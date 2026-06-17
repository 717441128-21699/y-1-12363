import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import './ChildProfile.css';

const ChildProfile: React.FC = () => {
  const { setCurrentView, profiles, activeProfile, switchProfile, addProfile, removeProfile } = useGame();
  const [newName, setNewName] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  const handleAdd = () => {
    if (!newName.trim()) return;
    const profile = addProfile(newName.trim());
    switchProfile(profile.id);
    setNewName('');
    setShowAdd(false);
  };

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
