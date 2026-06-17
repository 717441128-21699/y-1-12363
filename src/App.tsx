import React from 'react';
import { useGame } from './context/GameContext';
import Home from './components/Home';
import LevelSelect from './components/LevelSelect';
import GamePlay from './components/GamePlay';
import WordLibrary from './components/WordLibrary';
import ParentReport from './components/ParentReport';
import DailyTasks from './components/DailyTasks';
import FavoriteWords from './components/FavoriteWords';
import WrongWords from './components/WrongWords';

const App: React.FC = () => {
  const { currentView } = useGame();

  const renderView = () => {
    switch (currentView) {
      case 'home':
        return <Home />;
      case 'levels':
        return <LevelSelect />;
      case 'game':
        return <GamePlay />;
      case 'library':
        return <WordLibrary />;
      case 'tasks':
        return <DailyTasks />;
      case 'favorites':
        return <FavoriteWords />;
      case 'wrongWords':
        return <WrongWords />;
      case 'parent':
        return <ParentReport />;
      default:
        return <Home />;
    }
  };

  return (
    <div className="app-container">
      {renderView()}
    </div>
  );
};

export default App;
