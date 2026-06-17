import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { UserProgress, Item, GameState, HitNote } from '../types';
import { loadProgress, saveProgress, updatePlayTime, updateLevelStars, addFavoriteWord, removeFavoriteWord, addWrongWord, removeWrongWord, addScoreRecord, updateDailyTask, claimDailyTask, defaultItems } from '../utils/storage';
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
  completeLevel: (levelId: number, stars: number, score: number, accuracy: number) => void;
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
  const [progress, setProgress] = useState<UserProgress>(() => loadProgress());
  const [gameState, setGameState] = useState<GameState>(initialGameState);
  const [items, setItems] = useState<Item[]>(defaultItems.map(i => ({ ...i })));
  const [currentView, setCurrentView] = useState<string>('home');
  const [hitNotes, setHitNotes] = useState<HitNote[]>([]);
  const [allLevelNotes, setAllLevelNotes] = useState<HitNote[]>([]);
  const playTimeRef = useRef<number>(0);
  const timerRef = useRef<number | null>(null);

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
          const updated = updatePlayTime(progress, playTimeRef.current);
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
  }, [gameState.isPlaying, progress]);

  const addToFavorites = useCallback((wordId: string) => {
    setProgress(prev => addFavoriteWord(prev, wordId));
  }, []);

  const removeFromFavorites = useCallback((wordId: string) => {
    setProgress(prev => removeFavoriteWord(prev, wordId));
  }, []);

  const addToWrongWords = useCallback((wordId: string) => {
    setProgress(prev => addWrongWord(prev, wordId));
  }, []);

  const removeFromWrongWords = useCallback((wordId: string) => {
    setProgress(prev => removeWrongWord(prev, wordId));
  }, []);

  const completeLevel = useCallback((levelId: number, stars: number, score: number, accuracy: number) => {
    setProgress(prev => {
      let updated = updateLevelStars(prev, levelId, stars);
      updated = addScoreRecord(updated, levelId, score, accuracy);
      return updated;
    });
  }, []);

  const updateTask = useCallback((taskId: string, increment: number) => {
    setProgress(prev => updateDailyTask(prev, taskId, increment));
  }, []);

  const claimTask = useCallback((taskId: string) => {
    setProgress(prev => claimDailyTask(prev, taskId));
  }, []);

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
        updateTask,
        claimTask,
        useItem,
        addItem,
        setSpeedMultiplier,
        hitNotes,
        setHitNotes,
        allLevelNotes,
        addAllLevelNotes,
        resetAllLevelNotes
      }}
    >
      {children}
    </GameContext.Provider>
  );
};
