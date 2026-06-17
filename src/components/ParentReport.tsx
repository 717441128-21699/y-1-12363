import React, { useState, useMemo } from 'react';
import { useGame } from '../context/GameContext';
import { levels } from '../data/levels';
import { words } from '../data/words';
import { categories } from '../data/words';
import './ParentReport.css';

const ParentReport: React.FC = () => {
  const { setCurrentView, progress } = useGame();
  const [activeTab, setActiveTab] = useState<'overview' | 'progress' | 'worksheet'>('overview');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}小时${minutes}分钟`;
    }
    return `${minutes}分钟`;
  };

  const totalStars = Object.values(progress.levelStars).reduce((sum, s) => sum + s, 0);
  const totalLevels = Object.keys(progress.levelStars).length;
  const unlockedLevels = levels.filter(l => progress.levelStars[l.id] !== undefined).length;

  const recentRecords = useMemo(() => {
    const last7Days: { date: string; scores: number[]; accuracy: number[] }[] = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayRecords = progress.scoreHistory.filter(r => r.date === dateStr);
      last7Days.push({
        date: dateStr,
        scores: dayRecords.map(r => r.score),
        accuracy: dayRecords.map(r => r.accuracy)
      });
    }
    
    return last7Days;
  }, [progress.scoreHistory]);

  const maxScore = Math.max(...recentRecords.flatMap(d => d.scores.length > 0 ? d.scores : [0]), 100);

  const categoryStats = useMemo(() => {
    return categories.map(cat => {
      const catWords = words.filter(w => w.category === cat.id);
      const learnedCount = catWords.filter(w => 
        progress.scoreHistory.some(s => {
          const level = levels.find(l => l.id === s.levelId);
          return level?.wordIds.includes(w.id);
        }) || progress.favoriteWords.includes(w.id)
      ).length;
      
      return {
        ...cat,
        total: catWords.length,
        learned: learnedCount,
        progress: catWords.length > 0 ? (learnedCount / catWords.length) * 100 : 0
      };
    });
  }, [progress.scoreHistory, progress.favoriteWords]);

  const getWorksheetWords = () => {
    if (selectedCategory === 'all') {
      return words.slice(0, 12);
    }
    return words.filter(w => w.category === selectedCategory).slice(0, 12);
  };

  const handlePrint = () => {
    window.print();
  };

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
        <button 
          className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          📊 学习概览
        </button>
        <button 
          className={`tab ${activeTab === 'progress' ? 'active' : ''}`}
          onClick={() => setActiveTab('progress')}
        >
          📈 成绩曲线
        </button>
        <button 
          className={`tab ${activeTab === 'worksheet' ? 'active' : ''}`}
          onClick={() => setActiveTab('worksheet')}
        >
          📄 练习单
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'overview' && (
          <div className="overview-section">
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
                <div className="stat-icon">🏆</div>
                <div>
                  <div className="stat-value-large">{unlockedLevels} / {levels.length}</div>
                  <div className="stat-label">关卡进度</div>
                </div>
              </div>
              
              <div className="stat-card big">
                <div className="stat-icon">🔥</div>
                <div>
                  <div className="stat-value-large">{progress.streakDays} 天</div>
                  <div className="stat-label">连续学习</div>
                </div>
              </div>
            </div>

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
                    <div 
                      className="category-fill"
                      style={{ width: `${cat.progress}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="section-title">🎮 关卡详情</div>
            <div className="level-details-grid">
              {levels.map(level => {
                const stars = progress.levelStars[level.id] || 0;
                const unlocked = progress.levelStars[level.id] !== undefined;
                
                return (
                  <div 
                    key={level.id} 
                    className={`level-detail-card ${unlocked ? 'unlocked' : 'locked'}`}
                  >
                    <div className="level-number">{level.id}</div>
                    <div className="level-name">{level.name}</div>
                    <div className="level-stars">
                      {[1, 2, 3].map(i => (
                        <span key={i} className={`star ${i <= stars ? 'filled' : ''}`}>★</span>
                      ))}
                    </div>
                    {!unlocked && <span className="locked-text">🔒 未解锁</span>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'progress' && (
          <div className="progress-section">
            <div className="chart-container">
              <div className="chart-title">近7天得分趋势</div>
              <div className="chart">
                <div className="chart-y-axis">
                  {[maxScore, Math.floor(maxScore * 0.75), Math.floor(maxScore * 0.5), Math.floor(maxScore * 0.25), 0].map(val => (
                    <span key={val} className="y-label">{val}</span>
                  ))}
                </div>
                <div className="chart-bars">
                  {recentRecords.map((day, i) => {
                    const avgScore = day.scores.length > 0 
                      ? day.scores.reduce((a, b) => a + b, 0) / day.scores.length 
                      : 0;
                    const height = maxScore > 0 ? (avgScore / maxScore) * 100 : 0;
                    
                    return (
                      <div key={i} className="bar-wrapper">
                        <div 
                          className="bar"
                          style={{ height: `${height}%` }}
                        >
                          {avgScore > 0 && (
                            <span className="bar-value">{Math.round(avgScore)}</span>
                          )}
                        </div>
                        <span className="bar-label">
                          {new Date(day.date).getMonth() + 1}/{new Date(day.date).getDate()}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="chart-container">
              <div className="chart-title">近7天准确率趋势</div>
              <div className="chart accuracy-chart">
                <div className="chart-y-axis">
                  {[100, 75, 50, 25, 0].map(val => (
                    <span key={val} className="y-label">{val}%</span>
                  ))}
                </div>
                <div className="chart-bars">
                  {recentRecords.map((day, i) => {
                    const avgAccuracy = day.accuracy.length > 0 
                      ? day.accuracy.reduce((a, b) => a + b, 0) / day.accuracy.length 
                      : 0;
                    
                    return (
                      <div key={i} className="bar-wrapper">
                        <div 
                          className="bar green"
                          style={{ height: `${avgAccuracy}%` }}
                        >
                          {avgAccuracy > 0 && (
                            <span className="bar-value">{Math.round(avgAccuracy)}%</span>
                          )}
                        </div>
                        <span className="bar-label">
                          {new Date(day.date).getMonth() + 1}/{new Date(day.date).getDate()}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="history-list">
              <div className="history-title">📝 历史记录</div>
              {progress.scoreHistory.length === 0 ? (
                <div className="empty-history">暂无记录</div>
              ) : (
                <div className="history-items">
                  {progress.scoreHistory.slice(-10).reverse().map((record, i) => {
                    const level = levels.find(l => l.id === record.levelId);
                    return (
                      <div key={i} className="history-item">
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
          </div>
        )}

        {activeTab === 'worksheet' && (
          <div className="worksheet-section">
            <div className="worksheet-controls no-print">
              <div className="category-selector">
                <span>选择主题：</span>
                <select 
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="select-input"
                >
                  <option value="all">全部单词</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                  ))}
                </select>
              </div>
              <button className="btn btn-primary print-btn" onClick={handlePrint}>
                🖨️ 打印练习单
              </button>
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
                      <td className="practice-cell">
                        <span>○ ○ ○</span>
                      </td>
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
