import React, { useEffect } from 'react';
import '../styles/chess.css';
import { initGame } from '../chess/gameEngine';

export function ChessBoard() {
  useEffect(() => {
    initGame();
  }, []);

  return (
    <div className="app-main-container">
      {/* Hidden stubs for compatibility with any old selectors */}
      <div id="front-page-modal" className="hidden" style={{ display: 'none' }}>
        <div id="front-screen-1"></div>
        <div id="front-screen-2"></div>
      </div>
      <div id="matchmaking-modal" className="hidden" style={{ display: 'none' }}>
        <div id="matchmaking-title"></div>
        <div id="matchmaking-desc"></div>
        <div id="matchmaking-status-box"></div>
        <button id="btn-start-search" style={{ display: 'none' }}></button>
      </div>
      <div id="pvp-controls" className="hidden" style={{ display: 'none' }}></div>

      {/* Fixed Top-Right Resign Button during active match */}
      <button id="btn-resign" className="top-right-resign-btn hidden" title="Resign Game">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
          <line x1="4" y1="22" x2="4" y2="15" />
        </svg>
        <span>Resign</span>
      </button>

      {/* Left Area: Chessboard + Opponent Bar */}
      <div className="chess-board-area">
        <div className="board-and-players-wrapper">
          {/* Top Player Bar */}
          <div className="player-bar opponent-bar">
            <div className="player-avatar">👤</div>
            <div className="player-info">
              <span id="player-top-name" className="player-name">Opponent</span>
              <span id="player-top-rating" className="player-rating">1500 ELO</span>
            </div>
          </div>

          {/* The 2D Chess Board Container */}
          <div id="board-container" className="board-container-flex"></div>

          {/* Bottom Player Bar */}
          <div className="player-bar user-bar">
            <div className="player-avatar user-avatar">👤</div>
            <div className="player-info">
              <span id="player-bottom-name" className="player-name">You</span>
              <span id="player-bottom-rating" className="player-rating">1500 ELO</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Area: Sidebar */}
      <div id="right-sidebar" className="chess-right-sidebar">
        {/* View 1: Main Menu */}
        <div id="sidebar-main-menu" className="sidebar-view">
          <div className="sidebar-header">
            <div className="sidebar-logo">♟️</div>
            <h2 className="sidebar-title">Play Chess</h2>
          </div>
          <div className="sidebar-menu-list">
            <button id="btn-choice-pvp" className="sidebar-menu-btn pvp-btn">
              <div className="menu-btn-icon">⚡</div>
              <div className="menu-btn-text">
                <span className="menu-btn-title">Play Online</span>
                <span className="menu-btn-desc">Find an opponent of similar skill</span>
              </div>
            </button>

            <button id="btn-choice-bot" className="sidebar-menu-btn bot-btn">
              <div className="menu-btn-icon">🤖</div>
              <div className="menu-btn-text">
                <span className="menu-btn-title">Play Bots</span>
                <span className="menu-btn-desc">Challenge AI from Easy to Master</span>
              </div>
            </button>
          </div>
        </div>

        {/* View 2: Bots Menu */}
        <div id="sidebar-bots-menu" className="sidebar-view hidden">
          <div className="sidebar-header">
            <div className="sidebar-logo">🤖</div>
            <h2 className="sidebar-title">Play Bots</h2>
            <p className="sidebar-subtitle">Select Bot Level (Random Black or White)</p>
          </div>
          <div className="sidebar-bots-list">
            <button className="bot-card" data-diff="martin">
              <div className="bot-avatar">♟️</div>
              <div className="bot-info">
                <span className="bot-name">Martin (200)</span>
                <span className="bot-rating">Beginner • Relaxed</span>
              </div>
            </button>

            <button className="bot-card" data-diff="easy">
              <div className="bot-avatar">♞</div>
              <div className="bot-info">
                <span className="bot-name">Jimmy (800)</span>
                <span className="bot-rating">Casual • Friendly</span>
              </div>
            </button>

            <button className="bot-card" data-diff="medium">
              <div className="bot-avatar">♜</div>
              <div className="bot-info">
                <span className="bot-name">Nelson (1500)</span>
                <span className="bot-rating">Intermediate • Tactical</span>
              </div>
            </button>

            <button className="bot-card" data-diff="gm">
              <div className="bot-avatar">♛</div>
              <div className="bot-info">
                <span className="bot-name">Stockfish (0 ELO)</span>
                <span className="bot-rating">Max Engine • Level 20</span>
              </div>
            </button>
          </div>
          <button id="btn-bot-back" className="sidebar-back-btn">
            ← Back to Menu
          </button>
        </div>

        {/* View 3: Online Searching View */}
        <div id="sidebar-searching-view" className="sidebar-view hidden">
          <div className="sidebar-header">
            <div className="sidebar-logo">⚡</div>
            <h2 className="sidebar-title">Play Online</h2>
            <p className="sidebar-subtitle">Matchmaking in progress</p>
          </div>
          <div className="sidebar-searching-box">
            <div className="spinner searching-spinner"></div>
            <div id="matchmaking-spinner-text" className="searching-text">
              Searching for an opponent...
            </div>
          </div>
          <button id="btn-cancel-search" className="sidebar-back-btn">
            Cancel Search
          </button>
        </div>

        {/* View 4: Active Game View */}
        <div id="sidebar-active-game" className="sidebar-view hidden">
          <div className="sidebar-header">
            <div className="sidebar-logo">♔</div>
            <h2 className="sidebar-title">Live Match</h2>
          </div>
          
          <div className="sidebar-turn-status">
            <div id="status-dot" className="status-dot pulse"></div>
            <span id="status-text" className="status-text-val">White's Turn</span>
          </div>

          <div className="sidebar-game-actions">
            <button id="btn-sidebar-menu" className="sidebar-action-btn menu-btn">
              <span>← Main Menu</span>
            </button>
          </div>
        </div>
      </div>

      {/* Resign Confirmation Modal Overlay */}
      <div id="confirm-modal" className="modal-overlay">
        <div className="modal-card">
          <div className="modal-title">Resign Match?</div>
          <div className="modal-desc">
            Are you sure you want to resign this match?
          </div>
          <div style={{ display: 'flex', gap: '10px', marginTop: '20px', width: '100%' }}>
            <button id="btn-confirm-resign" className="btn-accent" style={{ flex: 1, padding: '12px', background: '#ef4444' }}>
              Confirm Resign
            </button>
            <button id="btn-cancel-resign" className="btn-secondary" style={{ flex: 1, padding: '12px', background: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)', color: '#fff', borderRadius: '10px', fontWeight: 600, cursor: 'pointer' }}>
              Cancel
            </button>
          </div>
        </div>
      </div>

      {/* Game Over Modal Overlay */}
      <div id="game-modal" className="modal-overlay toast">
        <div id="game-modal-card" className="modal-card">
          <div id="modal-title" className="modal-title">Checkmate!</div>
          <div id="modal-desc" className="modal-desc">White has won the game.</div>
          <div id="modal-actions">
            <button id="modal-restart-btn" className="btn-accent" style={{ width: '100%', padding: '12px' }}>
              Play Again
            </button>
          </div>
        </div>
      </div>

      {/* Review Sidebar */}
      <div id="review-sidebar" className="hidden review-sidebar-container">
        <div className="review-sidebar-header" onClick={() => {
          document.getElementById('review-sidebar')?.classList.toggle('collapsed');
        }}>
          <h2 style={{ color: '#fff', fontSize: '1.2rem', margin: 0, padding: 0 }}>Game Review</h2>
          <span className="collapse-icon">▼</span>
        </div>
        <div id="review-moves-list" className="review-moves-content">
          {/* Moves will be injected here dynamically */}
        </div>
      </div>

      {/* Review Panel (Bottom Controls) */}
      <div id="review-panel" className="ui-panel hidden" style={{ bottom: '20px', top: 'auto', left: '50%', transform: 'translateX(-50%)', justifyContent: 'center' }}>
        <button id="btn-review-prev" className="btn-secondary" style={{ padding: '10px 16px', fontSize: '1.2rem' }}>
          &larr;
        </button>
        <div id="review-status" style={{ color: '#fff', fontSize: '1rem', fontWeight: 600, padding: '0 20px', minWidth: '150px', textAlign: 'center' }}>
          Move 1 / 10
        </div>
        <button id="btn-review-next" className="btn-secondary" style={{ padding: '10px 16px', fontSize: '1.2rem' }}>
          &rarr;
        </button>
        <button id="btn-review-exit" className="btn-accent" style={{ marginLeft: '15px' }}>
          Exit Review
        </button>
      </div>
    </div>
  );
}
