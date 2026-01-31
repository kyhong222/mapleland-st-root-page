export interface Tool {
  title: string;
  description: string;
  href: string;
}

export const tools: Tool[] = [
  {
    title: '스킬 시뮬레이터',
    description: '메이플랜드의 스킬을 미리 찍어볼 수 있습니다.',
    href: '/skill/',
  },
  {
    title: '템세팅 시뮬레이터',
    description: '장비를 미리 착용해보고 스탯을 확인할 수 있습니다.',
    href: '/item/',
  },
];
