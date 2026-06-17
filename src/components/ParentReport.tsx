import React, { useState, useMemo } from 'react';
import { useGame } from '../context/GameContext';
import { levels } from '../data/levels';
import { words } from '../data/words';
import { categories } from '../data/words';
import { getPhraseById } from '../data/phrases';
import { UserProgress, WeeklyGoal } from '../types';
import { loadProgress } from '../utils/storage';
import './ParentReport.css';

type ChildOption = { id: string; name: string; avatar: string };

const FAIL_LABELS: Record<string, string> = {
  stress: '🎯 漏重音',
  slow: '🐢 节拍慢半拍',
  miss: '❌ 连续miss'
};

const ParentReport: React.FC = () => {
  const { setCurrentView, progress, profiles, activeProfile, weeklyGoal, allProfileData } = useGame();
  const [activeTab, setActiveTab] = useState<'overview' | 'progress' | 'compare' | 'detail' | 'worksheet' | 'weekly'>('overview');
  const [progressType, setProgressType] = useState<'word' | 'phrase'>('word');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedChildId, setSelectedChildId] = useState<string>(activeProfile?.id || '');

  const allChildren: ChildOption[] = [
    { id: '', name: '默认用户', avatar: '👦' },
    ...profiles.map(p => ({ id: p.id, name: p.name, avatar: p.avatar }))
  ];

  const selectedChild = allChildren.find(c => c.id === selectedChildId) || allChildren[0];

  const selectedProgress = useMemo(() => {
    if (selectedChildId === '') return progress;
    return loadProgress(selectedChildId);
  }, [selectedChildId, progress]);

  const selectedGoal = useMemo(() => {
    if (selectedChildId === '') return weeklyGoal;
    const p = profiles.find(x => x.id === selectedChildId);
    return p?.weeklyGoal || null;
  }, [selectedChildId, profiles, weeklyGoal]);

  const get7DayData = (p: UserProgress) => {
    const days: {
      date: string;
      dayLabel: string;
      wordCount: number;
      phraseCount: number;
      wordAcc: number;
      phraseAcc: number;
      reviewStart: number;
      reviewEnd: number;
    }[] = [];

    const phraseHistory = p.phraseHistory || [];
    const reviewCountByDate: Record<string, number> = {};

    for (let i = 13; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const reviewCount = (phraseHistory.filter(r => r.date <= dateStr && !r.mastered).length)
        + (p.phraseReview || []).length;
      reviewCountByDate[dateStr] = reviewCount;
    }

    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dayLabels = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
      const dayLabel = dayLabels[date.getDay()];

      const wordRecords = p.scoreHistory.filter(r => r.type === 'word' && r.date === dateStr);
      const phraseRecords = p.scoreHistory.filter(r => r.type === 'phrase' && r.date === dateStr);
      const phraseRecs = phraseHistory.filter(r => r.date === dateStr);

      const wordCount = wordRecords.length;
      const phraseCount = phraseRecs.length;
      const wordAcc = wordCount > 0 ? Math.round(wordRecords.reduce((s, r) => s + r.accuracy, 0) / wordCount) : 0;
      const phraseAcc = phraseCount > 0 ? Math.round(phraseRecs.reduce((s, r) => s + r.accuracy, 0) / phraseCount) : 0;

      const yesterday = new Date(date);
      yesterday.setDate(yesterday.getDate() - 1);
      const yStr = yesterday.toISOString().split('T')[0];

      days.push({
        date: dateStr,
        dayLabel,
        wordCount,
        phraseCount,
        wordAcc,
        phraseAcc,
        reviewStart: reviewCountByDate[yStr] || 0,
        reviewEnd: reviewCountByDate[dateStr] || 0
      });
    }
    return days;
  };

  const day7Data = useMemo(() => get7DayData(selectedProgress), [selectedProgress]);

  const getWeeklyData = (p: UserProgress, goal: WeeklyGoal | null) => {
    const ws = new Date();
    const day = ws.getDay();
    const diff = ws.getDate() - day + (day === 0 ? -6 : 1);
    ws.setDate(diff);
    const weekStart = ws.toISOString().split('T')[0];

    const wordRecs = p.scoreHistory.filter(r => r.type === 'word' && r.date >= weekStart);
    const phraseRecs = p.phraseHistory?.filter(r => r.date >= weekStart) || [];

    const failCount: Record<string, number> = { stress: 0, slow: 0, miss: 0 };
    phraseRecs.forEach(r => {
      (r.failReasons || []).forEach(f => { failCount[f] = (failCount[f] || 0) + 1; });
    });

    const masteredPhrases = phraseRecs.filter(r => r.mastered).slice(-5).reverse();

    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(ws);
      d.setDate(d.getDate() + i);
      const ds = d.toISOString().split('T')[0];
      weekDays.push({
        date: ds,
        dayLabel: ['一', '二', '三', '四', '五', '六', '日'][i],
        wordCount: wordRecs.filter(r => r.date === ds).length,
        phraseCount: phraseRecs.filter(r => r.date === ds).length
      });
    }

    const failRanking = Object.entries(failCount)
      .filter(([, c]) => c > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([k, c]) => ({ key: k, count: c, label: FAIL_LABELS[k] || k }));

    const avgWordAcc = wordRecs.length > 0 ? Math.round(wordRecs.reduce((s, r) => s + r.accuracy, 0) / wordRecs.length) : 0;
    const avgPhraseAcc = phraseRecs.length > 0 ? Math.round(phraseRecs.reduce((s, r) => s + r.accuracy, 0) / phraseRecs.length) : 0;

    return { weekStart, wordRecs, phraseRecs, failRanking, masteredPhrases, weekDays, avgWordAcc, avgPhraseAcc, goal };
  };

  const weeklyData = useMemo(() => getWeeklyData(selectedProgress, selectedGoal), [selectedProgress, selectedGoal]);

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}小时${minutes}分钟`;
    return `${minutes}分钟`;
  };

  const totalStars = Object.values(selectedProgress.levelStars).reduce((sum, s) => sum + s, 0);
  const unlockedLevels = levels.filter(l => selectedProgress.levelStars[l.id] !== undefined).length;

  const wordRecords = selectedProgress.scoreHistory.filter(r => r.type === 'word');
  const phraseHistory = selectedProgress.phraseHistory || [];

  const totalPhrasePractice = phraseHistory.length;
  const avgPhraseAccuracy = phraseHistory.length > 0
    ? Math.round(phraseHistory.reduce((sum, r) => sum + r.accuracy, 0) / phraseHistory.length)
    : 0;
  const recentPhrases = phraseHistory.slice(-5).reverse();

  function buildLast7Days(records: typeof selectedProgress.scoreHistory) {
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
    return buildLast7Days(selectedProgress.scoreHistory.filter(r => r.type === 'word'));
  }, [selectedProgress.scoreHistory]);

  const recentPhraseRecords = useMemo(() => {
    return buildLast7Days(selectedProgress.scoreHistory.filter(r => r.type === 'phrase'));
  }, [selectedProgress.scoreHistory]);

  const categoryStats = useMemo(() => {
    return categories.map(cat => {
      const catWords = words.filter(w => w.category === cat.id);
      const learnedCount = catWords.filter(w =>
        selectedProgress.scoreHistory.some(s => {
          const level = levels.find(l => l.id === s.levelId);
          return level?.wordIds.includes(w.id);
        }) || selectedProgress.favoriteWords.includes(w.id)
      ).length;
      return { ...cat, total: catWords.length, learned: learnedCount, progress: catWords.length > 0 ? (learnedCount / catWords.length) * 100 : 0 };
    });
  }, [selectedProgress.scoreHistory, selectedProgress.favoriteWords]);

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

  const handlePrint = () => window.print();

  return (
    <div className="parent-container">
      <div className="parent-header no-print">
        <button className="back-btn" onClick={() => setCurrentView('home')}>
          ← 返回
        </button>
        <div className="header-center">
          <h2>👨‍👩‍👧 家长中心</h2>
          {allChildren.length > 1 && (
            <select
              className="child-selector"
              value={selectedChildId}
              onChange={e => setSelectedChildId(e.target.value)}
            >
              {allChildren.map(c => (
                <option key={c.id} value={c.id}>{c.avatar} {c.name}</option>
              ))}
            </select>
          )}
        </div>
        <div style={{ width: 80 }} />
      </div>

      <div className="tabs no-print">
        <button className={`tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
          📊 学习概览
        </button>
        <button className={`tab ${activeTab === 'progress' ? 'active' : ''}`} onClick={() => setActiveTab('progress')}>
          📈 成绩曲线
        </button>
        <button className={`tab ${activeTab === 'detail' ? 'active' : ''}`} onClick={() => setActiveTab('detail')}>
          📆 近7天详细
        </button>
        {profiles.length > 0 && (
          <button className={`tab ${activeTab === 'compare' ? 'active' : ''}`} onClick={() => setActiveTab('compare')}>
            👥 孩子对比
          </button>
        )}
        <button className={`tab ${activeTab === 'weekly' ? 'active' : ''}`} onClick={() => setActiveTab('weekly')}>
          📰 周报导出
        </button>
        <button className={`tab ${activeTab === 'worksheet' ? 'active' : ''}`} onClick={() => setActiveTab('worksheet')}>
          📄 练习单
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'overview' && (
          <div className="overview-section">
            {renderWeeklyGoal(selectedGoal)}

            <div className="stats-grid">
              <div className="stat-card big">
                <div className="stat-icon">⏱️</div>
                <div>
                  <div className="stat-value-large">{formatTime(selectedProgress.totalPlayTime)}</div>
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
                const stars = selectedProgress.levelStars[level.id] || 0;
                const unlocked = selectedProgress.levelStars[level.id] !== undefined;
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
                <span className="phrase-stat-value">{(selectedProgress.phraseReview || []).length}</span>
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

        {activeTab === 'detail' && (
          <div className="detail-section">
            <div className="detail-header">
              <span className="detail-title">📆 近7天详细数据 · {selectedChild.avatar} {selectedChild.name}</span>
            </div>

            <div className="detail-table-wrap">
              <table className="detail-table">
                <thead>
                  <tr>
                    <th>日期</th>
                    <th>🎮 单词次数</th>
                    <th>🔗 短语次数</th>
                    <th>📊 单词准确率</th>
                    <th>📊 短语准确率</th>
                    <th>🔄 待复习变化</th>
                  </tr>
                </thead>
                <tbody>
                  {day7Data.map((d, i) => {
                    const reviewChange = d.reviewEnd - d.reviewStart;
                    return (
                      <tr key={i}>
                        <td>
                          <div style={{ fontWeight: 'bold' }}>{d.date}</div>
                          <div style={{ fontSize: 12, color: '#888' }}>{d.dayLabel}</div>
                        </td>
                        <td>
                          <span className={d.wordCount === 0 ? 'zero-cell' : ''}>{d.wordCount}</span>
                        </td>
                        <td>
                          <span className={d.phraseCount === 0 ? 'zero-cell' : ''}>{d.phraseCount}</span>
                        </td>
                        <td>
                          {d.wordAcc > 0 ? (
                            <span style={{ color: d.wordAcc >= 60 ? 'var(--success)' : 'var(--warning)' }}>
                              {d.wordAcc}%
                            </span>
                          ) : <span className="zero-cell">-</span>}
                        </td>
                        <td>
                          {d.phraseAcc > 0 ? (
                            <span style={{ color: d.phraseAcc >= 60 ? 'var(--success)' : 'var(--warning)' }}>
                              {d.phraseAcc}%
                            </span>
                          ) : <span className="zero-cell">-</span>}
                        </td>
                        <td>
                          {reviewChange === 0 ? (
                            <span className="zero-cell">-</span>
                          ) : reviewChange > 0 ? (
                            <span className="change-badge up">+{reviewChange}</span>
                          ) : (
                            <span className="change-badge down">{reviewChange}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="detail-footer">
                    <td><strong>合计 / 平均</strong></td>
                    <td><strong>{day7Data.reduce((s, d) => s + d.wordCount, 0)}</strong></td>
                    <td><strong>{day7Data.reduce((s, d) => s + d.phraseCount, 0)}</strong></td>
                    <td>
                      <strong>
                        {day7Data.filter(d => d.wordAcc > 0).length > 0
                          ? Math.round(day7Data.filter(d => d.wordAcc > 0).reduce((s, d) => s + d.wordAcc, 0) / day7Data.filter(d => d.wordAcc > 0).length)
                          : 0}%
                      </strong>
                    </td>
                    <td>
                      <strong>
                        {day7Data.filter(d => d.phraseAcc > 0).length > 0
                          ? Math.round(day7Data.filter(d => d.phraseAcc > 0).reduce((s, d) => s + d.phraseAcc, 0) / day7Data.filter(d => d.phraseAcc > 0).length)
                          : 0}%
                      </strong>
                    </td>
                    <td>
                      {day7Data[0] && day7Data[day7Data.length - 1]
                        ? (day7Data[day7Data.length - 1].reviewEnd - day7Data[0].reviewStart)
                        : 0}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="detail-notice">
              💡 每日数据从凌晨零点开始重新统计；切换孩子可以查看对应孩子的数据
            </div>
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

        {activeTab === 'weekly' && (
          <div className="weekly-section">
            <div className="no-print weekly-controls">
              <span className="weekly-title">📰 周报 · {selectedChild.avatar} {selectedChild.name}</span>
              <button className="btn btn-primary print-btn" onClick={handlePrint}>🖨️ 打印周报</button>
            </div>

            <div className="weekly-report">
              <div className="wr-header">
                <h1>📰 英语学习周报</h1>
                <div className="wr-meta">
                  <div>👶 姓名：{selectedChild.name}</div>
                  <div>📅 周期：{weeklyData.weekStart} ~ {new Date().toISOString().split('T')[0]}</div>
                </div>
              </div>

              {weeklyData.goal && (
                <div className="wr-section">
                  <h2>🎯 本周目标完成度</h2>
                  <div className="wr-goal-grid">
                    <div className="wr-goal-card">
                      <div className="wr-goal-label">🎮 单词闯关</div>
                      <div className="wr-goal-bignum">
                        {weeklyData.goal.wordDone}/{weeklyData.goal.wordTarget}
                      </div>
                      <div className="wr-goal-bar">
                        <div className="wr-goal-fill" style={{
                          width: `${weeklyData.goal.wordTarget > 0 ? Math.min(100, weeklyData.goal.wordDone / weeklyData.goal.wordTarget * 100) : 0}%`
                        }} />
                      </div>
                      <div className="wr-goal-pct">
                        {weeklyData.goal.wordTarget > 0 ? Math.min(100, Math.round(weeklyData.goal.wordDone / weeklyData.goal.wordTarget * 100)) : 0}%
                      </div>
                    </div>
                    <div className="wr-goal-card">
                      <div className="wr-goal-label">🔗 短语连读</div>
                      <div className="wr-goal-bignum">
                        {weeklyData.goal.phraseDone}/{weeklyData.goal.phraseTarget}
                      </div>
                      <div className="wr-goal-bar">
                        <div className="wr-goal-fill phrase" style={{
                          width: `${weeklyData.goal.phraseTarget > 0 ? Math.min(100, weeklyData.goal.phraseDone / weeklyData.goal.phraseTarget * 100) : 0}%`
                        }} />
                      </div>
                      <div className="wr-goal-pct">
                        {weeklyData.goal.phraseTarget > 0 ? Math.min(100, Math.round(weeklyData.goal.phraseDone / weeklyData.goal.phraseTarget * 100)) : 0}%
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="wr-section">
                <h2>📈 本周练习趋势</h2>
                <div className="wr-trend-table">
                  <table>
                    <thead>
                      <tr>
                        <th>周</th>
                        {weeklyData.weekDays.map(d => <th key={d.date}>{d.dayLabel}</th>)}
                        <th>合计</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>🎮 单词</td>
                        {weeklyData.weekDays.map(d => <td key={d.date}>{d.wordCount}</td>)}
                        <td><strong>{weeklyData.wordRecs.length}</strong></td>
                      </tr>
                      <tr>
                        <td>🔗 短语</td>
                        {weeklyData.weekDays.map(d => <td key={d.date}>{d.phraseCount}</td>)}
                        <td><strong>{weeklyData.phraseRecs.length}</strong></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="wr-summary-row">
                <div className="wr-summary-card">
                  <div className="wr-summary-label">单词平均准确率</div>
                  <div className="wr-summary-value">{weeklyData.avgWordAcc}%</div>
                </div>
                <div className="wr-summary-card">
                  <div className="wr-summary-label">短语平均准确率</div>
                  <div className="wr-summary-value">{weeklyData.avgPhraseAcc}%</div>
                </div>
                <div className="wr-summary-card">
                  <div className="wr-summary-label">累计星星</div>
                  <div className="wr-summary-value">{totalStars} ⭐</div>
                </div>
              </div>

              {weeklyData.failRanking.length > 0 && (
                <div className="wr-section">
                  <h2>📊 低分原因排行</h2>
                  <div className="wr-fail-ranking">
                    {weeklyData.failRanking.map((item, i) => (
                      <div key={item.key} className="wr-fail-item">
                        <span className="wr-fail-rank">#{i + 1}</span>
                        <span className="wr-fail-label">{item.label}</span>
                        <div className="wr-fail-bar">
                          <div className="wr-fail-fill" style={{ width: `${Math.min(100, item.count * 20)}%` }} />
                        </div>
                        <span className="wr-fail-count">{item.count}次</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {weeklyData.masteredPhrases.length > 0 && (
                <div className="wr-section">
                  <h2>🎉 最近掌握的短语</h2>
                  <div className="wr-mastered-list">
                    {weeklyData.masteredPhrases.map((p, i) => (
                      <div key={i} className="wr-mastered-item">
                        <span className="wr-mastered-phrase">{p.phrase}</span>
                        <span className="wr-mastered-trans">{p.translation}</span>
                        <span className="wr-mastered-acc">{p.accuracy}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="wr-footer">
                <div className="wr-footer-left">📅 生成日期：{new Date().toLocaleDateString('zh-CN')}</div>
                <div className="wr-footer-right">家长签字：_______________</div>
              </div>
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
