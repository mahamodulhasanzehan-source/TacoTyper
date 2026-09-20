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

// Bot Shot Selection Engine
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

  // If there's an ongoing target queue from recent hits (Medium / Hard)
  let queue = [...botTargetQueue];
  while (queue.length > 0) {
    const candidate = queue.shift()!;
    if (!firedShots[candidate] && candidate >= 0 && candidate < 100) {
      return { shotIdx: candidate, newQueue: queue };
    }
  }

  if (difficulty === 'easy') {
    // Pure random guess among unfired
    const randomIdx = unfired[Math.floor(Math.random() * unfired.length)];
    return { shotIdx: randomIdx, newQueue: [] };
  }

  if (difficulty === 'medium') {
    // Parity / Checkerboard search (r + c) % 2 === 0
    const parityCandidates = unfired.filter(idx => {
      const r = Math.floor(idx / 10);
      const c = idx % 10;
      return (r + c) % 2 === 0;
    });

    const chosen = parityCandidates.length > 0
      ? parityCandidates[Math.floor(Math.random() * parityCandidates.length)]
      : unfired[Math.floor(Math.random() * unfired.length)];

    return { shotIdx: chosen, newQueue: [] };
  }

  // Hard: Probability Density Mapping
  // Calculate which remaining unfired cells can fit surviving ships
  const survivingSizes = enemyShips
    .filter(s => s.hits.length < s.size)
    .map(s => s.size);

  const probability = new Array(100).fill(0);

  for (const size of survivingSizes) {
    // Test horizontal
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c <= 10 - size; c++) {
        let valid = true;
        const span: number[] = [];
        for (let i = 0; i < size; i++) {
          const idx = r * 10 + (c + i);
          if (firedShots[idx] === 'miss') {
            valid = false;
            break;
          }
          span.push(idx);
        }
        if (valid) {
          span.forEach(idx => {
            if (!firedShots[idx]) probability[idx] += 1;
            // Boost if adjacent to an unsunk hit
            if (firedShots[idx] === 'hit') {
              span.forEach(sIdx => {
                if (!firedShots[sIdx]) probability[sIdx] += 5;
              });
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
          if (firedShots[idx] === 'miss') {
            valid = false;
            break;
          }
          span.push(idx);
        }
        if (valid) {
          span.forEach(idx => {
            if (!firedShots[idx]) probability[idx] += 1;
            if (firedShots[idx] === 'hit') {
              span.forEach(sIdx => {
                if (!firedShots[sIdx]) probability[sIdx] += 5;
              });
            }
          });
        }
      }
    }
  }

  // Pick the unfired cell with highest probability score
  let maxScore = -1;
  let bestIdx = unfired[0];

  for (const idx of unfired) {
    if (probability[idx] > maxScore) {
      maxScore = probability[idx];
      bestIdx = idx;
    }
  }

  return { shotIdx: bestIdx, newQueue: [] };
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
