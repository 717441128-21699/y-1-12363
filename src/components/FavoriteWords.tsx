import React from 'react';
import { useGame } from '../context/GameContext';
import { getWordById } from '../data/words';
import { audioManager } from '../utils/audio';
import './FavoriteWords.css';

const FavoriteWords: React.FC = () => {
  const { setCurrentView, progress, removeFromFavorites } = useGame();

  const favoriteWords = progress.favoriteWords
    .map(id => getWordById(id))
    .filter(Boolean);

  const playWord = (word: string) => {
    audioManager.speak(word, 0.8);
  };

  return (
    <div className="favorites-container">
      <div className="favorites-header">
        <button className="back-btn" onClick={() => setCurrentView('home')}>
          ← 返回
        </button>
        <h2>❤️ 我的收藏</h2>
        <div style={{ width: 80 }} />
      </div>

      {favoriteWords.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <p>还没有收藏的单词</p>
          <p className="empty-hint">在单词学习中点击❤️收藏喜欢的单词吧！</p>
        </div>
      ) : (
        <div className="favorites-list">
          {favoriteWords.map(word => word && (
            <div key={word.id} className="favorite-item">
              <div className="word-info">
                <h3>{word.word}</h3>
                <span className="phonetic">{word.phonetic}</span>
                <span className="translation">{word.translation}</span>
              </div>
              <div className="word-actions">
                <button className="action-btn" onClick={() => playWord(word.word)}>
                  🔊
                </button>
                <button 
                  className="action-btn remove"
                  onClick={() => removeFromFavorites(word.id)}
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="favorites-footer">
        共 {favoriteWords.length} 个收藏单词
      </div>
    </div>
  );
};

export default FavoriteWords;
