// 각 서비스 레포의 건의/버그 이슈를 GitHub API로 모아 src/data/issues.json 으로 굽는다.
// 빌드가 아니라 이 스크립트에서만 네트워크를 타므로, GitHub 장애가 배포를 막지 않는다.
// 갱신은 .github/workflows/refresh-issues.yml 이 하루 한 번 돌린다.
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(ROOT, 'src/data/issues.json');

const SERVICES = [
  {
    key: 'skill',
    name: '스킬 시뮬레이터',
    repo: 'kyhong222/ms-skill-simulator',
    url: 'https://skill.mapleland.st',
  },
  {
    key: 'item',
    name: '템세팅 시뮬레이터 2.0',
    repo: 'kyhong222/mapleland-setting-v2',
    url: 'https://item.mapleland.st',
  },
  {
    key: 'coin',
    name: '월드코인 환전 계산기',
    repo: 'kyhong222/mapleland-coin-calculator',
    url: 'https://coin.mapleland.st',
  },
];

const TOKEN = process.env.GITHUB_TOKEN ?? '';
const headers = {
  accept: 'application/vnd.github+json',
  'user-agent': 'mapleland-st-root-page',
  ...(TOKEN ? { authorization: `Bearer ${TOKEN}` } : {}),
};

async function api(path) {
  const res = await fetch(`https://api.github.com${path}`, { headers });
  if (!res.ok) {
    const remaining = res.headers.get('x-ratelimit-remaining');
    throw new Error(`GET ${path} → ${res.status} ${res.statusText} (rate limit remaining: ${remaining})`);
  }
  return res.json();
}

// 이슈 본문/댓글은 사용자가 쓴 글이라 그대로 심지 않는다.
// 이미지·링크·코드펜스·HTML 을 걷어내고 한 줄로 눌러 길이를 자른다.
function toPlainText(markdown, limit = 180) {
  const text = (markdown ?? '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[*_`#>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > limit ? `${text.slice(0, limit - 1).trimEnd()}…` : text;
}

// item 레포는 "[버그] 제목" 처럼 말머리를 쓴다. 카테고리로 떼어내 뱃지로 쓴다.
// 레포마다 말머리가 제각각이라 뱃지에 쓸 세 가지로 눌러 맞춘다.
function splitCategory(rawTitle) {
  const match = /^\s*\[([^\]]{1,16})\]\s*(.+)$/.exec(rawTitle);
  if (!match) return { category: null, title: rawTitle.trim() };
  const raw = match[1];
  const category = /버그|오류/.test(raw) ? '버그' : /건의|제안|요청/.test(raw) ? '건의' : '기타';
  return { category, title: match[2].trim() };
}

async function ownerReply(repo, issue) {
  if (!issue.comments) return null;
  const owner = repo.split('/')[0];
  try {
    const comments = await api(`/repos/${repo}/issues/${issue.number}/comments?per_page=100`);
    // 오너의 마지막 답변이 곧 처리 결과다.
    const last = comments.filter((c) => c.user?.login === owner).pop();
    return last ? toPlainText(last.body) : null;
  } catch (err) {
    // 답변은 부가 정보라, 못 가져와도 이슈 자체는 살린다.
    console.warn(`  ! ${repo}#${issue.number} 댓글 조회 실패: ${err.message}`);
    return null;
  }
}

async function collect(service) {
  const raw = await api(`/repos/${service.repo}/issues?state=all&per_page=100&sort=created&direction=desc`);
  const issues = raw.filter((i) => !i.pull_request);

  const collected = [];
  for (const issue of issues) {
    const { category, title } = splitCategory(issue.title);
    collected.push({
      number: issue.number,
      title,
      category,
      state: issue.state,
      labels: issue.labels.map((l) => (typeof l === 'string' ? l : l.name)),
      createdAt: issue.created_at,
      closedAt: issue.closed_at,
      url: issue.html_url,
      reply: await ownerReply(service.repo, issue),
    });
  }

  console.log(`  ${service.repo}: ${collected.length}건`);
  return { ...service, issues: collected };
}

async function main() {
  console.log(TOKEN ? '· 인증된 토큰으로 조회' : '· 익명 조회 (시간당 60회 제한)');
  const services = [];
  for (const service of SERVICES) services.push(await collect(service));

  const total = services.reduce((n, s) => n + s.issues.length, 0);
  if (total === 0) throw new Error('이슈를 한 건도 가져오지 못했다');

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, `${JSON.stringify({ services }, null, 2)}\n`, 'utf8');
  console.log(`✓ ${OUT} 갱신 (총 ${total}건)`);
}

main().catch((err) => {
  console.error(`✗ 이슈 갱신 실패: ${err.message}`);
  if (existsSync(OUT)) {
    // 기존 데이터가 있으면 그대로 두고 빌드는 계속 굴러가게 한다.
    const kept = JSON.parse(readFileSync(OUT, 'utf8'));
    const total = kept.services.reduce((n, s) => n + s.issues.length, 0);
    console.error(`  기존 ${OUT} 유지 (총 ${total}건)`);
    process.exit(0);
  }
  process.exit(1);
});
