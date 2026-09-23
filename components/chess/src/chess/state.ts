import { Chess } from 'chess.js';

export interface GameState {
    game: Chess;
    selectedSquare: string | null;
    activeMoveHighlights: Set<string>;
    lastMoveSquares: string[];
    isAnimating: boolean;

    gameMode: string;
    aiDifficulty: string;
    isFlipped: boolean;

    // Online Multiplayer State
    ws: WebSocket | null;
    onlineGameId: string | null;
    onlinePlayerColor: 'w' | 'b' | null;
    onlineStatus: 'idle' | 'searching' | 'matched' | 'ended';

    // Game Review State
    isReviewMode: boolean;
    reviewMoveIndex: number;
    reviewHistory: any[];
    moveEvaluations: { classification: string, label: string, badgeColor: string }[];

    stockfishWorker: Worker | null;
    stockfishReady: boolean;
}

export const gameState: GameState = {
    game: new Chess(),
    selectedSquare: null,
    activeMoveHighlights: new Set(),
    lastMoveSquares: [],
    isAnimating: false,

    gameMode: 'pvai-w',
    aiDifficulty: 'easy',
    isFlipped: false,

    ws: null,
    onlineGameId: null,
    onlinePlayerColor: null,
    onlineStatus: 'idle',

    isReviewMode: false,
    reviewMoveIndex: -1,
    reviewHistory: [],
    moveEvaluations: [],

    stockfishWorker: null,
    stockfishReady: false,
};
