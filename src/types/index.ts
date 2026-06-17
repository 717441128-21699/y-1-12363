export interface Word {
  id: string;
  word: string;
  phonetic: string;
  translation: string;
  syllables: string[];
  stressIndex: number;
  category: string;
  difficulty: number;
}

export interface Level {
  id: number;
  name: string;
  theme: string;
  wordIds: string[];
  bpm: number;
  speed: number;
  starThreshold: number[];
  unlocked: boolean;
}

export interface GameState {
  currentLevel: number | null;
  currentWordIndex: number;
  score: number;
  combo: number;
  maxCombo: number;
  stars: number;
  isPlaying: boolean;
  isRecording: boolean;
  speedMultiplier: number;
  mistakes: string[];
}

export interface PhraseRecord {
  date: string;
  phraseId: string;
  phrase: string;
  translation: string;
  accuracy: number;
  score: number;
  sessionId: string;
  failReasons: string[];
  mastered: boolean;
}

export interface UserProgress {
  totalPlayTime: number;
  lastPlayDate: string;
  levelStars: Record<number, number>;
  favoriteWords: string[];
  wrongWords: string[];
  dailyTasks: DailyTask[];
  scoreHistory: ScoreRecord[];
  streakDays: number;
  phraseHistory: PhraseRecord[];
  phraseReview: string[];
}

export interface DailyTask {
  id: string;
  title: string;
  description: string;
  target: number;
  current: number;
  reward: number;
  completed: boolean;
  claimed: boolean;
}

export interface ScoreRecord {
  date: string;
  levelId: number;
  score: number;
  accuracy: number;
  type: 'word' | 'phrase';
}

export interface ChildProfile {
  id: string;
  name: string;
  avatar: string;
  createdAt: string;
  weeklyGoal: WeeklyGoal;
}

export interface WeeklyGoal {
  wordTarget: number;
  phraseTarget: number;
  weekStart: string;
  wordDone: number;
  phraseDone: number;
  countedSessions: string[];
}

export interface Item {
  id: string;
  name: string;
  icon: string;
  description: string;
  count: number;
}

export type BeatResult = 'perfect' | 'good' | 'miss';

export interface HitNote {
  syllable: string;
  time: number;
  result: BeatResult | null;
  isStress: boolean;
}
