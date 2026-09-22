import React, { useState, useEffect, useCallback } from 'react';
import { AppId, GameScreen } from '../types';
import { getUserProfile, saveUsername } from '../services/firebase';
import type { User } from '../services/firebase';
import { GameLeaderboardShell } from './GameLeaderboardShell';

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
  'quick-draw', 'finger-sumo', 'pong', 'knife-flip', 'reversi', 'battleship', 'nim', 'tower-stacker', 'tetris'
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

  switch (activeApp) {
    case 'iq':
      return (
        <GameLeaderboardShell appId="iq">
          <IQGame 
            user={user}
            onBackToHub={handleBackToHub}
            username={customUsername}
            onUpdateUsername={handleUpdateUsername}
            onLogout={onLogout}
          />
        </GameLeaderboardShell>
      );
    case 'mine':
      return (
        <GameLeaderboardShell appId="mine">
          <MinesweeperGame 
            user={user}
            onBackToHub={handleBackToHub}
            username={customUsername}
            onUpdateUsername={handleUpdateUsername}
            onLogout={onLogout}
          />
        </GameLeaderboardShell>
      );
    case 'wordle':
      return (
        <GameLeaderboardShell appId="wordle">
          <WordleGame 
            user={user}
            onBackToHub={handleBackToHub}
            username={customUsername}
            onUpdateUsername={handleUpdateUsername}
            onLogout={onLogout}
          />
        </GameLeaderboardShell>
      );
    case 'angle':
      return (
        <GameLeaderboardShell appId="angle">
          <AngleGame 
            user={user}
            onBackToHub={handleBackToHub}
            username={customUsername}
            onUpdateUsername={handleUpdateUsername}
            onLogout={onLogout}
          />
        </GameLeaderboardShell>
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
        <GameLeaderboardShell appId="tic-tac-toe">
          <TicTacToeGame 
            user={user}
            onBackToHub={handleBackToHub}
            username={customUsername}
            onUpdateUsername={handleUpdateUsername}
            onLogout={onLogout}
          />
        </GameLeaderboardShell>
      );
    case 'connect-4':
      return (
        <GameLeaderboardShell appId="connect-4">
          <Connect4Game 
            user={user}
            onBackToHub={handleBackToHub}
            username={customUsername}
            onUpdateUsername={handleUpdateUsername}
            onLogout={onLogout}
          />
        </GameLeaderboardShell>
      );
    case 'color-memory':
      return (
        <GameLeaderboardShell appId="color-memory">
          <ColorMemoryComponent 
            onBackToHub={handleBackToHub}
            user={user}
            username={customUsername}
          />
        </GameLeaderboardShell>
      );
    case 'particle-physics':
      return (
        <ParticlePhysicsComponent 
          onBackToHub={handleBackToHub}
        />
      );
    case 'fruit-merge':
      return (
        <GameLeaderboardShell appId="fruit-merge">
          <FruitMergeGame 
            onBackToHub={handleBackToHub}
            user={user}
            username={customUsername}
          />
        </GameLeaderboardShell>
      );
    case 'checkers':
      return (
        <GameLeaderboardShell appId="checkers">
          <CheckersGame 
            onBackToHub={handleBackToHub}
            user={user}
            username={customUsername}
          />
        </GameLeaderboardShell>
      );
    case 'dots-and-boxes':
      return (
        <GameLeaderboardShell appId="dots-and-boxes">
          <DotsAndBoxesGame 
            onBackToHub={handleBackToHub}
            user={user}
            username={customUsername}
          />
        </GameLeaderboardShell>
      );
    case 'snake':
      return (
        <GameLeaderboardShell appId="snake">
          <SnakeGame 
            onBackToHub={handleBackToHub}
            user={user}
            username={customUsername}
          />
        </GameLeaderboardShell>
      );
    case 'brick-breaker':
      return (
        <GameLeaderboardShell appId="brick-breaker">
          <BrickBreakerGame 
            onBackToHub={handleBackToHub}
            user={user}
            username={customUsername}
          />
        </GameLeaderboardShell>
      );
    case 'game-2048':
      return (
        <GameLeaderboardShell appId="game-2048">
          <Game2048 
            onBackToHub={handleBackToHub}
            user={user}
            username={customUsername}
          />
        </GameLeaderboardShell>
      );
    case 'ultimate-tictactoe':
      return (
        <GameLeaderboardShell appId="ultimate-tictactoe">
          <UltimateTicTacToeGame 
            onBackToHub={handleBackToHub}
            user={user}
            username={customUsername}
          />
        </GameLeaderboardShell>
      );
    case 'simon':
      return (
        <GameLeaderboardShell appId="simon">
          <SimonGame 
            onBackToHub={handleBackToHub}
            user={user}
            username={customUsername}
          />
        </GameLeaderboardShell>
      );
    case 'quick-draw':
      return (
        <GameLeaderboardShell appId="quick-draw">
          <QuickDrawGame 
            onBackToHub={handleBackToHub}
            user={user}
            username={customUsername}
          />
        </GameLeaderboardShell>
      );
    case 'finger-sumo':
      return (
        <GameLeaderboardShell appId="finger-sumo">
          <FingerSumoGame 
            onBackToHub={handleBackToHub}
            user={user}
            username={customUsername}
          />
        </GameLeaderboardShell>
      );
    case 'pong':
      return (
        <GameLeaderboardShell appId="pong">
          <PongGame 
            onBackToHub={handleBackToHub}
            user={user}
            username={customUsername}
          />
        </GameLeaderboardShell>
      );
    case 'knife-flip':
      return (
        <GameLeaderboardShell appId="knife-flip">
          <KnifeFlipGame 
            onBackToHub={handleBackToHub}
            user={user}
            username={customUsername}
          />
        </GameLeaderboardShell>
      );
    case 'reversi':
      return (
        <GameLeaderboardShell appId="reversi">
          <ReversiGame 
            onBackToHub={handleBackToHub}
            user={user}
            username={customUsername}
          />
        </GameLeaderboardShell>
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
        <GameLeaderboardShell appId="nim">
          <NimGame 
            onBackToHub={handleBackToHub}
            user={user}
            username={customUsername}
          />
        </GameLeaderboardShell>
      );
    case 'tower-stacker':
      return (
        <GameLeaderboardShell appId="tower-stacker">
          <TowerStackerGame 
            onBackToHub={handleBackToHub}
            user={user}
            username={customUsername}
          />
        </GameLeaderboardShell>
      );
    case 'tetris':
      return (
        <GameLeaderboardShell appId="tetris">
          <TetrisGame 
            onBackToHub={handleBackToHub}
            user={user}
            username={customUsername}
          />
        </GameLeaderboardShell>
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
}
