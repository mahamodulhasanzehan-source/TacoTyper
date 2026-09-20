export type Disc = 'B' | 'W' | null;
export type Board = Disc[];

export const DIRECTIONS = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1],           [0, 1],
  [1, -1],  [1, 0],  [1, 1]
];

export const getInitialBoard = (): Board => {
  const b: Board = Array(64).fill(null);
  // Center 4 discs:
  // Row 3 (index 24..31): col 3 (index 27) = W, col 4 (index 28) = B
  // Row 4 (index 32..39): col 3 (index 35) = B, col 4 (index 36) = W
  b[3 * 8 + 3] = 'W';
  b[3 * 8 + 4] = 'B';
  b[4 * 8 + 3] = 'B';
  b[4 * 8 + 4] = 'W';
  return b;
};

export const getFlipsForMove = (board: Board, idx: number, color: 'B' | 'W'): number[] => {
  if (board[idx] !== null) return [];
  const opp: Disc = color === 'B' ? 'W' : 'B';
  const r = Math.floor(idx / 8);
  const c = idx % 8;
  const flips: number[] = [];

  for (const [dr, dc] of DIRECTIONS) {
    let nr = r + dr;
    let nc = c + dc;
    const path: number[] = [];

    while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
      const nIdx = nr * 8 + nc;
      if (board[nIdx] === opp) {
        path.push(nIdx);
      } else if (board[nIdx] === color) {
        if (path.length > 0) {
          flips.push(...path);
        }
        break;
      } else {
        break;
      }
      nr += dr;
      nc += dc;
    }
  }

  return flips;
};

export const getLegalMoves = (board: Board, color: 'B' | 'W'): { idx: number; flips: number[] }[] => {
  const moves: { idx: number; flips: number[] }[] = [];
  for (let i = 0; i < 64; i++) {
    if (board[i] === null) {
      const flips = getFlipsForMove(board, i, color);
      if (flips.length > 0) {
        moves.push({ idx: i, flips });
      }
    }
  }
  return moves;
};

export const applyMove = (board: Board, idx: number, flips: number[], color: 'B' | 'W'): Board => {
  const next = [...board];
  next[idx] = color;
  for (const f of flips) {
    next[f] = color;
  }
  return next;
};

// 8x8 Positional Heatmap
const POSITION_WEIGHTS = [
  100, -20,  10,   5,   5,  10, -20, 100,
  -20, -50,  -2,  -2,  -2,  -2, -50, -20,
   10,  -2,  -1,  -1,  -1,  -1,  -2,  10,
    5,  -2,  -1,   0,   0,  -1,  -2,   5,
    5,  -2,  -1,   0,   0,  -1,  -2,   5,
   10,  -2,  -1,  -1,  -1,  -1,  -2,  10,
  -20, -50,  -2,  -2,  -2,  -2, -50, -20,
  100, -20,  10,   5,   5,  10, -20, 100
];

export const evaluateBoard = (board: Board, color: 'B' | 'W'): number => {
  const opp: 'B' | 'W' = color === 'B' ? 'W' : 'B';
  let posScore = 0;
  let pieceCount = 0;
  let oppPieceCount = 0;

  for (let i = 0; i < 64; i++) {
    if (board[i] === color) {
      posScore += POSITION_WEIGHTS[i];
      pieceCount++;
    } else if (board[i] === opp) {
      posScore -= POSITION_WEIGHTS[i];
      oppPieceCount++;
    }
  }

  // Mobility evaluation
  const myMoves = getLegalMoves(board, color).length;
  const oppMoves = getLegalMoves(board, opp).length;
  const mobility = 10 * (myMoves - oppMoves);

  // In endgame, piece count takes priority
  const total = pieceCount + oppPieceCount;
  if (total > 50) {
    return (pieceCount - oppPieceCount) * 10 + posScore;
  }

  return posScore + mobility;
};

export const getBotMove = (
  board: Board,
  botColor: 'B' | 'W',
  difficulty: 'easy' | 'medium' | 'hard'
): number | null => {
  const legalMoves = getLegalMoves(board, botColor);
  if (legalMoves.length === 0) return null;

  if (difficulty === 'easy') {
    // Random move
    const r = Math.floor(Math.random() * legalMoves.length);
    return legalMoves[r].idx;
  }

  if (difficulty === 'medium') {
    // Greedy heuristic: flips most pieces
    let best = legalMoves[0];
    for (const m of legalMoves) {
      if (m.flips.length > best.flips.length) {
        best = m;
      }
    }
    return best.idx;
  }

  // Hard: Minimax with Alpha-Beta pruning (depth 3)
  const oppColor: 'B' | 'W' = botColor === 'B' ? 'W' : 'B';

  const minimax = (b: Board, depth: number, alpha: number, beta: number, isMaximizing: boolean): number => {
    if (depth === 0) {
      return evaluateBoard(b, botColor);
    }

    const currentTurn = isMaximizing ? botColor : oppColor;
    const moves = getLegalMoves(b, currentTurn);

    if (moves.length === 0) {
      // Check if opponent also has no moves -> game over
      const nextMoves = getLegalMoves(b, isMaximizing ? oppColor : botColor);
      if (nextMoves.length === 0) {
        return evaluateBoard(b, botColor);
      }
      return minimax(b, depth - 1, alpha, beta, !isMaximizing);
    }

    if (isMaximizing) {
      let maxEval = -Infinity;
      for (const m of moves) {
        const nextBoard = applyMove(b, m.idx, m.flips, botColor);
        const evalVal = minimax(nextBoard, depth - 1, alpha, beta, false);
        maxEval = Math.max(maxEval, evalVal);
        alpha = Math.max(alpha, evalVal);
        if (beta <= alpha) break;
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (const m of moves) {
        const nextBoard = applyMove(b, m.idx, m.flips, oppColor);
        const evalVal = minimax(nextBoard, depth - 1, alpha, beta, true);
        minEval = Math.min(minEval, evalVal);
        beta = Math.min(beta, evalVal);
        if (beta <= alpha) break;
      }
      return minEval;
    }
  };

  let bestMove = legalMoves[0].idx;
  let bestScore = -Infinity;

  for (const m of legalMoves) {
    const nextBoard = applyMove(board, m.idx, m.flips, botColor);
    const score = minimax(nextBoard, 3, -Infinity, Infinity, false);
    if (score > bestScore) {
      bestScore = score;
      bestMove = m.idx;
    }
  }

  return bestMove;
};
