import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { words, categories, getWordsByCategory } from '../data/words';
import { audioManager } from '../utils/audio';
import './WordLibrary.css';

const WordLibrary: React.FC = () => {
  const { setCurrentView, addToFavorites, removeFromFavorites, progress } = useGame();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const getFilteredWords = () => {
    let filtered = selectedCategory === 'all' ? words : getWordsByCategory(selectedCategory);
    
    if (searchTerm) {
      filtered = filtered.filter(
        w => w.word.toLowerCase().includes(searchTerm.toLowerCase()) ||
             w.translation.includes(searchTerm)
      );
    }
    
    return filtered;
  };

  const playWord = (word: string) => {
    audioManager.speak(word, 0.8);
  };

  const toggleFavorite = (wordId: string) => {
    if (progress.favoriteWords.includes(wordId)) {
      removeFromFavorites(wordId);
    } else {
      addToFavorites(wordId);
    }
  };

  const filteredWords = getFilteredWords();

  return (
    <div className="word-library-container">
      <div className="library-header">
        <button className="back-btn" onClick={() => setCurrentView('home')}>
          ← 返回
        </button>
        <h2>📚 单词库</h2>
        <div style={{ width: 80 }} />
      </div>

      <div className="search-bar">
        <input
          type="text"
          placeholder="搜索单词..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
      </div>

      <div className="category-tabs">
        <button
          className={`category-tab ${selectedCategory === 'all' ? 'active' : ''}`}
          onClick={() => setSelectedCategory('all')}
        >
          🌟 全部
        </button>
        {categories.map(cat => (
          <button
            key={cat.id}
            className={`category-tab ${selectedCategory === cat.id ? 'active' : ''}`}
            onClick={() => setSelectedCategory(cat.id)}
          >
            {cat.icon} {cat.name}
          </button>
        ))}
      </div>

      <div className="words-grid">
        {filteredWords.map(word => (
          <div key={word.id} className="word-card">
            <div className="word-card-header">
              <span className="word-difficulty">
                {'⭐'.repeat(word.difficulty)}
              </span>
              <button
                className="favorite-btn"
                onClick={() => toggleFavorite(word.id)}
              >
                {progress.favoriteWords.includes(word.id) ? '❤️' : '🤍'}
              </button>
            </div>
            
            <h3 className="word-card-word">{word.word}</h3>
            <p className="word-card-phonetic">{word.phonetic}</p>
            <p className="word-card-translation">{word.translation}</p>

            <div className="syllables-display">
              {word.syllables.map((syl, i) => (
                <span
                  key={i}
                  className={`syllable-tag ${i === word.stressIndex ? 'stress' : ''}`}
                >
                  {syl}
                </span>
              ))}
            </div>

            <div className="word-card-actions">
              <button
                className="play-btn"
                onClick={() => playWord(word.word)}
              >
                🔊 播放
              </button>
              <button
                className="play-btn slow"
                onClick={() => audioManager.speak(word.word, 0.5)}
              >
                🐢 慢速
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="library-footer">
        共 {filteredWords.length} 个单词
      </div>
    </div>
  );
};

export default WordLibrary;
