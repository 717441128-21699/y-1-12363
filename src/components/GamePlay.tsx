import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useGame } from '../context/GameContext';
import { getLevelById } from '../data/levels';
import { getWordById } from '../data/words';
import { audioManager } from '../utils/audio';
import { calculateHitResult, calculateScore, calculateAccuracy, calculateStars, getResultText, getResultColor } from '../utils/scoring';
import { HitNote, BeatResult } from '../types';
import './GamePlay.css';

const GamePlay: React.FC = () => {
  const {
    gameState,
    setGameState,
    progress,
    completeLevel,
    updateTask,
    addToWrongWords,
    addToFavorites,
    items,
    useItem,
    setCurrentView,
    setHitNotes,
    hitNotes,
    allLevelNotes,
    addAllLevelNotes,
    resetAllLevelNotes
  } = useGame();

  const level = getLevelById(gameState.currentLevel || 1);
  const [gamePhase, setGamePhase] = useState<'ready' | 'playing' | 'wordComplete' | 'finished'>('ready');
  const [currentWord, setCurrentWord] = useState<ReturnType<typeof getWordById>>();
  const [notes, setNotes] = useState<HitNote[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [showResult, setShowResult] = useState<{ text: string; color: string } | null>(null);
  const [comboText, setComboText] = useState<string | null>(null);
  const [recordingBlob, setRecordingBlob] = useState<Blob | null>(null);
  const [isReplaying, setIsReplaying] = useState(false);
  const [showItems, setShowItems] = useState(false);
  const [hasShield, setHasShield] = useState(false);
  const [doubleScore, setDoubleScore] = useState(false);
  const [slowMode, setSlowMode] = useState(false);

  const animationRef = useRef<number>();
  const startTimeRef = useRef<number>(0);
  const beatTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const currentNoteIndexRef = useRef(0);
  const sessionIdRef = useRef<string>('');
  const savedRef = useRef<boolean>(false);

  useEffect(() => {
    sessionIdRef.current = 'wg_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    savedRef.current = false;
  }, [gameState.currentLevel]);

  useEffect(() => {
    if (level) {
      const word = getWordById(level.wordIds[gameState.currentWordIndex]);
      setCurrentWord(word);
    }
  }, [level, gameState.currentWordIndex]);

  const generateNotes = useCallback(() => {
    if (!currentWord || !level) return [];
    
    const beatInterval = 60 / (level.bpm * level.speed * gameState.speedMultiplier);
    const syllables = currentWord.syllables;
    const startDelay = 2;
    
    const newNotes: HitNote[] = syllables.map((syllable, index) => ({
      syllable,
      time: startDelay + index * beatInterval,
      result: null,
      isStress: index === currentWord.stressIndex
    }));
    
    return newNotes;
  }, [currentWord, level, gameState.speedMultiplier]);

  useEffect(() => {
    if (currentWord && gamePhase === 'ready') {
      const newNotes = generateNotes();
      setNotes(newNotes);
      setHitNotes(newNotes);
      currentNoteIndexRef.current = 0;
    }
  }, [currentWord, gamePhase, generateNotes, setHitNotes]);

  const startGame = useCallback(() => {
    if (!level || !currentWord) return;
    
    audioManager.resume();
    setGamePhase('playing');
    setGameState(prev => ({ ...prev, isPlaying: true }));
    startTimeRef.current = performance.now();
    currentNoteIndexRef.current = 0;
    
    updateTask('task1', 1);

    const beatInterval = (60 / (level.bpm * level.speed * gameState.speedMultiplier)) * 1000;
    const startDelay = 2000;
    
    let beatCount = 0;
    const totalBeats = currentWord.syllables.length + 2;
    
    const playBeat = () => {
      if (beatCount < totalBeats && beatCount >= 2) {
        audioManager.playBeat();
      } else if (beatCount < 2) {
        audioManager.playTone(440, 0.1);
      }
      beatCount++;
      
      if (beatCount < totalBeats + 1) {
        beatTimeoutRef.current = setTimeout(playBeat, beatInterval);
      }
    };
    
    playBeat();
  }, [level, currentWord, gameState.speedMultiplier, setGameState, updateTask]);

  useEffect(() => {
    if (gamePhase !== 'playing') return;

    const animate = () => {
      const elapsed = (performance.now() - startTimeRef.current) / 1000;
      setCurrentTime(elapsed);

      const currentNotes = notes;
      while (
        currentNoteIndexRef.current < currentNotes.length &&
        elapsed > currentNotes[currentNoteIndexRef.current].time + 0.3
      ) {
        const noteIndex = currentNoteIndexRef.current;
        if (currentNotes[noteIndex].result === null) {
          handleMiss(noteIndex);
        }
        currentNoteIndexRef.current++;
      }

      const allNotesProcessed = currentNotes.every(n => n.result !== null);
      if (allNotesProcessed && gamePhase === 'playing') {
        setTimeout(() => handleWordComplete(), 500);
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [gamePhase, notes]);

  const handleMiss = (noteIndex: number) => {
    setNotes(prev => {
      const newNotes = [...prev];
      if (newNotes[noteIndex]) {
        newNotes[noteIndex] = { ...newNotes[noteIndex], result: 'miss' };
      }
      return newNotes;
    });

    if (hasShield) {
      setHasShield(false);
      setShowResult({ text: '🛡️ 护盾抵消!', color: '#4ECDC4' });
    } else {
      setGameState(prev => ({ ...prev, combo: 0 }));
      setShowResult({ text: 'Miss!', color: getResultColor('miss') });
      audioManager.playFail();
    }

    setTimeout(() => setShowResult(null), 800);
  };

  const handleHit = useCallback(() => {
    if (gamePhase !== 'playing') return;

    const noteIndex = currentNoteIndexRef.current;
    if (noteIndex >= notes.length) return;

    const targetNote = notes[noteIndex];
    if (!targetNote || targetNote.result !== null) return;

    const hitTime = currentTime;
    const result = calculateHitResult(hitTime, targetNote.time, 0.3);

    setNotes(prev => {
      const newNotes = [...prev];
      newNotes[noteIndex] = { ...newNotes[noteIndex], result };
      return newNotes;
    });

    let scoreGain = 0;
    if (result !== 'miss') {
      const newCombo = gameState.combo + 1;
      scoreGain = calculateScore(result, newCombo, targetNote.isStress);
      
      if (doubleScore) {
        scoreGain *= 2;
      }

      setGameState(prev => ({
        ...prev,
        score: prev.score + scoreGain,
        combo: newCombo,
        maxCombo: Math.max(prev.maxCombo, newCombo)
      }));

      if (newCombo >= 10) {
        updateTask('task2', 10);
      }

      if (newCombo > 0 && newCombo % 5 === 0) {
        setComboText(`${newCombo} 连击!`);
        setTimeout(() => setComboText(null), 1000);
      }

      setShowResult({ text: getResultText(result), color: getResultColor(result) });
      
      if (result === 'perfect') {
        audioManager.playSuccess();
      } else {
        audioManager.playTone(600, 0.1);
      }
    } else {
      if (hasShield) {
        setHasShield(false);
        setShowResult({ text: '🛡️ 护盾抵消!', color: '#4ECDC4' });
      } else {
        setGameState(prev => ({ ...prev, combo: 0 }));
        setShowResult({ text: 'Miss!', color: getResultColor('miss') });
        audioManager.playFail();
      }
    }

    setTimeout(() => setShowResult(null), 800);
    currentNoteIndexRef.current++;
  }, [gamePhase, notes, currentTime, gameState.combo, hasShield, doubleScore, setGameState, updateTask]);

  const handleWordComplete = () => {
    setGamePhase('wordComplete');
    setGameState(prev => ({ ...prev, isPlaying: false }));
    
    const resolvedNotes = notes.filter(n => n.result !== null);
    addAllLevelNotes(resolvedNotes);

    const accuracy = calculateAccuracy(notes);
    
    if (accuracy < 60 && currentWord) {
      addToWrongWords(currentWord.id);
    }

    if (beatTimeoutRef.current) {
      clearTimeout(beatTimeoutRef.current);
    }
  };

  const nextWord = () => {
    if (!level) return;

    const nextIndex = gameState.currentWordIndex + 1;
    
    if (nextIndex >= level.wordIds.length) {
      finishGame();
    } else {
      setGameState(prev => ({ ...prev, currentWordIndex: nextIndex }));
      setGamePhase('ready');
      setRecordingBlob(null);
      setIsReplaying(false);
    }
  };

  const retryWord = () => {
    setGamePhase('ready');
    setRecordingBlob(null);
    setIsReplaying(false);
    setNotes(generateNotes().map(n => ({ ...n, result: null })));
    currentNoteIndexRef.current = 0;
  };

  const finishGame = () => {
    if (!level || savedRef.current) return;
    savedRef.current = true;

    const levelNotes = [...allLevelNotes];
    const accuracy = calculateAccuracy(levelNotes);
    const stars = calculateStars(accuracy, level.starThreshold);

    setGameState(prev => ({ ...prev, stars }));
    completeLevel(level.id, stars, gameState.score, accuracy, sessionIdRef.current);

    if (stars === 3) {
      updateTask('task3', 1);
    }

    setGamePhase('finished');
  };

  const handlePlayAgain = () => {
    resetAllLevelNotes();
    sessionIdRef.current = 'wg_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    savedRef.current = false;
    setGameState(prev => ({ ...prev, currentWordIndex: 0, score: 0, combo: 0, maxCombo: 0, stars: 0, mistakes: [] }));
    setGamePhase('ready');
    setRecordingBlob(null);
    setIsReplaying(false);
    setHasShield(false);
    setDoubleScore(false);
    setSlowMode(false);
  };

  const startRecording = async () => {
    if (!level || !currentWord) return;
    
    setGameState(prev => ({ ...prev, isRecording: true }));
    await audioManager.startRecording();
    
    audioManager.speak(currentWord.word, 0.8);
    
    setTimeout(() => {
      stopRecording();
    }, 3000);
  };

  const stopRecording = async () => {
    const blob = await audioManager.stopRecording();
    if (blob) {
      setRecordingBlob(blob);
    }
    setGameState(prev => ({ ...prev, isRecording: false }));
  };

  const playRecording = () => {
    if (recordingBlob) {
      setIsReplaying(true);
      audioManager.playAudioBlob(recordingBlob);
      setTimeout(() => setIsReplaying(false), 3000);
    }
  };

  const playStandard = () => {
    if (currentWord) {
      audioManager.speak(currentWord.word, 0.8);
    }
  };

  const playSlow = () => {
    if (currentWord) {
      audioManager.speak(currentWord.word, 0.5);
    }
  };

  const toggleFavorite = () => {
    if (currentWord) {
      if (progress.favoriteWords.includes(currentWord.id)) {
        // 已收藏，无需处理
      } else {
        addToFavorites(currentWord.id);
        updateTask('task4', 1);
      }
    }
  };

  const handleUseItem = (itemId: string) => {
    const success = useItem(itemId);
    if (success) {
      if (itemId === 'item1') setHasShield(true);
      if (itemId === 'item2') {
        setDoubleScore(true);
        setTimeout(() => setDoubleScore(false), 10000);
      }
      if (itemId === 'item3') {
        setSlowMode(true);
        setGameState(prev => ({ ...prev, speedMultiplier: prev.speedMultiplier * 0.6 }));
        setTimeout(() => {
          setSlowMode(false);
          setGameState(prev => ({ ...prev, speedMultiplier: prev.speedMultiplier / 0.6 }));
        }, 5000);
      }
    }
    setShowItems(false);
  };

  const backToLevels = () => {
    if (beatTimeoutRef.current) {
      clearTimeout(beatTimeoutRef.current);
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    setGameState(prev => ({ ...prev, isPlaying: false }));
    setCurrentView('levels');
  };

  const accuracy = calculateAccuracy(notes);
  const isFavorited = currentWord ? progress.favoriteWords.includes(currentWord.id) : false;

  const renderNotes = () => {
    const trackHeight = 400;
    const hitLineY = 350;
    const speed = 100;

    return notes.map((note, index) => {
      const y = hitLineY - (note.time - currentTime) * speed;
      const isActive = y > 0 && y < trackHeight;
      const isHit = note.result !== null;
      
      return (
        <div
          key={index}
          className={`note ${note.result || ''} ${note.isStress ? 'stress' : ''} ${isHit ? 'hit' : ''}`}
          style={{
            transform: `translateY(${y}px)`,
            opacity: isActive || isHit ? 1 : 0.3
          }}
        >
          <span className="note-syllable">{note.syllable}</span>
          {note.isStress && <span className="stress-mark">ˈ</span>}
        </div>
      );
    });
  };

  const renderFinishedScreen = () => {
    if (!level) return null;
    
    const levelNotes = [...allLevelNotes];
    const finalAccuracy = calculateAccuracy(levelNotes);
    
    return (
      <div className="finished-screen">
        <div className="finished-card animate-fadeIn">
          <h2>🎉 关卡完成！</h2>
          
          <div className="result-stars">
            {[1, 2, 3].map(i => (
              <span key={i} className={`big-star ${i <= gameState.stars ? 'filled animate-bounce' : ''}`} style={{ animationDelay: `${i * 0.2}s` }}>
                ★
              </span>
            ))}
          </div>

          <div className="result-stats">
            <div className="result-item">
              <div className="result-value">{gameState.score}</div>
              <div className="result-label">总分</div>
            </div>
            <div className="result-item">
              <div className="result-value">{gameState.maxCombo}</div>
              <div className="result-label">最大连击</div>
            </div>
            <div className="result-item">
              <div className="result-value">{finalAccuracy}%</div>
              <div className="result-label">准确率</div>
            </div>
          </div>

          <div className="finished-buttons">
            <button className="btn btn-secondary" onClick={handlePlayAgain}>
              🔄 再来一次
            </button>
            <button className="btn btn-primary" onClick={backToLevels}>
              🎯 返回选关
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="game-play-container">
      <div className="game-header no-print">
        <button className="back-btn" onClick={backToLevels}>
          ← 退出
        </button>
        
        <div className="game-info">
          <span className="level-name">{level?.name}</span>
          <span className="word-progress">
            {gameState.currentWordIndex + 1} / {level?.wordIds.length}
          </span>
        </div>

        <div className="game-stats">
          <span className="score-display">🏆 {gameState.score}</span>
          <span className="combo-display">🔥 {gameState.combo}</span>
        </div>
      </div>

      {gamePhase !== 'finished' && currentWord && (
        <div className="word-display">
          <h2 className="word-text">{currentWord.word}</h2>
          <p className="word-phonetic">{currentWord.phonetic}</p>
          <p className="word-translation">{currentWord.translation}</p>
          <button 
            className={`favorite-btn ${isFavorited ? 'favorited' : ''}`}
            onClick={toggleFavorite}
          >
            {isFavorited ? '❤️' : '🤍'} 收藏
          </button>
        </div>
      )}

      {gamePhase === 'playing' && (
        <div className="rhythm-track">
          <div className="track-container">
            {renderNotes()}
            <div className="hit-line">
              <div className="hit-zone" onClick={handleHit}>
                🎤
              </div>
            </div>
          </div>

          {showResult && (
            <div className="result-popup" style={{ color: showResult.color }}>
              {showResult.text}
            </div>
          )}

          {comboText && (
            <div className="combo-popup">
              {comboText}
            </div>
          )}

          {(hasShield || doubleScore || slowMode) && (
            <div className="active-buffs">
              {hasShield && <span className="buff">🛡️ 护盾</span>}
              {doubleScore && <span className="buff">✨ 双倍分</span>}
              {slowMode && <span className="buff">🐢 慢动作</span>}
            </div>
          )}
        </div>
      )}

      {gamePhase === 'ready' && currentWord && (
        <div className="ready-screen">
          <div className="ready-content animate-fadeIn">
            <div className="syllables-display">
              {currentWord.syllables.map((syl, i) => (
                <span key={i} className={`syllable-box ${i === currentWord.stressIndex ? 'stress' : ''}`}>
                  {syl}
                  {i === currentWord.stressIndex && <span className="stress-label">重音</span>}
                </span>
              ))}
            </div>

            <div className="audio-controls">
              <button className="audio-btn" onClick={playStandard}>
                🔊 听标准音
              </button>
              <button className="audio-btn" onClick={playSlow}>
                🐢 慢速朗读
              </button>
            </div>

            <p className="tip-text">
              准备好了吗？跟着节拍，每个音节对应一次点击！
            </p>

            <button className="btn btn-primary start-btn" onClick={startGame}>
              🎮 开始挑战
            </button>
          </div>
        </div>
      )}

      {gamePhase === 'wordComplete' && currentWord && (
        <div className="word-complete-screen">
          <div className="complete-card animate-fadeIn">
            <h3>单词完成！</h3>
            
            <div className="word-accuracy">
              准确率: <span style={{ color: accuracy >= 80 ? 'var(--success)' : 'var(--warning)' }}>{accuracy}%</span>
            </div>

            <div className="recording-section">
              <button 
                className={`record-btn ${gameState.isRecording ? 'recording' : ''}`}
                onClick={startRecording}
                disabled={gameState.isRecording}
              >
                {gameState.isRecording ? '🔴 录音中...' : '🎤 跟读录音'}
              </button>

              {recordingBlob && (
                <button 
                  className={`playback-btn ${isReplaying ? 'playing' : ''}`}
                  onClick={playRecording}
                >
                  {isReplaying ? '🔊 播放中...' : '▶️ 播放录音'}
                </button>
              )}
            </div>

            <div className="complete-buttons">
              {accuracy < 80 && (
                <button className="btn btn-warning" onClick={retryWord}>
                  🔄 再练一次
                </button>
              )}
              <button className="btn btn-primary" onClick={nextWord}>
                下一个 →
              </button>
            </div>
          </div>
        </div>
      )}

      {gamePhase === 'finished' && renderFinishedScreen()}

      {gamePhase === 'playing' && (
        <div className="game-controls no-print">
          <div className="items-section">
            <button className="items-btn" onClick={() => setShowItems(!showItems)}>
              🎒 道具
            </button>
            
            {showItems && (
              <div className="items-dropdown">
                {items.map(item => (
                  <button
                    key={item.id}
                    className="item-option"
                    onClick={() => handleUseItem(item.id)}
                    disabled={item.count === 0}
                  >
                    <span>{item.icon} {item.name}</span>
                    <span className="item-count">x{item.count}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="speed-control">
            <span>速度</span>
            <button 
              className="speed-btn"
              onClick={() => setGameState(prev => ({ ...prev, speedMultiplier: Math.max(0.5, prev.speedMultiplier - 0.1) }))}
            >
              -
            </button>
            <span className="speed-value">{Math.round(gameState.speedMultiplier * 100)}%</span>
            <button 
              className="speed-btn"
              onClick={() => setGameState(prev => ({ ...prev, speedMultiplier: Math.min(2, prev.speedMultiplier + 0.1) }))}
            >
              +
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GamePlay;
