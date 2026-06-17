import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { getWordById } from '../data/words';
import { audioManager } from '../utils/audio';
import './WrongWords.css';

const WrongWords: React.FC = () => {
  const { setCurrentView, progress, removeFromWrongWords, setGameState } = useGame();
  const [practiceMode, setPracticeMode] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);

  const wrongWords = progress.wrongWords
    .map(id => getWordById(id))
    .filter(Boolean);

  const playWord = (word: string) => {
    audioManager.speak(word, 0.8);
  };

  const startPractice = () => {
    if (wrongWords.length === 0) return;
    setPracticeMode(true);
    setCurrentIndex(0);
    setShowAnswer(false);
  };

  const nextWord = () => {
    if (currentIndex < wrongWords.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setShowAnswer(false);
    } else {
      setPracticeMode(false);
    }
  };

  const markAsKnown = (wordId: string) => {
    removeFromWrongWords(wordId);
  };

  const currentWord = wrongWords[currentIndex];

  if (practiceMode && currentWord) {
    return (
      <div className="wrong-practice-container">
        <div className="practice-header">
          <button className="back-btn" onClick={() => setPracticeMode(false)}>
            ← 退出练习
          </button>
          <span className="progress-text">
            {currentIndex + 1} / {wrongWords.length}
          </span>
        </div>

        <div className="practice-card animate-fadeIn">
          <div className="practice-word-section">
            <h2 className="practice-word">{currentWord.word}</h2>
            <button className="play-audio-btn" onClick={() => playWord(currentWord.word)}>
              🔊 听发音
            </button>
          </div>

          {!showAnswer ? (
            <button 
              className="show-answer-btn"
              onClick={() => {
                setShowAnswer(true);
                playWord(currentWord.word);
              }}
            >
              显示答案
            </button>
          ) : (
            <div className="answer-section animate-fadeIn">
              <p className="answer-phonetic">{currentWord.phonetic}</p>
              <p className="answer-translation">{currentWord.translation}</p>
              
              <div className="answer-syllables">
                {currentWord.syllables.map((syl, i) => (
                  <span
                    key={i}
                    className={`syllable-item ${i === currentWord.stressIndex ? 'stress' : ''}`}
                  >
                    {syl}
                  </span>
                ))}
              </div>

              <div className="practice-actions">
                <button 
                  className="btn btn-secondary"
                  onClick={() => markAsKnown(currentWord.id)}
                >
                  ✅ 记住了
                </button>
                <button 
                  className="btn btn-primary"
                  onClick={nextWord}
                >
                  {currentIndex < wrongWords.length - 1 ? '下一个 →' : '完成 ✓'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="wrong-words-container">
      <div className="wrong-header">
        <button className="back-btn" onClick={() => setCurrentView('home')}>
          ← 返回
        </button>
        <h2>📝 错词本</h2>
        <div style={{ width: 80 }} />
      </div>

      {wrongWords.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🎉</div>
          <p>太棒了！没有错词</p>
          <p className="empty-hint">继续保持，加油！</p>
        </div>
      ) : (
        <>
          <button className="practice-btn" onClick={startPractice}>
            🎯 开始复习 ({wrongWords.length} 个单词)
          </button>

          <div className="wrong-list">
            {wrongWords.map((word, index) => word && (
              <div key={word.id} className="wrong-item">
                <div className="item-number">{index + 1}</div>
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
                    onClick={() => removeFromWrongWords(word.id)}
                    title="标记为已掌握"
                  >
                    ✅
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="wrong-footer">
        共 {wrongWords.length} 个待复习单词
      </div>
    </div>
  );
};

export default WrongWords;
