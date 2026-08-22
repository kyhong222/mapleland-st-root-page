import { StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import App from './App';

// scripts/prerender.mjs 가 빌드 후 이걸 불러 #root 안에 심는다.
// 클라이언트는 main.tsx 의 hydrateRoot 로 이어받는다.
export function render() {
  return renderToString(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
