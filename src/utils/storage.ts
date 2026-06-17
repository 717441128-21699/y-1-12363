import { UserProgress, DailyTask, ScoreRecord, Item, PhraseRecord, ChildProfile } from '../types';

const PROFILES_KEY = 'english_rhythm_profiles';
const ACTIVE_PROFILE_KEY = 'english_rhythm_active_profile';

const defaultDailyTasks: DailyTask[] = [
  {
    id: 'task1',
    title: '每日开口',
    description: '完成1次跟读练习',
    target: 1,
    current: 0,
    reward: 50,
    completed: false,
    claimed: false
  },
  {
    id: 'task2',
    title: '连击达人',
    description: '达到10次连击',
    target: 10,
    current: 0,
    reward: 100,
    completed: false,
    claimed: false
  },
  {
    id: 'task3',
    title: '三星挑战',
    description: '获得1个三星评价',
    target: 1,
    current: 0,
    reward: 200,
    completed: false,
    claimed: false
  },
  {
    id: 'task4',
    title: '词汇收藏家',
    description: '收藏5个单词',
    target: 5,
    current: 0,
    reward: 80,
    completed: false,
    claimed: false
  }
];

const defaultItems: Item[] = [
  { id: 'item1', name: '护盾', icon: '🛡️', description: '抵消一次失误', count: 3 },
  { id: 'item2', name: '双倍分', icon: '✨', description: '10秒内得分翻倍', count: 2 },
  { id: 'item3', name: '慢动作', icon: '🐢', description: '减慢速度5秒', count: 2 }
];

const avatars = ['👦', '👧', '🧒', '👶', '🧒🏻', '👦🏽', '👧🏾'];

const getDefaultProgress = (): UserProgress => ({
  totalPlayTime: 0,
  lastPlayDate: '',
  levelStars: { 1: 0 },
  favoriteWords: [],
  wrongWords: [],
  dailyTasks: defaultDailyTasks.map(t => ({ ...t })),
  scoreHistory: [],
  streakDays: 0,
  phraseHistory: [],
  phraseReview: []
});

export const loadProfiles = (): ChildProfile[] => {
  try {
    const saved = localStorage.getItem(PROFILES_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error('Failed to load profiles:', e);
  }
  return [];
};

export const saveProfiles = (profiles: ChildProfile[]): void => {
  try {
    localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
  } catch (e) {
    console.error('Failed to save profiles:', e);
  }
};

export const getActiveProfileId = (): string | null => {
  try {
    return localStorage.getItem(ACTIVE_PROFILE_KEY);
  } catch {
    return null;
  }
};

export const setActiveProfileId = (id: string): void => {
  try {
    localStorage.setItem(ACTIVE_PROFILE_KEY, id);
  } catch (e) {
    console.error('Failed to set active profile:', e);
  }
};

export const createProfile = (name: string): ChildProfile => {
  const profiles = loadProfiles();
  const avatar = avatars[profiles.length % avatars.length];
  const profile: ChildProfile = {
    id: 'child_' + Date.now(),
    name,
    avatar,
    createdAt: new Date().toISOString().split('T')[0]
  };
  profiles.push(profile);
  saveProfiles(profiles);
  return profile;
};

export const deleteProfile = (id: string): void => {
  const profiles = loadProfiles();
  saveProfiles(profiles.filter(p => p.id !== id));
  try {
    localStorage.removeItem('erp_' + id);
  } catch {}
};

const getStorageKey = (profileId: string | null): string => {
  if (profileId) return 'erp_' + profileId;
  return 'english_rhythm_game_progress';
};

export const loadProgress = (profileId: string | null = null): UserProgress => {
  const key = getStorageKey(profileId);
  try {
    const saved = localStorage.getItem(key);
    if (saved) {
      const progress = JSON.parse(saved) as UserProgress;
      const today = new Date().toDateString();
      
      if (progress.lastPlayDate !== today) {
        progress.dailyTasks = defaultDailyTasks.map(t => ({ ...t }));
        
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        if (progress.lastPlayDate === yesterday.toDateString()) {
          progress.streakDays = (progress.streakDays || 0) + 1;
        } else if (progress.lastPlayDate !== today) {
          progress.streakDays = 1;
        }
      }

      progress.dailyTasks = progress.dailyTasks.map(task => ({
        ...task,
        claimed: task.claimed || false
      }));

      progress.phraseHistory = progress.phraseHistory || [];
      progress.phraseReview = progress.phraseReview || [];
      progress.scoreHistory = (progress.scoreHistory || []).map(r => ({
        ...r,
        type: r.type || 'word'
      }));
      
      return progress;
    }
  } catch (e) {
    console.error('Failed to load progress:', e);
  }
  return getDefaultProgress();
};

export const saveProgress = (progress: UserProgress, profileId: string | null = null): void => {
  const key = getStorageKey(profileId);
  try {
    localStorage.setItem(key, JSON.stringify(progress));
  } catch (e) {
    console.error('Failed to save progress:', e);
  }
};

export const updatePlayTime = (progress: UserProgress, seconds: number, profileId: string | null = null): UserProgress => {
  const updated = {
    ...progress,
    totalPlayTime: progress.totalPlayTime + seconds,
    lastPlayDate: new Date().toDateString()
  };
  saveProgress(updated, profileId);
  return updated;
};

export const updateLevelStars = (
  progress: UserProgress,
  levelId: number,
  stars: number,
  profileId: string | null = null
): UserProgress => {
  const currentStars = progress.levelStars[levelId] || 0;
  if (stars <= currentStars) return progress;
  
  const updated = {
    ...progress,
    levelStars: {
      ...progress.levelStars,
      [levelId]: stars
    }
  };
  
  const nextLevel = levelId + 1;
  if (stars >= 1 && !updated.levelStars[nextLevel]) {
    updated.levelStars[nextLevel] = 0;
  }
  
  saveProgress(updated, profileId);
  return updated;
};

export const addFavoriteWord = (progress: UserProgress, wordId: string, profileId: string | null = null): UserProgress => {
  if (progress.favoriteWords.includes(wordId)) return progress;
  const updated = {
    ...progress,
    favoriteWords: [...progress.favoriteWords, wordId]
  };
  saveProgress(updated, profileId);
  return updated;
};

export const removeFavoriteWord = (progress: UserProgress, wordId: string, profileId: string | null = null): UserProgress => {
  const updated = {
    ...progress,
    favoriteWords: progress.favoriteWords.filter(id => id !== wordId)
  };
  saveProgress(updated, profileId);
  return updated;
};

export const addWrongWord = (progress: UserProgress, wordId: string, profileId: string | null = null): UserProgress => {
  if (progress.wrongWords.includes(wordId)) return progress;
  const updated = {
    ...progress,
    wrongWords: [...progress.wrongWords, wordId]
  };
  saveProgress(updated, profileId);
  return updated;
};

export const removeWrongWord = (progress: UserProgress, wordId: string, profileId: string | null = null): UserProgress => {
  const updated = {
    ...progress,
    wrongWords: progress.wrongWords.filter(id => id !== wordId)
  };
  saveProgress(updated, profileId);
  return updated;
};

export const addScoreRecord = (
  progress: UserProgress,
  levelId: number,
  score: number,
  accuracy: number,
  type: 'word' | 'phrase' = 'word',
  profileId: string | null = null
): UserProgress => {
  const record: ScoreRecord = {
    date: new Date().toISOString().split('T')[0],
    levelId,
    score,
    accuracy,
    type
  };
  
  const updated = {
    ...progress,
    scoreHistory: [...progress.scoreHistory, record]
  };
  saveProgress(updated, profileId);
  return updated;
};

export const addPhraseRecord = (
  progress: UserProgress,
  phraseId: string,
  phrase: string,
  translation: string,
  accuracy: number,
  score: number,
  profileId: string | null = null
): UserProgress => {
  const record: PhraseRecord = {
    date: new Date().toISOString().split('T')[0],
    phraseId,
    phrase,
    translation,
    accuracy,
    score
  };

  let updated = {
    ...progress,
    phraseHistory: [...(progress.phraseHistory || []), record]
  };

  if (accuracy < 60) {
    if (!updated.phraseReview.includes(phraseId)) {
      updated.phraseReview = [...updated.phraseReview, phraseId];
    }
  } else {
    updated.phraseReview = updated.phraseReview.filter(id => id !== phraseId);
  }

  saveProgress(updated, profileId);
  return updated;
};

export const removeFromPhraseReview = (
  progress: UserProgress,
  phraseId: string,
  profileId: string | null = null
): UserProgress => {
  const updated = {
    ...progress,
    phraseReview: progress.phraseReview.filter(id => id !== phraseId)
  };
  saveProgress(updated, profileId);
  return updated;
};

export const updateDailyTask = (
  progress: UserProgress,
  taskId: string,
  increment: number,
  profileId: string | null = null
): UserProgress => {
  const updatedTasks = progress.dailyTasks.map(task => {
    if (task.id !== taskId || task.completed) return task;
    const newCurrent = Math.min(task.current + increment, task.target);
    return {
      ...task,
      current: newCurrent,
      completed: newCurrent >= task.target
    };
  });
  
  const updated = { ...progress, dailyTasks: updatedTasks };
  saveProgress(updated, profileId);
  return updated;
};

export const claimDailyTask = (
  progress: UserProgress,
  taskId: string,
  profileId: string | null = null
): UserProgress => {
  const updatedTasks = progress.dailyTasks.map(task => {
    if (task.id !== taskId || task.claimed) return task;
    return {
      ...task,
      claimed: true
    };
  });
  
  const updated = { ...progress, dailyTasks: updatedTasks };
  saveProgress(updated, profileId);
  return updated;
};

export { defaultItems };
