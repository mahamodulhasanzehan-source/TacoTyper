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

      {/* Top Floating Toolbar for Quick In-Game Controls */}
      <div className="chess-toolbar">
        <button id="btn-sound-toggle" className="chess-toolbar-btn" type="button" title="Toggle Sound">
          <span id="sound-icon" className="chess-btn-icon">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
            </svg>
          </span>
          <span className="chess-toolbar-label hidden sm:inline">Sound</span>
        </button>
        <button id="btn-flip-board" className="chess-toolbar-btn" type="button" title="Flip Board Perspective">
          <span className="chess-btn-icon">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
            </svg>
          </span>
          <span className="chess-toolbar-label hidden sm:inline">Flip</span>
        </button>
        <button id="btn-resign" className="chess-toolbar-btn resign-toolbar-btn hidden" type="button" title="Resign Game">
          <span className="chess-btn-icon">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
              <line x1="4" y1="22" x2="4" y2="15" />
            </svg>
          </span>
          <span>Resign</span>
        </button>
      </div>

      {/* Main Area: Chessboard + Opponent Bar + In-Board Turn Pill */}
      <div className="chess-board-area">
        <div className="board-and-players-wrapper">
          {/* Top Player Bar */}
          <div className="player-bar opponent-bar">
            <div className="player-avatar">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            </div>
            <div className="player-info">
              <span id="player-top-name" className="player-name">Opponent</span>
              <span id="player-top-rating" className="player-rating">1500 ELO</span>
            </div>
            <div id="player-top-badge" className="player-side-badge">Black</div>
          </div>

          {/* Active Turn Status Pill (Visible live during gameplay & review) */}
          <div id="turn-status-container" className="turn-status-pill">
            <div id="status-dot" className="status-dot pulse"></div>
            <span id="status-text" className="status-text-val">White's Turn</span>
          </div>

          {/* The 2D Chess Board Container */}
          <div id="board-container" className="board-container-flex"></div>

          {/* Bottom Player Bar */}
          <div className="player-bar user-bar">
            <div className="player-avatar user-avatar">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            </div>
            <div className="player-info">
              <span id="player-bottom-name" className="player-name">You</span>
              <span id="player-bottom-rating" className="player-rating">1500 ELO</span>
            </div>
            <div id="player-bottom-badge" className="player-side-badge user">White</div>
          </div>
        </div>
      </div>

      {/* Sidebar: Desktop right panel / Mobile zero-scroll docked dock */}
      <div id="right-sidebar" className="chess-right-sidebar">
        {/* View 1: Main Menu */}
        <div id="sidebar-main-menu" className="sidebar-view">
          <div className="sidebar-header">
            <div className="sidebar-logo">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14"></path>
              </svg>
            </div>
            <h2 className="sidebar-title">Play Chess</h2>
            <p className="sidebar-subtitle">Select a mode to begin</p>
          </div>
          <div className="sidebar-menu-list">
            <button id="btn-choice-pvp" className="sidebar-menu-btn pvp-btn" type="button">
              <div className="menu-btn-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                </svg>
              </div>
              <div className="menu-btn-text">
                <span className="menu-btn-title">Play Online</span>
                <span className="menu-btn-desc">Random opponent</span>
              </div>
            </button>

            <button id="btn-choice-bot" className="sidebar-menu-btn bot-btn" type="button">
              <div className="menu-btn-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="4" y="4" width="16" height="16" rx="2"></rect>
                  <rect x="9" y="9" width="6" height="6"></rect>
                  <line x1="9" y1="1" x2="9" y2="4"></line>
                  <line x1="15" y1="1" x2="15" y2="4"></line>
                  <line x1="9" y1="20" x2="9" y2="23"></line>
                  <line x1="15" y1="20" x2="15" y2="23"></line>
                  <line x1="20" y1="9" x2="23" y2="9"></line>
                  <line x1="20" y1="14" x2="23" y2="14"></line>
                  <line x1="1" y1="9" x2="4" y2="9"></line>
                  <line x1="1" y1="14" x2="4" y2="14"></line>
                </svg>
              </div>
              <div className="menu-btn-text">
                <span className="menu-btn-title">Play Bots</span>
                <span className="menu-btn-desc">4 AI difficulty levels</span>
              </div>
            </button>
          </div>
        </div>

        {/* View 2: Bots Menu */}
        <div id="sidebar-bots-menu" className="sidebar-view hidden">
          <div className="sidebar-header">
            <div className="sidebar-logo">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="4" y="4" width="16" height="16" rx="2"></rect>
                <circle cx="9" cy="10" r="1"></circle>
                <circle cx="15" cy="10" r="1"></circle>
                <path d="M9 15h6"></path>
              </svg>
            </div>
            <h2 className="sidebar-title">Select Bot Level</h2>
            <p className="sidebar-subtitle">Random piece color assigned</p>
          </div>
          <div className="sidebar-bots-list">
            <button className="bot-card" data-diff="martin" type="button">
              <div className="bot-avatar text-emerald-400">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="7" r="4"></circle>
                  <path d="M7 21h10M9 21v-4a3 3 0 0 1 6 0v4"></path>
                </svg>
              </div>
              <div className="bot-info">
                <span className="bot-name">Martin (200)</span>
                <span className="bot-rating">Beginner</span>
              </div>
            </button>

            <button className="bot-card" data-diff="easy" type="button">
              <div className="bot-avatar text-sky-400">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 19H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h3l2-2h4l2 2h3a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
              </div>
              <div className="bot-info">
                <span className="bot-name">Jimmy (800)</span>
                <span className="bot-rating">Casual</span>
              </div>
            </button>

            <button className="bot-card" data-diff="medium" type="button">
              <div className="bot-avatar text-amber-400">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 21h14M7 21V9l5-4 5 4v12"></path>
                  <line x1="10" y1="12" x2="14" y2="12"></line>
                </svg>
              </div>
              <div className="bot-info">
                <span className="bot-name">Nelson (1500)</span>
                <span className="bot-rating">Tactical</span>
              </div>
            </button>

            <button className="bot-card" data-diff="gm" type="button">
              <div className="bot-avatar text-rose-400">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14"></path>
                </svg>
              </div>
              <div className="bot-info">
                <span className="bot-name">Stockfish</span>
                <span className="bot-rating">Level 20 Master</span>
              </div>
            </button>
          </div>
          <button id="btn-bot-back" className="sidebar-back-btn" type="button">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            <span>Back to Menu</span>
          </button>
        </div>

        {/* View 3: Online Searching View */}
        <div id="sidebar-searching-view" className="sidebar-view hidden">
          <div className="sidebar-header">
            <div className="sidebar-logo">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
              </svg>
            </div>
            <h2 className="sidebar-title">Play Online</h2>
            <p className="sidebar-subtitle">Matchmaking in progress</p>
          </div>
          <div className="sidebar-searching-box">
            <div className="spinner searching-spinner"></div>
            <div id="matchmaking-spinner-text" className="searching-text">
              Searching for an opponent...
            </div>
          </div>
          <button id="btn-cancel-search" className="sidebar-back-btn" type="button">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
            <span>Cancel Search</span>
          </button>
        </div>

        {/* View 4: Active Game View */}
        <div id="sidebar-active-game" className="sidebar-view hidden">
          <div className="sidebar-header">
            <div className="sidebar-logo">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f4b400" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14"></path>
              </svg>
            </div>
            <h2 className="sidebar-title">Live Match</h2>
          </div>
          <div className="sidebar-game-actions">
            <button id="btn-sidebar-menu" className="sidebar-action-btn menu-btn" type="button">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
              </svg>
              <span>Main Menu</span>
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
