/**
 * 이슈 목록 실시간 조회 (Vercel Node Function).
 *
 * 페이지에 구워진 src/data/issues.json 은 하루 한 번만 갱신되므로, 방금 등록한 의견이
 * 바로 보이지 않는다. 클라이언트가 마운트 후 이걸 불러 최신 목록으로 갈아끼운다.
 * 프리렌더된 HTML 은 그대로라 크롤러가 보는 내용에는 영향이 없다.
 *
 * 답변(reply)은 이슈마다 댓글 API 를 한 번씩 더 타야 해서 여기서는 받지 않는다.
 * 클라이언트가 구워진 데이터의 reply 를 이슈 번호로 이어붙인다.
 *
 * CDN 에 60초 캐시하므로 방문자가 늘어도 GitHub 호출은 레포당 분당 1회 수준이다.
 */

const SERVICES = [
  { key: 'skill', name: '스킬 시뮬레이터', shortName: '스킬', repo: 'kyhong222/ms-skill-simulator', url: 'https://skill.mapleland.st' },
  { key: 'item', name: '템세팅 시뮬레이터 2.0', shortName: '템세팅', repo: 'kyhong222/mapleland-setting-v2', url: 'https://item.mapleland.st' },
  { key: 'coin', name: '월드코인 환전 계산기', shortName: '월드코인', repo: 'kyhong222/mapleland-coin-calculator', url: 'https://coin.mapleland.st' },
];

// scripts/fetch-issues.mjs 의 splitCategory 와 같은 규칙. 한쪽만 고치면 뱃지가 어긋난다.
function splitCategory(rawTitle) {
  const match = /^\s*\[([^\]]{1,16})\]\s*(.+)$/.exec(rawTitle);
  if (!match) return { category: null, title: rawTitle.trim() };
  const raw = match[1];
  const category = /버그|오류/.test(raw) ? '버그' : /건의|제안|요청/.test(raw) ? '건의' : '기타';
  return { category, title: match[2].trim() };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' });

  const token = process.env.GITHUB_TOKEN;
  const headers = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'mapleland-st-feedback-proxy',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  try {
    const services = await Promise.all(
      SERVICES.map(async (service) => {
        const gh = await fetch(
          `https://api.github.com/repos/${service.repo}/issues?state=all&per_page=100&sort=created&direction=desc`,
          { headers },
        );
        if (!gh.ok) throw new Error(`${service.repo} → ${gh.status}`);
        const raw = await gh.json();
        const issues = raw
          .filter((i) => !i.pull_request)
          .map((i) => ({
            number: i.number,
            ...splitCategory(i.title),
            state: i.state,
            labels: i.labels.map((l) => (typeof l === 'string' ? l : l.name)),
            createdAt: i.created_at,
            closedAt: i.closed_at,
            url: i.html_url,
            reply: null, // 클라이언트가 구워진 데이터에서 이어붙인다
          }));
        return { ...service, issues };
      }),
    );

    // 방문자가 몰려도 GitHub 호출은 분당 세 번을 넘지 않는다.
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    return res.status(200).json({ services });
  } catch (e) {
    console.error('issues proxy error', e);
    // 클라이언트는 실패하면 구워진 데이터를 그대로 쓴다.
    return res.status(502).json({ error: '목록을 불러오지 못했습니다.' });
  }
}
