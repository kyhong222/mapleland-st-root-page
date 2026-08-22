import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import './index.css'
import App from './App'

const container = document.getElementById('root')!

// 빌드 후 prerender 스크립트가 #root 를 채워두므로 보통은 하이드레이션 경로를 탄다.
// dev 서버처럼 비어 있을 때만 새로 마운트한다.
if (container.hasChildNodes()) {
  hydrateRoot(
    container,
    <StrictMode>
      <App />
    </StrictMode>,
  )
} else {
  createRoot(container).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}
