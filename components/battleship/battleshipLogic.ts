export interface Ship {
  id: string;
  name: string;
  size: number;
  cells: number[]; // Grid indices 0..99
  hits: number[];
}

export type CellState = 'empty' | 'ship' | 'hit' | 'miss';

export const SHIPS_CONFIG = [
  { id: 'carrier', name: 'Carrier', size: 5 },
  { id: 'battleship', name: 'Battleship', size: 4 },
  { id: 'cruiser', name: 'Cruiser', size: 3 },
  { id: 'submarine', name: 'Submarine', size: 3 },
  { id: 'destroyer', name: 'Destroyer', size: 2 }
];

export const generateRandomFleet = (): Ship[] => {
  const ships: Ship[] = [];
  const occupied = new Set<number>();

  for (const cfg of SHIPS_CONFIG) {
    let placed = false;
    let attempts = 0;

    while (!placed && attempts < 200) {
      attempts++;
      const isHorizontal = Math.random() < 0.5;
      const r = Math.floor(Math.random() * 10);
      const c = Math.floor(Math.random() * 10);

      const cells: number[] = [];
      let canPlace = true;

      for (let i = 0; i < cfg.size; i++) {
        const nr = isHorizontal ? r : r + i;
        const nc = isHorizontal ? c + i : c;

        if (nr >= 10 || nc >= 10) {
          canPlace = false;
          break;
        }

        const idx = nr * 10 + nc;
        if (occupied.has(idx)) {
          canPlace = false;
          break;
        }
        cells.push(idx);
      }

      if (canPlace) {
        cells.forEach(idx => occupied.add(idx));
        ships.push({
          id: cfg.id,
          name: cfg.name,
          size: cfg.size,
          cells,
          hits: []
        });
        placed = true;
      }
    }
  }

  return ships;
};

// Smart Hunt & Target Bot Engine
export const getBotShot = (
  firedShots: { [idx: number]: 'hit' | 'miss' },
  enemyShips: Ship[],
  difficulty: 'easy' | 'medium' | 'hard',
  botTargetQueue: number[]
): { shotIdx: number; newQueue: number[] } => {
  const unfired: number[] = [];
  for (let i = 0; i < 100; i++) {
    if (!firedShots[i]) unfired.push(i);
  }
  if (unfired.length === 0) return { shotIdx: 0, newQueue: [] };

  // Identify all hit cells that belong to ships that are ALREADY sunk
  const sunkHitCells = new Set<number>();
  enemyShips.forEach(s => {
    if (s.hits.length === s.size) {
      s.hits.forEach(cell => sunkHitCells.add(cell));
    }
  });

  // Active unsunk hits that need finishing off
  const activeHits = Object.keys(firedShots)
    .map(Number)
    .filter(idx => firedShots[idx] === 'hit' && !sunkHitCells.has(idx));

  let queue = [...botTargetQueue].filter(idx => !firedShots[idx] && idx >= 0 && idx < 100);

  // TARGET MODE: When there are active unsunk hits on the board
  if (activeHits.length > 0) {
    // 1. If 2 or more hits belong to the same active ship, detect line direction and attack ends
    if (activeHits.length >= 2) {
      const rows = activeHits.map(idx => Math.floor(idx / 10));
      const cols = activeHits.map(idx => idx % 10);
      const sameRow = rows.every(r => r === rows[0]);
      const sameCol = cols.every(c => c === cols[0]);

      if (sameRow) {
        const r = rows[0];
        const minCol = Math.min(...cols);
        const maxCol = Math.max(...cols);
        const lineCandidates: number[] = [];
        if (minCol > 0 && !firedShots[r * 10 + (minCol - 1)]) {
          lineCandidates.push(r * 10 + (minCol - 1));
        }
        if (maxCol < 9 && !firedShots[r * 10 + (maxCol + 1)]) {
          lineCandidates.push(r * 10 + (maxCol + 1));
        }
        if (lineCandidates.length > 0) {
          const shot = lineCandidates[0];
          const remainingQueue = [
            ...lineCandidates.slice(1),
            ...queue.filter(q => q !== shot && !lineCandidates.includes(q))
          ];
          return { shotIdx: shot, newQueue: remainingQueue };
        }
      } else if (sameCol) {
        const c = cols[0];
        const minRow = Math.min(...rows);
        const maxRow = Math.max(...rows);
        const lineCandidates: number[] = [];
        if (minRow > 0 && !firedShots[(minRow - 1) * 10 + c]) {
          lineCandidates.push((minRow - 1) * 10 + c);
        }
        if (maxRow < 9 && !firedShots[(maxRow + 1) * 10 + c]) {
          lineCandidates.push((maxRow + 1) * 10 + c);
        }
        if (lineCandidates.length > 0) {
          const shot = lineCandidates[0];
          const remainingQueue = [
            ...lineCandidates.slice(1),
            ...queue.filter(q => q !== shot && !lineCandidates.includes(q))
          ];
          return { shotIdx: shot, newQueue: remainingQueue };
        }
      }
    }

    // 2. Consume existing target queue from previous hits
    while (queue.length > 0) {
      const candidate = queue.shift()!;
      if (!firedShots[candidate] && candidate >= 0 && candidate < 100) {
        return { shotIdx: candidate, newQueue: queue };
      }
    }

    // 3. Queue was empty but unsunk hits exist: gather all adjacent orthogonal cells
    const freshNeighbors: number[] = [];
    for (const hit of activeHits) {
      const adj = getAdjacentCells(hit).filter(n => !firedShots[n]);
      freshNeighbors.push(...adj);
    }
    const uniqueNeighbors = Array.from(new Set(freshNeighbors));
    if (uniqueNeighbors.length > 0) {
      const shot = uniqueNeighbors[0];
      return { shotIdx: shot, newQueue: uniqueNeighbors.slice(1) };
    }
  }

  // Check remaining queue
  while (queue.length > 0) {
    const candidate = queue.shift()!;
    if (!firedShots[candidate] && candidate >= 0 && candidate < 100) {
      return { shotIdx: candidate, newQueue: queue };
    }
  }

  // HUNT MODE: Parity search and probability density
  const survivingSizes = enemyShips
    .filter(s => s.hits.length < s.size)
    .map(s => s.size);

  const minShipSize = survivingSizes.length > 0 ? Math.min(...survivingSizes) : 2;

  if (difficulty === 'easy') {
    // Parity / checkerboard
    const parityCandidates = unfired.filter(idx => {
      const r = Math.floor(idx / 10);
      const c = idx % 10;
      return (r + c) % 2 === 0;
    });
    const pool = parityCandidates.length > 0 ? parityCandidates : unfired;
    const randomIdx = pool[Math.floor(Math.random() * pool.length)];
    return { shotIdx: randomIdx, newQueue: [] };
  }

  // Medium / Hard: Probability Density Mapping
  const probability = new Array(100).fill(0);

  for (const size of survivingSizes) {
    // Test horizontal
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c <= 10 - size; c++) {
        let valid = true;
        const span: number[] = [];
        for (let i = 0; i < size; i++) {
          const idx = r * 10 + (c + i);
          if (firedShots[idx] === 'miss' || sunkHitCells.has(idx)) {
            valid = false;
            break;
          }
          span.push(idx);
        }
        if (valid) {
          span.forEach(idx => {
            if (!firedShots[idx]) {
              probability[idx] += 1;
              if ((Math.floor(idx / 10) + (idx % 10)) % minShipSize === 0) {
                probability[idx] += 2;
              }
            }
          });
        }
      }
    }

    // Test vertical
    for (let r = 0; r <= 10 - size; r++) {
      for (let c = 0; c < 10; c++) {
        let valid = true;
        const span: number[] = [];
        for (let i = 0; i < size; i++) {
          const idx = (r + i) * 10 + c;
          if (firedShots[idx] === 'miss' || sunkHitCells.has(idx)) {
            valid = false;
            break;
          }
          span.push(idx);
        }
        if (valid) {
          span.forEach(idx => {
            if (!firedShots[idx]) {
              probability[idx] += 1;
              if ((Math.floor(idx / 10) + (idx % 10)) % minShipSize === 0) {
                probability[idx] += 2;
              }
            }
          });
        }
      }
    }
  }

  let maxScore = -1;
  let bestCandidates: number[] = [];

  for (const idx of unfired) {
    if (probability[idx] > maxScore) {
      maxScore = probability[idx];
      bestCandidates = [idx];
    } else if (probability[idx] === maxScore) {
      bestCandidates.push(idx);
    }
  }

  const chosen = bestCandidates.length > 0
    ? bestCandidates[Math.floor(Math.random() * bestCandidates.length)]
    : unfired[Math.floor(Math.random() * unfired.length)];

  return { shotIdx: chosen, newQueue: [] };
};

export const getAdjacentCells = (idx: number): number[] => {
  const r = Math.floor(idx / 10);
  const c = idx % 10;
  const neighbors: number[] = [];
  if (r > 0) neighbors.push((r - 1) * 10 + c);
  if (r < 9) neighbors.push((r + 1) * 10 + c);
  if (c > 0) neighbors.push(r * 10 + (c - 1));
  if (c < 9) neighbors.push(r * 10 + (c + 1));
  return neighbors;
};
