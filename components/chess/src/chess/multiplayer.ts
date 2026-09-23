import { gameState } from './state';
import { executeMove, resetGame, showGameOverModal, updateModeUI, updateStatusUI, openFrontPageModal, showSidebarView } from './gameEngine';
import { render2DBoard } from './board2d';
import { SoundEngine } from './sound';
import { db, auth } from '../../../../services/firebase';
import { 
  doc, 
  collection, 
  setDoc, 
  getDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  where, 
  getDocs, 
  serverTimestamp 
} from 'firebase/firestore';

export function getUserId(): string {
  if (auth && auth.currentUser && auth.currentUser.uid) {
    return auth.currentUser.uid;
  }
  let uid = sessionStorage.getItem('chess_pvp_uid');
  if (!uid) {
    uid = 'user_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36);
    sessionStorage.setItem('chess_pvp_uid', uid);
  }
  return uid;
}

export async function ensureAuth(): Promise<{ uid: string }> {
  return { uid: getUserId() };
}

let lastSelectedNonPvpMode = 'pvai-w';
let queueCollectionUnsubscribe: (() => void) | null = null;
let myQueueUnsubscribe: (() => void) | null = null;
let gameUnsubscribe: (() => void) | null = null;
let lastProcessedMoveIndex = -1;
let isCreatingGame = false;

export function initMultiplayer() {
    const btnStartSearch = document.getElementById('btn-start-search');
    const btnCancelSearch = document.getElementById('btn-cancel-search');
    const modeSelect = document.getElementById('mode-select') as HTMLSelectElement;

    if (btnStartSearch) {
        btnStartSearch.addEventListener('click', () => {
            startMatchmaking();
        });
    }

    if (btnCancelSearch) {
        btnCancelSearch.addEventListener('click', () => {
            cancelMatchmaking();
        });
    }

    if (modeSelect) {
        modeSelect.addEventListener('change', (e) => {
            const selectedVal = (e.target as HTMLSelectElement).value;
            if (selectedVal === 'pvp') {
                openMatchmakingModal();
            } else {
                lastSelectedNonPvpMode = selectedVal;
            }
        });
    }
}

export function openMatchmakingModal() {
    showSidebarView('searching');
}

export function closeMatchmakingModal() {
    const modal = document.getElementById('matchmaking-modal');
    if (modal) {
        modal.classList.remove('active');
    }
}

export async function startMatchmaking() {
    showSidebarView('searching');
    const statusBox = document.getElementById('matchmaking-status-box');
    const spinnerText = document.getElementById('matchmaking-spinner-text');
    const btnStart = document.getElementById('btn-start-search');

    if (statusBox) statusBox.classList.remove('hidden');
    if (spinnerText) spinnerText.textContent = 'Searching for an opponent...';
    if (btnStart) {
        (btnStart as HTMLButtonElement).disabled = true;
        btnStart.style.display = 'none';
    }

    gameState.onlineStatus = 'searching';
    isCreatingGame = false;

    // Clear previous queue listeners
    if (queueCollectionUnsubscribe) { queueCollectionUnsubscribe(); queueCollectionUnsubscribe = null; }
    if (myQueueUnsubscribe) { myQueueUnsubscribe(); myQueueUnsubscribe = null; }

    try {
        const user = await ensureAuth();
        if (spinnerText) spinnerText.textContent = 'Searching for an opponent...';

        const myQueueRef = doc(db, 'matchmakingQueue', user.uid);

        // 1. Place user into matchmaking queue
        await setDoc(myQueueRef, {
            userId: user.uid,
            createdAt: Date.now(),
            status: 'waiting',
            gameId: ''
        });

        // 2. Listen to my own queue document for 'matched' status
        myQueueUnsubscribe = onSnapshot(myQueueRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data.status === 'matched' && data.gameId) {
                    // Clean up queue listeners
                    if (queueCollectionUnsubscribe) { queueCollectionUnsubscribe(); queueCollectionUnsubscribe = null; }
                    if (myQueueUnsubscribe) { myQueueUnsubscribe(); myQueueUnsubscribe = null; }

                    deleteDoc(myQueueRef).catch(() => {});

                    // Use onSnapshot to wait until the game document is ready
                    const gameRef = doc(db, 'games', data.gameId);
                    const gameUnsub = onSnapshot(gameRef, (gameSnap) => {
                        if (gameSnap.exists()) {
                            gameUnsub();
                            const gameData = gameSnap.data();
                            const myColor = gameData.whitePlayerId === user.uid ? 'w' : 'b';
                            joinGame(data.gameId, myColor);
                        }
                    });
                }
            }
        });

        // 3. Listen to all waiting queue entries to match immediately
        const queueQuery = query(collection(db, 'matchmakingQueue'), where('status', '==', 'waiting'));
        queueCollectionUnsubscribe = onSnapshot(queueQuery, async (snapshot) => {
            if (isCreatingGame) return;

            let waitingOpponent: { id: string; userId: string } | null = null;
            for (const docSnap of snapshot.docs) {
                const data = docSnap.data();
                if (data.userId !== user.uid) {
                    waitingOpponent = { id: docSnap.id, userId: data.userId };
                    break;
                }
            }

            if (waitingOpponent) {
                // Determine who creates the game deterministically (lower string ID)
                const isCreator = user.uid < waitingOpponent.userId;

                if (isCreator && !isCreatingGame) {
                    isCreatingGame = true;
                    try {
                        const gameRef = doc(collection(db, 'games'));
                        const gameId = gameRef.id;

                        const isUserWhite = Math.random() < 0.5;
                        const whitePlayerId = isUserWhite ? user.uid : waitingOpponent.userId;
                        const blackPlayerId = isUserWhite ? waitingOpponent.userId : user.uid;

                        await setDoc(gameRef, {
                            whitePlayerId,
                            blackPlayerId,
                            fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
                            moves: [],
                            currentTurn: 'w',
                            status: 'active',
                            winner: null,
                            lastMove: null,
                            rematchRequestFrom: null,
                            updatedAt: serverTimestamp()
                        });

                        // Match both players
                        await updateDoc(doc(db, 'matchmakingQueue', waitingOpponent.id), {
                            status: 'matched',
                            gameId: gameId
                        });

                        await updateDoc(myQueueRef, {
                            status: 'matched',
                            gameId: gameId
                        });
                    } catch (e) {
                        console.error('Error creating match game:', e);
                        isCreatingGame = false;
                    }
                }
            }
        });

    } catch (e: any) {
        console.error('Matchmaking error:', e);
        showMatchmakingError('Failed to connect to Firebase. Please try again.');
    }
}

export async function cancelMatchmaking() {
    if (queueCollectionUnsubscribe) {
        queueCollectionUnsubscribe();
        queueCollectionUnsubscribe = null;
    }
    if (myQueueUnsubscribe) {
        myQueueUnsubscribe();
        myQueueUnsubscribe = null;
    }

    try {
        const user = await ensureAuth();
        await deleteDoc(doc(db, 'matchmakingQueue', user.uid));
    } catch (e) {
        // ignore
    }

    gameState.onlineStatus = 'idle';
    closeMatchmakingModal();
    openFrontPageModal();
}

function showMatchmakingError(msg: string) {
    showSidebarView('searching');
    const spinnerText = document.getElementById('matchmaking-spinner-text');
    const desc = document.getElementById('matchmaking-desc');
    const statusBox = document.getElementById('matchmaking-status-box');
    const btnStart = document.getElementById('btn-start-search');

    if (spinnerText) spinnerText.textContent = msg;
    if (desc) desc.textContent = msg;
    if (statusBox) statusBox.classList.add('hidden');
    if (btnStart) {
        btnStart.style.display = 'block';
        (btnStart as HTMLButtonElement).disabled = false;
    }
}

function joinGame(gameId: string, color: 'w' | 'b') {
    gameState.onlineGameId = gameId;
    gameState.onlinePlayerColor = color;
    gameState.onlineStatus = 'matched';
    gameState.gameMode = 'pvp';
    lastProcessedMoveIndex = -1;

    closeMatchmakingModal();
    const gameModal = document.getElementById('game-modal');
    if (gameModal) gameModal.classList.remove('active');

    resetGame();
    render2DBoard();

    SoundEngine.playStart();

    const colorName = color === 'w' ? 'White' : 'Black';
    const statusText = document.getElementById('status-text');
    if (statusText) {
        statusText.textContent = `Online PvP Match Started! You are ${colorName}`;
    }

    updateModeUI();
    showSidebarView('game');

    subscribeToGameUpdates(gameId);
}

function subscribeToGameUpdates(gameId: string) {
    if (gameUnsubscribe) gameUnsubscribe();

    const gameRef = doc(db, 'games', gameId);
    gameUnsubscribe = onSnapshot(gameRef, (docSnap) => {
        if (!docSnap.exists()) return;
        const data = docSnap.data();
        const myUid = getUserId();

        // Check if game document was restarted for a rematch
        if (data.status === 'active') {
            const isRematchRestart = gameState.onlineStatus === 'ended' || (Array.isArray(data.moves) && data.moves.length === 0 && lastProcessedMoveIndex >= 0);
            if (isRematchRestart) {
                const myColor = data.whitePlayerId === myUid ? 'w' : (data.blackPlayerId === myUid ? 'b' : gameState.onlinePlayerColor);
                gameState.onlineStatus = 'matched';
                gameState.onlinePlayerColor = myColor;
                lastProcessedMoveIndex = -1;

                // Hide modals
                const gameModal = document.getElementById('game-modal');
                if (gameModal) gameModal.classList.remove('active');
                const confirmModal = document.getElementById('confirm-modal');
                if (confirmModal) confirmModal.classList.remove('active');

                resetGame();
                render2DBoard();

                SoundEngine.playStart();
                const colorName = myColor === 'w' ? 'White' : 'Black';
                const statusText = document.getElementById('status-text');
                if (statusText) {
                    statusText.textContent = `Online PvP Match Started! You are ${colorName}`;
                }

                updateModeUI();
            }
        }

        // 1. Process moves made by opponent / missing moves
        if (Array.isArray(data.moves)) {
            const movesCount = data.moves.length;
            if (movesCount > lastProcessedMoveIndex + 1) {
                for (let i = lastProcessedMoveIndex + 1; i < movesCount; i++) {
                    const rawMove = data.moves[i];
                    const moveObj = typeof rawMove === 'string' ? JSON.parse(rawMove) : rawMove;
                    executeMove(moveObj);
                }
                lastProcessedMoveIndex = movesCount - 1;
            }
        }

        // 2. Process Game Status (Resignation / Win / Draw / Rematch)
        if (data.status === 'resigned' && gameState.onlineStatus !== 'ended') {
            gameState.onlineStatus = 'ended';
            SoundEngine.playCheck();
            if (data.winner === gameState.onlinePlayerColor) {
                showGameOverModal('Opponent Resigned', 'Your opponent resigned! You win the match!', 'win');
            } else {
                showGameOverModal('You Resigned', 'You resigned the match.', 'lose');
            }
        }

        // 3. Process Rematch Requests
        if (data.rematchRequestFrom && data.rematchRequestFrom !== myUid) {
            const modalTitle = document.getElementById('modal-title');
            const modalDesc = document.getElementById('modal-desc');
            const rematchBtn = document.getElementById('modal-rematch-btn');
            if (modalTitle) modalTitle.textContent = 'Rematch Request';
            if (modalDesc) modalDesc.textContent = 'Your opponent wants to play again.';
            if (rematchBtn) {
                rematchBtn.textContent = 'Accept Rematch';
                (rematchBtn as HTMLButtonElement).disabled = false;
                const newBtn = rematchBtn.cloneNode(true) as HTMLButtonElement;
                rematchBtn.parentNode?.replaceChild(newBtn, rematchBtn);
                newBtn.addEventListener('click', () => {
                    sendRematchAccept();
                });
            }
        }
    });
}

export async function sendMoveToServer(move: any) {
    if (gameState.gameMode === 'pvp' && gameState.onlineGameId) {
        try {
            const gameRef = doc(db, 'games', gameState.onlineGameId);
            const gameSnap = await getDoc(gameRef);
            const currentMoves = gameSnap.exists() && Array.isArray(gameSnap.data().moves) ? gameSnap.data().moves : [];
            
            const moveData: { from: string; to: string; promotion?: string } = {
                from: move.from,
                to: move.to
            };
            if (move.promotion) {
                moveData.promotion = move.promotion;
            }

            await updateDoc(gameRef, {
                fen: gameState.game.fen(),
                moves: [...currentMoves, JSON.stringify(moveData)],
                lastMove: moveData,
                currentTurn: gameState.game.turn(),
                updatedAt: serverTimestamp()
            });
            lastProcessedMoveIndex = currentMoves.length;
        } catch (e) {
            console.error('Error sending move to Firebase:', e);
        }
    }
}

export async function sendResignToServer() {
    if (gameState.gameMode === 'pvp' && gameState.onlineGameId) {
        try {
            const gameRef = doc(db, 'games', gameState.onlineGameId);
            const winnerColor = gameState.onlinePlayerColor === 'w' ? 'b' : 'w';
            await updateDoc(gameRef, {
                status: 'resigned',
                winner: winnerColor,
                updatedAt: serverTimestamp()
            });
        } catch (e) {
            console.error('Error sending resignation to Firebase:', e);
        }
    }
}

export async function sendRematchRequest() {
    if (gameState.gameMode === 'pvp' && gameState.onlineGameId) {
        try {
            const myUid = getUserId();
            const gameRef = doc(db, 'games', gameState.onlineGameId);
            await updateDoc(gameRef, {
                rematchRequestFrom: myUid,
                updatedAt: serverTimestamp()
            });
        } catch (e) {
            console.error('Error sending rematch request:', e);
        }
    }
}

export async function sendRematchAccept() {
    if (gameState.gameMode === 'pvp' && gameState.onlineGameId) {
        try {
            const myUid = getUserId();
            const gameRef = doc(db, 'games', gameState.onlineGameId);
            const gameSnap = await getDoc(gameRef);
            if (gameSnap.exists()) {
                const gameData = gameSnap.data();
                // Swap colors for new game
                const newWhitePlayerId = gameData.blackPlayerId;
                const newBlackPlayerId = gameData.whitePlayerId;
                const myColor = newWhitePlayerId === myUid ? 'w' : 'b';

                await updateDoc(gameRef, {
                    whitePlayerId: newWhitePlayerId,
                    blackPlayerId: newBlackPlayerId,
                    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
                    moves: [],
                    currentTurn: 'w',
                    status: 'active',
                    winner: null,
                    lastMove: null,
                    rematchRequestFrom: null,
                    updatedAt: serverTimestamp()
                });
                joinGame(gameState.onlineGameId, myColor);
            }
        } catch (e) {
            console.error('Error accepting rematch:', e);
        }
    }
}
