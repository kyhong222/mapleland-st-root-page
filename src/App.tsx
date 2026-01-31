import { tools } from './data/tools';
import { ToolCard } from './components/ToolCard';

function App() {
  return (
    <div>
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-white">메이플랜드.세팅</h1>
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
