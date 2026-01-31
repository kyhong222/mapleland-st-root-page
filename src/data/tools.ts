export interface Tool {
  title: string;
  description: string;
  href: string;
}

export const tools: Tool[] = [
  {
    title: '스킬 시뮬레이터',
    description: '스킬 트리를 미리 계획하고 시뮬레이션',
    href: '/skill/',
  },
  {
    title: '세팅 시뮬레이터',
    description: '캐릭터 장비/스탯 세팅 시뮬레이션',
    href: '/mapleland-setting/',
  },
];
