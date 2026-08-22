/**
 * 의견 남기기 서버리스 프록시 (Vercel Node Function).
 *
 * 랜딩 페이지의 FeedbackDialog 가 { service, type, title, body, contact, hp } 를 POST 하면
 * 서버에 숨긴 토큰으로 GitHub 이슈를 만든다. 사용자는 GitHub 계정이 없어도 된다.
 * mapleland-setting-v2 의 api/feedback.js 와 같은 구조이나, 대상 레포가 셋이라 매핑이 붙는다.
 *
 * 필요한 환경변수 (Vercel Project Settings → Environment Variables):
 *   GITHUB_TOKEN   (필수) Fine-grained PAT 권장. Repository access 를 아래 세 레포로만 한정하고
 *                  권한은 Issues: Read and write 하나만 준다. classic 토큰의 repo 스코프는
 *                  유출 시 전체 레포 쓰기 권한이 넘어가므로 쓰지 않는 편이 낫다.
 *   ALLOWED_ORIGIN (선택) 기본 'https://mapleland.st'
 */

// 클라이언트는 service 키만 보낸다. owner/repo 를 그대로 받으면
// 토큰 권한이 닿는 아무 레포에나 이슈를 열 수 있게 되므로 서버에서 고정한다.
// labels 는 각 레포에 "이미 있는" 것만 넣는다. 없는 라벨을 보내면 GitHub 이 새로 만들어버린다.
const SERVICES = {
  skill: { owner: 'kyhong222', repo: 'ms-skill-simulator', labels: ['feedback'] },
  item: { owner: 'kyhong222', repo: 'mapleland-setting-v2', labels: ['user-feedback'] },
  coin: { owner: 'kyhong222', repo: 'mapleland-coin-calculator', labels: [] },
};

// 말머리는 scripts/fetch-issues.mjs 가 카테고리 뱃지로 파싱한다. 라벨과 달리 레포를 안 가린다.
const TYPE_TAG = { bug: '버그', idea: '건의', etc: '기타' };

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'https://mapleland.st';

const TITLE_MIN = 2;
const TITLE_MAX = 120;
const BODY_MIN = 5;
const BODY_MAX = 5000;
const CONTACT_MAX = 120;

// 인스턴스 메모리 기반이라 완벽하지 않다. (람다가 여러 개 뜨면 각자 센다)
// 작정한 스팸은 못 막고, 실수로 연타하는 것과 단순 봇 정도를 걸러낸다.
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX = 3;
const hits = new Map();

function rateLimited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (recent.length >= RATE_MAX) {
    hits.set(ip, recent);
    return true;
  }
  recent.push(now);
  hits.set(ip, recent);
  // 오래된 키가 쌓이지 않게 가끔 청소한다.
  if (hits.size > 500) {
    for (const [k, v] of hits) if (v.every((t) => now - t >= RATE_WINDOW_MS)) hits.delete(k);
  }
  return false;
}

function clientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd) return fwd.split(',')[0].trim();
  return req.headers['x-real-ip'] || 'unknown';
}

function clean(v, max) {
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
}

function safeParse(s) {
  try {
    return JSON.parse(s);
  } catch {
    return {};
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.setHeader('Vary', 'Origin');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const payload = typeof req.body === 'string' ? safeParse(req.body) : req.body || {};
  const { hp } = payload;

  // 허니팟: 사람은 비워두는 숨김 필드. 값이 있으면 봇 → 만들지 않고 성공한 척한다.
  if (typeof hp === 'string' && hp.length > 0) return res.status(200).json({ ok: true, url: '' });

  const target = SERVICES[payload.service];
  if (!target) return res.status(400).json({ error: '알 수 없는 서비스입니다.' });

  const tag = TYPE_TAG[payload.type] ?? TYPE_TAG.etc;
  const title = clean(payload.title, TITLE_MAX);
  const content = clean(payload.body, BODY_MAX);
  const contact = clean(payload.contact, CONTACT_MAX);

  if (title.length < TITLE_MIN || content.length < BODY_MIN) {
    return res.status(400).json({ error: '제목과 내용을 조금 더 자세히 적어주세요.' });
  }

  if (rateLimited(clientIp(req))) {
    return res.status(429).json({ error: '잠시 후 다시 시도해 주세요. (연속 등록 제한)' });
  }

  if (!process.env.GITHUB_TOKEN) {
    console.error('GITHUB_TOKEN 미설정');
    return res.status(500).json({ error: '서버 설정 오류로 접수하지 못했습니다.' });
  }

  const lines = [content];
  if (contact) lines.push('', '---', `연락처: ${contact}`);
  lines.push('', '<sub>mapleland.st 의견 남기기 폼에서 접수됨</sub>');

  try {
    const gh = await fetch(`https://api.github.com/repos/${target.owner}/${target.repo}/issues`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
        'User-Agent': 'mapleland-st-feedback-proxy',
      },
      body: JSON.stringify({
        title: `[${tag}] ${title}`,
        body: lines.join('\n'),
        labels: target.labels,
      }),
    });

    if (!gh.ok) {
      // 응답 본문에 토큰이 섞일 일은 없지만, 클라이언트에는 상태코드만 넘긴다.
      console.error('GitHub API error', gh.status, await gh.text().catch(() => ''));
      return res.status(502).json({ error: `GitHub 등록에 실패했습니다. (${gh.status})` });
    }

    const issue = await gh.json();
    return res.status(200).json({ ok: true, url: issue.html_url, number: issue.number });
  } catch (e) {
    console.error('feedback proxy error', e);
    return res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
}
