import { tools } from './data/tools';
import { ToolCard } from './components/ToolCard';

function App() {
  return (
    <div>
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-white">메이플랜드 도구 모음</h1>
        <p className="mt-2 text-gray-400">사용할 도구를 선택하세요</p>
      </header>
      <div className="grid gap-4 sm:grid-cols-2">
        {tools.map((tool) => (
          <ToolCard key={tool.href} {...tool} />
        ))}
      </div>
    </div>
  );
}

export default App;
