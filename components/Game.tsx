import React, { useState, useEffect, useCallback } from 'react';
import { AppId, GameScreen } from '../types';
import { getUserProfile, saveUsername } from '../services/firebase';
import type { User } from '../services/firebase';

import HubScreen from './HubScreen';
import TacoGame from './TacoGame';
import IQGame from './IQGame'; 
import MinesweeperGame from './MinesweeperGame';
import WordleGame from './WordleGame';
import AngleGame from './AngleGame';
import MoreLessGame from './MoreLessGame';
import SpellingBeeGame from './SpellingBeeGame';
import TicTacToeGame from './TicTacToeGame';
import Connect4Game from './Connect4Game';
import ColorMemoryComponent from './ColorMemoryComponent';
import ParticlePhysicsComponent from './ParticlePhysicsComponent';
import FruitMergeGame from './FruitMergeGame';
import CheckersGame from './CheckersGame';
import DotsAndBoxesGame from './DotsAndBoxesGame';
import SnakeGame from './SnakeGame';
import BrickBreakerGame from './BrickBreakerGame';
import Game2048 from './Game2048';
import UltimateTicTacToeGame from './UltimateTicTacToeGame';
import SimonGame from './SimonGame';
import QuickDrawGame from './QuickDrawGame';
import FingerSumoGame from './FingerSumoGame';
import PongGame from './PongGame';
import KnifeFlipGame from './KnifeFlipGame';
import ReversiGame from './ReversiGame';
import BattleshipGame from './BattleshipGame';
import NimGame from './NimGame';
import TowerStackerGame from './TowerStackerGame';
import TetrisGame from './TetrisGame';
import ChessGame from './ChessGame';
import { GameLeaderboard } from './GameLeaderboard';

interface GameProps {
  user: User;
  onLogout: () => void;
  customUsername?: string | null;
  onUpdateUsername?: (name: string) => void;
  onGoogleSignIn?: () => Promise<void>;
}

const VALID_APPS: AppId[] = [
  'taco', 'iq', 'mine', 'wordle', 'angle', 'more-less', 
  'spelling-bee', 'tic-tac-toe', 'connect-4', 'color-memory', 
  'particle-physics', 'fruit-merge', 'checkers', 'dots-and-boxes',
  'snake', 'brick-breaker', 'game-2048', 'ultimate-tictactoe', 'simon',
  'quick-draw', 'finger-sumo', 'pong', 'knife-flip', 'reversi', 'battleship', 'nim', 'tower-stacker', 'tetris', 'chess'
];

export default function Game({ 
  user, 
  onLogout, 
  customUsername: propUsername, 
  onUpdateUsername, 
  onGoogleSignIn 
}: GameProps) {
  const [activeApp, setActiveApp] = useState<AppId>('taco');
  const [screen, setScreen] = useState<GameScreen>('hub');
  const [customUsername, setCustomUsername] = useState<string | null>(propUsername || null);

  useEffect(() => {
    if (propUsername !== undefined) {
      setCustomUsername(propUsername);
    }
  }, [propUsername]);

  useEffect(() => {
    const checkUser = async () => {
      if (user.isAnonymous || user.uid.startsWith('guest_')) {
        return;
      }
      const profile = await getUserProfile(user.uid);
      if (profile && profile.username) {
        setCustomUsername(profile.username);
      }
    };
    checkUser();
  }, [user]);

  const parseRoute = useCallback((hashStr: string): { app: AppId, screen: GameScreen } => {
    const clean = hashStr.replace(/^#\/?/, '').toLowerCase().trim();
    if (!clean || clean === 'hub') {
      return { app: 'taco', screen: 'hub' };
    }
    if (clean.startsWith('taco/')) {
      const sub = clean.replace('taco/', '');
      const validScreens: GameScreen[] = ['hub', 'start', 'mode-select', 'level-select', 'playing', 'speed-test-playing', 'speed-test-result', 'paused', 'game-over', 'level-complete', 'boss-intro'];
      if (validScreens.includes(sub as GameScreen)) {
        return { app: 'taco', screen: sub as GameScreen };
      }
      return { app: 'taco', screen: 'start' };
    }
    if (clean === 'taco') return { app: 'taco', screen: 'start' };

    if (VALID_APPS.includes(clean as AppId)) {
      return { app: clean as AppId, screen: 'hub' };
    }
    return { app: 'taco', screen: 'hub' };
  }, []);

  const navigateTo = useCallback((app: AppId, scr?: GameScreen, replace = false) => {
    const targetScreen = scr || (app === 'taco' ? 'hub' : 'hub');
    const hash = app === 'taco' ? (targetScreen === 'hub' ? '#/hub' : `#/taco/${targetScreen}`) : `#/${app}`;

    if (window.location.hash !== hash) {
      if (replace) {
        window.history.replaceState({ app, screen: targetScreen }, '', hash);
      } else {
        window.history.pushState({ app, screen: targetScreen }, '', hash);
      }
    }
    setActiveApp(app);
    if (scr) setScreen(scr);
  }, []);

  const handleBackToHub = useCallback(() => {
    setActiveApp('taco');
    setScreen('hub');
    if (window.location.hash !== '#/hub') {
      window.history.pushState({ app: 'taco', screen: 'hub' }, '', '#/hub');
    }
  }, []);

  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (e.state && e.state.app) {
        setActiveApp(e.state.app);
        if (e.state.screen) setScreen(e.state.screen);
      } else {
        const route = parseRoute(window.location.hash);
        setActiveApp(route.app);
        setScreen(route.screen);
      }
    };

    window.addEventListener('popstate', handlePopState);

    if (window.location.hash) {
      const initialRoute = parseRoute(window.location.hash);
      setActiveApp(initialRoute.app);
      setScreen(initialRoute.screen);
    } else {
      window.history.replaceState({ app: 'taco', screen: 'hub' }, '', '#/hub');
    }

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [parseRoute]);

  const handleUpdateUsername = async (name: string) => {
    setCustomUsername(name);
    if (onUpdateUsername) onUpdateUsername(name);
    try {
      await saveUsername(user.uid, name);
    } catch (err) {
      console.warn("Could not update username remotely, updated locally:", err);
    }
  };

  const handleLaunchGame = useCallback((appId: AppId) => {
    if (appId === 'taco') {
      navigateTo('taco', 'start');
    } else {
      navigateTo(appId);
    }
  }, [navigateTo]);

  if (activeApp === 'taco' && screen !== 'hub') {
    return (
      <TacoGame 
        user={user}
        onLogout={onLogout}
        customUsername={customUsername}
        onUpdateUsername={handleUpdateUsername}
        onBackToHub={handleBackToHub}
        initialScreen={screen}
        onScreenChange={(s) => navigateTo('taco', s)}
      />
    );
  }

  if (screen === 'hub') {
    return (
      <HubScreen 
        user={user} 
        onLaunchGame={handleLaunchGame}
        onLogout={onLogout}
        username={customUsername}
        onUpdateUsername={handleUpdateUsername}
        onGoogleSignIn={onGoogleSignIn}
      />
    );
  }

  const renderMinigame = (appId: AppId) => {
    switch (appId) {
      case 'iq':
        return (
          <IQGame 
            user={user}
            onBackToHub={handleBackToHub}
            username={customUsername}
            onUpdateUsername={handleUpdateUsername}
            onLogout={onLogout}
          />
        );
      case 'mine':
        return (
          <MinesweeperGame 
            user={user}
            onBackToHub={handleBackToHub}
            username={customUsername}
            onUpdateUsername={handleUpdateUsername}
            onLogout={onLogout}
          />
        );
      case 'wordle':
        return (
          <WordleGame 
            user={user}
            onBackToHub={handleBackToHub}
            username={customUsername}
            onUpdateUsername={handleUpdateUsername}
            onLogout={onLogout}
          />
        );
      case 'angle':
        return (
          <AngleGame 
            user={user}
            onBackToHub={handleBackToHub}
            username={customUsername}
            onUpdateUsername={handleUpdateUsername}
            onLogout={onLogout}
          />
        );
      case 'more-less':
        return (
          <MoreLessGame 
            user={user}
            onBackToHub={handleBackToHub}
            username={customUsername}
            onUpdateUsername={handleUpdateUsername}
            onLogout={onLogout}
          />
        );
      case 'spelling-bee':
        return (
          <SpellingBeeGame 
            user={user}
            onBackToHub={handleBackToHub}
            username={customUsername}
            onUpdateUsername={handleUpdateUsername}
            onLogout={onLogout}
          />
        );
      case 'tic-tac-toe':
        return (
          <TicTacToeGame 
            user={user}
            onBackToHub={handleBackToHub}
            username={customUsername}
            onUpdateUsername={handleUpdateUsername}
            onLogout={onLogout}
          />
        );
      case 'connect-4':
        return (
          <Connect4Game 
            user={user}
            onBackToHub={handleBackToHub}
            username={customUsername}
            onUpdateUsername={handleUpdateUsername}
            onLogout={onLogout}
          />
        );
      case 'color-memory':
        return (
          <ColorMemoryComponent 
            onBackToHub={handleBackToHub}
            user={user}
            username={customUsername}
          />
        );
      case 'particle-physics':
        return (
          <ParticlePhysicsComponent 
            onBackToHub={handleBackToHub}
          />
        );
      case 'fruit-merge':
        return (
          <FruitMergeGame 
            onBackToHub={handleBackToHub}
            user={user}
            username={customUsername}
          />
        );
      case 'checkers':
        return (
          <CheckersGame 
            onBackToHub={handleBackToHub}
            user={user}
            username={customUsername}
          />
        );
      case 'dots-and-boxes':
        return (
          <DotsAndBoxesGame 
            onBackToHub={handleBackToHub}
            user={user}
            username={customUsername}
          />
        );
      case 'snake':
        return (
          <SnakeGame 
            onBackToHub={handleBackToHub}
            user={user}
            username={customUsername}
          />
        );
      case 'brick-breaker':
        return (
          <BrickBreakerGame 
            onBackToHub={handleBackToHub}
            user={user}
            username={customUsername}
          />
        );
      case 'game-2048':
        return (
          <Game2048 
            onBackToHub={handleBackToHub}
            user={user}
            username={customUsername}
          />
        );
      case 'ultimate-tictactoe':
        return (
          <UltimateTicTacToeGame 
            onBackToHub={handleBackToHub}
            user={user}
            username={customUsername}
          />
        );
      case 'simon':
        return (
          <SimonGame 
            onBackToHub={handleBackToHub}
            user={user}
            username={customUsername}
          />
        );
      case 'quick-draw':
        return (
          <QuickDrawGame 
            onBackToHub={handleBackToHub}
            user={user}
            username={customUsername}
          />
        );
      case 'finger-sumo':
        return (
          <FingerSumoGame 
            onBackToHub={handleBackToHub}
            user={user}
            username={customUsername}
          />
        );
      case 'pong':
        return (
          <PongGame 
            onBackToHub={handleBackToHub}
            user={user}
            username={customUsername}
          />
        );
      case 'knife-flip':
        return (
          <KnifeFlipGame 
            onBackToHub={handleBackToHub}
            user={user}
            username={customUsername}
          />
        );
      case 'reversi':
        return (
          <ReversiGame 
            onBackToHub={handleBackToHub}
            user={user}
            username={customUsername}
          />
        );
      case 'battleship':
        return (
          <BattleshipGame 
            onBackToHub={handleBackToHub}
            user={user}
            username={customUsername}
          />
        );
      case 'nim':
        return (
          <NimGame 
            onBackToHub={handleBackToHub}
            user={user}
            username={customUsername}
          />
        );
      case 'tower-stacker':
        return (
          <TowerStackerGame 
            onBackToHub={handleBackToHub}
            user={user}
            username={customUsername}
          />
        );
      case 'tetris':
        return (
          <TetrisGame 
            onBackToHub={handleBackToHub}
            user={user}
            username={customUsername}
          />
        );
      case 'chess':
        return (
          <ChessGame 
            onBackToHub={handleBackToHub}
            user={user}
            username={customUsername}
          />
        );
      default:
        return (
          <HubScreen 
            user={user} 
            onLaunchGame={handleLaunchGame}
            onLogout={onLogout}
            username={customUsername}
            onUpdateUsername={handleUpdateUsername}
            onGoogleSignIn={onGoogleSignIn}
          />
        );
    }
  };

  return (
    <div className="w-screen h-screen flex overflow-hidden bg-black select-none font-sans relative">
      <div className="flex-1 h-full min-w-0 overflow-hidden relative">
        {renderMinigame(activeApp)}
      </div>
      <GameLeaderboard appId={activeApp} />
    </div>
  );
}
