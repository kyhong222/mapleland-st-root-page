import { useEffect, useRef, useState } from 'react';
import type { ServiceFeedback } from '../data/issues';

const ENDPOINT = '/api/feedback';

const TYPES = [
  { value: 'bug', label: '🐛 버그 제보' },
  { value: 'idea', label: '💡 기능 건의' },
  { value: 'etc', label: '💬 기타' },
] as const;
type FeedbackType = (typeof TYPES)[number]['value'];

const TYPE_TAG: Record<FeedbackType, string> = { bug: '버그', idea: '건의', etc: '기타' };
const TITLE_MAX = 120;
const BODY_MAX = 5000;

// 서버가 죽었을 때를 위한 폴백. GitHub 계정이 있는 사람은 이걸로 직접 올릴 수 있다.
function prefillUrl(repo: string, type: FeedbackType, title: string, body: string, contact: string) {
  const lines = [body.trim()];
  if (contact.trim()) lines.push('', '---', `연락처: ${contact.trim()}`);
  const q = new URLSearchParams({
    title: `[${TYPE_TAG[type]}] ${title.trim()}`,
    body: lines.join('\n'),
  });
  return `https://github.com/${repo}/issues/new?${q}`;
}

const FIELD =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#5093e1] focus:ring-2 focus:ring-[#5093e1]/30';

type Status = 'idle' | 'submitting' | 'success' | 'error';

export function FeedbackDialog({
  service,
  onClose,
}: {
  service: ServiceFeedback;
  onClose: () => void;
}) {
  const [type, setType] = useState<FeedbackType>('bug');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [contact, setContact] = useState('');
  const [hp, setHp] = useState(''); // 허니팟 — 사람은 비워둔다
  const [status, setStatus] = useState<Status>('idle');
  const [resultUrl, setResultUrl] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const titleRef = useRef<HTMLInputElement>(null);

  const submitting = status === 'submitting';
  const canSubmit = title.trim().length >= 2 && body.trim().length >= 5 && !submitting;

  useEffect(() => {
    titleRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) onClose();
    };
    document.addEventListener('keydown', onKey);
    // 뒤 배경이 같이 스크롤되지 않도록 잠근다.
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose, submitting]);

  const submit = async () => {
    if (!canSubmit) return;
    setStatus('submitting');
    setErrorMsg('');
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service: service.key,
          type,
          title: title.trim(),
          body: body.trim(),
          contact: contact.trim(),
          hp,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? `서버 응답 오류 (${res.status})`);
      setResultUrl(typeof data?.url === 'string' ? data.url : '');
      setStatus('success');
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : '전송에 실패했습니다.');
      setStatus('error');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#06174a]/60 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="feedback-dialog-title"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-[0_24px_60px_-12px_rgba(6,23,74,0.7)]"
      >
        <h3 id="feedback-dialog-title" className="text-lg font-bold text-[#0f2f6b]">
          의견 남기기
        </h3>
        <p className="mt-1 text-sm text-slate-500">{service.name}</p>

        {status === 'success' ? (
          <div className="mt-4">
            <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800 ring-1 ring-inset ring-emerald-200">
              의견이 접수되었습니다. 감사합니다!
            </p>
            {resultUrl && (
              <p className="mt-2 break-all text-sm text-slate-600">
                등록된 글:{' '}
                <a
                  href={resultUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#0f409c] underline underline-offset-2"
                >
                  {resultUrl}
                </a>
              </p>
            )}
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg bg-[#0f409c] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#0d3585]"
              >
                닫기
              </button>
            </div>
          </div>
        ) : (
          <>
            <p className="mt-3 text-xs leading-relaxed text-slate-500">
              GitHub 계정 없이 바로 남길 수 있습니다. 접수된 내용은{' '}
              <b className="text-slate-600">공개 저장소의 글로 등록</b>되니 개인정보는 넣지 말아
              주세요.
            </p>

            <div className="mt-4 space-y-3">
              <select
                value={type}
                onChange={(e) => setType(e.target.value as FeedbackType)}
                className={FIELD}
                aria-label="의견 유형"
              >
                {TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>

              <input
                ref={titleRef}
                value={title}
                onChange={(e) => setTitle(e.target.value.slice(0, TITLE_MAX))}
                maxLength={TITLE_MAX}
                placeholder="제목"
                className={FIELD}
                aria-label="제목"
              />

              <div>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value.slice(0, BODY_MAX))}
                  maxLength={BODY_MAX}
                  rows={6}
                  placeholder="어떤 점이 불편했는지, 무엇을 바라시는지 적어주세요."
                  className={`${FIELD} resize-y`}
                  aria-label="내용"
                />
                <p className="mt-1 text-right text-xs text-slate-400">
                  {body.length} / {BODY_MAX}
                </p>
              </div>

              <input
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                maxLength={120}
                placeholder="연락처 (선택 · 공개됨)"
                className={FIELD}
                aria-label="연락처"
              />

              {/* 허니팟: 화면 밖에 두고, 값이 차 있으면 서버가 봇으로 판단한다 */}
              <div aria-hidden className="pointer-events-none absolute -left-[9999px] top-0 h-0 overflow-hidden">
                <input
                  tabIndex={-1}
                  autoComplete="off"
                  name="website"
                  value={hp}
                  onChange={(e) => setHp(e.target.value)}
                />
              </div>
            </div>

            {status === 'error' && (
              <p className="mt-3 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-800 ring-1 ring-inset ring-rose-200">
                {errorMsg} 아래 &lsquo;GitHub에서 직접 등록&rsquo;으로도 남길 수 있습니다.
              </p>
            )}

            <div className="mt-5 flex flex-wrap items-center gap-2">
              {status === 'error' && (
                <a
                  href={prefillUrl(service.repo, type, title, body, contact)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mr-auto text-sm font-medium text-[#0f409c] underline-offset-2 hover:underline"
                >
                  GitHub에서 직접 등록
                </a>
              )}
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="ml-auto rounded-lg px-4 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-100 disabled:opacity-50"
              >
                취소
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={!canSubmit}
                className="rounded-lg bg-[#0f409c] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#0d3585] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {submitting ? '전송 중…' : '보내기'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
