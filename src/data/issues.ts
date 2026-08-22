import raw from './issues.json';

export interface Issue {
  number: number;
  title: string;
  category: string | null;
  state: 'open' | 'closed';
  labels: string[];
  createdAt: string;
  closedAt: string | null;
  url: string;
  reply: string | null;
}

export interface ServiceFeedback {
  key: string;
  name: string;
  shortName: string;
  repo: string;
  url: string;
  issues: Issue[];
}

export const services = (raw as { services: ServiceFeedback[] }).services;

export const totalCount = services.reduce((n, s) => n + s.issues.length, 0);
export const resolvedCount = services.reduce(
  (n, s) => n + s.issues.filter((i) => i.state === 'closed').length,
  0,
);

// toLocaleDateString 은 Node 와 브라우저의 로캘이 달라 프리렌더 결과와
// 하이드레이션 결과가 어긋난다. ISO 문자열을 직접 잘라 결정적으로 만든다.
export function formatDate(iso: string) {
  return `${iso.slice(0, 4)}.${iso.slice(5, 7)}.${iso.slice(8, 10)}`;
}
