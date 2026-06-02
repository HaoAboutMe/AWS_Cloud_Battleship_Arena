import { useEffect, useState, useRef, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import { createBoard, placeShip, canPlaceShip, placeShipsRandomly, fireAt, checkVictory } from "../game/GameLogic";
import { getBotMove, resetBotAI } from "../game/botAI";

function Game() {
    const location = useLocation();
    const [difficulty, setDifficulty] = useState("easy");

    const [gameState, setGameState] = useState('PLACEMENT'); // PLACEMENT, PLAYER_TURN, BOT_TURN, GAME_OVER
    const [playerBoard, setPlayerBoard] = useState(createBoard());
    const [enemyBoard, setEnemyBoard] = useState(createBoard());
    
    // Placement State
    const shipsToPlace = [5, 4, 3, 2];
    const [currentShipIndex, setCurrentShipIndex] = useState(0);
    const [isHorizontal, setIsHorizontal] = useState(true);
    const [hoverCell, setHoverCell] = useState(null);
    
    // Game State
    const [turnTimer, setTurnTimer] = useState(30);
    const [logs, setLogs] = useState([]);
    const [winner, setWinner] = useState(null); // 'PLAYER' | 'BOT'
    
    // Statistics
    const [stats, setStats] = useState({
        turns: 0,
        shots: 0,
        hits: 0,
        misses: 0,
        shipsDestroyed: 0,
    });
    const [enemyShipsSunk, setEnemyShipsSunk] = useState([]);
    const [showModal, setShowModal] = useState(false);

    const logContainerRef = useRef(null);
    const timerRef = useRef(null);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const diff = params.get("difficulty") || "easy";
        setDifficulty(diff);
        resetBotAI();
    }, [location]);

    useEffect(() => {
        if (logContainerRef.current) {
            logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
        }
    }, [logs]);

    const addLog = useCallback((msg, type = "info") => {
        setLogs(prev => [...prev, { id: Date.now() + Math.random(), msg, type }]);
    }, []);

    // Right click rotation
    useEffect(() => {
        const handleContextMenu = (e) => {
            e.preventDefault();
            if (gameState === 'PLACEMENT') {
                setIsHorizontal(prev => !prev);
            }
        };
        document.addEventListener("contextmenu", handleContextMenu);
        return () => document.removeEventListener("contextmenu", handleContextMenu);
    }, [gameState]);

    // Timer Tick
    useEffect(() => {
        if (gameState === 'PLAYER_TURN') {
            timerRef.current = setInterval(() => {
                setTurnTimer(prev => {
                    if (prev <= 1) {
                        clearInterval(timerRef.current);
                        addLog("Time is up! Turn passes to enemy.", "warning");
                        startBotTurn();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        } else {
            clearInterval(timerRef.current);
        }
        return () => clearInterval(timerRef.current);
    }, [gameState]);

    const saveMatchStats = useCallback((isVictory) => {
        const key = 'battleshipStats';
        let savedStats = JSON.parse(localStorage.getItem(key)) || {
            totalMatches: 0,
            wins: 0,
            losses: 0,
            totalShots: 0,
            totalHits: 0,
        };
        
        savedStats.totalMatches += 1;
        if (isVictory) savedStats.wins += 1;
        else savedStats.losses += 1;
        
        savedStats.totalShots += stats.shots;
        savedStats.totalHits += stats.hits;
        
        localStorage.setItem(key, JSON.stringify(savedStats));
    }, [stats]);

    const endGame = useCallback((isPlayerVictory) => {
        setGameState('GAME_OVER');
        setWinner(isPlayerVictory ? 'PLAYER' : 'BOT');
        addLog(isPlayerVictory ? "VICTORY! Enemy fleet destroyed!" : "DEFEAT! Your fleet was destroyed.", isPlayerVictory ? "victory" : "defeat");
        saveMatchStats(isPlayerVictory);
        setTimeout(() => setShowModal(true), 1500);
    }, [saveMatchStats, addLog]);

    const startPlayerTurn = () => {
        setGameState('PLAYER_TURN');
        setTurnTimer(30);
        addLog("Your turn started.", "info");
        setStats(prev => ({ ...prev, turns: prev.turns + 1 }));
    };

    const startBotTurn = () => {
        setGameState('BOT_TURN');
        addLog("Enemy is thinking...", "info");
        
        // Random delay for bot thinking 700ms - 1200ms
        const delay = Math.floor(Math.random() * 500) + 700;
        setTimeout(() => {
            performBotMove();
        }, delay);
    };

    const performBotMove = () => {
        if (gameState === 'GAME_OVER') return;
        
        setPlayerBoard(prevBoard => {
            const newPlayerBoard = [...prevBoard.map(row => [...row.map(c => ({...c}))])];
            const botShot = getBotMove(newPlayerBoard, difficulty);
            const cell = newPlayerBoard[botShot.row][botShot.col];
            
            const colLetter = String.fromCharCode(65 + botShot.col);
            const rowNum = botShot.row + 1;
            const cellName = `${colLetter}${rowNum}`;

            if (cell.hasShip) {
                if (botShot.result && botShot.result.isSunk) {
                    addLog(`Enemy DESTROYED your ship (size ${botShot.result.shipLength}) at ${cellName}!`, "defeat");
                } else {
                    addLog(`Enemy hit your ship at ${cellName}!`, "enemy_hit");
                }
                
                if (checkVictory(newPlayerBoard)) {
                    endGame(false);
                } else {
                    // Bot gets another turn
                    const delay = Math.floor(Math.random() * 500) + 700;
                    setTimeout(() => performBotMove(), delay);
                }
            } else {
                addLog(`Enemy missed at ${cellName}.`, "enemy_miss");
                setTimeout(() => startPlayerTurn(), 800);
            }
            
            return newPlayerBoard;
        });
    };

    const handleEnemyCellClick = (r, c) => {
        if (gameState !== 'PLAYER_TURN') return;
        
        // We only check this to prevent obvious double clicks on already hit cells
        if (enemyBoard[r][c].isHit) return;

        clearInterval(timerRef.current);
        
        setEnemyBoard(prevBoard => {
            if (prevBoard[r][c].isHit) return prevBoard; // prevent fast double click issues
            
            const newEnemyBoard = [...prevBoard.map(row => [...row.map(c => ({...c}))])];
            const shotResult = fireAt(newEnemyBoard, r, c);
            
            const colLetter = String.fromCharCode(65 + c);
            const rowNum = r + 1;
            const cellName = `${colLetter}${rowNum}`;

            setStats(prev => ({ ...prev, shots: prev.shots + 1 }));

            if (shotResult.result === "HIT") {
                setStats(prev => ({ ...prev, hits: prev.hits + 1 }));
                if (shotResult.isSunk) {
                    setStats(prev => ({ ...prev, shipsDestroyed: prev.shipsDestroyed + 1 }));
                    setEnemyShipsSunk(prev => [...prev, shotResult.shipLength]);
                    addLog(`You destroyed an enemy ship (size ${shotResult.shipLength}) at ${cellName}!`, "destroy");
                } else {
                    addLog(`Direct hit at ${cellName}!`, "player_hit");
                }
                
                if (checkVictory(newEnemyBoard)) {
                    endGame(true);
                } else {
                    // Extra turn for player
                    setTimeout(() => startPlayerTurn(), 800);
                }
            } else {
                setStats(prev => ({ ...prev, misses: prev.misses + 1 }));
                addLog(`Missed at ${cellName}.`, "player_miss");
                setTimeout(() => startBotTurn(), 800);
            }
            
            return newEnemyBoard;
        });
    };

    const handlePlayerCellHover = (r, c) => {
        if (gameState === 'PLACEMENT') {
            setHoverCell({ r, c });
        }
    };

    const handlePlayerCellClick = (r, c) => {
        if (gameState !== 'PLACEMENT') return;
        
        const length = shipsToPlace[currentShipIndex];
        const newBoard = [...playerBoard.map(row => [...row.map(c => ({...c}))])];
        
        if (placeShip(newBoard, r, c, length, isHorizontal)) {
            setPlayerBoard(newBoard);
            if (currentShipIndex + 1 < shipsToPlace.length) {
                setCurrentShipIndex(currentShipIndex + 1);
            } else {
                finishPlacement();
            }
        }
    };

    const finishPlacement = () => {
        const newEnemyBoard = [...enemyBoard.map(row => [...row.map(c => ({...c}))])];
        placeShipsRandomly(newEnemyBoard);
        setEnemyBoard(newEnemyBoard);
        setGameState('PLAYER_TURN');
        setTurnTimer(30);
        addLog("Fleet deployed. Battle initiated!", "info");
        addLog("Your turn started.", "info");
        setStats(prev => ({ ...prev, turns: 1 }));
    };

    const getShipCssClasses = (cell) => {
        if (!cell.hasShip) return "";
        let classes = "bg-secondary/40 border-secondary shadow-[0_0_10px_rgba(0,210,255,0.3)] ";
        if (cell.shipPart === 'head') {
            classes += cell.isHorizontal ? "rounded-l-full border-l-2 border-y-2 " : "rounded-t-full border-t-2 border-x-2 ";
        } else if (cell.shipPart === 'tail') {
            classes += cell.isHorizontal ? "rounded-r-full border-r-2 border-y-2 " : "rounded-b-full border-b-2 border-x-2 ";
        } else {
            classes += cell.isHorizontal ? "border-y-2 " : "border-x-2 ";
        }
        
        // Sunk styling
        if (gameState !== 'PLACEMENT' && cell.isHit) {
             classes = classes.replace("bg-secondary/40", "bg-error/60").replace("border-secondary", "border-error").replace("rgba(0,210,255,0.3)", "rgba(255,0,0,0.5)");
        }
        
        return classes;
    };

    const renderBoard = (board, isEnemy) => {
        const letters = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];
        return (
            <div className="flex flex-col select-none">
                <div className="flex mb-1">
                    <div className="w-6 h-6"></div>
                    {letters.map(l => (
                        <div key={l} className="w-8 h-8 flex items-center justify-center text-secondary/70 font-bold text-xs">{l}</div>
                    ))}
                </div>
                {board.map((row, r) => (
                    <div key={r} className="flex">
                        <div className="w-6 h-8 flex items-center justify-center text-secondary/70 font-bold text-xs mr-1">{r + 1}</div>
                        {row.map((cell, c) => {
                            let isHovered = false;
                            let canPlace = true;
                            
                            if (!isEnemy && gameState === 'PLACEMENT' && hoverCell) {
                                const length = shipsToPlace[currentShipIndex];
                                if (isHorizontal) {
                                    if (r === hoverCell.r && c >= hoverCell.c && c < hoverCell.c + length) {
                                        isHovered = true;
                                    }
                                } else {
                                    if (c === hoverCell.c && r >= hoverCell.r && r < hoverCell.r + length) {
                                        isHovered = true;
                                    }
                                }
                                if (isHovered && !canPlaceShip(board, hoverCell.r, hoverCell.c, length, isHorizontal)) {
                                    canPlace = false;
                                }
                            }

                            const isCellHit = cell.isHit;
                            const isCellMiss = isCellHit && !cell.hasShip;
                            const isCellShipHit = isCellHit && cell.hasShip;
                            
                            return (
                                <div 
                                    key={`${r}-${c}`}
                                    onMouseEnter={() => !isEnemy && handlePlayerCellHover(r, c)}
                                    onMouseLeave={() => !isEnemy && setHoverCell(null)}
                                    onClick={() => isEnemy ? handleEnemyCellClick(r, c) : handlePlayerCellClick(r, c)}
                                    className={`
                                        w-8 h-8 sm:w-10 sm:h-10 m-[1px] relative cursor-pointer
                                        transition-all duration-300
                                        ${isEnemy ? "bg-surface-container hover:bg-white/10" : "bg-surface-container/50"}
                                        ${isHovered ? (canPlace ? "bg-secondary/50 shadow-[0_0_15px_#a5e7ff]" : "bg-error/50") : ""}
                                    `}
                                >
                                    {/* Ship rendering for player, or for enemy if game over */}
                                    {(!isEnemy || (isEnemy && gameState === 'GAME_OVER')) && cell.hasShip && (
                                        <div className={`absolute inset-0 ${getShipCssClasses(cell)} transition-all duration-300`}></div>
                                    )}
                                    
                                    {/* Hit/Miss Effects */}
                                    {isCellMiss && (
                                        <div className="absolute inset-0 flex items-center justify-center animate-fade-in">
                                            <div className="w-2 h-2 rounded-full bg-white/50"></div>
                                        </div>
                                    )}
                                    {isCellShipHit && (
                                        <div className="absolute inset-0 flex items-center justify-center animate-ping-once z-10">
                                            <span className="text-error font-black text-xl drop-shadow-[0_0_5px_rgba(255,0,0,0.8)]">✕</span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="bg-background text-on-background font-body-md min-h-screen selection:bg-secondary/30 flex flex-col">
            <header className="w-full top-0 sticky z-50 border-b border-white/5 bg-surface/40 backdrop-blur-xl shadow-[0_0_20px_rgba(0,210,255,0.1)]">
                <div className="flex justify-between items-center w-full px-gutter max-w-[1440px] mx-auto h-12">
                    <Link to="/" className="font-display-lg text-[20px] font-black text-secondary tracking-tighter uppercase hover:text-white transition-colors">
                        Cloud Battleship Arena
                    </Link>
                    <div className="flex items-center gap-4">
                        <span className="text-[10px] uppercase font-bold text-secondary bg-secondary/10 px-2 py-1 rounded-sm border border-secondary/20">
                            Difficulty: {difficulty}
                        </span>
                        <Link to="/" className="material-symbols-outlined text-on-surface-variant hover:text-secondary active:scale-95 transition-all p-2 rounded-full hover:bg-white/5">
                            home
                        </Link>
                    </div>
                </div>
            </header>

            <main className="flex-1 w-full max-w-[1440px] mx-auto px-gutter py-6 flex flex-col lg:flex-row gap-8">
                
                {/* Boards Section */}
                <div className="flex-1 flex flex-col gap-8">
                    {/* Status Header */}
                    <div className="glass-card p-4 rounded-xl border border-white/10 flex justify-between items-center">
                        <div>
                            <h2 className="font-display-lg text-xl uppercase tracking-widest text-on-surface">
                                {gameState === 'PLACEMENT' ? "Deploy Your Fleet" : "Sector Command"}
                            </h2>
                            <p className="text-on-surface-variant text-sm mt-1">
                                {gameState === 'PLACEMENT' && "Use Right-Click to rotate ships."}
                                {gameState === 'PLAYER_TURN' && <span className="text-secondary glow-text">Your turn! Target enemy waters.</span>}
                                {gameState === 'BOT_TURN' && <span className="text-error">Enemy is firing! Brace for impact!</span>}
                                {gameState === 'GAME_OVER' && (winner === 'PLAYER' ? <span className="text-green-400">Sector Secured!</span> : <span className="text-error">Fleet Annihilated!</span>)}
                            </p>
                        </div>
                        {gameState !== 'PLACEMENT' && gameState !== 'GAME_OVER' && (
                            <div className="text-center">
                                <span className="text-[10px] text-on-surface-variant uppercase font-bold tracking-widest">Time</span>
                                <div className={`text-3xl font-black ${turnTimer <= 10 ? 'text-error animate-pulse' : 'text-secondary'}`}>
                                    {turnTimer}s
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col lg:flex-row gap-8 justify-center items-center lg:items-start">
                        {/* Player Board */}
                        <div className="flex flex-col items-center">
                            <h3 className="font-bold text-secondary mb-4 tracking-widest uppercase">Your Fleet</h3>
                            {renderBoard(playerBoard, false)}
                        </div>
                        
                        {/* Enemy Board */}
                        <div className="flex flex-col items-center">
                            <div className="flex flex-col items-center mb-4">
                                <h3 className="font-bold text-error tracking-widest uppercase mb-2">
                                    {gameState === 'PLACEMENT' ? "Enemy Waters (Scanning...)" : "Enemy Waters"}
                                </h3>
                                
                                {/* Enemy Ship Status Icons */}
                                <div className="flex gap-4 h-[12px]">
                                    {gameState !== 'PLACEMENT' && shipsToPlace.map((length, idx) => {
                                        const isSunk = enemyShipsSunk.includes(length);
                                        return (
                                            <div key={idx} className="flex gap-[2px]">
                                                {Array.from({length}).map((_, i) => (
                                                    <div 
                                                        key={i} 
                                                        className={`w-3 h-3 border ${
                                                            isSunk 
                                                                ? 'bg-surface-variant border-outline-variant opacity-40' 
                                                                : 'bg-secondary/40 border-secondary shadow-[0_0_5px_rgba(0,210,255,0.3)]'
                                                        }`}
                                                    />
                                                ))}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className={`transition-opacity duration-700 ${gameState === 'PLACEMENT' ? 'opacity-20 pointer-events-none' : 'opacity-100'}`}>
                                {renderBoard(enemyBoard, true)}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Battle Log Section */}
                <div className="w-full lg:w-[350px] flex flex-col gap-4">
                    <div className="glass-card flex-1 flex flex-col rounded-xl overflow-hidden border border-white/10 min-h-[300px] lg:max-h-[600px]">
                        <div className="p-4 border-b border-white/5 bg-white/5">
                            <h3 className="font-bold text-on-surface uppercase tracking-widest flex items-center gap-2">
                                <span className="material-symbols-outlined text-[18px]">receipt_long</span>
                                Battle Log
                            </h3>
                        </div>
                        <div 
                            ref={logContainerRef}
                            className="flex-1 p-4 overflow-y-auto flex flex-col gap-2 font-mono text-xs"
                        >
                            {logs.map(log => (
                                <div key={log.id} className={`p-2 rounded-sm border-l-2 ${
                                    log.type === 'player_hit' ? 'bg-secondary/20 border-secondary text-secondary font-bold' :
                                    log.type === 'player_miss' ? 'bg-secondary/5 border-secondary/30 text-secondary/70' :
                                    log.type === 'enemy_hit' ? 'bg-error/20 border-error text-error font-bold' :
                                    log.type === 'enemy_miss' ? 'bg-error/5 border-error/30 text-error/70' :
                                    log.type === 'destroy' ? 'bg-green-500/20 border-green-500 text-green-400 font-bold glow-text' :
                                    log.type === 'defeat' ? 'bg-error/30 border-error text-error font-bold glow-text-error' :
                                    log.type === 'victory' ? 'bg-yellow-500/20 border-yellow-500 text-yellow-400 font-bold glow-text' :
                                    log.type === 'warning' ? 'bg-orange-500/10 border-orange-500 text-orange-400' :
                                    'bg-surface-container border-white/10 text-on-surface'
                                } animate-fade-in`}>
                                    {log.msg}
                                </div>
                            ))}
                            {logs.length === 0 && (
                                <div className="text-on-surface-variant italic text-center mt-4 opacity-50">Awaiting deployment...</div>
                            )}
                        </div>
                    </div>
                </div>
            </main>

            {/* Victory/Defeat Modal */}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in">
                    <div className="glass-card max-w-md w-full p-8 rounded-2xl border border-white/10 shadow-2xl flex flex-col items-center text-center">
                        <div className="mb-6">
                            {winner === 'PLAYER' ? (
                                <span className="material-symbols-outlined text-[80px] text-green-400 drop-shadow-[0_0_20px_rgba(74,222,128,0.5)]">emoji_events</span>
                            ) : (
                                <span className="material-symbols-outlined text-[80px] text-error drop-shadow-[0_0_20px_rgba(255,0,0,0.5)]">skull</span>
                            )}
                        </div>
                        
                        <h2 className={`font-display-lg text-4xl mb-2 ${winner === 'PLAYER' ? 'text-green-400 glow-text' : 'text-error glow-text-error'}`}>
                            {winner === 'PLAYER' ? 'VICTORY' : 'DEFEAT'}
                        </h2>
                        <p className="text-on-surface-variant text-sm mb-6 uppercase tracking-widest font-bold">
                            Difficulty: {difficulty}
                        </p>
                        
                        <div className="w-full bg-surface-container/50 rounded-lg p-4 mb-6 grid grid-cols-2 gap-4 text-left">
                            <div>
                                <p className="text-[10px] uppercase text-on-surface-variant font-bold">Total Turns</p>
                                <p className="text-lg font-black">{stats.turns}</p>
                            </div>
                            <div>
                                <p className="text-[10px] uppercase text-on-surface-variant font-bold">Total Shots</p>
                                <p className="text-lg font-black">{stats.shots}</p>
                            </div>
                            <div>
                                <p className="text-[10px] uppercase text-on-surface-variant font-bold">Hits / Misses</p>
                                <p className="text-lg font-black text-secondary">{stats.hits} <span className="text-on-surface-variant text-sm font-normal">/ {stats.misses}</span></p>
                            </div>
                            <div>
                                <p className="text-[10px] uppercase text-on-surface-variant font-bold">Accuracy</p>
                                <p className="text-lg font-black text-secondary">{stats.shots > 0 ? Math.round((stats.hits / stats.shots) * 100) : 0}%</p>
                            </div>
                        </div>

                        <div className="flex gap-4 w-full">
                            <button 
                                onClick={() => window.location.reload()}
                                className="flex-1 bg-secondary text-on-secondary-fixed font-bold py-3 rounded-full hover:bg-secondary-container transition-all active:scale-95"
                            >
                                PLAY AGAIN
                            </button>
                            <Link to="/" className="flex-1 bg-surface-container border border-white/10 text-on-surface font-bold py-3 rounded-full hover:bg-white/5 transition-all active:scale-95 block">
                                RETURN HOME
                            </Link>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Game;