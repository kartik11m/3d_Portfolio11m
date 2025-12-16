import React from 'react';
import './StartMenu.css';

const StartMenu = ({ visible, onStart, onShowLicense, onShowResume }) => {
  if (!visible) return null;

  return (
    <div className="start-overlay">
      <div className="start-panel">
        <h1 className="start-title">Welcome to Kartik's Portfolio</h1>
        <div className="start-buttons">
          <button className="btn primary" onClick={onStart}>Start</button>
          <button className="btn" onClick={onShowLicense}>Driver's License</button>
          <button className="btn" onClick={onShowResume}>Resume</button>
        </div>
        <div className="start-footer">Use ArrowUp / ArrowDown to control speed</div>
      </div>
    </div>
  );
};

export default StartMenu;
