import type { Tool } from '../data/tools';

export function ToolCard({ title, description, href }: Tool) {
  return (
    <a
      href={href}
      className="block rounded-lg border border-gray-700 bg-gray-800 p-6 transition-colors hover:border-gray-500 hover:bg-gray-700"
    >
      <h2 className="mb-2 text-xl font-semibold text-white">{title}</h2>
      <p className="text-sm text-gray-400">{description}</p>
    </a>
  );
}
