import skillIcon from '../assets/skill-simulator.png';
import itemIcon from '../assets/item-simulator.png';
import coinIcon from '../assets/coin-calculator.png';

export interface Tool {
  title: string;
  description: string;
  href: string;
  icon: string;
}

export const tools: Tool[] = [
  {
    title: '스킬 시뮬레이터',
    description: '메이플랜드의 스킬을 미리 찍어볼 수 있습니다.',
    href: 'https://skill.mapleland.st',
    icon: skillIcon,
  },
  {
    title: '템세팅 시뮬레이터 2.0',
    description: '장비를 미리 착용해보고 스탯을 확인할 수 있습니다.',
    href: 'https://item.mapleland.st',
    icon: itemIcon,
  },
  {
    title: '월드코인 환전 계산기',
    description: '월드코인 환전 시세를 계산할 수 있습니다.',
    href: 'https://coin.mapleland.st',
    icon: coinIcon,
  },
];
