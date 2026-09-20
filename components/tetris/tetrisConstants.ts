export type TetrominoType = 'I' | 'J' | 'L' | 'O' | 'S' | 'T' | 'Z';

export interface Tetromino {
  type: TetrominoType;
  shape: number[][];
  color: string;
}

export const TETROMINOES: Record<TetrominoType, { shape: number[][]; color: string }> = {
  I: {
    shape: [
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
      [0, 0, 0, 0]
    ],
    color: '#06b6d4' // Cyan
  },
  J: {
    shape: [
      [1, 0, 0],
      [1, 1, 1],
      [0, 0, 0]
    ],
    color: '#3b82f6' // Blue
  },
  L: {
    shape: [
      [0, 0, 1],
      [1, 1, 1],
      [0, 0, 0]
    ],
    color: '#f97316' // Orange
  },
  O: {
    shape: [
      [1, 1],
      [1, 1]
    ],
    color: '#eab308' // Yellow
  },
  S: {
    shape: [
      [0, 1, 1],
      [1, 1, 0],
      [0, 0, 0]
    ],
    color: '#10b981' // Green
  },
  T: {
    shape: [
      [0, 1, 0],
      [1, 1, 1],
      [0, 0, 0]
    ],
    color: '#a855f7' // Purple
  },
  Z: {
    shape: [
      [1, 1, 0],
      [0, 1, 1],
      [0, 0, 0]
    ],
    color: '#ef4444' // Red
  }
};

export const getRandomTetromino = (): Tetromino => {
  const types: TetrominoType[] = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];
  const t = types[Math.floor(Math.random() * types.length)];
  return {
    type: t,
    shape: TETROMINOES[t].shape.map(row => [...row]),
    color: TETROMINOES[t].color
  };
};

export const rotateMatrix = (matrix: number[][]): number[][] => {
  const n = matrix.length;
  const result: number[][] = [];
  for (let i = 0; i < n; i++) {
    result.push([]);
    for (let j = 0; j < n; j++) {
      result[i][j] = matrix[n - 1 - j][i];
    }
  }
  return result;
};

export const checkCollision = (
  shape: number[][],
  posX: number,
  posY: number,
  board: (string | null)[][]
): boolean => {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (shape[r][c] !== 0) {
        const boardX = posX + c;
        const boardY = posY + r;

        // Wall collisions
        if (boardX < 0 || boardX >= 10 || boardY >= 20) {
          return true;
        }

        // Locked pieces collision
        if (boardY >= 0 && board[boardY][boardX] !== null) {
          return true;
        }
      }
    }
  }
  return false;
};
