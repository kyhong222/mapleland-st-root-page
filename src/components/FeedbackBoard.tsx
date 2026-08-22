import {
  formatDate,
  newIssueUrl,
  resolvedCount,
  services,
  totalCount,
  type Issue,
  type ServiceFeedback,
} from '../data/issues';

const CATEGORY_STYLE: Record<string, string> = {
  버그: 'bg-rose-50 text-rose-700 ring-rose-200',
  건의: 'bg-sky-50 text-sky-700 ring-sky-200',
  기타: 'bg-slate-100 text-slate-600 ring-slate-200',
};

function Badge({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${className}`}
    >
      {children}
    </span>
  );
}

function IssueRow({ issue }: { issue: Issue }) {
  const resolved = issue.state === 'closed';
  return (
    <li className="border-t border-[#0f409c]/10 py-3 first:border-t-0">
      <div className="flex flex-wrap items-center gap-2">
        <Badge
          className={
            resolved
              ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
              : 'bg-amber-50 text-amber-700 ring-amber-200'
          }
        >
          {resolved ? '반영 완료' : '검토 중'}
        </Badge>
        {issue.category && (
          <Badge className={CATEGORY_STYLE[issue.category] ?? CATEGORY_STYLE['기타']}>
            {issue.category}
          </Badge>
        )}
        <time dateTime={issue.createdAt} className="ml-auto text-xs text-slate-500">
          {formatDate(issue.createdAt)}
        </time>
      </div>

      <h4 className="mt-1.5 text-[0.95rem] font-medium leading-snug text-[#0f2f6b]">
        <a
          href={issue.url}
          target="_blank"
          rel="noopener noreferrer"
          className="underline-offset-2 hover:underline"
        >
          {issue.title}
        </a>
      </h4>

      {issue.reply && (
        <p className="mt-1.5 border-l-2 border-[#5093e1]/50 pl-3 text-sm leading-relaxed text-slate-600">
          <span className="font-medium text-[#0f2f6b]">답변 </span>
          {issue.reply}
        </p>
      )}
    </li>
  );
}

function ServiceSection({ service }: { service: ServiceFeedback }) {
  const resolved = service.issues.filter((i) => i.state === 'closed').length;
  return (
    <section className="rounded-xl border border-white/70 bg-white/85 p-6 shadow-[0_10px_30px_-12px_rgba(6,23,74,0.6)] backdrop-blur-md">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-[#0f409c]/25 pb-3">
        <h3 className="text-lg font-semibold text-[#0f2f6b]">
          <a href={service.url} className="underline-offset-2 hover:underline">
            {service.name}
          </a>
        </h3>
        <p className="text-sm text-slate-500">
          {service.issues.length}건 접수 · {resolved}건 반영
        </p>
        <a
          href={newIssueUrl(service.repo)}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto text-sm font-medium text-[#0f409c] underline-offset-2 hover:underline"
        >
          의견 남기기 →
        </a>
      </div>

      {service.issues.length > 0 ? (
        <ul>
          {service.issues.map((issue) => (
            <IssueRow key={issue.number} issue={issue} />
          ))}
        </ul>
      ) : (
        <p className="pt-3 text-sm text-slate-500">아직 접수된 의견이 없습니다.</p>
      )}
    </section>
  );
}

export function FeedbackBoard() {
  return (
    <div className="mx-auto mt-12 max-w-2xl">
      <header className="mb-4 text-center">
        <h2 className="text-2xl font-bold text-white [text-shadow:0_2px_10px_rgba(6,23,74,0.85)]">
          사용자 의견
        </h2>
        <p className="mt-1.5 text-sm text-white/85 [text-shadow:0_1px_6px_rgba(6,23,74,0.85)]">
          지금까지 {totalCount}건이 접수되어 {resolvedCount}건이 반영되었습니다. 버그 제보와 기능
          건의는 각 서비스의 GitHub 이슈로 받고 있습니다.
        </p>
      </header>

      <div className="grid gap-4">
        {services.map((service) => (
          <ServiceSection key={service.key} service={service} />
        ))}
      </div>
    </div>
  );
}
