import { useEffect, useState } from 'react';
import { formatDate, type Issue, type ServiceFeedback } from '../data/issues';

interface Block {
  text: string;
  images: string[];
}

interface Comment extends Block {
  id: number;
  author: string;
  isOwner: boolean;
  createdAt: string;
}

interface Detail {
  number: number;
  state: 'open' | 'closed';
  createdAt: string;
  url: string;
  viaForm: boolean;
  body: Block;
  comments: Comment[];
}

// 서버가 태그를 걷어낸 순수 텍스트만 넘긴다. React 텍스트 노드로 찍으므로
// dangerouslySetInnerHTML 없이도 줄바꿈만 살릴 수 있다.
function Body({ block, empty }: { block: Block; empty: string }) {
  return (
    <>
      {block.text ? (
        <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-700">
          {block.text}
        </p>
      ) : (
        block.images.length === 0 && <p className="text-sm italic text-slate-400">{empty}</p>
      )}
      {block.images.length > 0 && (
        <div className="mt-2 space-y-2">
          {block.images.map((src) => (
            <a key={src} href={src} target="_blank" rel="noopener noreferrer">
              <img
                src={src}
                alt="첨부 이미지"
                loading="lazy"
                referrerPolicy="no-referrer"
                className="max-h-72 w-auto max-w-full rounded-lg border border-slate-200"
              />
            </a>
          ))}
        </div>
      )}
    </>
  );
}

export function IssueDetailDialog({
  service,
  issue,
  onClose,
}: {
  service: ServiceFeedback;
  issue: Issue;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  useEffect(() => {
    let alive = true;
    setDetail(null);
    setError('');
    fetch(`/api/issue?service=${service.key}&number=${issue.number}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? `불러오기 실패 (${res.status})`);
        if (alive) setDetail(data);
      })
      .catch((e) => alive && setError(e instanceof Error ? e.message : '불러오지 못했습니다.'));
    return () => {
      alive = false;
    };
  }, [service.key, issue.number]);

  const resolved = issue.state === 'closed';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#06174a]/60 p-4 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="issue-detail-title"
        className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-xl bg-white shadow-[0_24px_60px_-12px_rgba(6,23,74,0.7)]"
      >
        <div className="border-b border-[#0f409c]/15 p-6 pb-4">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
                resolved
                  ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                  : 'bg-amber-50 text-amber-700 ring-amber-200'
              }`}
            >
              {resolved ? '반영 완료' : '검토 중'}
            </span>
            <span className="text-xs text-slate-500">{service.name}</span>
            <time dateTime={issue.createdAt} className="ml-auto text-xs text-slate-500">
              {formatDate(issue.createdAt)}
            </time>
          </div>
          <h3 id="issue-detail-title" className="mt-2 text-lg font-bold leading-snug text-[#0f2f6b]">
            {issue.title}
          </h3>
        </div>

        <div className="flex-1 overflow-y-auto p-6 pt-4">
          {error ? (
            <div className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-800 ring-1 ring-inset ring-rose-200">
              {error}
            </div>
          ) : !detail ? (
            <p className="text-sm text-slate-400">불러오는 중…</p>
          ) : (
            <>
              <p className="mb-1.5 text-xs font-medium text-slate-500">
                {detail.viaForm ? '작성자 · 익명' : '작성자 · GitHub'}
              </p>
              <Body block={detail.body} empty="내용이 없습니다." />

              <div className="mt-6 border-t border-[#0f409c]/15 pt-4">
                <h4 className="mb-3 text-sm font-semibold text-[#0f2f6b]">
                  답변 {detail.comments.length}개
                </h4>
                {detail.comments.length === 0 ? (
                  <p className="text-sm text-slate-400">아직 답변이 없습니다.</p>
                ) : (
                  <ul className="space-y-4">
                    {detail.comments.map((c) => (
                      <li
                        key={c.id}
                        className={`rounded-lg p-3 ${
                          c.isOwner ? 'bg-[#5093e1]/10 ring-1 ring-inset ring-[#5093e1]/25' : 'bg-slate-50'
                        }`}
                      >
                        <div className="mb-1.5 flex items-center gap-2">
                          <span className="text-xs font-medium text-[#0f2f6b]">
                            {c.isOwner ? '운영자' : c.author}
                          </span>
                          <time dateTime={c.createdAt} className="text-xs text-slate-400">
                            {formatDate(c.createdAt)}
                          </time>
                        </div>
                        <Body block={c} empty="내용이 없습니다." />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-3 border-t border-[#0f409c]/15 p-6 pt-4">
          <a
            href={issue.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-slate-500 underline-offset-2 hover:underline"
          >
            GitHub에서 보기
          </a>
          <button
            type="button"
            onClick={onClose}
            className="ml-auto rounded-lg bg-[#0f409c] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#0d3585]"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
