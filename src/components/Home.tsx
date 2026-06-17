import React from 'react';
import { useGame } from '../context/GameContext';
import './Home.css';

const Home: React.FC = () => {
  const { setCurrentView, progress, items } = useGame();

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

  return (
    <div className="home-container">
      <div className="home-header">
        <h1 className="title animate-bounce">
          🎵 英语节奏大冒险 🎵
        </h1>
        <p className="subtitle">跟着节拍说英语，越玩越棒！</p>
      </div>

      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-icon">⭐</div>
          <div className="stat-info">
            <div className="stat-value">{totalStars}</div>
            <div className="stat-label">收集星星</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🏆</div>
          <div className="stat-info">
            <div className="stat-value">{totalLevels}</div>
            <div className="stat-label">解锁关卡</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">⏱️</div>
          <div className="stat-info">
            <div className="stat-value">{formatTime(progress.totalPlayTime)}</div>
            <div className="stat-label">学习时长</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🔥</div>
          <div className="stat-info">
            <div className="stat-value">{progress.streakDays}天</div>
            <div className="stat-label">连续学习</div>
          </div>
        </div>
      </div>

      <div className="menu-grid">
        <button className="menu-card primary" onClick={() => setCurrentView('levels')}>
          <div className="menu-icon">🎮</div>
          <div className="menu-title">开始闯关</div>
          <div className="menu-desc">选择关卡，开始挑战！</div>
        </button>

        <button className="menu-card secondary" onClick={() => setCurrentView('tasks')}>
          <div className="menu-icon">📋</div>
          <div className="menu-title">每日任务</div>
          <div className="menu-desc">完成任务赢奖励</div>
          {progress.dailyTasks.filter(t => t.completed).length > 0 && (
            <div className="menu-badge">
              {progress.dailyTasks.filter(t => t.completed).length}/{progress.dailyTasks.length}
            </div>
          )}
        </button>

        <button className="menu-card accent" onClick={() => setCurrentView('library')}>
          <div className="menu-icon">📚</div>
          <div className="menu-title">单词库</div>
          <div className="menu-desc">浏览所有单词</div>
        </button>

        <button className="menu-card success" onClick={() => setCurrentView('favorites')}>
          <div className="menu-icon">❤️</div>
          <div className="menu-title">我的收藏</div>
          <div className="menu-desc">{progress.favoriteWords.length} 个单词</div>
        </button>

        <button className="menu-card warning" onClick={() => setCurrentView('wrongWords')}>
          <div className="menu-icon">📝</div>
          <div className="menu-title">错词本</div>
          <div className="menu-desc">{progress.wrongWords.length} 个待复习</div>
        </button>

        <button className="menu-card purple" onClick={() => setCurrentView('parent')}>
          <div className="menu-icon">👨‍👩‍👧</div>
          <div className="menu-title">家长中心</div>
          <div className="menu-desc">查看学习报告</div>
        </button>
      </div>

      <div className="items-bar">
        <div className="items-title">我的道具</div>
        <div className="items-list">
          {items.map(item => (
            <div key={item.id} className="item-slot" title={item.description}>
              <span className="item-icon">{item.icon}</span>
              <span className="item-count">x{item.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Home;
