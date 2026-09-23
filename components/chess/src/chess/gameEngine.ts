import { gameState } from './state';
import { SoundEngine } from './sound';
import { initStockfish, checkAITurn, startStockfishReview, renderReviewSidebar, requestLiveEvaluation, prioritizeReviewMoveAnalysis } from './ai';
import { init2DBoard, render2DBoard } from './board2d';
import { initMultiplayer, sendMoveToServer, sendResignToServer, sendRematchRequest, openMatchmakingModal, startMatchmaking } from './multiplayer';

export function executeMove(moveObj: any) {
    if (gameState.isAnimating) return false;

    const move = gameState.game.move(moveObj);
    if (!move) return false;

    requestLiveEvaluation(gameState.game.fen());

    // Trigger Audio FX based on move event
    if (gameState.game.inCheck()) {
        SoundEngine.playCheck();
    } else if (move.flags.includes('k') || move.flags.includes('q')) {
        SoundEngine.playCastle();
    } else if (move.captured) {
        SoundEngine.playCapture();
    } else {
        SoundEngine.playMove();
    }

    const fromSq = move.from;
    const toSq = move.to;

    // Render Last Move Square Highlights
    setLastMoveHighlights(fromSq, toSq);
    updateStatusUI();
    clearHighlights();
    gameState.selectedSquare = null;
    render2DBoard();
    checkAITurn();
    return true;
}

export function selectSquare(sq: string) {
    gameState.selectedSquare = sq;
    gameState.activeMoveHighlights.clear();

    const moves = gameState.game.moves({ square: sq as any, verbose: true });
    moves.forEach(m => {
        gameState.activeMoveHighlights.add(m.to);
    });

    render2DBoard();
}

export function clearHighlights() {
    gameState.selectedSquare = null;
    gameState.activeMoveHighlights.clear();
    render2DBoard();
}

export function setLastMoveHighlights(fromSq: string, toSq: string) {
    gameState.lastMoveSquares = [fromSq, toSq];
}

export function promptPromotion(callback: (piece: string) => void) {
    const modal = document.getElementById('game-modal');
    const title = document.getElementById('modal-title');
    const desc = document.getElementById('modal-desc');
    const actions = document.getElementById('modal-actions');
    if (!modal || !title || !desc || !actions) return;

    title.textContent = 'Pawn Promotion';
    desc.textContent = 'Select piece to promote your pawn:';

    actions.innerHTML = `
        <div class="promotion-options">
            <button class="promotion-btn btn-accent" data-piece="q">♛</button>
            <button class="promotion-btn btn-accent" data-piece="r">♜</button>
            <button class="promotion-btn btn-accent" data-piece="b">♝</button>
            <button class="promotion-btn btn-accent" data-piece="n">♞</button>
        </div>
    `;

    modal.classList.add('active');

    const handleChoice = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        const piece = target.getAttribute('data-piece');
        if (piece) {
            modal.classList.remove('active');
            actions.removeEventListener('click', handleChoice as any);
            callback(piece);
        }
    };

    actions.addEventListener('click', handleChoice as any);
}

export function updateStatusUI() {
    if (gameState.isReviewMode) return;

    const currentTurnChar = gameState.game.turn();
    const turn = currentTurnChar === 'w' ? "White" : "Black";
    const statusText = document.getElementById('status-text');
    const statusDot = document.getElementById('status-dot');
    if (!statusText || !statusDot) return;

    let turnSuffix = '';
    if (gameState.gameMode === 'pvp' && gameState.onlinePlayerColor) {
        if (currentTurnChar === gameState.onlinePlayerColor) {
            turnSuffix = ' (Your Turn)';
        } else {
            turnSuffix = " (Opponent's Turn)";
        }
    }

    if (gameState.game.isCheckmate()) {
        statusText.textContent = `Checkmate! ${turn === 'White' ? 'Black' : 'White'} wins!`;
        statusDot.style.backgroundColor = '#ef4444';
        statusDot.style.boxShadow = '0 0 12px #ef4444';
        const winnerColorChar = turn === 'White' ? 'b' : 'w';
        
        let resultType: 'win' | 'lose' | 'draw' = 'win'; // default
        if (gameState.gameMode === 'pvp' && gameState.onlinePlayerColor) {
            resultType = winnerColorChar === gameState.onlinePlayerColor ? 'win' : 'lose';
        } else if (gameState.gameMode === 'pvai-w') {
            resultType = winnerColorChar === 'w' ? 'win' : 'lose';
        } else if (gameState.gameMode === 'pvai-b') {
            resultType = winnerColorChar === 'b' ? 'win' : 'lose';
        }

        showGameOverModal(`Checkmate!`, `${turn === 'White' ? 'Black' : 'White'} wins the match.`, resultType);
    } else if (gameState.game.isDraw() || gameState.game.isStalemate() || gameState.game.isThreefoldRepetition()) {
        statusText.textContent = `Game Over - Draw!`;
        statusDot.style.backgroundColor = '#f59e0b';
        statusDot.style.boxShadow = '0 0 12px #f59e0b';
        showGameOverModal(`Draw!`, `The game ended in a draw.`, 'draw');
    } else if (gameState.game.inCheck()) {
        statusText.textContent = `${turn}'s Turn (CHECK!)${turnSuffix}`;
        statusDot.style.backgroundColor = '#f59e0b';
        statusDot.style.boxShadow = '0 0 12px #f59e0b';
    } else {
        statusText.textContent = `${turn}'s Turn${turnSuffix}`;
        statusDot.style.backgroundColor = '#10b981';
        statusDot.style.boxShadow = '0 0 12px #10b981';
    }
}

export function showSidebarView(view: 'main' | 'bots' | 'searching' | 'game') {
    const main = document.getElementById('sidebar-main-menu');
    const bots = document.getElementById('sidebar-bots-menu');
    const searching = document.getElementById('sidebar-searching-view');
    const game = document.getElementById('sidebar-active-game');
    const rightSidebar = document.getElementById('right-sidebar');
    const btnResign = document.getElementById('btn-resign');

    if (main) main.classList.toggle('hidden', view !== 'main');
    if (bots) bots.classList.toggle('hidden', view !== 'bots');
    if (searching) searching.classList.toggle('hidden', view !== 'searching');
    if (game) game.classList.toggle('hidden', view !== 'game');

    if (view === 'game') {
        if (rightSidebar) rightSidebar.style.display = 'none';
        if (btnResign) btnResign.classList.remove('hidden');
    } else {
        if (rightSidebar) rightSidebar.style.display = 'flex';
        if (btnResign) btnResign.classList.add('hidden');
    }

    const topName = document.getElementById('player-top-name');
    const topRating = document.getElementById('player-top-rating');
    const bottomName = document.getElementById('player-bottom-name');
    const bottomRating = document.getElementById('player-bottom-rating');

    if (bottomName && bottomRating) {
        if (gameState.gameMode === 'pvp' && gameState.onlinePlayerColor) {
            bottomName.textContent = gameState.onlinePlayerColor === 'w' ? 'You (White)' : 'You (Black)';
        } else if (gameState.gameMode === 'pvai-w') {
            bottomName.textContent = 'You (White)';
        } else if (gameState.gameMode === 'pvai-b') {
            bottomName.textContent = 'You (Black)';
        } else {
            bottomName.textContent = 'You';
        }
        bottomRating.textContent = '1500 ELO';
    }

    if (topName && topRating) {
        if (view === 'game') {
            if (gameState.gameMode === 'pvp') {
                topName.textContent = 'Online Opponent';
                topRating.textContent = 'Similar Skill';
            } else {
                const diff = gameState.aiDifficulty || 'easy';
                const names: Record<string, { name: string; rating: string }> = {
                    'martin': { name: 'Martin (200)', rating: '~200 ELO' },
                    'easy': { name: 'Jimmy (800)', rating: '~800 ELO' },
                    'medium': { name: 'Nelson (1500)', rating: '~1500 ELO' },
                    'gm': { name: 'Stockfish (0 ELO)', rating: '0 ELO' }
                };
                const botInfo = names[diff] || { name: 'Bot Opponent', rating: 'AI Engine' };
                topName.textContent = botInfo.name;
                topRating.textContent = botInfo.rating;
            }
        } else {
            topName.textContent = 'Opponent';
            topRating.textContent = '1500 ELO';
        }
    }
}

export function openFrontPageModal() {
    showSidebarView('main');
    const frontModal = document.getElementById('front-page-modal');
    if (frontModal) frontModal.classList.remove('active');
}

export function updateModeUI() {
    const pvpControls = document.getElementById('pvp-controls');
    if (pvpControls) {
        pvpControls.classList.remove('hidden');
    }
    const topName = document.getElementById('player-top-name');
    const topRating = document.getElementById('player-top-rating');
    if (topName && topRating) {
        if (gameState.gameMode === 'pvp') {
            topName.textContent = 'Online Opponent';
            topRating.textContent = 'Similar Skill';
        } else {
            const diff = gameState.aiDifficulty || 'easy';
            const names: Record<string, { name: string; rating: string }> = {
                'martin': { name: 'Martin (200)', rating: '~200 ELO' },
                'easy': { name: 'Jimmy (800)', rating: '~800 ELO' },
                'medium': { name: 'Nelson (1500)', rating: '~1500 ELO' },
                'gm': { name: 'Stockfish (0 ELO)', rating: '0 ELO' }
            };
            const botInfo = names[diff] || { name: 'Bot Opponent', rating: 'AI Engine' };
            topName.textContent = botInfo.name;
            topRating.textContent = botInfo.rating;
        }
    }
}

export function handleResign() {
    if (gameState.game.isGameOver() || (gameState.gameMode === 'pvp' && gameState.onlineStatus === 'ended')) return;
    const confirmModal = document.getElementById('confirm-modal');
    if (confirmModal) {
        confirmModal.classList.add('active');
    }
}

export function executeResign() {
    const confirmModal = document.getElementById('confirm-modal');
    if (confirmModal) confirmModal.classList.remove('active');

    if (gameState.game.isGameOver() || (gameState.gameMode === 'pvp' && gameState.onlineStatus === 'ended')) return;

    let resigningColorChar = gameState.game.turn();
    if (gameState.gameMode === 'pvp' && gameState.onlinePlayerColor) {
        resigningColorChar = gameState.onlinePlayerColor;
    }

    const turn = resigningColorChar === 'w' ? 'White' : 'Black';
    const winner = turn === 'White' ? 'Black' : 'White';

    if (gameState.gameMode === 'pvp') {
        sendResignToServer();
        gameState.onlineStatus = 'ended';
    } else {
        gameState.onlineStatus = 'idle';
    }

    SoundEngine.playCheck();
    showGameOverModal(`${turn} Resigned`, `${winner} wins the match by resignation.`, 'lose');
}

export function showGameOverModal(title: string, desc: string, resultType: 'win' | 'lose' | 'draw' = 'draw') {
    const modal = document.getElementById('game-modal');
    const modalCard = document.getElementById('game-modal-card');
    const modalTitle = document.getElementById('modal-title');
    const modalDesc = document.getElementById('modal-desc');
    const actions = document.getElementById('modal-actions');
    if (!modal || !modalCard || !modalTitle || !modalDesc || !actions) return;

    modalTitle.textContent = title;
    modalDesc.textContent = desc;

    modalCard.classList.remove('win', 'lose', 'draw');
    modalCard.classList.add(resultType);

    if (gameState.gameMode === 'pvp') {
        actions.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 10px; width: 100%;">
                <button id="modal-rematch-btn" class="btn-accent" style="width: 100%; padding: 12px; font-weight: 600;">Request Rematch</button>
                <button id="modal-review-btn" class="btn-secondary" style="width: 100%; padding: 12px; background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255, 255, 255, 0.2); color: #fff; border-radius: 10px; font-weight: 600; cursor: pointer;">Review Game</button>
                <button id="modal-exit-pvp-btn" class="btn-secondary" style="width: 100%; padding: 12px; background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255, 255, 255, 0.2); color: #ef4444; border-radius: 10px; font-weight: 600; cursor: pointer;">Main Menu</button>
            </div>
        `;

        const rematchBtn = document.getElementById('modal-rematch-btn');
        if (rematchBtn) {
            rematchBtn.addEventListener('click', () => {
                rematchBtn.textContent = "Waiting for opponent...";
                (rematchBtn as HTMLButtonElement).disabled = true;
                sendRematchRequest();
            });
        }

        const reviewBtn = document.getElementById('modal-review-btn');
        if (reviewBtn) reviewBtn.addEventListener('click', () => enterReviewMode());

        const exitBtn = document.getElementById('modal-exit-pvp-btn');
        if (exitBtn) {
            exitBtn.addEventListener('click', () => {
                modal.classList.remove('active');
                openFrontPageModal();
            });
        }
    } else {
        actions.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 10px; width: 100%;">
                <button id="modal-restart-btn" class="btn-accent" style="width: 100%; padding: 12px; font-weight: 600;">Play Again</button>
                <button id="modal-menu-btn" class="btn-secondary" style="width: 100%; padding: 12px; background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255, 255, 255, 0.2); color: #fff; border-radius: 10px; font-weight: 600; cursor: pointer;">Main Menu</button>
                <button id="modal-review-btn" class="btn-secondary" style="width: 100%; padding: 12px; background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255, 255, 255, 0.2); color: #fff; border-radius: 10px; font-weight: 600; cursor: pointer;">Review Game</button>
            </div>
        `;

        const restartBtn = document.getElementById('modal-restart-btn');
        if (restartBtn) {
            restartBtn.addEventListener('click', () => {
                modal.classList.remove('active');
                const isWhite = Math.random() < 0.5;
                gameState.gameMode = isWhite ? 'pvai-w' : 'pvai-b';
                updateModeUI();
                resetGame();
                showSidebarView('game');
            });
        }

        const menuBtn = document.getElementById('modal-menu-btn');
        if (menuBtn) {
            menuBtn.addEventListener('click', () => {
                modal.classList.remove('active');
                openFrontPageModal();
            });
        }

        const reviewBtn = document.getElementById('modal-review-btn');
        if (reviewBtn) reviewBtn.addEventListener('click', () => enterReviewMode());
    }

    modal.classList.add('active');
}

export function enterReviewMode() {
    const modal = document.getElementById('game-modal');
    if (modal) modal.classList.remove('active');

    const rs = document.getElementById('right-sidebar');
    if (rs) rs.style.display = 'none';

    const btnResign = document.getElementById('btn-resign');
    if (btnResign) btnResign.classList.add('hidden');

    gameState.isReviewMode = true;
    gameState.reviewHistory = gameState.game.history({ verbose: true });
    gameState.reviewMoveIndex = gameState.reviewHistory.length;

    // Start asynchronous stockfish review
    startStockfishReview();

    const reviewPanel = document.getElementById('review-panel');
    const reviewSidebar = document.getElementById('review-sidebar');
    const topPanel = document.getElementById('top-ui-panel');
    const statusText = document.getElementById('status-text');

    if (reviewPanel) reviewPanel.classList.remove('hidden');
    if (reviewSidebar) reviewSidebar.classList.remove('hidden');
    if (topPanel) topPanel.classList.add('hidden');
    if (statusText) statusText.textContent = "Review Mode";

    updateReviewBoard();
}

export function exitReviewMode() {
    gameState.isReviewMode = false;
    const rs = document.getElementById('right-sidebar');
    if (rs) rs.style.display = 'flex';
    const reviewPanel = document.getElementById('review-panel');
    const reviewSidebar = document.getElementById('review-sidebar');
    const topPanel = document.getElementById('top-ui-panel');
    
    if (reviewPanel) reviewPanel.classList.add('hidden');
    if (reviewSidebar) reviewSidebar.classList.add('hidden');
    if (topPanel && gameState.gameMode !== 'pvp') topPanel.classList.remove('hidden');
    
    // Jump back to end of game state
    gameState.reviewMoveIndex = gameState.reviewHistory.length;
    updateReviewBoard();
    updateStatusUI();
    openFrontPageModal();
}

export function updateReviewBoard() {
    // Reset internal game state to start
    gameState.game.reset();
    for (let i = 0; i < gameState.reviewMoveIndex; i++) {
        const move = gameState.reviewHistory[i];
        if (move) {
            gameState.game.move({ from: move.from, to: move.to, promotion: move.promotion });
        }
    }
    
    if (gameState.reviewMoveIndex > 0) {
        const lastMove = gameState.reviewHistory[gameState.reviewMoveIndex - 1];
        setLastMoveHighlights(lastMove.from, lastMove.to);
    } else {
        setLastMoveHighlights('', '');
    }

    render2DBoard();
    const statusBox = document.getElementById('review-status');
    const statusText = document.getElementById('status-text');
    const statusDot = document.getElementById('status-dot');

    if (statusBox) {
        statusBox.textContent = `Move ${gameState.reviewMoveIndex} / ${gameState.reviewHistory.length}`;
    }

    if (statusText && statusDot) {
        if (gameState.reviewMoveIndex > 0) {
            const evalObj = gameState.moveEvaluations[gameState.reviewMoveIndex - 1];
            statusText.textContent = `Reviewing: ${evalObj ? evalObj.label : 'Analyzing...'}`;
            
            if (evalObj?.classification === 'blunder') {
                statusDot.style.backgroundColor = '#ef4444';
                statusDot.style.boxShadow = '0 0 12px #ef4444';
            } else if (evalObj?.classification === 'mistake' || evalObj?.classification === 'inaccuracy') {
                statusDot.style.backgroundColor = '#f59e0b';
                statusDot.style.boxShadow = '0 0 12px #f59e0b';
            } else if (evalObj?.classification === 'excellent' || evalObj?.classification === 'brilliant') {
                statusDot.style.backgroundColor = '#10b981';
                statusDot.style.boxShadow = '0 0 12px #10b981';
            } else {
                statusDot.style.backgroundColor = '#3b82f6';
                statusDot.style.boxShadow = '0 0 12px #3b82f6';
            }
        } else {
            statusText.textContent = "Review Mode - Start Position";
            statusDot.style.backgroundColor = '#3b82f6';
            statusDot.style.boxShadow = '0 0 12px #3b82f6';
        }
    }
    
    renderReviewSidebar();
    prioritizeReviewMoveAnalysis(gameState.reviewMoveIndex);
}

export function resetGame() {
    if (gameState.gameMode !== 'pvp') {
        gameState.onlineStatus = 'idle';
    }
    gameState.game.reset();
    gameState.isFlipped = false;
    requestLiveEvaluation(gameState.game.fen());
    gameState.selectedSquare = null;
    gameState.lastMoveSquares = [];
    clearHighlights();
    render2DBoard();
    updateModeUI();
    checkAITurn();
}

export function setupEventListeners() {
    const initAudio = () => SoundEngine.init();
    window.addEventListener('pointerdown', initAudio);
    window.addEventListener('click', initAudio);

    // Front page options
    const choicePvp = document.getElementById('btn-choice-pvp');
    if (choicePvp) {
        choicePvp.addEventListener('click', () => {
            const frontModal = document.getElementById('front-page-modal');
            if (frontModal) frontModal.classList.remove('active');
            gameState.gameMode = 'pvp';
            updateModeUI();
            showSidebarView('searching');
            openMatchmakingModal();
            startMatchmaking();
        });
    }

    const choiceBot = document.getElementById('btn-choice-bot');
    if (choiceBot) {
        choiceBot.addEventListener('click', () => {
            showSidebarView('bots');
        });
    }

    const botBack = document.getElementById('btn-bot-back');
    if (botBack) {
        botBack.addEventListener('click', () => {
            showSidebarView('main');
        });
    }

    const botCards = document.querySelectorAll('.bot-card');
    botCards.forEach(card => {
        card.addEventListener('click', () => {
            const diff = card.getAttribute('data-diff') || 'easy';
            gameState.aiDifficulty = diff;
            const isWhite = Math.random() < 0.5;
            gameState.gameMode = isWhite ? 'pvai-w' : 'pvai-b';

            const frontModal = document.getElementById('front-page-modal');
            if (frontModal) frontModal.classList.remove('active');

            updateModeUI();
            resetGame();
            showSidebarView('game');
        });
    });

    const btnSidebarMenu = document.getElementById('btn-sidebar-menu');
    if (btnSidebarMenu) {
        btnSidebarMenu.addEventListener('click', () => {
            if (gameState.gameMode === 'pvp' && gameState.onlineStatus !== 'idle' && gameState.onlineStatus !== 'ended') {
                const confirmModal = document.getElementById('confirm-modal');
                if (confirmModal) confirmModal.classList.add('active');
            } else {
                openFrontPageModal();
            }
        });
    }

    const btnResign = document.getElementById('btn-resign');
    if (btnResign) btnResign.addEventListener('click', handleResign);

    const btnConfirmResign = document.getElementById('btn-confirm-resign');
    if (btnConfirmResign) btnConfirmResign.addEventListener('click', executeResign);

    const btnCancelResign = document.getElementById('btn-cancel-resign');
    if (btnCancelResign) {
        btnCancelResign.addEventListener('click', () => {
            const confirmModal = document.getElementById('confirm-modal');
            if (confirmModal) confirmModal.classList.remove('active');
        });
    }

    // Review mode listeners
    const btnReviewPrev = document.getElementById('btn-review-prev');
    if (btnReviewPrev) {
        btnReviewPrev.addEventListener('click', () => {
            if (gameState.isReviewMode && gameState.reviewMoveIndex > 0) {
                gameState.reviewMoveIndex--;
                updateReviewBoard();
            }
        });
    }
    
    const btnReviewNext = document.getElementById('btn-review-next');
    if (btnReviewNext) {
        btnReviewNext.addEventListener('click', () => {
            if (gameState.isReviewMode && gameState.reviewMoveIndex < gameState.reviewHistory.length) {
                gameState.reviewMoveIndex++;
                updateReviewBoard();
            }
        });
    }

    const btnReviewExit = document.getElementById('btn-review-exit');
    if (btnReviewExit) {
        btnReviewExit.addEventListener('click', () => {
            exitReviewMode();
        });
    }

    document.addEventListener('jumpToReviewMove', ((e: CustomEvent) => {
        if (gameState.isReviewMode) {
            gameState.reviewMoveIndex = e.detail;
            updateReviewBoard();
        }
    }) as EventListener);
}

export function initGame() {
    initStockfish();
    init2DBoard();
    resetGame();
    setupEventListeners();
    initMultiplayer();
}
