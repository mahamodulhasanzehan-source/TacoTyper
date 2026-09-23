import { gameState } from './state';
import { get2DPieceSVG } from './pieces2d';
import { executeMove, promptPromotion, selectSquare, clearHighlights } from './gameEngine';
import { sendMoveToServer } from './multiplayer';
import { SoundEngine } from './sound';

let board2DContainer: HTMLElement | null = null;
let board2DElement: HTMLElement | null = null;

export function init2DBoard() {
    const parent = document.getElementById('board-container') || document.body;

    let existing = document.getElementById('board-2d-container');
    if (!existing) {
        board2DContainer = document.createElement('div');
        board2DContainer.id = 'board-2d-container';
        board2DContainer.className = 'board-2d-wrapper';

        board2DElement = document.createElement('div');
        board2DElement.id = 'board-2d';
        board2DElement.className = 'board-2d-grid';

        board2DContainer.appendChild(board2DElement);
        parent.appendChild(board2DContainer);
    } else {
        board2DContainer = existing;
        board2DElement = document.getElementById('board-2d');
    }

    render2DBoard();
}

export function render2DBoard() {
    if (!board2DElement) {
        board2DElement = document.getElementById('board-2d');
        if (!board2DElement) return;
    }

    // Board perspective: check if board is flipped
    const isBlackPerspective = gameState.gameMode === 'pvai-b' ||
        (gameState.gameMode === 'pvp' && gameState.onlinePlayerColor === 'b') ||
        gameState.isFlipped;
        
    const expectedPerspective = isBlackPerspective ? 'b' : 'w';
    
    // If perspective changed or no children, reset the board HTML structure
    if (board2DElement.children.length !== 64 || board2DElement.dataset.perspective !== expectedPerspective) {
        board2DElement.innerHTML = '';
        board2DElement.dataset.perspective = expectedPerspective;
        
        const ranksInit = isBlackPerspective ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];
        const filesInit = isBlackPerspective ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];
        
        ranksInit.forEach(() => {
            filesInit.forEach(() => {
                const squareDiv = document.createElement('div');
                squareDiv.className = 'square-2d';
                board2DElement!.appendChild(squareDiv);
            });
        });
    }

    // Attach delegated pointerdown listener once
    if (!board2DElement.dataset.hasDelegatedListener) {
        board2DElement.addEventListener('pointerdown', (e: PointerEvent) => {
            e.preventDefault();
            e.stopPropagation();
            const targetSquare = (e.target as HTMLElement).closest('.square-2d') as HTMLElement;
            if (targetSquare && targetSquare.dataset.square) {
                handle2DSquareClick(targetSquare.dataset.square);
            }
        });
        board2DElement.dataset.hasDelegatedListener = 'true';
    }

    const boardState = gameState.game.board();

    // Check if King is in check
    let inCheckSquare: string | null = null;
    if (gameState.game.inCheck()) {
        const turn = gameState.game.turn();
        for (let r = 0; r < 8; r++) {
            for (let f = 0; f < 8; f++) {
                const p = boardState[r][f];
                if (p && p.type === 'k' && p.color === turn) {
                    const fileChar = String.fromCharCode(97 + f);
                    const rankNum = 8 - r;
                    inCheckSquare = `${fileChar}${rankNum}`;
                }
            }
        }
    }

    // Loop through ranks and files according to perspective
    const ranks = isBlackPerspective ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];
    const files = isBlackPerspective ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];

    let childIndex = 0;
    ranks.forEach((rIndex, displayRankIdx) => {
        files.forEach((fIndex, displayFileIdx) => {
            const fileChar = String.fromCharCode(97 + fIndex);
            const rankNum = 8 - rIndex;
            const sq = `${fileChar}${rankNum}`;

            const squareDiv = board2DElement!.children[childIndex] as HTMLElement;
            squareDiv.dataset.square = sq;

            // Checkerboard coloring
            const isLight = (rIndex + fIndex) % 2 === 0;
            let classStr = 'square-2d ' + (isLight ? 'light' : 'dark');

            // 1. Highlight: Selected Square
            if (gameState.selectedSquare === sq) {
                classStr += ' selected-2d';
            }

            // 2. Highlight: Last Move Squares
            if (gameState.lastMoveSquares.includes(sq)) {
                classStr += ' last-move-2d';
            }

            // 3. Highlight: Check
            if (inCheckSquare === sq) {
                classStr += ' check-2d';
            }

            // 4. Highlight: Legal Move Destination
            if (gameState.activeMoveHighlights.has(sq)) {
                const piece = boardState[rIndex][fIndex];
                if (piece) {
                    classStr += ' legal-capture-2d';
                } else {
                    classStr += ' legal-move-2d';
                }
            }
            
            if (squareDiv.className !== classStr) {
                squareDiv.className = classStr;
            }

            // Labels setup
            let labelsContainer = squareDiv.querySelector('.labels-container');
            if (!labelsContainer) {
                labelsContainer = document.createElement('div');
                labelsContainer.className = 'labels-container';
                squareDiv.appendChild(labelsContainer);
                
                // Rank labels on first visible column
                if (displayFileIdx === 0) {
                    const rankLabel = document.createElement('span');
                    rankLabel.className = 'coord-label rank-label';
                    rankLabel.textContent = `${rankNum}`;
                    labelsContainer.appendChild(rankLabel);
                }

                // File labels on bottom rank
                if (displayRankIdx === 7) {
                    const fileLabel = document.createElement('span');
                    fileLabel.className = 'coord-label file-label';
                    fileLabel.textContent = fileChar;
                    labelsContainer.appendChild(fileLabel);
                }
            }

            // Piece rendering with DOM persistence check
            const piece = boardState[rIndex][fIndex];
            let pieceContainer = squareDiv.querySelector('.piece-2d-wrapper') as HTMLElement | null;
            
            if (piece) {
                const pieceKey = `${piece.color}${piece.type}`;
                if (!pieceContainer) {
                    pieceContainer = document.createElement('div');
                    pieceContainer.className = 'piece-2d-wrapper';
                    squareDiv.appendChild(pieceContainer);
                }
                
                if (pieceContainer.dataset.pieceKey !== pieceKey) {
                    pieceContainer.dataset.pieceKey = pieceKey;
                    pieceContainer.innerHTML = get2DPieceSVG(piece.type, piece.color);
                }
            } else {
                if (pieceContainer) {
                    pieceContainer.remove();
                }
            }

            childIndex++;
        });
    });
}

function handle2DSquareClick(clickedSq: string) {
    if (gameState.isAnimating) return;
    if (gameState.isReviewMode) return;
    if (gameState.game.isGameOver() || (gameState.gameMode === 'pvp' && gameState.onlineStatus === 'ended')) return;

    const activeSidebarView = document.querySelector('.sidebar-view:not(.hidden)');
    if (activeSidebarView && activeSidebarView.id !== 'sidebar-active-game') return;
    if (document.getElementById('game-modal')?.classList.contains('active')) return;
    if (document.getElementById('confirm-modal')?.classList.contains('active')) return;

    const currentTurn = gameState.game.turn();
    if (gameState.gameMode === 'pvai-w' && currentTurn === 'b') return;
    if (gameState.gameMode === 'pvai-b' && currentTurn === 'w') return;
    if (gameState.gameMode === 'pvp') {
        if (!gameState.onlinePlayerColor || currentTurn !== gameState.onlinePlayerColor) return;
    }

    if (gameState.selectedSquare) {
        if (clickedSq === gameState.selectedSquare) {
            clearHighlights();
            render2DBoard();
            return;
        }

        const moves = gameState.game.moves({ square: gameState.selectedSquare as any, verbose: true });
        const targetMove = moves.find(m => m.to === clickedSq);

        if (targetMove) {
            if (targetMove.flags.includes('p')) {
                promptPromotion(promotionPiece => {
                    targetMove.promotion = promotionPiece as any;
                    if (executeMove(targetMove)) {
                        sendMoveToServer(targetMove);
                    }
                });
            } else {
                if (executeMove(targetMove)) {
                    sendMoveToServer(targetMove);
                }
            }
        } else if (gameState.game.get(clickedSq as any)?.color === gameState.game.turn()) {
            SoundEngine.playSelect();
            selectSquare(clickedSq);
            render2DBoard();
        } else {
            clearHighlights();
            render2DBoard();
        }
    } else {
        if (gameState.game.get(clickedSq as any)?.color === gameState.game.turn()) {
            SoundEngine.playSelect();
            selectSquare(clickedSq);
            render2DBoard();
        }
    }
}
