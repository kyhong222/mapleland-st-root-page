import { Analytics } from '@vercel/analytics/react';
import { tools } from './data/tools';
import { ToolCard } from './components/ToolCard';

function App() {
  return (
    <div>
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-white [text-shadow:0_2px_10px_rgba(6,23,74,0.85)]">
          메이플랜드.세팅
        </h1>
      </header>
      <div className="mx-auto grid max-w-2xl gap-4">
        {tools.map((tool) => (
          <ToolCard key={tool.href} {...tool} />
        ))}
      </div>
      <Analytics />
    </div>
  );
}

export default App;
