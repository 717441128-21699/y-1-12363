import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import './ChildProfile.css';

const ChildProfile: React.FC = () => {
  const { setCurrentView, profiles, activeProfile, switchProfile, addProfile, removeProfile, weeklyGoal, setWeeklyGoal } = useGame();
  const [newName, setNewName] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [showGoalEdit, setShowGoalEdit] = useState(false);
  const [goalWord, setGoalWord] = useState(String(weeklyGoal?.wordTarget || 5));
  const [goalPhrase, setGoalPhrase] = useState(String(weeklyGoal?.phraseTarget || 5));

  const handleAdd = () => {
    if (!newName.trim()) return;
    const profile = addProfile(newName.trim());
    switchProfile(profile.id);
    setNewName('');
    setShowAdd(false);
  };

  const handleSaveGoal = () => {
    setWeeklyGoal({
      wordTarget: parseInt(goalWord) || 5,
      phraseTarget: parseInt(goalPhrase) || 5
    });
    setShowGoalEdit(false);
  };

  const wordPct = weeklyGoal && weeklyGoal.wordTarget > 0
    ? Math.min(100, Math.round(weeklyGoal.wordDone / weeklyGoal.wordTarget * 100)) : 0;
  const phrasePct = weeklyGoal && weeklyGoal.phraseTarget > 0
    ? Math.min(100, Math.round(weeklyGoal.phraseDone / weeklyGoal.phraseTarget * 100)) : 0;

  return (
    <div className="profile-container">
      <div className="profile-header">
        <button className="back-btn" onClick={() => setCurrentView('home')}>
          ← 返回
        </button>
        <h2>👶 儿童档案</h2>
        <div style={{ width: 80 }} />
      </div>

      <div className="profile-current">
        <span className="current-label">当前</span>
        <span className="current-avatar">{activeProfile?.avatar || '👦'}</span>
        <span className="current-name">{activeProfile?.name || '默认用户'}</span>
      </div>

      {weeklyGoal && (
        <div className="goal-section">
          <div className="goal-header">
            <span>📅 本周目标</span>
            <button className="goal-edit-btn" onClick={() => {
              setGoalWord(String(weeklyGoal.wordTarget));
              setGoalPhrase(String(weeklyGoal.phraseTarget));
              setShowGoalEdit(true);
            }}>
              ✏️ 设置
            </button>
          </div>
          <div className="goal-row">
            <span className="goal-label">🎮 单词闯关</span>
            <div className="goal-bar-wrap">
              <div className="goal-bar word" style={{ width: `${wordPct}%` }} />
            </div>
            <span className="goal-pct">{weeklyGoal.wordDone}/{weeklyGoal.wordTarget}</span>
          </div>
          <div className="goal-row">
            <span className="goal-label">🔗 短语连读</span>
            <div className="goal-bar-wrap">
              <div className="goal-bar phrase" style={{ width: `${phrasePct}%` }} />
            </div>
            <span className="goal-pct">{weeklyGoal.phraseDone}/{weeklyGoal.phraseTarget}</span>
          </div>
        </div>
      )}

      {showGoalEdit && (
        <div className="goal-form">
          <div className="goal-form-title">设置周目标</div>
          <div className="goal-form-row">
            <span>🎮 单词次数</span>
            <input type="number" className="goal-input" value={goalWord} onChange={e => setGoalWord(e.target.value)} min={1} max={50} />
          </div>
          <div className="goal-form-row">
            <span>🔗 短语次数</span>
            <input type="number" className="goal-input" value={goalPhrase} onChange={e => setGoalPhrase(e.target.value)} min={1} max={50} />
          </div>
          <div className="form-buttons">
            <button className="btn btn-primary" onClick={handleSaveGoal}>✓ 保存</button>
            <button className="btn btn-secondary" onClick={() => setShowGoalEdit(false)}>取消</button>
          </div>
        </div>
      )}

      <div className="profile-list">
        <div
          className={`profile-item ${!activeProfile ? 'active' : ''}`}
          onClick={() => {
            localStorage.removeItem('english_rhythm_active_profile');
            window.location.reload();
          }}
        >
          <span className="profile-avatar">👦</span>
          <span className="profile-name">默认用户</span>
          {!activeProfile && <span className="active-mark">✓</span>}
        </div>

        {profiles.map(profile => (
          <div
            key={profile.id}
            className={`profile-item ${activeProfile?.id === profile.id ? 'active' : ''}`}
            onClick={() => switchProfile(profile.id)}
          >
            <span className="profile-avatar">{profile.avatar}</span>
            <div className="profile-info">
              <span className="profile-name">{profile.name}</span>
              <span className="profile-date">创建于 {profile.createdAt}</span>
            </div>
            {activeProfile?.id === profile.id && <span className="active-mark">✓</span>}
            {profiles.length > 1 && activeProfile?.id !== profile.id && (
              <button
                className="delete-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(`确定删除 ${profile.name} 的档案吗？所有学习数据将丢失。`)) {
                    removeProfile(profile.id);
                  }
                }}
              >
                🗑️
              </button>
            )}
          </div>
        ))}
      </div>

      {!showAdd ? (
        <button className="add-profile-btn" onClick={() => setShowAdd(true)}>
          ➕ 添加新档案
        </button>
      ) : (
        <div className="add-form">
          <input
            type="text"
            placeholder="输入孩子姓名..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="name-input"
            maxLength={10}
            autoFocus
          />
          <div className="form-buttons">
            <button className="btn btn-primary" onClick={handleAdd} disabled={!newName.trim()}>
              ✓ 创建
            </button>
            <button className="btn btn-secondary" onClick={() => { setShowAdd(false); setNewName(''); }}>
              取消
            </button>
          </div>
        </div>
      )}

      <div className="profile-notice">
        💡 切换档案后，星星、任务、错词和连读记录互不影响
      </div>
    </div>
  );
};

export default ChildProfile;
