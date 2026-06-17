import React from 'react';
import { useGame } from '../context/GameContext';
import './DailyTasks.css';

const DailyTasks: React.FC = () => {
  const { setCurrentView, progress, addItem } = useGame();

  const completedCount = progress.dailyTasks.filter(t => t.completed).length;
  const totalCount = progress.dailyTasks.length;

  const claimReward = (taskId: string, reward: number) => {
    addItem('item1', Math.floor(reward / 50));
    addItem('item2', Math.floor(reward / 100));
  };

  return (
    <div className="tasks-container">
      <div className="tasks-header">
        <button className="back-btn" onClick={() => setCurrentView('home')}>
          ← 返回
        </button>
        <h2>📋 每日任务</h2>
        <div style={{ width: 80 }} />
      </div>

      <div className="progress-card">
        <div className="progress-info">
          <span className="progress-title">今日进度</span>
          <span className="progress-count">{completedCount} / {totalCount}</span>
        </div>
        <div className="progress-bar">
          <div 
            className="progress-fill"
            style={{ width: `${(completedCount / totalCount) * 100}%` }}
          />
        </div>
        {completedCount === totalCount && (
          <div className="all-complete animate-bounce">
            🎉 全部完成！
          </div>
        )}
      </div>

      <div className="tasks-list">
        {progress.dailyTasks.map((task, index) => (
          <div 
            key={task.id} 
            className={`task-card ${task.completed ? 'completed' : ''}`}
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <div className="task-icon">
              {task.completed ? '✅' : '⏳'}
            </div>
            
            <div className="task-info">
              <h3 className="task-title">{task.title}</h3>
              <p className="task-desc">{task.description}</p>
              
              <div className="task-progress">
                <div className="task-progress-bar">
                  <div 
                    className="task-progress-fill"
                    style={{ width: `${(task.current / task.target) * 100}%` }}
                  />
                </div>
                <span className="task-progress-text">
                  {task.current} / {task.target}
                </span>
              </div>
            </div>

            <div className="task-reward">
              <span className="reward-label">奖励</span>
              <span className="reward-value">🎁 {task.reward}</span>
              {task.completed && (
                <button 
                  className="claim-btn"
                  onClick={() => claimReward(task.id, task.reward)}
                >
                  领取
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="streak-section">
        <div className="streak-card">
          <div className="streak-icon">🔥</div>
          <div className="streak-info">
            <span className="streak-label">连续学习</span>
            <span className="streak-value">{progress.streakDays} 天</span>
          </div>
        </div>
        
        <div className="tip-card">
          💡 小提示：每天坚持完成任务，道具奖励拿到手软！
        </div>
      </div>
    </div>
  );
};

export default DailyTasks;
