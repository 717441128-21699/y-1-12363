import React, { useState, useMemo } from 'react';
import { useGame } from '../context/GameContext';
import { levels } from '../data/levels';
import { words } from '../data/words';
import { categories } from '../data/words';
import { getPhraseById } from '../data/phrases';
import { UserProgress, WeeklyGoal } from '../types';
import { loadProgress } from '../utils/storage';
import './ParentReport.css';

const ParentReport: React.FC = () => {
  const { setCurrentView, progress, profiles, activeProfile, weeklyGoal, allProfileData } = useGame();
  const [activeTab, setActiveTab] = useState<'overview' | 'progress' | 'compare' | 'worksheet'>('overview');
  const [progressType, setProgressType] = useState<'word' | 'phrase'>('word');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [compareProfileId, setCompareProfileId] = useState<string>('');

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}小时${minutes}分钟`;
    return `${minutes}分钟`;
  };

  const totalStars = Object.values(progress.levelStars).reduce((sum, s) => sum + s, 0);
  const unlockedLevels = levels.filter(l => progress.levelStars[l.id] !== undefined).length;

  const wordRecords = progress.scoreHistory.filter(r => r.type === 'word');
  const phraseHistory = progress.phraseHistory || [];

  const totalPhrasePractice = phraseHistory.length;
  const avgPhraseAccuracy = phraseHistory.length > 0
    ? Math.round(phraseHistory.reduce((sum, r) => sum + r.accuracy, 0) / phraseHistory.length)
    : 0;
  const recentPhrases = phraseHistory.slice(-5).reverse();

  function buildLast7Days(records: typeof progress.scoreHistory) {
    const result: { date: string; scores: number[]; accuracy: number[] }[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dayRecords = records.filter(r => r.date === dateStr);
      result.push({
        date: dateStr,
        scores: dayRecords.map(r => r.score),
        accuracy: dayRecords.map(r => r.accuracy)
      });
    }
    return result;
  }

  const recentWordRecords = useMemo(() => {
    return buildLast7Days(progress.scoreHistory.filter(r => r.type === 'word'));
  }, [progress.scoreHistory]);

  const recentPhraseRecords = useMemo(() => {
    return buildLast7Days(progress.scoreHistory.filter(r => r.type === 'phrase'));
  }, [progress.scoreHistory]);

  const categoryStats = useMemo(() => {
    return categories.map(cat => {
      const catWords = words.filter(w => w.category === cat.id);
      const learnedCount = catWords.filter(w =>
        progress.scoreHistory.some(s => {
          const level = levels.find(l => l.id === s.levelId);
          return level?.wordIds.includes(w.id);
        }) || progress.favoriteWords.includes(w.id)
      ).length;
      return { ...cat, total: catWords.length, learned: learnedCount, progress: catWords.length > 0 ? (learnedCount / catWords.length) * 100 : 0 };
    });
  }, [progress.scoreHistory, progress.favoriteWords]);

  const getWorksheetWords = () => {
    if (selectedCategory === 'all') return words.slice(0, 12);
    return words.filter(w => w.category === selectedCategory).slice(0, 12);
  };

  const renderChart = (data: { date: string; scores: number[]; accuracy: number[] }[], title: string) => {
    const maxScore = Math.max(...data.flatMap(d => d.scores.length > 0 ? d.scores : [0]), 100);
    return (
      <div className="chart-container">
        <div className="chart-title">{title}</div>
        <div className="chart">
          <div className="chart-y-axis">
            {[maxScore, Math.floor(maxScore * 0.75), Math.floor(maxScore * 0.5), Math.floor(maxScore * 0.25), 0].map(val => (
              <span key={val} className="y-label">{val}</span>
            ))}
          </div>
          <div className="chart-bars">
            {data.map((day, i) => {
              const avgScore = day.scores.length > 0 ? day.scores.reduce((a, b) => a + b, 0) / day.scores.length : 0;
              const height = maxScore > 0 ? (avgScore / maxScore) * 100 : 0;
              return (
                <div key={i} className="bar-wrapper">
                  <div className="bar" style={{ height: `${height}%` }}>
                    {avgScore > 0 && <span className="bar-value">{Math.round(avgScore)}</span>}
                  </div>
                  <span className="bar-label">{new Date(day.date).getMonth() + 1}/{new Date(day.date).getDate()}</span>
                </div>
              );
            })}
          </div>
        </div>
        <div className="chart accuracy-chart">
          <div className="chart-y-axis">
            {[100, 75, 50, 25, 0].map(val => (
              <span key={val} className="y-label">{val}%</span>
            ))}
          </div>
          <div className="chart-bars">
            {data.map((day, i) => {
              const avgAccuracy = day.accuracy.length > 0 ? day.accuracy.reduce((a, b) => a + b, 0) / day.accuracy.length : 0;
              return (
                <div key={i} className="bar-wrapper">
                  <div className="bar green" style={{ height: `${avgAccuracy}%` }}>
                    {avgAccuracy > 0 && <span className="bar-value">{Math.round(avgAccuracy)}%</span>}
                  </div>
                  <span className="bar-label">{new Date(day.date).getMonth() + 1}/{new Date(day.date).getDate()}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const handlePrint = () => window.print();

  const renderWeeklyGoal = (goal: WeeklyGoal | null) => {
    if (!goal) return null;
    const wordPct = goal.wordTarget > 0 ? Math.min(100, Math.round(goal.wordDone / goal.wordTarget * 100)) : 0;
    const phrasePct = goal.phraseTarget > 0 ? Math.min(100, Math.round(goal.phraseDone / goal.phraseTarget * 100)) : 0;
    return (
      <div className="weekly-goal-card">
        <div className="wg-title">📅 本周目标</div>
        <div className="wg-row">
          <span className="wg-label">🎮 单词闯关</span>
          <div className="wg-bar-wrap">
            <div className="wg-bar" style={{ width: `${wordPct}%` }} />
          </div>
          <span className="wg-pct">{goal.wordDone}/{goal.wordTarget}</span>
        </div>
        <div className="wg-row">
          <span className="wg-label">🔗 短语连读</span>
          <div className="wg-bar-wrap">
            <div className="wg-bar phrase" style={{ width: `${phrasePct}%` }} />
          </div>
          <span className="wg-pct">{goal.phraseDone}/{goal.phraseTarget}</span>
        </div>
      </div>
    );
  };

  const compareData = useMemo(() => {
    if (!compareProfileId && profiles.length > 0) return null;
    const targetId = compareProfileId || (profiles.length > 0 ? profiles[0].id : '');
    if (!targetId) return null;
    const p = profiles.find(x => x.id === targetId);
    if (!p) return null;
    const pProgress = loadProgress(targetId);
    const wordRecs = pProgress.scoreHistory.filter(r => r.type === 'word');
    const phraseRecs = pProgress.scoreHistory.filter(r => r.type === 'phrase');
    const ph = pProgress.phraseHistory || [];
    return {
      profile: p,
      goal: p.weeklyGoal,
      wordCount7: wordRecs.filter(r => {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        return r.date >= d.toISOString().split('T')[0];
      }).length,
      phraseCount7: phraseRecs.filter(r => {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        return r.date >= d.toISOString().split('T')[0];
      }).length,
      wordAcc7: wordRecs.length > 0 ? Math.round(wordRecs.reduce((s, r) => s + r.accuracy, 0) / wordRecs.length) : 0,
      phraseAcc7: ph.length > 0 ? Math.round(ph.reduce((s, r) => s + r.accuracy, 0) / ph.length) : 0,
      reviewCount: (pProgress.phraseReview || []).length,
      totalStars: Object.values(pProgress.levelStars).reduce((s, v) => s + v, 0)
    };
  }, [compareProfileId, profiles]);

  const allCompareData = useMemo(() => {
    return allProfileData().map(d => {
      const wordRecs = d.progress.scoreHistory.filter(r => r.type === 'word');
      const phraseRecs = d.progress.scoreHistory.filter(r => r.type === 'phrase');
      const ph = d.progress.phraseHistory || [];
      const d7 = new Date();
      d7.setDate(d7.getDate() - 7);
      const d7s = d7.toISOString().split('T')[0];
      return {
        profileId: d.profileId,
        name: d.name,
        avatar: d.avatar,
        goal: d.goal,
        wordCount7: wordRecs.filter(r => r.date >= d7s).length,
        phraseCount7: phraseRecs.filter(r => r.date >= d7s).length,
        wordAcc7: wordRecs.length > 0 ? Math.round(wordRecs.reduce((s, r) => s + r.accuracy, 0) / wordRecs.length) : 0,
        phraseAcc7: ph.length > 0 ? Math.round(ph.reduce((s, r) => s + r.accuracy, 0) / ph.length) : 0,
        reviewCount: (d.progress.phraseReview || []).length,
        totalStars: Object.values(d.progress.levelStars).reduce((s, v) => s + v, 0)
      };
    });
  }, [allProfileData]);

  return (
    <div className="parent-container">
      <div className="parent-header no-print">
        <button className="back-btn" onClick={() => setCurrentView('home')}>
          ← 返回
        </button>
        <h2>👨‍👩‍👧 家长中心</h2>
        <div style={{ width: 80 }} />
      </div>

      <div className="tabs no-print">
        <button className={`tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
          📊 学习概览
        </button>
        <button className={`tab ${activeTab === 'progress' ? 'active' : ''}`} onClick={() => setActiveTab('progress')}>
          📈 成绩曲线
        </button>
        {profiles.length > 0 && (
          <button className={`tab ${activeTab === 'compare' ? 'active' : ''}`} onClick={() => setActiveTab('compare')}>
            👥 孩子对比
          </button>
        )}
        <button className={`tab ${activeTab === 'worksheet' ? 'active' : ''}`} onClick={() => setActiveTab('worksheet')}>
          📄 练习单
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'overview' && (
          <div className="overview-section">
            {renderWeeklyGoal(weeklyGoal)}

            <div className="stats-grid">
              <div className="stat-card big">
                <div className="stat-icon">⏱️</div>
                <div>
                  <div className="stat-value-large">{formatTime(progress.totalPlayTime)}</div>
                  <div className="stat-label">累计学习时长</div>
                </div>
              </div>
              <div className="stat-card big">
                <div className="stat-icon">⭐</div>
                <div>
                  <div className="stat-value-large">{totalStars} 颗</div>
                  <div className="stat-label">收集星星</div>
                </div>
              </div>
              <div className="stat-card big">
                <div className="stat-icon">🎮</div>
                <div>
                  <div className="stat-value-large">{unlockedLevels} / {levels.length}</div>
                  <div className="stat-label">关卡进度</div>
                </div>
              </div>
              <div className="stat-card big">
                <div className="stat-icon">🔗</div>
                <div>
                  <div className="stat-value-large">{totalPhrasePractice} 次</div>
                  <div className="stat-label">连读练习</div>
                </div>
              </div>
            </div>

            <div className="section-title">🎮 单词闯关</div>
            <div className="level-details-grid compact">
              {levels.map(level => {
                const stars = progress.levelStars[level.id] || 0;
                const unlocked = progress.levelStars[level.id] !== undefined;
                return (
                  <div key={level.id} className={`level-detail-card ${unlocked ? 'unlocked' : 'locked'}`}>
                    <div className="level-number">{level.id}</div>
                    <div className="level-name">{level.name}</div>
                    <div className="level-stars">
                      {[1, 2, 3].map(i => (
                        <span key={i} className={`star ${i <= stars ? 'filled' : ''}`}>★</span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="section-title">🔗 短语连读</div>
            <div className="phrase-stats-card">
              <div className="phrase-stat-row">
                <span>练习总次数</span>
                <span className="phrase-stat-value">{totalPhrasePractice}</span>
              </div>
              <div className="phrase-stat-row">
                <span>平均准确率</span>
                <span className="phrase-stat-value">{avgPhraseAccuracy}%</span>
              </div>
              <div className="phrase-stat-row">
                <span>待复习短语</span>
                <span className="phrase-stat-value">{(progress.phraseReview || []).length}</span>
              </div>
              <div className="phrase-stat-row">
                <span>已掌握短语</span>
                <span className="phrase-stat-value">{phraseHistory.filter(r => r.mastered).length}</span>
              </div>
            </div>

            {recentPhrases.length > 0 && (
              <div className="recent-phrase-section">
                <div className="section-title">🕐 最近练过的短语</div>
                <div className="recent-phrase-list">
                  {recentPhrases.map((r, i) => (
                    <div key={i} className="recent-phrase-item">
                      <span className="rp-phrase">{r.phrase}</span>
                      <span className="rp-translation">{r.translation}</span>
                      <span className="rp-acc" style={{ color: r.accuracy >= 60 ? 'var(--success)' : 'var(--warning)' }}>
                        {r.accuracy}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="section-title">📚 分类学习进度</div>
            <div className="category-progress-list">
              {categoryStats.map(cat => (
                <div key={cat.id} className="category-progress-item">
                  <div className="category-info">
                    <span className="category-icon">{cat.icon}</span>
                    <span className="category-name">{cat.name}</span>
                    <span className="category-count">{cat.learned}/{cat.total}</span>
                  </div>
                  <div className="category-bar">
                    <div className="category-fill" style={{ width: `${cat.progress}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'progress' && (
          <div className="progress-section">
            <div className="progress-type-tabs">
              <button className={`ptype-tab ${progressType === 'word' ? 'active' : ''}`} onClick={() => setProgressType('word')}>
                🎮 单词闯关
              </button>
              <button className={`ptype-tab ${progressType === 'phrase' ? 'active' : ''}`} onClick={() => setProgressType('phrase')}>
                🔗 短语连读
              </button>
            </div>

            {progressType === 'word' ? (
              <>
                {renderChart(recentWordRecords, '单词闯关 · 近7天得分趋势')}
                <div className="history-list">
                  <div className="history-title">📝 单词闯关记录</div>
                  {wordRecords.length === 0 ? (
                    <div className="empty-history">暂无记录</div>
                  ) : (
                    <div className="history-items">
                      {wordRecords.slice(-10).reverse().map((record, i) => {
                        const level = levels.find(l => l.id === record.levelId);
                        return (
                          <div key={i} className="history-item">
                            <span className="history-type-badge word">🎮</span>
                            <span className="history-date">{record.date}</span>
                            <span className="history-level">{level?.name}</span>
                            <span className="history-score">{record.score}分</span>
                            <span className="history-accuracy">{record.accuracy}%</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                {renderChart(recentPhraseRecords, '短语连读 · 近7天得分趋势')}
                <div className="history-list">
                  <div className="history-title">📝 短语连读记录</div>
                  {phraseHistory.length === 0 ? (
                    <div className="empty-history">暂无记录</div>
                  ) : (
                    <div className="history-items">
                      {phraseHistory.slice(-10).reverse().map((record, i) => (
                        <div key={i} className="history-item">
                          <span className="history-type-badge phrase">🔗</span>
                          <span className="history-date">{record.date}</span>
                          <span className="history-level">{record.phrase} ({record.translation})</span>
                          <span className="history-accuracy">{record.accuracy}%</span>
                          {record.failReasons && record.failReasons.length > 0 && (
                            <span className="history-fail-reasons">
                              {record.failReasons.map(r => {
                                const labels: Record<string, string> = { stress: '漏重音', slow: '节拍慢', miss: '连续miss' };
                                return <span key={r} className={`fail-tag small ${r}`}>{labels[r] || r}</span>;
                              })}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'compare' && (
          <div className="compare-section">
            <div className="compare-header-row">
              <span className="compare-title">👥 孩子维度对比</span>
            </div>

            <div className="compare-cards">
              {allCompareData.map(d => {
                const isActive = d.profileId === (activeProfile?.id || '');
                return (
                  <div key={d.profileId} className={`compare-card ${isActive ? 'current' : ''}`}>
                    <div className="cc-header">
                      <span className="cc-avatar">{d.avatar}</span>
                      <span className="cc-name">{d.name}</span>
                      {isActive && <span className="cc-active-badge">当前</span>}
                    </div>
                    <div className="cc-body">
                      <div className="cc-row">
                        <span className="cc-label">⭐ 星星</span>
                        <span className="cc-val">{d.totalStars}</span>
                      </div>
                      <div className="cc-row">
                        <span className="cc-label">🎮 7天单词</span>
                        <span className="cc-val">{d.wordCount7}次 / {d.wordAcc7}%</span>
                      </div>
                      <div className="cc-row">
                        <span className="cc-label">🔗 7天短语</span>
                        <span className="cc-val">{d.phraseCount7}次 / {d.phraseAcc7}%</span>
                      </div>
                      <div className="cc-row">
                        <span className="cc-label">🔄 待复习</span>
                        <span className="cc-val">{d.reviewCount}个</span>
                      </div>
                      {d.goal && (
                        <div className="cc-goal">
                          <div className="cc-row">
                            <span className="cc-label">📅 单词目标</span>
                            <span className="cc-val">{d.goal.wordDone}/{d.goal.wordTarget}</span>
                          </div>
                          <div className="cc-row">
                            <span className="cc-label">📅 短语目标</span>
                            <span className="cc-val">{d.goal.phraseDone}/{d.goal.phraseTarget}</span>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="cc-alert">
                      {d.wordCount7 + d.phraseCount7 < 3 && (
                        <span className="cc-low-activity">⚠️ 本周练习较少</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="section-title" style={{ marginTop: 20 }}>📊 7天练习量趋势</div>
            <div className="compare-trend-grid">
              {allCompareData.map(d => {
                const pProgress = loadProgress(d.profileId);
                const word7 = buildLast7Days(pProgress.scoreHistory.filter(r => r.type === 'word'));
                const phrase7 = buildLast7Days(pProgress.scoreHistory.filter(r => r.type === 'phrase'));
                return (
                  <div key={d.profileId} className="compare-trend-item">
                    <div className="ct-name">{d.avatar} {d.name}</div>
                    <div className="ct-row">
                      <span className="ct-type">🎮 单词</span>
                      <div className="ct-bars">
                        {word7.map((day, i) => (
                          <div key={i} className="ct-bar" style={{ height: `${day.scores.length > 0 ? Math.min(100, day.scores.length * 25) : 2}px` }} title={`${day.date}: ${day.scores.length}次`} />
                        ))}
                      </div>
                    </div>
                    <div className="ct-row">
                      <span className="ct-type">🔗 短语</span>
                      <div className="ct-bars">
                        {phrase7.map((day, i) => (
                          <div key={i} className="ct-bar phrase" style={{ height: `${day.scores.length > 0 ? Math.min(100, day.scores.length * 25) : 2}px` }} title={`${day.date}: ${day.scores.length}次`} />
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'worksheet' && (
          <div className="worksheet-section">
            <div className="worksheet-controls no-print">
              <div className="category-selector">
                <span>选择主题：</span>
                <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="select-input">
                  <option value="all">全部单词</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                  ))}
                </select>
              </div>
              <button className="btn btn-primary print-btn" onClick={handlePrint}>🖨️ 打印练习单</button>
            </div>
            <div className="worksheet">
              <div className="worksheet-header">
                <h1>📝 英语单词练习单</h1>
                <div className="worksheet-info">
                  <span>日期：___________</span>
                  <span>姓名：___________</span>
                  <span>得分：___________</span>
                </div>
              </div>
              <table className="worksheet-table">
                <thead>
                  <tr>
                    <th>序号</th>
                    <th>单词</th>
                    <th>音标</th>
                    <th>中文意思</th>
                    <th>音节划分</th>
                    <th>跟读练习</th>
                  </tr>
                </thead>
                <tbody>
                  {getWorksheetWords().map((word, index) => (
                    <tr key={word.id}>
                      <td>{index + 1}</td>
                      <td className="word-cell">{word.word}</td>
                      <td className="phonetic-cell">{word.phonetic}</td>
                      <td>{word.translation}</td>
                      <td className="syllable-cell">
                        {word.syllables.map((s, i) => (
                          <span key={i} className={i === word.stressIndex ? 'stress' : ''}>
                            {s}{i < word.syllables.length - 1 ? '-' : ''}
                          </span>
                        ))}
                      </td>
                      <td className="practice-cell"><span>○ ○ ○</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="worksheet-footer">
                <p>📌 学习提示：</p>
                <ol>
                  <li>先听标准发音，注意重音位置</li>
                  <li>按照音节划分，逐音节跟读</li>
                  <li>每读一遍在圆圈内打勾</li>
                  <li>不会的单词可以标记出来，重点复习</li>
                </ol>
                <p className="parent-sign">家长签字：____________</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ParentReport;
