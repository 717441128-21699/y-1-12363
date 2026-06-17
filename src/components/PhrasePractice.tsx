import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useGame } from '../context/GameContext';
import { phrases, Phrase } from '../data/phrases';
import { getWordById } from '../data/words';
import { audioManager } from '../utils/audio';
import { calculateHitResult, calculateAccuracy, getResultText, getResultColor } from '../utils/scoring';
import { HitNote } from '../types';
import './PhrasePractice.css';

const PhrasePractice: React.FC = () => {
  const { setCurrentView, addToWrongWords, updateTask } = useGame();
  
  const [selectedPhrase, setSelectedPhrase] = useState<Phrase | null>(null);
  const [phase, setPhase] = useState<'select' | 'ready' | 'playing' | 'result'>('select');
  const [notes, setNotes] = useState<HitNote[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [showResult, setShowResult] = useState<{ text: string; color: string } | null>(null);
  const [bpm] = useState(90);
  const [recordingBlob, setRecordingBlob] = useState<Blob | null>(null);
  const [isReplaying, setIsReplaying] = useState(false);

  const animationRef = useRef<number>();
  const startTimeRef = useRef<number>(0);
  const beatTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const currentNoteIndexRef = useRef(0);

  const generateNotes = useCallback((phrase: Phrase): HitNote[] => {
    const beatInterval = 60 / bpm;
    return phrase.syllables.map((syllable, index) => ({
      syllable,
      time: 2 + index * beatInterval,
      result: null,
      isStress: phrase.stressIndices.includes(index)
    }));
  }, [bpm]);

  const handleSelectPhrase = (phrase: Phrase) => {
    setSelectedPhrase(phrase);
    const newNotes = generateNotes(phrase);
    setNotes(newNotes);
    currentNoteIndexRef.current = 0;
    setPhase('ready');
  };

  const playStandard = () => {
    if (selectedPhrase) {
      audioManager.speak(selectedPhrase.phrase, 0.8);
    }
  };

  const playSlow = () => {
    if (selectedPhrase) {
      audioManager.speak(selectedPhrase.phrase, 0.5);
    }
  };

  const startPlaying = useCallback(() => {
    if (!selectedPhrase) return;
    
    audioManager.resume();
    setPhase('playing');
    startTimeRef.current = performance.now();
    currentNoteIndexRef.current = 0;
    
    updateTask('task1', 1);

    const beatInterval = (60 / bpm) * 1000;
    let beatCount = 0;
    const totalBeats = selectedPhrase.syllables.length + 2;
    
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
  }, [selectedPhrase, bpm, updateTask]);

  useEffect(() => {
    if (phase !== 'playing') return;

    const animate = () => {
      const elapsed = (performance.now() - startTimeRef.current) / 1000;
      setCurrentTime(elapsed);

      while (
        currentNoteIndexRef.current < notes.length &&
        elapsed > notes[currentNoteIndexRef.current].time + 0.3
      ) {
        const noteIndex = currentNoteIndexRef.current;
        if (notes[noteIndex].result === null) {
          setNotes(prev => {
            const newNotes = [...prev];
            if (newNotes[noteIndex]) {
              newNotes[noteIndex] = { ...newNotes[noteIndex], result: 'miss' };
            }
            return newNotes;
          });
          setShowResult({ text: 'Miss!', color: getResultColor('miss') });
          audioManager.playFail();
          setTimeout(() => setShowResult(null), 800);
        }
        currentNoteIndexRef.current++;
      }

      const allProcessed = notes.every(n => n.result !== null);
      if (allProcessed && phase === 'playing') {
        setTimeout(() => setPhase('result'), 500);
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [phase, notes]);

  const handleHit = useCallback(() => {
    if (phase !== 'playing') return;

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

    setShowResult({ text: getResultText(result), color: getResultColor(result) });
    
    if (result === 'perfect') {
      audioManager.playSuccess();
    } else if (result === 'good') {
      audioManager.playTone(600, 0.1);
    } else {
      audioManager.playFail();
    }

    setTimeout(() => setShowResult(null), 800);
    currentNoteIndexRef.current++;
  }, [phase, notes, currentTime]);

  const startRecording = async () => {
    if (!selectedPhrase) return;
    await audioManager.startRecording();
    audioManager.speak(selectedPhrase.phrase, 0.8);
    setTimeout(async () => {
      const blob = await audioManager.stopRecording();
      if (blob) setRecordingBlob(blob);
    }, 4000);
  };

  const playRecording = () => {
    if (recordingBlob) {
      setIsReplaying(true);
      audioManager.playAudioBlob(recordingBlob);
      setTimeout(() => setIsReplaying(false), 4000);
    }
  };

  const handleRetry = () => {
    if (!selectedPhrase) return;
    const newNotes = generateNotes(selectedPhrase);
    setNotes(newNotes);
    currentNoteIndexRef.current = 0;
    setRecordingBlob(null);
    setPhase('ready');
  };

  const handleBack = () => {
    if (beatTimeoutRef.current) clearTimeout(beatTimeoutRef.current);
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    setPhase('select');
    setSelectedPhrase(null);
    setRecordingBlob(null);
  };

  const accuracy = calculateAccuracy(notes);

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

  return (
    <div className="phrase-practice-container">
      <div className="phrase-header">
        <button className="back-btn" onClick={() => {
          if (phase === 'select') {
            setCurrentView('home');
          } else {
            handleBack();
          }
        }}>
          ← 返回
        </button>
        <h2>🔗 连读练习</h2>
        <div style={{ width: 80 }} />
      </div>

      {phase === 'select' && (
        <div className="phrase-list">
          <p className="phrase-intro">选择一个短语，练习连读发音！把多个单词连起来读，更自然更流利。</p>
          {phrases.map(phrase => (
            <div key={phrase.id} className="phrase-card" onClick={() => handleSelectPhrase(phrase)}>
              <div className="phrase-main">
                <span className="phrase-text">{phrase.phrase}</span>
                <span className="phrase-translation">{phrase.translation}</span>
              </div>
              <div className="phrase-syllables">
                {phrase.syllables.map((syl, i) => (
                  <span key={i} className={`phrase-syl ${phrase.stressIndices.includes(i) ? 'stress' : ''}`}>
                    {syl}
                  </span>
                ))}
              </div>
              <div className="phrase-meta">
                <span className="phrase-difficulty">{'⭐'.repeat(phrase.difficulty)}</span>
                <span className="phrase-syl-count">{phrase.syllables.length}个音节</span>
              </div>
              <button className="phrase-listen-btn" onClick={(e) => {
                e.stopPropagation();
                audioManager.speak(phrase.phrase, 0.8);
              }}>
                🔊 试听
              </button>
            </div>
          ))}
        </div>
      )}

      {phase === 'ready' && selectedPhrase && (
        <div className="ready-screen">
          <div className="ready-content animate-fadeIn">
            <h2 className="phrase-display">{selectedPhrase.phrase}</h2>
            <p className="phrase-translation-display">{selectedPhrase.translation}</p>

            <div className="syllables-display">
              {selectedPhrase.syllables.map((syl, i) => (
                <span key={i} className={`syllable-box ${selectedPhrase.stressIndices.includes(i) ? 'stress' : ''}`}>
                  {syl}
                  {selectedPhrase.stressIndices.includes(i) && <span className="stress-label">重音</span>}
                </span>
              ))}
            </div>

            <div className="word-breakdown">
              {selectedPhrase.wordIds.map((wid, i) => {
                const w = getWordById(wid);
                return w ? (
                  <span key={i} className="breakdown-word">
                    {w.word}({w.translation})
                    {i < selectedPhrase.wordIds.length - 1 && <span className="breakdown-plus"> + </span>}
                  </span>
                ) : null;
              })}
            </div>

            <div className="audio-controls">
              <button className="audio-btn" onClick={playStandard}>🔊 听标准音</button>
              <button className="audio-btn" onClick={playSlow}>🐢 慢速朗读</button>
            </div>

            <p className="tip-text">跟着节拍，每个音节对应一次点击，注意重音！</p>

            <button className="btn btn-primary start-btn" onClick={startPlaying}>🎮 开始练习</button>
          </div>
        </div>
      )}

      {phase === 'playing' && selectedPhrase && (
        <div className="playing-area">
          <h2 className="phrase-display">{selectedPhrase.phrase}</h2>
          
          <div className="rhythm-track">
            <div className="track-container">
              {renderNotes()}
              <div className="hit-line">
                <div className="hit-zone" onClick={handleHit}>🎤</div>
              </div>
            </div>

            {showResult && (
              <div className="result-popup" style={{ color: showResult.color }}>
                {showResult.text}
              </div>
            )}
          </div>
        </div>
      )}

      {phase === 'result' && selectedPhrase && (
        <div className="result-screen">
          <div className="result-card animate-fadeIn">
            <h3>连读练习完成！</h3>
            <h2>{selectedPhrase.phrase}</h2>
            <p className="result-translation">{selectedPhrase.translation}</p>
            
            <div className="result-accuracy">
              准确率: <span style={{ color: accuracy >= 80 ? 'var(--success)' : 'var(--warning)' }}>{accuracy}%</span>
            </div>

            <div className="result-notes">
              {notes.map((note, i) => (
                <span key={i} className={`result-note ${note.result || ''} ${note.isStress ? 'stress' : ''}`}>
                  {note.syllable}
                </span>
              ))}
            </div>

            <div className="recording-section">
              <button className="record-btn" onClick={startRecording}>🎤 跟读录音</button>
              {recordingBlob && (
                <button className={`playback-btn ${isReplaying ? 'playing' : ''}`} onClick={playRecording}>
                  {isReplaying ? '🔊 播放中...' : '▶️ 播放录音'}
                </button>
              )}
            </div>

            <div className="result-buttons">
              <button className="btn btn-warning" onClick={handleRetry}>🔄 再练一次</button>
              <button className="btn btn-secondary" onClick={handleBack}>选择其他短语</button>
            </div>

            {accuracy < 60 && (
              <button className="btn btn-danger" onClick={() => selectedPhrase.wordIds.forEach(wid => addToWrongWords(wid))}>
                📝 加入错词本
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PhrasePractice;
