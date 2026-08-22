import { useCallback, useEffect, useState } from 'react';
import {
  formatDate,
  services as bakedServices,
  type Issue,
  type ServiceFeedback,
} from '../data/issues';
import { FeedbackDialog } from './FeedbackDialog';
import { IssueDetailDialog } from './IssueDetailDialog';

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

function IssueRow({ issue, onOpen }: { issue: Issue; onOpen: () => void }) {
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

      {/* GitHub 링크를 유지한 채 클릭만 가로챈다. 크롤러와 새 탭으로 열기는 그대로 살고,
          평범한 클릭은 자체 상세 화면으로 간다. */}
      <h4 className="mt-1.5 text-[0.95rem] font-medium leading-snug text-[#0f2f6b]">
        <a
          href={issue.url}
          onClick={(e) => {
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
            e.preventDefault();
            onOpen();
          }}
          className="underline-offset-2 hover:underline"
        >
          {issue.title}
        </a>
      </h4>

      {issue.reply && (
        <button
          type="button"
          onClick={onOpen}
          className="mt-1.5 block w-full border-l-2 border-[#5093e1]/50 pl-3 text-left text-sm leading-relaxed text-slate-600 transition hover:text-slate-900"
        >
          <span className="font-medium text-[#0f2f6b]">답변 </span>
          {issue.reply}
        </button>
      )}
    </li>
  );
}

function Panel({
  service,
  active,
  onWriteFeedback,
  onOpenIssue,
}: {
  service: ServiceFeedback;
  active: boolean;
  onWriteFeedback: () => void;
  onOpenIssue: (issue: Issue) => void;
}) {
  const resolved = service.issues.filter((i) => i.state === 'closed').length;
  return (
    // 비활성 패널을 렌더링에서 빼면 프리렌더된 HTML 에서도 사라져 크롤러가 못 읽는다.
    // 세 패널을 모두 심어두고 hidden 으로만 가린다.
    <div
      role="tabpanel"
      id={`feedback-panel-${service.key}`}
      aria-labelledby={`feedback-tab-${service.key}`}
      hidden={!active}
      className={active ? undefined : 'hidden'}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-6 pt-4">
        <p className="text-sm text-slate-500">
          <a
            href={service.url}
            className="font-medium text-[#0f2f6b] underline-offset-2 hover:underline"
          >
            {service.name}
          </a>
          <span className="mx-1.5 text-slate-300">·</span>
          {service.issues.length}건 접수 · {resolved}건 반영
        </p>
        <button
          type="button"
          onClick={onWriteFeedback}
          className="ml-auto rounded-lg bg-[#0f409c] px-3 py-1.5 text-sm font-medium text-white transition hover:bg-[#0d3585]"
        >
          의견 남기기
        </button>
      </div>

      {service.issues.length > 0 ? (
        <ul className="max-h-[26rem] overflow-y-auto overscroll-contain px-6 pb-4">
          {service.issues.map((issue) => (
            <IssueRow key={issue.number} issue={issue} onOpen={() => onOpenIssue(issue)} />
          ))}
        </ul>
      ) : (
        <p className="px-6 pb-6 pt-3 text-sm text-slate-500">아직 접수된 의견이 없습니다.</p>
      )}
    </div>
  );
}

// 구워진 데이터에만 답변이 들어 있다. (/api/issues 는 댓글까지 받지 않는다)
// 최신 목록에 이슈 번호로 답변을 이어붙인다.
function withBakedReplies(fresh: ServiceFeedback[]): ServiceFeedback[] {
  return fresh.map((service) => {
    const baked = bakedServices.find((s) => s.key === service.key);
    if (!baked) return service;
    const replies = new Map(baked.issues.map((i) => [i.number, i.reply]));
    return {
      ...service,
      issues: service.issues.map((i) => ({ ...i, reply: i.reply ?? replies.get(i.number) ?? null })),
    };
  });
}

export function FeedbackBoard() {
  // 초기값은 구워진 데이터. SSR 결과와 같아야 하이드레이션이 어긋나지 않는다.
  const [services, setServices] = useState<ServiceFeedback[]>(bakedServices);
  const [activeKey, setActiveKey] = useState(bakedServices[0].key);
  // 열려 있을 때만 렌더링하므로 프리렌더 결과에는 다이얼로그가 없다.
  const [formService, setFormService] = useState<ServiceFeedback | null>(null);
  const [detail, setDetail] = useState<{ service: ServiceFeedback; issue: Issue } | null>(null);

  const refresh = useCallback(async (bustCache = false) => {
    try {
      const res = await fetch(bustCache ? `/api/issues?t=${Date.now()}` : '/api/issues');
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data?.services)) setServices(withBakedReplies(data.services));
    } catch {
      // 실패하면 구워진 데이터를 그대로 쓴다. 목록이 조금 오래된 것뿐이다.
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // 등록 직후에는 응답으로 받은 이슈를 바로 끼워 넣는다.
  // GitHub 반영에 시간이 걸려도 사용자는 자기 글을 즉시 본다.
  const handleSubmitted = (serviceKey: string, issue: Issue) => {
    setServices((prev) =>
      prev.map((s) =>
        s.key === serviceKey && !s.issues.some((i) => i.number === issue.number)
          ? { ...s, issues: [issue, ...s.issues] }
          : s,
      ),
    );
    void refresh(true);
  };

  const totalCount = services.reduce((n, s) => n + s.issues.length, 0);
  const resolvedCount = services.reduce(
    (n, s) => n + s.issues.filter((i) => i.state === 'closed').length,
    0,
  );

  return (
    <div className="mx-auto mt-12 max-w-2xl">
      <header className="mb-4 text-center">
        <h2 className="text-2xl font-bold text-white [text-shadow:0_2px_10px_rgba(6,23,74,0.85)]">
          사용자 의견
        </h2>
        <p className="mt-1.5 text-sm text-white/85 [text-shadow:0_1px_6px_rgba(6,23,74,0.85)]">
          지금까지 {totalCount}건이 접수되어 {resolvedCount}건이 반영되었습니다. 버그 제보와 기능
          건의를 GitHub 계정 없이 남기실 수 있습니다.
        </p>
      </header>

      <section className="overflow-hidden rounded-xl border border-white/70 bg-white/85 shadow-[0_10px_30px_-12px_rgba(6,23,74,0.6)] backdrop-blur-md">
        <div
          role="tablist"
          aria-label="서비스별 사용자 의견"
          className="flex border-b border-[#0f409c]/25"
        >
          {services.map((service) => {
            const active = service.key === activeKey;
            return (
              <button
                key={service.key}
                type="button"
                role="tab"
                id={`feedback-tab-${service.key}`}
                aria-selected={active}
                aria-controls={`feedback-panel-${service.key}`}
                onClick={() => setActiveKey(service.key)}
                className={`flex-1 border-b-2 px-3 py-3 text-sm font-medium transition ${
                  active
                    ? 'border-[#0f409c] text-[#0f2f6b]'
                    : 'border-transparent text-slate-500 hover:bg-white/60 hover:text-[#0f2f6b]'
                }`}
              >
                {service.shortName}
                <span className={`ml-1.5 text-xs ${active ? 'text-[#5093e1]' : 'text-slate-400'}`}>
                  {service.issues.length}
                </span>
              </button>
            );
          })}
        </div>

        {services.map((service) => (
          <Panel
            key={service.key}
            service={service}
            active={service.key === activeKey}
            onWriteFeedback={() => setFormService(service)}
            onOpenIssue={(issue) => setDetail({ service, issue })}
          />
        ))}
      </section>

      {formService && (
        <FeedbackDialog
          service={formService}
          onSubmitted={handleSubmitted}
          onClose={() => setFormService(null)}
        />
      )}

      {detail && (
        <IssueDetailDialog
          service={detail.service}
          issue={detail.issue}
          onClose={() => setDetail(null)}
        />
      )}
    </div>
  );
}
