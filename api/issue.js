/**
 * 이슈 상세 + 댓글 조회 (Vercel Node Function).
 *
 * GET /api/issue?service=item&number=31
 *
 * 본문과 댓글은 전부 사용자가 쓴 글이다. 마크다운/HTML 을 그대로 넘겨 클라이언트에서
 * 렌더링하면 XSS 가 되므로, 여기서 태그를 걷어내고 순수 텍스트로만 넘긴다.
 * 클라이언트는 그걸 React 텍스트 노드로 찍으므로 HTML 이 실행될 여지가 없다.
 *
 * 이미지는 버그 제보에 실제로 많이 쓰여서 살리되, 주소를 그대로 신뢰하지 않고
 * GitHub 첨부 호스트에서 온 것만 추려 별도 배열로 넘긴다.
 */

const SERVICES = {
  skill: 'kyhong222/ms-skill-simulator',
  item: 'kyhong222/mapleland-setting-v2',
  coin: 'kyhong222/mapleland-coin-calculator',
};

const OWNER_LOGIN = 'kyhong222';

// 이 접두사로 시작하는 이미지만 렌더링한다. 임의 외부 주소는 버린다.
const ALLOWED_IMAGE_PREFIXES = [
  'https://github.com/user-attachments/',
  'https://user-images.githubusercontent.com/',
  'https://raw.githubusercontent.com/',
];

// api/feedback.js 가 폼 접수 글에 남기는 표식. 이게 있으면 GitHub 작성자는
// 토큰 소유자(레포 주인)일 뿐 실제 작성자가 아니므로 '익명'으로 표시한다.
const FORM_MARKER = 'mapleland.st 의견 남기기 폼에서 접수됨';

const TEXT_MAX = 4000;

function extractImages(markdown) {
  const found = [];
  for (const m of markdown.matchAll(/!\[[^\]]*\]\(\s*([^)\s]+)/g)) found.push(m[1]);
  for (const m of markdown.matchAll(/<img[^>]*\ssrc\s*=\s*["']([^"']+)["']/gi)) found.push(m[1]);
  return [...new Set(found)]
    .filter((u) => ALLOWED_IMAGE_PREFIXES.some((p) => u.startsWith(p)))
    .slice(0, 8);
}

function toText(markdown) {
  return markdown
    .replace(new RegExp(`<sub>\\s*${FORM_MARKER}\\s*</sub>`, 'g'), '')
    .replace(/```[\s\S]*?```/g, '[코드]')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/<img[^>]*>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, TEXT_MAX);
}

function present(markdown) {
  const raw = typeof markdown === 'string' ? markdown : '';
  return { text: toText(raw), images: extractImages(raw) };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' });

  const repo = SERVICES[req.query.service];
  const number = Number.parseInt(req.query.number, 10);
  if (!repo || !Number.isInteger(number) || number < 1) {
    return res.status(400).json({ error: '잘못된 요청입니다.' });
  }

  const token = process.env.GITHUB_TOKEN;
  const headers = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'mapleland-st-feedback-proxy',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  try {
    const [issueRes, commentsRes] = await Promise.all([
      fetch(`https://api.github.com/repos/${repo}/issues/${number}`, { headers }),
      fetch(`https://api.github.com/repos/${repo}/issues/${number}/comments?per_page=100`, {
        headers,
      }),
    ]);

    if (issueRes.status === 404) return res.status(404).json({ error: '없는 글입니다.' });
    if (!issueRes.ok) throw new Error(`issue ${issueRes.status}`);
    if (!commentsRes.ok) throw new Error(`comments ${commentsRes.status}`);

    const issue = await issueRes.json();
    if (issue.pull_request) return res.status(404).json({ error: '없는 글입니다.' });
    const comments = await commentsRes.json();

    const rawBody = typeof issue.body === 'string' ? issue.body : '';

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    return res.status(200).json({
      number: issue.number,
      state: issue.state,
      createdAt: issue.created_at,
      url: issue.html_url,
      // 폼으로 들어온 글은 GitHub 상 작성자가 레포 주인이라 표시하지 않는다.
      viaForm: rawBody.includes(FORM_MARKER),
      body: present(rawBody),
      comments: comments.map((c) => ({
        id: c.id,
        author: c.user?.login ?? '알 수 없음',
        isOwner: c.user?.login === OWNER_LOGIN,
        createdAt: c.created_at,
        ...present(typeof c.body === 'string' ? c.body : ''),
      })),
    });
  } catch (e) {
    console.error('issue detail proxy error', e);
    return res.status(502).json({ error: '글을 불러오지 못했습니다.' });
  }
}
