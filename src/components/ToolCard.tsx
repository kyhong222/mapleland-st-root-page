import type { Tool } from '../data/tools';

export function ToolCard({ title, description, href, icon }: Tool) {
  return (
    <a
      href={href}
      className="flex items-center gap-4 rounded-xl border border-white/70 bg-white/85 p-6 shadow-[0_10px_30px_-12px_rgba(6,23,74,0.6)] backdrop-blur-md transition duration-200 hover:-translate-y-0.5 hover:border-[#5093e1] hover:bg-white hover:shadow-[0_16px_36px_-12px_rgba(6,23,74,0.7)]"
    >
      <img
        src={icon}
        alt=""
        aria-hidden="true"
        className="h-10 w-10 shrink-0 [image-rendering:pixelated]"
      />
      <div className="min-w-0 border-l border-[#0f409c]/25 pl-4">
        <h2 className="mb-1 text-xl font-semibold text-[#0f2f6b]">{title}</h2>
        <p className="text-sm text-slate-600">{description}</p>
      </div>
    </a>
  );
}
