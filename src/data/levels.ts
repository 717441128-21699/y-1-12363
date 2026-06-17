import { Level } from '../types';

export const levels: Level[] = [
  {
    id: 1,
    name: '第一关：水果乐园',
    theme: 'fruits',
    wordIds: ['w001', 'w004', 'w002', 'w003'],
    bpm: 80,
    speed: 1,
    starThreshold: [60, 80, 95],
    unlocked: true
  },
  {
    id: 2,
    name: '第二关：动物世界',
    theme: 'animals',
    wordIds: ['w007', 'w008', 'w009', 'w010', 'w012'],
    bpm: 90,
    speed: 1,
    starThreshold: [60, 80, 95],
    unlocked: false
  },
  {
    id: 3,
    name: '第三关：彩虹颜色',
    theme: 'colors',
    wordIds: ['w013', 'w014', 'w015', 'w016', 'w017', 'w018'],
    bpm: 100,
    speed: 1,
    starThreshold: [60, 80, 95],
    unlocked: false
  },
  {
    id: 4,
    name: '第四关：数字王国',
    theme: 'numbers',
    wordIds: ['w019', 'w020', 'w021', 'w022', 'w023', 'w024'],
    bpm: 100,
    speed: 1.1,
    starThreshold: [60, 80, 95],
    unlocked: false
  },
  {
    id: 5,
    name: '第五关：问候小达人',
    theme: 'greetings',
    wordIds: ['w026', 'w025', 'w027', 'w028'],
    bpm: 110,
    speed: 1.1,
    starThreshold: [60, 80, 95],
    unlocked: false
  },
  {
    id: 6,
    name: '第六关：校园生活',
    theme: 'school',
    wordIds: ['w029', 'w031', 'w032', 'w030'],
    bpm: 110,
    speed: 1.2,
    starThreshold: [60, 80, 95],
    unlocked: false
  },
  {
    id: 7,
    name: '第七关：心情表达',
    theme: 'feelings',
    wordIds: ['w033', 'w034', 'w036', 'w035'],
    bpm: 120,
    speed: 1.2,
    starThreshold: [60, 80, 95],
    unlocked: false
  },
  {
    id: 8,
    name: '第八关：水果进阶',
    theme: 'fruits',
    wordIds: ['w005', 'w006', 'w001', 'w002', 'w003'],
    bpm: 120,
    speed: 1.3,
    starThreshold: [60, 80, 95],
    unlocked: false
  },
  {
    id: 9,
    name: '第九关：动物乐园',
    theme: 'animals',
    wordIds: ['w011', 'w009', 'w010', 'w007', 'w008', 'w012'],
    bpm: 130,
    speed: 1.3,
    starThreshold: [60, 80, 95],
    unlocked: false
  },
  {
    id: 10,
    name: '第十关：终极挑战',
    theme: 'mixed',
    wordIds: ['w001', 'w007', 'w015', 'w024', 'w026', 'w030', 'w033', 'w035'],
    bpm: 140,
    speed: 1.5,
    starThreshold: [60, 80, 95],
    unlocked: false
  }
];

export const getLevelById = (id: number): Level | undefined => {
  return levels.find(l => l.id === id);
};

export const getLevelsByTheme = (theme: string): Level[] => {
  return levels.filter(l => l.theme === theme);
};
