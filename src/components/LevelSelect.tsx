import React from 'react';
import { useGame } from '../context/GameContext';
import { levels } from '../data/levels';
import { categories } from '../data/words';
import './LevelSelect.css';

const LevelSelect: React.FC = () => {
  const { setCurrentView, progress, setGameState } = useGame();

  const getThemeIcon = (theme: string): string => {
    const cat = categories.find(c => c.id === theme);
    return cat?.icon || '🎯';
  };

  const isLevelUnlocked = (levelId: number): boolean => {
    return progress.levelStars[levelId] !== undefined;
  };

  const getLevelStars = (levelId: number): number => {
    return progress.levelStars[levelId] || 0;
  };

  const handleLevelClick = (levelId: number) => {
    if (!isLevelUnlocked(levelId)) return;
    
    setGameState(prev => ({
      ...prev,
      currentLevel: levelId,
      currentWordIndex: 0,
      score: 0,
      combo: 0,
      maxCombo: 0,
      stars: 0,
      isPlaying: false,
      isRecording: false,
      mistakes: []
    }));
    setCurrentView('game');
  };

  const renderStars = (count: number) => {
    return (
      <div className="stars-display">
        {[1, 2, 3].map(i => (
          <span key={i} className={`star ${i <= count ? 'filled' : ''}`}>★</span>
        ))}
      </div>
    );
  };

  return (
    <div className="level-select-container">
      <div className="level-header">
        <button className="back-btn" onClick={() => setCurrentView('home')}>
          ← 返回
        </button>
        <h2>🎯 选择关卡</h2>
        <div style={{ width: 80 }} />
      </div>

      <div className="levels-grid">
        {levels.map(level => {
          const unlocked = isLevelUnlocked(level.id);
          const stars = getLevelStars(level.id);
          
          return (
            <div
              key={level.id}
              className={`level-card ${unlocked ? 'unlocked' : 'locked'} ${stars === 3 ? 'perfect' : ''}`}
              onClick={() => handleLevelClick(level.id)}
            >
              <div className="level-number">{level.id}</div>
              <div className="level-icon">{getThemeIcon(level.theme)}</div>
              <div className="level-name">{level.name}</div>
              <div className="level-info">
                <span>BPM: {level.bpm}</span>
                <span>单词: {level.wordIds.length}</span>
              </div>
              {unlocked ? (
                renderStars(stars)
              ) : (
                <div className="locked-badge">🔒 未解锁</div>
              )}
              {stars === 3 && (
                <div className="crown">👑</div>
              )}
            </div>
          );
        })}
      </div>

      <div className="level-tips">
        💡 提示：获得 1 颗星即可解锁下一关
      </div>
    </div>
  );
};

export default LevelSelect;
