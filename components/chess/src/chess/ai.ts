import { Square, PieceSymbol, Color, Chess } from 'chess.js';
import { gameState } from './state';
import { PST_PAWN, PST_KNIGHT, PST_BISHOP, PST_ROOK, PST_QUEEN, PST_KING_MID } from './constants';
import { executeMove, updateReviewBoard } from './gameEngine';

export function initStockfish() {
    try {
        fetch('https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.2/stockfish.js')
            .then(response => response.text())
            .then(code => {
                const blob = new Blob([code], { type: 'application/javascript' });
                
                gameState.stockfishWorker = new Worker(URL.createObjectURL(blob));
                gameState.stockfishWorker.onmessage = handleStockfishOutput;
                gameState.stockfishWorker.postMessage('uci');

                reviewWorker = new Worker(URL.createObjectURL(blob));
                reviewWorker.onmessage = handleReviewWorkerOutput;
                reviewWorker.postMessage('uci');
            })
            .catch(err => console.warn('Stockfish Worker fallback active.', err));
    } catch (e) {
        console.warn('Worker initialization error:', e);
    }
}

let reviewWorker: Worker | null = null;
let reviewWorkerReady = false;
export const fenEvalCache: Map<string, number> = new Map();
let currentLiveAnalysisFen: string | null = null;
let currentLiveAnalysisScore: number | null = null;
let analysisTimeoutTimer: any = null;
let liveAnalysisQueue: string[] = [];
let reviewQueue: string[] = [];
let isReviewing = false;

export function requestLiveEvaluation(fen: string) {
    if (!fenEvalCache.has(fen) && !liveAnalysisQueue.includes(fen) && currentLiveAnalysisFen !== fen) {
        liveAnalysisQueue.push(fen);
        processLiveAnalysisQueue();
    }
}

export function prioritizeReviewMoveAnalysis(index: number) {
    if (!reviewQueue || reviewQueue.length === 0) return;

    const fensToPrioritize: string[] = [];
    if (index > 0 && reviewQueue[index - 1] && !fenEvalCache.has(reviewQueue[index - 1])) {
        fensToPrioritize.push(reviewQueue[index - 1]);
    }
    if (reviewQueue[index] && !fenEvalCache.has(reviewQueue[index])) {
        fensToPrioritize.push(reviewQueue[index]);
    }

    for (let i = fensToPrioritize.length - 1; i >= 0; i--) {
        const fen = fensToPrioritize[i];
        const existingIdx = liveAnalysisQueue.indexOf(fen);
        if (existingIdx > -1) {
            liveAnalysisQueue.splice(existingIdx, 1);
        }
        liveAnalysisQueue.unshift(fen);
    }

    processLiveAnalysisQueue();
}

function processLiveAnalysisQueue() {
    if (!reviewWorker || !reviewWorkerReady || currentLiveAnalysisFen) return;
    if (liveAnalysisQueue.length === 0) return;

    currentLiveAnalysisFen = liveAnalysisQueue.shift()!;
    currentLiveAnalysisScore = null;

    try {
        reviewWorker.postMessage('position fen ' + currentLiveAnalysisFen);
        reviewWorker.postMessage('go depth 10');
    } catch (e) {
        currentLiveAnalysisFen = null;
        return;
    }

    // Safety watchdog: prevent analysis queue from ever freezing permanently
    if (analysisTimeoutTimer) clearTimeout(analysisTimeoutTimer);
    analysisTimeoutTimer = setTimeout(() => {
        if (currentLiveAnalysisFen) {
            let scoreToSave = currentLiveAnalysisScore;
            if (scoreToSave === null) {
                try {
                    const tempGame = new Chess(currentLiveAnalysisFen);
                    if (tempGame.isGameOver()) {
                        scoreToSave = tempGame.isCheckmate() ? (tempGame.turn() === 'w' ? -10000 : 10000) : 0;
                    } else {
                        scoreToSave = 0;
                    }
                } catch (e) {
                    scoreToSave = 0;
                }
            }
            fenEvalCache.set(currentLiveAnalysisFen, scoreToSave);
            currentLiveAnalysisFen = null;
            processLiveAnalysisQueue();
            if (isReviewing) {
                renderReviewSidebar();
            }
        }
    }, 4000);
}

export function handleReviewWorkerOutput(event: MessageEvent) {
    const line = typeof event.data === 'string' ? event.data : '';
    if (line === 'uciok') {
        reviewWorkerReady = true;
        processLiveAnalysisQueue();
        return;
    }

    if (!currentLiveAnalysisFen) return;

    // Capture evaluation from ANY info output line
    if (line.includes('score cp ')) {
        const match = line.match(/score cp (-?\d+)/);
        if (match) {
            let cp = parseInt(match[1], 10);
            const fenParts = currentLiveAnalysisFen.split(' ');
            const isWhiteToMove = fenParts[1] === 'w';
            if (!isWhiteToMove) {
                cp = -cp;
            }
            currentLiveAnalysisScore = cp;
        }
    } else if (line.includes('score mate ')) {
        const match = line.match(/score mate (-?\d+)/);
        if (match) {
            const movesToMate = parseInt(match[1], 10);
            let cp = movesToMate > 0 ? 10000 - movesToMate * 10 : -10000 - movesToMate * 10;
            const fenParts = currentLiveAnalysisFen.split(' ');
            if (fenParts[1] !== 'w') {
                cp = -cp;
            }
            currentLiveAnalysisScore = cp;
        }
    }

    if (line.startsWith('bestmove')) {
        if (analysisTimeoutTimer) {
            clearTimeout(analysisTimeoutTimer);
            analysisTimeoutTimer = null;
        }

        if (currentLiveAnalysisFen) {
            let scoreToSave = currentLiveAnalysisScore;
            if (scoreToSave === null) {
                try {
                    const tempGame = new Chess(currentLiveAnalysisFen);
                    if (tempGame.isGameOver()) {
                        scoreToSave = tempGame.isCheckmate() ? (tempGame.turn() === 'w' ? -10000 : 10000) : 0;
                    } else {
                        scoreToSave = 0;
                    }
                } catch (e) {
                    scoreToSave = 0;
                }
            }
            fenEvalCache.set(currentLiveAnalysisFen, scoreToSave);
        }

        currentLiveAnalysisFen = null;
        processLiveAnalysisQueue();

        if (isReviewing) {
            renderReviewSidebar();
        }
    }
}

export function startStockfishReview() {
    isReviewing = true;
    gameState.moveEvaluations = [];

    const tempGame = new Chess();
    reviewQueue = [tempGame.fen()];
    requestLiveEvaluation(tempGame.fen());

    for (const move of gameState.reviewHistory) {
        try {
            tempGame.move({ from: move.from, to: move.to, promotion: move.promotion });
            const fen = tempGame.fen();
            reviewQueue.push(fen);
            requestLiveEvaluation(fen);
        } catch (e) {
            console.warn('Error reconstructing review move:', e);
        }
    }

    renderReviewSidebar();
}

let stockfishMoveTimeout: any = null;

export function handleStockfishOutput(event: MessageEvent) {
    const line = typeof event.data === 'string' ? event.data : '';
    if (line === 'uciok') {
        gameState.stockfishReady = true;
    } else if (line.startsWith('bestmove')) {
        if (stockfishMoveTimeout) {
            clearTimeout(stockfishMoveTimeout);
            stockfishMoveTimeout = null;
        }
        const moveStr = line.split(' ')[1];
        if (moveStr && moveStr !== '(none)') {
            const from = moveStr.substring(0, 2) as Square;
            const to = moveStr.substring(2, 4) as Square;
            const promotion = moveStr.length > 4 ? moveStr.substring(4, 5) : undefined;
            executeMove({ from, to, promotion });
        }
    }
}

export function renderReviewSidebar() {
    const listEl = document.getElementById('review-moves-list');
    if (!listEl) return;
    
    listEl.innerHTML = '';
    
    gameState.moveEvaluations = [];
    let isFullyAnalyzed = true;

    for (let i = 0; i < gameState.reviewHistory.length; i++) {
        const move = gameState.reviewHistory[i];
        
        const prevFen = reviewQueue[i];
        const currFen = reviewQueue[i+1];
        
        const hasPrev = prevFen !== undefined && fenEvalCache.has(prevFen);
        const hasCurr = currFen !== undefined && fenEvalCache.has(currFen);

        let ev: any = undefined;

        if (hasPrev && hasCurr) {
            const prevEval = fenEvalCache.get(prevFen)!;
            const currEval = fenEvalCache.get(currFen)!;
            const color = move.color;
            const diff = color === 'w' ? (currEval - prevEval) : (prevEval - currEval);
            
            let classification = 'normal';
            let label = 'Normal';
            let badgeColor = '#94a3b8';
            
            if (diff <= -250) {
                classification = 'blunder';
                label = 'Blunder ❓❓';
                badgeColor = '#ef4444';
            } else if (diff <= -100) {
                classification = 'mistake';
                label = 'Mistake ❓';
                badgeColor = '#f97316';
            } else if (diff <= -50) {
                classification = 'inaccuracy';
                label = 'Inaccuracy ?!';
                badgeColor = '#eab308';
            } else if (diff >= 150) {
                classification = 'brilliant';
                label = 'Brilliant !!';
                badgeColor = '#06b6d4';
            } else if (diff >= 50) {
                classification = 'great';
                label = 'Great !';
                badgeColor = '#3b82f6';
            } else if (diff >= 10) {
                classification = 'good';
                label = 'Good ✓';
                badgeColor = '#22c55e';
            } else if (diff >= -10 && diff <= 9) {
                classification = 'best';
                label = 'Best ✨';
                badgeColor = '#10b981';
            }
            
            ev = { classification, label, badgeColor };
            gameState.moveEvaluations.push(ev);
        } else {
            isFullyAnalyzed = false;
            gameState.moveEvaluations.push({ classification: 'normal', label: 'Analyzing...', badgeColor: '#94a3b8' });
        }
        
        const moveNumber = Math.floor(i / 2) + 1;
        const moveLabel = move.color === 'w' ? `${moveNumber}. ${move.san}` : `${moveNumber}... ${move.san}`;
        
        const el = document.createElement('div');
        el.style.display = 'flex';
        el.style.justifyContent = 'space-between';
        el.style.alignItems = 'center';
        el.style.padding = '8px 12px';
        el.style.backgroundColor = i === gameState.reviewMoveIndex - 1 ? 'rgba(255, 255, 255, 0.1)' : 'transparent';
        el.style.borderRadius = '6px';
        el.style.cursor = 'pointer';
        el.style.border = i === gameState.reviewMoveIndex - 1 ? '1px solid rgba(255,255,255,0.2)' : '1px solid transparent';
        
        el.onclick = () => {
            gameState.reviewMoveIndex = i + 1;
            prioritizeReviewMoveAnalysis(i + 1);
            document.dispatchEvent(new CustomEvent('jumpToReviewMove', { detail: i + 1 }));
        };
        
        const nameSpan = document.createElement('span');
        nameSpan.style.color = '#e2e8f0';
        nameSpan.style.fontWeight = '500';
        nameSpan.textContent = moveLabel;
        
        const badgeSpan = document.createElement('span');
        badgeSpan.style.backgroundColor = ev ? ev.badgeColor : 'rgba(148, 163, 184, 0.15)';
        badgeSpan.style.color = ev ? '#fff' : '#94a3b8';
        badgeSpan.style.border = ev ? 'none' : '1px solid rgba(148, 163, 184, 0.3)';
        badgeSpan.style.fontSize = '0.75rem';
        badgeSpan.style.padding = '2px 8px';
        badgeSpan.style.borderRadius = '4px';
        badgeSpan.style.fontWeight = '600';
        badgeSpan.textContent = ev ? ev.label : 'Analyzing...';
        
        el.appendChild(nameSpan);
        el.appendChild(badgeSpan);
        
        listEl.appendChild(el);
    }

    const statusText = document.getElementById('review-status');
    if (statusText) {
        if (isFullyAnalyzed) {
            statusText.textContent = `Move ${gameState.reviewMoveIndex} / ${gameState.reviewHistory.length}`;
        } else {
            let count = 0;
            for (let f of reviewQueue) { if (fenEvalCache.has(f)) count++; }
            statusText.textContent = `Stockfish Analyzing: ${count}/${reviewQueue.length}`;
        }
    }
}

// ==========================================
// OPENING BOOK DICTIONARY FOR VARIETY
// ==========================================
const OPENING_BOOK: Record<string, { san: string; weight: number }[]> = {
    "": [
        { san: "e4", weight: 45 },
        { san: "d4", weight: 35 },
        { san: "c4", weight: 12 },
        { san: "Nf3", weight: 8 }
    ],
    "e4": [
        { san: "e5", weight: 40 },
        { san: "c5", weight: 30 },
        { san: "e6", weight: 15 },
        { san: "c6", weight: 15 }
    ],
    "e4 e5": [
        { san: "Nf3", weight: 50 },
        { san: "Bc4", weight: 20 },
        { san: "Nc3", weight: 15 },
        { san: "f4", weight: 15 }
    ],
    "e4 e5 Nf3": [
        { san: "Nc6", weight: 60 },
        { san: "Nf6", weight: 30 },
        { san: "d6", weight: 10 }
    ],
    "e4 e5 Nf3 Nc6": [
        { san: "Bb5", weight: 40 },
        { san: "Bc4", weight: 35 },
        { san: "d4", weight: 20 },
        { san: "Nc3", weight: 5 }
    ],
    "e4 c5": [
        { san: "Nf3", weight: 70 },
        { san: "Nc3", weight: 20 },
        { san: "c3", weight: 10 }
    ],
    "e4 e6": [
        { san: "d4", weight: 80 },
        { san: "Nf3", weight: 20 }
    ],
    "e4 c6": [
        { san: "d4", weight: 80 },
        { san: "Nf3", weight: 20 }
    ],
    "d4": [
        { san: "d5", weight: 45 },
        { san: "Nf6", weight: 35 },
        { san: "e6", weight: 10 },
        { san: "g6", weight: 10 }
    ],
    "d4 d5": [
        { san: "c4", weight: 65 },
        { san: "Nf3", weight: 20 },
        { san: "Bf4", weight: 15 }
    ],
    "d4 Nf6": [
        { san: "c4", weight: 60 },
        { san: "Nf3", weight: 20 },
        { san: "Bf4", weight: 20 }
    ],
    "c4": [
        { san: "e5", weight: 35 },
        { san: "c5", weight: 30 },
        { san: "Nf6", weight: 25 },
        { san: "e6", weight: 10 }
    ],
    "Nf3": [
        { san: "d5", weight: 40 },
        { san: "Nf6", weight: 35 },
        { san: "c5", weight: 15 },
        { san: "g6", weight: 10 }
    ]
};

function getBookMove(): any | null {
    const history = gameState.game.history();
    const historyKey = history.join(" ");

    const candidates = OPENING_BOOK[historyKey];
    if (!candidates || candidates.length === 0) return null;

    const totalWeight = candidates.reduce((sum, c) => sum + c.weight, 0);
    let rand = Math.random() * totalWeight;

    for (const cand of candidates) {
        if (rand < cand.weight) {
            const moves = gameState.game.moves({ verbose: true });
            const match = moves.find(m => m.san === cand.san);
            if (match) return match;
            break;
        }
        rand -= cand.weight;
    }

    return null;
}

// ==========================================
// EVALUATION & BOT AI DECISION ENGINE
// ==========================================

export function evaluateBoard(boardState: ({ type: PieceSymbol; color: Color } | null)[][]): number {
    let totalEval = 0;
    const pieceValues: Record<string, number> = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };

    for (let r = 0; r < 8; r++) {
        for (let f = 0; f < 8; f++) {
            const piece = boardState[r][f];
            if (!piece) continue;

            const isWhite = piece.color === 'w';
            const rowIdx = isWhite ? r : 7 - r;
            let val = pieceValues[piece.type];

            if (piece.type === 'p') val += PST_PAWN[rowIdx][f];
            else if (piece.type === 'n') val += PST_KNIGHT[rowIdx][f];
            else if (piece.type === 'b') val += PST_BISHOP[rowIdx][f];
            else if (piece.type === 'r') val += PST_ROOK[rowIdx][f];
            else if (piece.type === 'q') val += PST_QUEEN[rowIdx][f];
            else if (piece.type === 'k') val += PST_KING_MID[rowIdx][f];

            totalEval += isWhite ? val : -val;
        }
    }

    return totalEval;
}

// Quiescence search evaluates capture exchanges at depth boundary
function quiescence(alpha: number, beta: number, isMaximizing: boolean, depthLimit = 1): number {
    const standPat = evaluateBoard(gameState.game.board());
    if (depthLimit === 0) return standPat;

    if (isMaximizing) {
        if (standPat >= beta) return beta;
        if (standPat > alpha) alpha = standPat;

        const captureMoves = gameState.game.moves({ verbose: true }).filter(m => m.captured);
        for (const move of captureMoves) {
            gameState.game.move(move);
            const score = quiescence(alpha, beta, false, depthLimit - 1);
            gameState.game.undo();

            if (score >= beta) return beta;
            if (score > alpha) alpha = score;
        }
        return alpha;
    } else {
        if (standPat <= alpha) return alpha;
        if (standPat < beta) beta = standPat;

        const captureMoves = gameState.game.moves({ verbose: true }).filter(m => m.captured);
        for (const move of captureMoves) {
            gameState.game.move(move);
            const score = quiescence(alpha, beta, true, depthLimit - 1);
            gameState.game.undo();

            if (score <= alpha) return alpha;
            if (score < beta) beta = score;
        }
        return beta;
    }
}

export function minimax(depth: number, alpha: number, beta: number, isMaximizing: boolean): number {
    if (gameState.game.isGameOver()) {
        if (gameState.game.isCheckmate()) {
            return isMaximizing ? -15000 - depth : 15000 + depth;
        }
        return 0;
    }

    if (depth === 0) {
        return quiescence(alpha, beta, isMaximizing, 1);
    }

    const moves = gameState.game.moves({ verbose: true });

    if (isMaximizing) {
        let maxEval = -Infinity;
        for (const move of moves) {
            gameState.game.move(move);
            const evalVal = minimax(depth - 1, alpha, beta, false);
            gameState.game.undo();
            maxEval = Math.max(maxEval, evalVal);
            alpha = Math.max(alpha, evalVal);
            if (beta <= alpha) break;
        }
        return maxEval;
    } else {
        let minEval = Infinity;
        for (const move of moves) {
            gameState.game.move(move);
            const evalVal = minimax(depth - 1, alpha, beta, true);
            gameState.game.undo();
            minEval = Math.min(minEval, evalVal);
            beta = Math.min(beta, evalVal);
            if (beta <= alpha) break;
        }
        return minEval;
    }
}

export function checkAITurn() {
    if (gameState.game.isGameOver()) return;

    const turn = gameState.game.turn();
    const isAITurn = (gameState.gameMode === 'pvai-w' && turn === 'b') || (gameState.gameMode === 'pvai-b' && turn === 'w');

    if (isAITurn) {
        const statusText = document.getElementById('status-text');
        if (statusText) statusText.textContent = "Bot is calculating...";
        setTimeout(makeAIMove, 250);
    }
}

export function makeAIMove() {
    if (gameState.game.isGameOver()) return;

    if (gameState.aiDifficulty === 'martin') {
        makeMartinMove();
    } else if (gameState.aiDifficulty === 'easy') {
        makeEasyMove();
    } else if (gameState.aiDifficulty === 'medium') {
        makeMediumMove();
    } else if (gameState.aiDifficulty === 'gm') {
        makeGrandmasterMove();
    } else {
        makeEasyMove();
    }
}

export function makeMartinMove() {
    const bookMove = getBookMove();
    if (bookMove && Math.random() < 0.7) {
        executeMove(bookMove);
        return;
    }

    const moves = gameState.game.moves({ verbose: true });
    if (moves.length === 0) return;

    const captureMoves = moves.filter(m => m.captured);
    if (captureMoves.length > 0 && Math.random() < 0.2) {
        executeMove(captureMoves[Math.floor(Math.random() * captureMoves.length)]);
    } else {
        executeMove(moves[Math.floor(Math.random() * moves.length)]);
    }
}

function sendStockfishCommand(skillLevel: number, depth: number, movetimeMs: number, fallbackFn: () => void) {
    if (stockfishMoveTimeout) {
        clearTimeout(stockfishMoveTimeout);
        stockfishMoveTimeout = null;
    }

    if (gameState.stockfishWorker && gameState.stockfishReady) {
        let executed = false;
        stockfishMoveTimeout = setTimeout(() => {
            if (!executed) {
                console.warn('Stockfish response timed out. Executing fallback move.');
                fallbackFn();
            }
        }, movetimeMs + 1800);

        try {
            gameState.stockfishWorker.postMessage(`setoption name Skill Level value ${skillLevel}`);
            gameState.stockfishWorker.postMessage('position fen ' + gameState.game.fen());
            gameState.stockfishWorker.postMessage(`go depth ${depth} movetime ${movetimeMs}`);
            return;
        } catch (e) {
            console.warn('Failed to post message to Stockfish worker:', e);
            clearTimeout(stockfishMoveTimeout);
            stockfishMoveTimeout = null;
        }
    }

    fallbackFn();
}

export function makeEasyMove() {
    sendStockfishCommand(1, 3, 400, () => {
        const bookMove = getBookMove();
        if (bookMove && Math.random() < 0.5) {
            executeMove(bookMove);
            return;
        }

        const moves = gameState.game.moves({ verbose: true });
        if (moves.length === 0) return;

        const isWhite = gameState.game.turn() === 'w';

        const scoredMoves = moves.map(m => {
            gameState.game.move(m);
            const score = evaluateBoard(gameState.game.board()) + (Math.random() * 80 - 40);
            gameState.game.undo();
            return { move: m, score };
        });

        scoredMoves.sort((a, b) => isWhite ? b.score - a.score : a.score - b.score);

        const topCount = Math.min(4, scoredMoves.length);
        const selectedMove = scoredMoves[Math.floor(Math.random() * topCount)].move;
        executeMove(selectedMove);
    });
}

export function makeMediumMove() {
    sendStockfishCommand(10, 6, 800, () => {
        const bookMove = getBookMove();
        if (bookMove) {
            executeMove(bookMove);
            return;
        }

        const moves = gameState.game.moves({ verbose: true });
        if (moves.length === 0) return;

        const isWhite = gameState.game.turn() === 'w';
        let bestMove = moves[0];
        let bestScore = isWhite ? -Infinity : Infinity;
        let alpha = -Infinity;
        let beta = Infinity;

        for (const move of moves) {
            gameState.game.move(move);
            const score = minimax(1, alpha, beta, !isWhite);
            gameState.game.undo();

            if (isWhite) {
                if (score > bestScore) {
                    bestScore = score;
                    bestMove = move;
                }
                alpha = Math.max(alpha, bestScore);
            } else {
                if (score < bestScore) {
                    bestScore = score;
                    bestMove = move;
                }
                beta = Math.min(beta, bestScore);
            }
        }

        executeMove(bestMove);
    });
}

export function makeGrandmasterMove() {
    sendStockfishCommand(20, 10, 1200, () => {
        const moves = gameState.game.moves({ verbose: true });
        if (moves.length === 0) return;

        const isWhite = gameState.game.turn() === 'w';
        let bestMove = moves[0];
        let bestScore = isWhite ? -Infinity : Infinity;
        let alpha = -Infinity;
        let beta = Infinity;

        for (const move of moves) {
            gameState.game.move(move);
            const score = minimax(2, alpha, beta, !isWhite);
            gameState.game.undo();

            if (isWhite) {
                if (score > bestScore) {
                    bestScore = score;
                    bestMove = move;
                }
                alpha = Math.max(alpha, bestScore);
            } else {
                if (score < bestScore) {
                    bestScore = score;
                    bestMove = move;
                }
                beta = Math.min(beta, bestScore);
            }
        }

        executeMove(bestMove);
    });
}
