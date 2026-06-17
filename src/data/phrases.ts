import { Word } from '../types';

export interface Phrase {
  id: string;
  phrase: string;
  translation: string;
  wordIds: string[];
  syllables: string[];
  stressIndices: number[];
  difficulty: number;
}

export const phrases: Phrase[] = [
  {
    id: 'p001',
    phrase: 'hello apple',
    translation: '你好，苹果',
    wordIds: ['w026', 'w001'],
    syllables: ['hel', 'lo', 'ap', 'ple'],
    stressIndices: [1, 2],
    difficulty: 1
  },
  {
    id: 'p002',
    phrase: 'red cat',
    translation: '红色的猫',
    wordIds: ['w013', 'w007'],
    syllables: ['red', 'cat'],
    stressIndices: [0],
    difficulty: 1
  },
  {
    id: 'p003',
    phrase: 'good morning',
    translation: '早上好',
    wordIds: ['w028', 'w025'],
    syllables: ['good', 'morn', 'ing'],
    stressIndices: [2],
    difficulty: 1
  },
  {
    id: 'p004',
    phrase: 'happy dog',
    translation: '快乐的狗',
    wordIds: ['w033', 'w008'],
    syllables: ['hap', 'py', 'dog'],
    stressIndices: [0],
    difficulty: 1
  },
  {
    id: 'p005',
    phrase: 'blue banana',
    translation: '蓝色的香蕉',
    wordIds: ['w014', 'w002'],
    syllables: ['blue', 'ba', 'na', 'na'],
    stressIndices: [2],
    difficulty: 2
  },
  {
    id: 'p006',
    phrase: 'thank teacher',
    translation: '谢谢老师',
    wordIds: ['w028', 'w030'],
    syllables: ['thank', 'tea', 'cher'],
    stressIndices: [1],
    difficulty: 2
  },
  {
    id: 'p007',
    phrase: 'green grape',
    translation: '绿色的葡萄',
    wordIds: ['w016', 'w004'],
    syllables: ['green', 'grape'],
    stressIndices: [0],
    difficulty: 1
  },
  {
    id: 'p008',
    phrase: 'big elephant',
    translation: '大象',
    wordIds: ['w009'],
    syllables: ['big', 'el', 'e', 'phant'],
    stressIndices: [2],
    difficulty: 2
  },
  {
    id: 'p009',
    phrase: 'sad goodbye',
    translation: '伤心的告别',
    wordIds: ['w034', 'w027'],
    syllables: ['sad', 'good', 'bye'],
    stressIndices: [2],
    difficulty: 2
  },
  {
    id: 'p010',
    phrase: 'yellow pencil',
    translation: '黄色的铅笔',
    wordIds: ['w015', 'w032'],
    syllables: ['yel', 'low', 'pen', 'cil'],
    stressIndices: [0, 2],
    difficulty: 2
  },
  {
    id: 'p011',
    phrase: 'one two three',
    translation: '一二三',
    wordIds: ['w019', 'w020', 'w021'],
    syllables: ['one', 'two', 'three'],
    stressIndices: [0],
    difficulty: 1
  },
  {
    id: 'p012',
    phrase: 'orange butterfly',
    translation: '橙色的蝴蝶',
    wordIds: ['w003', 'w011'],
    syllables: ['or', 'ange', 'but', 'ter', 'fly'],
    stressIndices: [0, 4],
    difficulty: 3
  }
];

export const getPhraseById = (id: string): Phrase | undefined => {
  return phrases.find(p => p.id === id);
};
