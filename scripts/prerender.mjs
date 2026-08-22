// vite build 가 만든 dist/index.html 의 빈 #root 를 실제 마크업으로 채운다.
// 크롤러(구글 색인 / AdSense 심사)가 JS 실행 없이 이슈 목록을 읽을 수 있어야 하므로,
// SPA 그대로 두면 이 페이지는 사실상 빈 문서로 보인다.
import { readFileSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const HTML = resolve(ROOT, 'dist/index.html');
const SSR_ENTRY = resolve(ROOT, 'dist-ssr/entry-server.js');
const PLACEHOLDER = '<div id="root"></div>';

const { render } = await import(pathToFileURL(SSR_ENTRY).href);
const html = readFileSync(HTML, 'utf8');

if (!html.includes(PLACEHOLDER)) {
  throw new Error(`dist/index.html 에서 ${PLACEHOLDER} 를 찾지 못했다`);
}

const markup = render();
writeFileSync(HTML, html.replace(PLACEHOLDER, `<div id="root">${markup}</div>`), 'utf8');

// SSR 번들은 심고 나면 배포할 필요가 없다.
rmSync(resolve(ROOT, 'dist-ssr'), { recursive: true, force: true });

console.log(`✓ dist/index.html 프리렌더 완료 (+${markup.length.toLocaleString('en-US')}자)`);
