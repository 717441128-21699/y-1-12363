import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { UserProgress, Item, GameState, HitNote, ChildProfile, WeeklyGoal } from '../types';
import { loadProgress, saveProgress, updatePlayTime, updateLevelStars, addFavoriteWord, removeFavoriteWord, addWrongWord, removeWrongWord, addScoreRecord, addPhraseRecord, removeFromPhraseReview, updateDailyTask, claimDailyTask, defaultItems, loadProfiles, saveProfiles, getActiveProfileId, setActiveProfileId, createProfile, deleteProfile, updateWeeklyGoal, incrementWeeklyGoal, getProfileGoal, getAllProfileProgress } from '../utils/storage';
import { audioManager } from '../utils/audio';

interface GameContextType {
  progress: UserProgress;
  gameState: GameState;
  items: Item[];
  currentView: string;
  setCurrentView: (view: string) => void;
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
  addToFavorites: (wordId: string) => void;
  removeFromFavorites: (wordId: string) => void;
  addToWrongWords: (wordId: string) => void;
  removeFromWrongWords: (wordId: string) => void;
  completeLevel: (levelId: number, stars: number, score: number, accuracy: number, sessionId: string) => void;
  completePhrase: (phraseId: string, phrase: string, translation: string, accuracy: number, score: number, sessionId: string, failReasons: string[]) => void;
  removePhraseFromReview: (phraseId: string) => void;
  updateTask: (taskId: string, increment: number) => void;
  claimTask: (taskId: string) => void;
  useItem: (itemId: string) => boolean;
  addItem: (itemId: string, count: number) => void;
  setSpeedMultiplier: (speed: number) => void;
  hitNotes: HitNote[];
  setHitNotes: React.Dispatch<React.SetStateAction<HitNote[]>>;
  allLevelNotes: HitNote[];
  addAllLevelNotes: (notes: HitNote[]) => void;
  resetAllLevelNotes: () => void;
  profiles: ChildProfile[];
  activeProfile: ChildProfile | null;
  switchProfile: (id: string) => void;
  addProfile: (name: string) => ChildProfile;
  removeProfile: (id: string) => void;
  weeklyGoal: WeeklyGoal | null;
  setWeeklyGoal: (goal: Partial<WeeklyGoal>) => void;
  allProfileData: () => { profileId: string; name: string; avatar: string; goal: WeeklyGoal; progress: UserProgress }[];
}

const GameContext = createContext<GameContextType | null>(null);

export const useGame = (): GameContextType => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};

const initialGameState: GameState = {
  currentLevel: null,
  currentWordIndex: 0,
  score: 0,
  combo: 0,
  maxCombo: 0,
  stars: 0,
  isPlaying: false,
  isRecording: false,
  speedMultiplier: 1,
  mistakes: []
};

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profiles, setProfiles] = useState<ChildProfile[]>(() => loadProfiles());
  const [activeProfileId, setActiveProfileIdState] = useState<string | null>(() => getActiveProfileId());
  const [progress, setProgress] = useState<UserProgress>(() => loadProgress(getActiveProfileId()));
  const [gameState, setGameState] = useState<GameState>(initialGameState);
  const [items, setItems] = useState<Item[]>(defaultItems.map(i => ({ ...i })));
  const [currentView, setCurrentView] = useState<string>('home');
  const [hitNotes, setHitNotes] = useState<HitNote[]>([]);
  const [allLevelNotes, setAllLevelNotes] = useState<HitNote[]>([]);
  const [weeklyGoal, setWeeklyGoalState] = useState<WeeklyGoal | null>(() => getProfileGoal(getActiveProfileId()));
  const playTimeRef = useRef<number>(0);
  const timerRef = useRef<number | null>(null);

  const activeProfile = profiles.find(p => p.id === activeProfileId) || null;

  const refreshWeeklyGoal = useCallback(() => {
    setWeeklyGoalState(getProfileGoal(activeProfileId));
  }, [activeProfileId]);

  useEffect(() => {
    audioManager.init();
  }, []);

  useEffect(() => {
    if (gameState.isPlaying) {
      timerRef.current = window.setInterval(() => {
        playTimeRef.current += 1;
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        if (playTimeRef.current > 0) {
          const updated = updatePlayTime(progress, playTimeRef.current, activeProfileId);
          setProgress(updated);
          playTimeRef.current = 0;
        }
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [gameState.isPlaying, progress, activeProfileId]);

  const addToFavorites = useCallback((wordId: string) => {
    setProgress(prev => addFavoriteWord(prev, wordId, activeProfileId));
  }, [activeProfileId]);

  const removeFromFavorites = useCallback((wordId: string) => {
    setProgress(prev => removeFavoriteWord(prev, wordId, activeProfileId));
  }, [activeProfileId]);

  const addToWrongWords = useCallback((wordId: string) => {
    setProgress(prev => addWrongWord(prev, wordId, activeProfileId));
  }, [activeProfileId]);

  const removeFromWrongWords = useCallback((wordId: string) => {
    setProgress(prev => removeWrongWord(prev, wordId, activeProfileId));
  }, [activeProfileId]);

  const completeLevel = useCallback((levelId: number, stars: number, score: number, accuracy: number, sessionId: string) => {
    setProgress(prev => {
      let updated = updateLevelStars(prev, levelId, stars, activeProfileId);
      updated = addScoreRecord(updated, levelId, score, accuracy, 'word', activeProfileId);
      return updated;
    });
    const newGoal = incrementWeeklyGoal(activeProfileId, 'word', sessionId);
    if (newGoal) setWeeklyGoalState(newGoal);
  }, [activeProfileId]);

  const completePhrase = useCallback((phraseId: string, phrase: string, translation: string, accuracy: number, score: number, sessionId: string, failReasons: string[]) => {
    setProgress(prev => {
      let updated = addPhraseRecord(prev, phraseId, phrase, translation, accuracy, score, activeProfileId, sessionId, failReasons);
      updated = addScoreRecord(updated, 0, score, accuracy, 'phrase', activeProfileId);
      return updated;
    });
    const newGoal = incrementWeeklyGoal(activeProfileId, 'phrase', sessionId);
    if (newGoal) setWeeklyGoalState(newGoal);
  }, [activeProfileId]);

  const removePhraseFromReview = useCallback((phraseId: string) => {
    setProgress(prev => removeFromPhraseReview(prev, phraseId, activeProfileId));
  }, [activeProfileId]);

  const updateTask = useCallback((taskId: string, increment: number) => {
    setProgress(prev => updateDailyTask(prev, taskId, increment, activeProfileId));
  }, [activeProfileId]);

  const claimTask = useCallback((taskId: string) => {
    setProgress(prev => claimDailyTask(prev, taskId, activeProfileId));
  }, [activeProfileId]);

  const useItem = useCallback((itemId: string): boolean => {
    let success = false;
    setItems(prev => prev.map(item => {
      if (item.id === itemId && item.count > 0) {
        success = true;
        return { ...item, count: item.count - 1 };
      }
      return item;
    }));
    return success;
  }, []);

  const addItem = useCallback((itemId: string, count: number) => {
    setItems(prev => prev.map(item => {
      if (item.id === itemId) {
        return { ...item, count: item.count + count };
      }
      return item;
    }));
  }, []);

  const setSpeedMultiplier = useCallback((speed: number) => {
    setGameState(prev => ({ ...prev, speedMultiplier: speed }));
  }, []);

  const addAllLevelNotes = useCallback((newNotes: HitNote[]) => {
    setAllLevelNotes(prev => [...prev, ...newNotes]);
  }, []);

  const resetAllLevelNotes = useCallback(() => {
    setAllLevelNotes([]);
  }, []);

  const switchProfile = useCallback((id: string) => {
    setActiveProfileId(id);
    setActiveProfileIdState(id);
    const newProgress = loadProgress(id);
    setProgress(newProgress);
    setGameState(initialGameState);
    setItems(defaultItems.map(i => ({ ...i })));
    setWeeklyGoalState(getProfileGoal(id));
    setCurrentView('home');
  }, []);

  const addProfile = useCallback((name: string): ChildProfile => {
    const profile = createProfile(name);
    setProfiles(loadProfiles());
    return profile;
  }, []);

  const removeProfileFn = useCallback((id: string) => {
    deleteProfile(id);
    setProfiles(loadProfiles());
    if (id === activeProfileId) {
      const remaining = loadProfiles();
      if (remaining.length > 0) {
        switchProfile(remaining[0].id);
      } else {
        setActiveProfileId('');
        setActiveProfileIdState(null);
        setProgress(loadProgress(null));
      }
    }
  }, [activeProfileId, switchProfile]);

  const setWeeklyGoalFn = useCallback((goal: Partial<WeeklyGoal>) => {
    updateWeeklyGoal(activeProfileId, goal);
    setWeeklyGoalState(getProfileGoal(activeProfileId));
  }, [activeProfileId]);

  const allProfileData = useCallback(() => {
    return getAllProfileProgress();
  }, []);

  return (
    <GameContext.Provider
      value={{
        progress,
        gameState,
        items,
        currentView,
        setCurrentView,
        setGameState,
        addToFavorites,
        removeFromFavorites,
        addToWrongWords,
        removeFromWrongWords,
        completeLevel,
        completePhrase,
        removePhraseFromReview,
        updateTask,
        claimTask,
        useItem,
        addItem,
        setSpeedMultiplier,
        hitNotes,
        setHitNotes,
        allLevelNotes,
        addAllLevelNotes,
        resetAllLevelNotes,
        profiles,
        activeProfile,
        switchProfile,
        addProfile,
        removeProfile: removeProfileFn,
        weeklyGoal,
        setWeeklyGoal: setWeeklyGoalFn,
        allProfileData
      }}
    >
      {children}
    </GameContext.Provider>
  );
};
