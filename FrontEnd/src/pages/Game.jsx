import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import ship1 from "../assets/ships/image/ship-1.png";
import ship2 from "../assets/ships/image/ship-2.png";
import ship3 from "../assets/ships/image/ship-3.png";
import ship4 from "../assets/ships/image/ship-4.png";
import { canPlaceShip, checkVictory, createBoard, fireAt, getShipOffsets, markWaterAroundSunkShip, placeShip, placeShipsRandomly, SHIP_DEFS } from "../game/GameLogic";
import { getBotMove, resetBotAI } from "../game/botAI";
import "./GameEffects.css";

const BOARD_SIZE = 10;
const CELL_SIZE = 40;
const CELL_GAP = 2;
const COORD_HEADER_HEIGHT = 24;
const SHIP_CELL_PADDING = 0;
const SHIP_IMAGE_SCALE = 1.22;
const L_SHIP_IMAGE_SCALE = 1.15;
const SHIP_IMAGE_OFFSET_X = 6;
const SHIP_IMAGE_OFFSET_Y = -6;
const L_SHIP_IMAGE_OFFSET_X = -20;
const L_SHIP_IMAGE_OFFSET_Y = 6;
const PATROL_IMAGE_OFFSET_X = 6;
const PATROL_IMAGE_OFFSET_Y = 0;
const PATROL_VERTICAL_IMAGE_OFFSET_X = 1.5;
const PATROL_VERTICAL_IMAGE_OFFSET_Y = 8;
const GRID_SIZE_PX = BOARD_SIZE * CELL_SIZE + (BOARD_SIZE - 1) * CELL_GAP;

const SHIP_SPRITES = {
    carrier: { 0: ship1, 90: ship1 },
    patrol: { 0: ship2, 90: ship2 },
    zship: { 0: ship4, 90: ship4, 180: ship4, 270: ship4 },
    destroyer: { 0: ship3, 90: ship3, 180: ship3, 270: ship3 },
};

const resolveSpriteUrl = (sprite) => {
    if (!sprite) return "";
    if (typeof sprite === "string") return sprite;
    if (typeof sprite === "object") return sprite.default || sprite.src || "";
    return "";
};

const rotateOffset = (x, y, rotation) => {
    const normalizedRotation = ((rotation % 360) + 360) % 360;

    if (normalizedRotation === 90) return { x: y, y: -x };
    if (normalizedRotation === 180) return { x: -x, y: -y };
    if (normalizedRotation === 270) return { x: -y, y: x };

    return { x, y };
};

const getAngledShipOffset = (shipTypeId, rotation) => {
    const normalizedRotation = ((rotation % 360) + 360) % 360;

    if (shipTypeId === "destroyer" && normalizedRotation === 90) {
        return { x: -8, y: -20 };
    }

    if (shipTypeId === "destroyer" && normalizedRotation === 270) {
        return { x: 10, y: 20 };
    }

    if (shipTypeId === "zship" && normalizedRotation === 90) {
        return { x: 8, y: 6 };
    }

    if (shipTypeId === "zship" && normalizedRotation === 270) {
        return { x: -8, y: -4 };
    }

    const baseOffsetX = shipTypeId === "destroyer" ? L_SHIP_IMAGE_OFFSET_X : SHIP_IMAGE_OFFSET_X;
    const baseOffsetY = shipTypeId === "destroyer" ? L_SHIP_IMAGE_OFFSET_Y : SHIP_IMAGE_OFFSET_Y;

    return rotateOffset(baseOffsetX, baseOffsetY, normalizedRotation);
};

function Game() {
    const location = useLocation();
    const [difficulty, setDifficulty] = useState("easy");

    const [gameState, setGameState] = useState('PLACEMENT'); // PLACEMENT, READY, PLAYER_TURN, BOT_TURN, GAME_OVER
    const [playerBoard, setPlayerBoard] = useState(createBoard());
    const [enemyBoard, setEnemyBoard] = useState(createBoard());
    
    // Placement State
    const shipsToPlace = SHIP_DEFS;
    const [currentShipIndex, setCurrentShipIndex] = useState(0);
    const [rotation, setRotation] = useState(0);
    const [hoverCell, setHoverCell] = useState(null);
    const [selectedShip, setSelectedShip] = useState(null);
    const [draggedShip, setDraggedShip] = useState(null);
    
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
    const [enemySunkShipIds, setEnemySunkShipIds] = useState([]);
    const [playerShipsSunk, setPlayerShipsSunk] = useState([]);
    const [boardShake, setBoardShake] = useState(null);
    const [sunkEffect, setSunkEffect] = useState(null);
    const [showModal, setShowModal] = useState(false);

    const logContainerRef = useRef(null);
    const timerRef = useRef(null);
    const dragSkipClickRef = useRef(false);
    const currentShip = shipsToPlace[currentShipIndex];

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

    const triggerBoardShake = (boardSide) => {
        const token = Date.now() + Math.random();
        setBoardShake({ boardSide, token });
        window.setTimeout(() => {
            setBoardShake(current => current?.token === token ? null : current);
        }, 180);
    };

    const triggerSunkEffect = (boardSide, shipTypeId, shipId, cells) => {
        const shipDef = shipsToPlace.find(ship => ship.id === shipTypeId);
        const token = Date.now() + Math.random();

        setSunkEffect({
            boardSide,
            shipTypeId,
            shipId,
            shipLabel: shipDef?.label || "Ship",
            cells,
            token,
        });

        window.setTimeout(() => {
            setSunkEffect(current => current?.token === token ? null : current);
        }, 2400);
    };

    const cloneBoard = (board) => board.map(row => row.map(cell => ({ ...cell })));

    const clearShipFromBoard = (board, shipId) => {
        board.forEach((row) => {
            row.forEach((cell) => {
                if (cell.shipId !== shipId) return;

                cell.hasShip = false;
                cell.shipId = null;
                cell.shipTypeId = null;
                cell.shipRotation = null;
                cell.shipLength = null;
                cell.shipRoot = false;
                cell.shipBounds = null;
            });
        });
    };

    const getRootCellForShip = (board, shipId) => {
        for (const row of board) {
            for (const cell of row) {
                if (cell.shipId === shipId && cell.shipRoot) return cell;
            }
        }
        return null;
    };

    const getShipDefById = (shipTypeId) => shipsToPlace.find(ship => ship.id === shipTypeId);

    const getPlacedShipSelection = (cell, board = playerBoard) => {
        if (!cell.hasShip) return null;

        const shipDef = getShipDefById(cell.shipTypeId);
        const rootCell = getRootCellForShip(board, cell.shipId);
        if (!shipDef || !rootCell) return null;

        return {
            shipId: cell.shipId,
            shipDef,
            rotation: cell.shipRotation,
            row: rootCell.row,
            col: rootCell.col,
        };
    };

    const getPlacedShipSelectionAt = (row, col, board = playerBoard) => {
        const directSelection = getPlacedShipSelection(board[row][col], board);
        if (directSelection) return directSelection;

        for (const boardRow of board) {
            for (const cell of boardRow) {
                if (!cell.shipRoot || !cell.shipBounds) continue;

                const insideBounds = row >= cell.row
                    && row < cell.row + cell.shipBounds.rows
                    && col >= cell.col
                    && col < cell.col + cell.shipBounds.cols;

                if (insideBounds) {
                    const shipDef = getShipDefById(cell.shipTypeId);
                    if (!shipDef) return null;

                    return {
                        shipId: cell.shipId,
                        shipDef,
                        rotation: cell.shipRotation,
                        row: cell.row,
                        col: cell.col,
                    };
                }
            }
        }

        return null;
    };

    const selectPlacedShip = (cell, board = playerBoard) => {
        const placedShip = getPlacedShipSelection(cell, board);
        if (!placedShip) return;

        setSelectedShip(placedShip);
        setRotation(placedShip.rotation);
    };

    const movePlacedShipTo = (targetRow, targetCol, shipToMove = selectedShip) => {
        if (!shipToMove) return false;

        const newBoard = cloneBoard(playerBoard);
        clearShipFromBoard(newBoard, shipToMove.shipId);

        if (!placeShip(newBoard, targetRow, targetCol, shipToMove.shipDef, shipToMove.rotation)) {
            return false;
        }

        const newRootCell = getRootCellForShip(newBoard, newBoard[targetRow][targetCol].shipId);
        const newShipId = newRootCell?.shipId ?? newBoard[targetRow][targetCol].shipId;
        const updatedShip = {
            ...shipToMove,
            shipId: newShipId,
            row: targetRow,
            col: targetCol,
        };

        setPlayerBoard(newBoard);
        setSelectedShip(null);
        setHoverCell(null);
        setRotation(updatedShip.rotation);
        return true;
    };

    const rotatePlacedShip = useCallback((shipToRotate) => {
        if (!shipToRotate) return;

        const rotations = shipToRotate.shipDef.rotations;
        const idx = rotations.indexOf(shipToRotate.rotation);
        const nextRotation = rotations[(idx + 1) % rotations.length];

        setPlayerBoard(prevBoard => {
            const newBoard = cloneBoard(prevBoard);
            clearShipFromBoard(newBoard, shipToRotate.shipId);

            const candidateRoots = [
                [shipToRotate.row, shipToRotate.col],
                [shipToRotate.row - 1, shipToRotate.col],
                [shipToRotate.row, shipToRotate.col - 1],
                [shipToRotate.row + 1, shipToRotate.col],
                [shipToRotate.row, shipToRotate.col + 1],
                [shipToRotate.row - 1, shipToRotate.col - 1],
                [shipToRotate.row - 1, shipToRotate.col + 1],
                [shipToRotate.row + 1, shipToRotate.col - 1],
                [shipToRotate.row + 1, shipToRotate.col + 1],
            ];
            const nextRoot = candidateRoots.find(([row, col]) =>
                canPlaceShip(newBoard, row, col, shipToRotate.shipDef, nextRotation)
            );

            if (!nextRoot) {
                return prevBoard;
            }

            const [nextRow, nextCol] = nextRoot;
            placeShip(newBoard, nextRow, nextCol, shipToRotate.shipDef, nextRotation);
            const newShipId = newBoard[nextRow][nextCol].shipId;
            setSelectedShip({
                ...shipToRotate,
                shipId: newShipId,
                rotation: nextRotation,
                row: nextRow,
                col: nextCol,
            });
            setRotation(nextRotation);
            return newBoard;
        });
    }, []);

    const rotateShip = useCallback(() => {
        const shipToRotate = selectedShip?.shipDef || currentShip;
        const currentRotation = selectedShip?.rotation ?? rotation;
        if (!shipToRotate) return;

        const rotations = shipToRotate.rotations;
        const idx = rotations.indexOf(currentRotation);
        const nextRotation = rotations[(idx + 1) % rotations.length];

        if (gameState === 'READY' && selectedShip) {
            rotatePlacedShip(selectedShip);
            return;
        }

        setRotation(nextRotation);
    }, [currentShip, gameState, rotatePlacedShip, rotation, selectedShip]);

    useEffect(() => {
        if (currentShip) {
            setRotation(currentShip.rotations[0]);
        }
    }, [currentShipIndex]);

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
                triggerBoardShake("player");
                if (botShot.result && botShot.result.isSunk) {
                    const sunkCells = markWaterAroundSunkShip(newPlayerBoard, botShot.result.shipId);
                    setPlayerShipsSunk(prev => prev.includes(botShot.result.shipId)
                        ? prev
                        : [...prev, botShot.result.shipId]);
                    triggerSunkEffect("player", botShot.result.shipTypeId, botShot.result.shipId, sunkCells);
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
        if (enemyBoard[r][c].isHit && !enemyBoard[r][c].autoMarked) return;

        clearInterval(timerRef.current);
        
        setEnemyBoard(prevBoard => {
            if (prevBoard[r][c].isHit && !prevBoard[r][c].autoMarked) return prevBoard;
            
            const newEnemyBoard = [...prevBoard.map(row => [...row.map(c => ({...c}))])];
            if (newEnemyBoard[r][c].autoMarked) {
                newEnemyBoard[r][c].isHit = false;
                newEnemyBoard[r][c].autoMarked = false;
            }
            const shotResult = fireAt(newEnemyBoard, r, c);
            
            const colLetter = String.fromCharCode(65 + c);
            const rowNum = r + 1;
            const cellName = `${colLetter}${rowNum}`;

            setStats(prev => ({ ...prev, shots: prev.shots + 1 }));

            if (shotResult.result === "HIT") {
                triggerBoardShake("enemy");
                setStats(prev => ({ ...prev, hits: prev.hits + 1 }));
                if (shotResult.isSunk) {
                    const sunkCells = markWaterAroundSunkShip(newEnemyBoard, shotResult.shipId, false);
                    setStats(prev => ({ ...prev, shipsDestroyed: prev.shipsDestroyed + 1 }));
                    setEnemyShipsSunk(prev => [...prev, shotResult.shipTypeId]);
                    setEnemySunkShipIds(prev => prev.includes(shotResult.shipId)
                        ? prev
                        : [...prev, shotResult.shipId]);
                    triggerSunkEffect("enemy", shotResult.shipTypeId, shotResult.shipId, sunkCells);
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
        if (gameState === 'PLACEMENT' || gameState === 'READY') {
            setHoverCell({ r, c });
        }
    };

    const handlePlayerCellMouseDown = (event, r, c) => {
        if (gameState !== 'READY') return;
        if (event.button !== 0) return;

        const placedShip = getPlacedShipSelectionAt(r, c);
        if (!placedShip) return;

        event.preventDefault();
        const shipToDrag = {
            ...placedShip,
            grabOffset: {
                row: r - placedShip.row,
                col: c - placedShip.col,
            },
        };

        setSelectedShip(placedShip);
        setRotation(placedShip.rotation);
        setDraggedShip(shipToDrag);
    };

    const handlePlayerCellMouseUp = (r, c) => {
        if (gameState !== 'READY' || !draggedShip) return;

        const targetRow = r - draggedShip.grabOffset.row;
        const targetCol = c - draggedShip.grabOffset.col;
        if (targetRow === draggedShip.row && targetCol === draggedShip.col) {
            setDraggedShip(null);
            return;
        }

        movePlacedShipTo(targetRow, targetCol, draggedShip);
        setDraggedShip(null);
        dragSkipClickRef.current = true;
        window.setTimeout(() => {
            dragSkipClickRef.current = false;
        }, 0);
    };

    useEffect(() => {
        const stopDragging = () => setDraggedShip(null);
        document.addEventListener("mouseup", stopDragging);
        return () => document.removeEventListener("mouseup", stopDragging);
    }, []);

    const handlePlayerCellClick = (r, c) => {
        if (dragSkipClickRef.current) return;

        if (gameState === 'READY') {
            const clickedCell = playerBoard[r][c];

            if (clickedCell.hasShip && clickedCell.shipId !== selectedShip?.shipId) {
                selectPlacedShip(clickedCell);
                return;
            }

            if (clickedCell.hasShip && clickedCell.shipId === selectedShip?.shipId) {
                selectPlacedShip(clickedCell);
                return;
            }

            if (!selectedShip) {
                if (clickedCell.hasShip) selectPlacedShip(clickedCell);
                return;
            }

            movePlacedShipTo(r, c);
            return;
        }

        if (gameState !== 'PLACEMENT') return;

        if (!currentShip) return;
        const newBoard = [...playerBoard.map(row => [...row.map(c => ({...c}))])];

        if (placeShip(newBoard, r, c, currentShip, rotation)) {
            setPlayerBoard(newBoard);
            if (currentShipIndex + 1 < shipsToPlace.length) {
                setCurrentShipIndex(currentShipIndex + 1);
            } else {
                finishPlacement();
            }
        }
    };

    const handlePlayerCellContextMenu = (event, r, c) => {
        event.preventDefault();
        event.stopPropagation();

        if (gameState === 'PLACEMENT') {
            rotateShip();
            return;
        }

        if (gameState !== 'READY') return;

        const placedShip = getPlacedShipSelectionAt(r, c);
        if (!placedShip) return;

        setDraggedShip(null);
        setHoverCell(null);
        rotatePlacedShip(placedShip);
    };

    const finishPlacement = () => {
        setGameState('READY');
        setHoverCell(null);
        addLog("Fleet deployed. You can still adjust your ships before ready.", "info");
    };

    const beginBattle = () => {
        const newEnemyBoard = [...enemyBoard.map(row => [...row.map(c => ({...c}))])];
        placeShipsRandomly(newEnemyBoard, shipsToPlace);
        setEnemyBoard(newEnemyBoard);
        setSelectedShip(null);
        setHoverCell(null);
        setGameState('PLAYER_TURN');
        setTurnTimer(30);
        addLog("Battle initiated!", "info");
        addLog("Your turn started.", "info");
        setStats(prev => ({ ...prev, turns: 1 }));
    };

    const getShipSpriteUrl = (cell) => {
        if (!cell.shipRoot) return "";
        const sprite = SHIP_SPRITES[cell.shipTypeId]?.[cell.shipRotation];
        return resolveSpriteUrl(sprite);
    };

    const getShipOverlayStyle = (cell) => {
        if (!cell.shipBounds) return null;
        const width = (cell.shipBounds.cols * CELL_SIZE) + ((cell.shipBounds.cols - 1) * CELL_GAP);
        const height = (cell.shipBounds.rows * CELL_SIZE) + ((cell.shipBounds.rows - 1) * CELL_GAP);
        const left = cell.col * (CELL_SIZE + CELL_GAP);
        const top = cell.row * (CELL_SIZE + CELL_GAP);

        return {
            position: "absolute",
            left: `${left + SHIP_CELL_PADDING}px`,
            top: `${top + SHIP_CELL_PADDING}px`,
            width: `${width - (SHIP_CELL_PADDING * 2)}px`,
            height: `${height - (SHIP_CELL_PADDING * 2)}px`,
            overflow: "hidden",
            filter: "drop-shadow(0 0 6px rgba(0, 0, 0, 0.45))",
        };
    };

    const getShipImageStyle = (cell) => {
        if (!cell.shipBounds) return null;
        const width = (cell.shipBounds.cols * CELL_SIZE) + ((cell.shipBounds.cols - 1) * CELL_GAP);
        const height = (cell.shipBounds.rows * CELL_SIZE) + ((cell.shipBounds.rows - 1) * CELL_GAP);
        const rotationDeg = cell.shipRotation || 0;
        const quarterTurn = rotationDeg === 90 || rotationDeg === 270;
        const isAngledShip = cell.shipTypeId === "destroyer" || cell.shipTypeId === "zship";
        const isStraightShip = cell.shipTypeId === "carrier" || cell.shipTypeId === "patrol";
        const usesVerticalSourceImage = cell.shipTypeId === "carrier" || cell.shipTypeId === "patrol";
        const straightImageRotation = usesVerticalSourceImage ? rotationDeg + 90 : rotationDeg;
        const isLShip = cell.shipTypeId === "destroyer";
        const rotatedOffset = isAngledShip
            ? getAngledShipOffset(cell.shipTypeId, rotationDeg)
            : { x: 0, y: 0 };
        const offsetX = rotatedOffset.x;
        const offsetY = rotatedOffset.y;
        const scale = isLShip ? L_SHIP_IMAGE_SCALE : (isAngledShip ? SHIP_IMAGE_SCALE : 1);

        if (isStraightShip) {
            const straightQuarterTurn = straightImageRotation === 90 || straightImageRotation === 270;
            const straightScale = cell.shipTypeId === "patrol" ? 1.5 : 1;
            const isVerticalPatrol = cell.shipTypeId === "patrol" && rotationDeg === 90;
            const straightOffsetX = isVerticalPatrol
                ? PATROL_VERTICAL_IMAGE_OFFSET_X
                : (cell.shipTypeId === "patrol" ? PATROL_IMAGE_OFFSET_X : 0);
            const straightOffsetY = isVerticalPatrol
                ? PATROL_VERTICAL_IMAGE_OFFSET_Y
                : (cell.shipTypeId === "patrol" ? PATROL_IMAGE_OFFSET_Y : 0);
            return {
                position: "absolute",
                left: straightQuarterTurn ? `${(width - height) / 2}px` : "0",
                top: straightQuarterTurn ? `${(height - width) / 2}px` : "0",
                width: straightQuarterTurn ? `${height}px` : "100%",
                height: straightQuarterTurn ? `${width}px` : "100%",
                objectFit: "cover",
                objectPosition: "center",
                transform: `translate(${straightOffsetX}px, ${straightOffsetY}px) rotate(${straightImageRotation}deg) scale(${straightScale})`,
                transformOrigin: "center",
                imageRendering: "auto",
                maxWidth: "none",
            };
        }

        return {
            position: "absolute",
            left: quarterTurn ? `${(width - height) / 2}px` : "0",
            top: quarterTurn ? `${(height - width) / 2}px` : "0",
            width: quarterTurn ? `${height}px` : "100%",
            height: quarterTurn ? `${width}px` : "100%",
            objectFit: isAngledShip ? "cover" : "fill",
            objectPosition: "center",
            transform: `translate(${offsetX}px, ${offsetY}px) rotate(${rotationDeg}deg) scale(${scale})`,
            transformOrigin: "center",
            maxWidth: "none",
        };
    };

    const getFallbackShipCells = (board, shipId) => {
        const cells = [];
        board.forEach((row) => {
            row.forEach((cell) => {
                if (cell.shipId === shipId) cells.push(cell);
            });
        });
        return cells;
    };

    const renderBoard = (board, isEnemy, boardSide) => {
        const letters = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];
        const previewShip = currentShip;
        const previewRotation = rotation;
        let placementOffsets = null;
        let canPlace = false;

        if (!isEnemy && hoverCell && gameState === 'PLACEMENT' && previewShip) {
            placementOffsets = getShipOffsets(previewShip, previewRotation)
                .map(([dr, dc]) => ({ r: hoverCell.r + dr, c: hoverCell.c + dc }));
            canPlace = canPlaceShip(board, hoverCell.r, hoverCell.c, previewShip, previewRotation);
        }

        if (!isEnemy && hoverCell && gameState === 'READY') {
            const movingShip = draggedShip || selectedShip;

            if (movingShip) {
                const rootRow = draggedShip ? hoverCell.r - draggedShip.grabOffset.row : hoverCell.r;
                const rootCol = draggedShip ? hoverCell.c - draggedShip.grabOffset.col : hoverCell.c;
                const previewBoard = cloneBoard(board);

                clearShipFromBoard(previewBoard, movingShip.shipId);
                placementOffsets = getShipOffsets(movingShip.shipDef, movingShip.rotation)
                    .map(([dr, dc]) => ({ r: rootRow + dr, c: rootCol + dc }));
                canPlace = canPlaceShip(previewBoard, rootRow, rootCol, movingShip.shipDef, movingShip.rotation);
            }
        }

        const shipOverlays = [];
        const hitOverlays = [];
        const sunkShipIds = isEnemy ? enemySunkShipIds : playerShipsSunk;
        const showAllShips = !isEnemy || gameState === 'GAME_OVER';
        if (showAllShips || sunkShipIds.length > 0) {
            board.forEach((row) => {
                row.forEach((cell) => {
                    if (!cell.shipRoot) return;
                    const isShipSunk = sunkShipIds.includes(cell.shipId);
                    if (!showAllShips && !isShipSunk) return;

                    const spriteUrl = getShipSpriteUrl(cell);
                    const overlayStyle = getShipOverlayStyle(cell);
                    const imageStyle = getShipImageStyle(cell);
                    const isActivelySinking = sunkEffect?.boardSide === boardSide
                        && sunkEffect.shipId === cell.shipId;
                    if (!overlayStyle) return;
                    shipOverlays.push(
                        <div
                            key={`ship-${cell.shipId}`}
                            className={`pointer-events-none ship-overlay ${
                                isShipSunk ? "ship-sunk-silhouette" : ""
                            } ${isActivelySinking ? "ship-sinking" : ""}`}
                            style={overlayStyle}
                        >
                            {spriteUrl ? (
                                <img src={spriteUrl} alt="" style={imageStyle} />
                            ) : (
                                getFallbackShipCells(board, cell.shipId).map((shipCell) => (
                                    <div
                                        key={`${cell.shipId}-${shipCell.row}-${shipCell.col}`}
                                        className="absolute bg-secondary/30 border border-secondary/40"
                                        style={{
                                            left: `${(shipCell.col - cell.col) * (CELL_SIZE + CELL_GAP)}px`,
                                            top: `${(shipCell.row - cell.row) * (CELL_SIZE + CELL_GAP)}px`,
                                            width: `${CELL_SIZE}px`,
                                            height: `${CELL_SIZE}px`,
                                        }}
                                    />
                                ))
                            )}
                        </div>
                    );
                });
            });
        }

        board.forEach((row) => {
            row.forEach((cell) => {
                if (!cell.isHit || !cell.hasShip) return;

                hitOverlays.push(
                    <div
                        key={`hit-${cell.row}-${cell.col}`}
                        className="shot-effect shot-hit"
                        style={{
                            left: `${cell.col * (CELL_SIZE + CELL_GAP)}px`,
                            top: `${cell.row * (CELL_SIZE + CELL_GAP)}px`,
                            right: "auto",
                            bottom: "auto",
                            width: `${CELL_SIZE}px`,
                            height: `${CELL_SIZE}px`,
                        }}
                        aria-hidden="true"
                    >
                        <span className="hit-shockwave" />
                        <span className="hit-fireball" />
                        <span className="hit-smoke hit-smoke-one" />
                        <span className="hit-smoke hit-smoke-two" />
                        <span className="hit-spark hit-spark-one" />
                        <span className="hit-spark hit-spark-two" />
                        <span className="hit-spark hit-spark-three" />
                        <span className="hit-mark">X</span>
                    </div>
                );
            });
        });

        return (
            <div className="flex flex-col select-none">
                <div className="flex mb-1" style={{ gap: `${CELL_GAP}px` }}>
                    <div style={{ width: "24px", height: `${COORD_HEADER_HEIGHT}px` }} />
                    {letters.map((l) => (
                        <div
                            key={l}
                            className="flex items-center justify-center text-secondary/70 font-bold text-xs"
                            style={{ width: `${CELL_SIZE}px`, height: `${COORD_HEADER_HEIGHT}px` }}
                        >
                            {l}
                        </div>
                    ))}
                </div>
                <div className="flex">
                    <div className="flex flex-col" style={{ gap: `${CELL_GAP}px`, marginRight: `${CELL_GAP}px` }}>
                        {Array.from({ length: BOARD_SIZE }).map((_, idx) => (
                            <div
                                key={idx}
                                className="flex items-center justify-center text-secondary/70 font-bold text-xs"
                                style={{ width: "24px", height: `${CELL_SIZE}px` }}
                            >
                                {idx + 1}
                            </div>
                        ))}
                    </div>
                    <div
                        className={`relative ${
                            boardShake?.boardSide === boardSide ? "board-impact-shake" : ""
                        }`}
                        style={{ width: `${GRID_SIZE_PX}px`, height: `${GRID_SIZE_PX}px` }}
                    >
                        <div className="absolute inset-0 z-20 pointer-events-none">{shipOverlays}</div>
                        <div className="absolute inset-0 z-40 pointer-events-none">{hitOverlays}</div>
                        <div
                            className="relative grid"
                            style={{
                                gridTemplateColumns: `repeat(${BOARD_SIZE}, ${CELL_SIZE}px)`,
                                gridAutoRows: `${CELL_SIZE}px`,
                                gap: `${CELL_GAP}px`,
                            }}
                        >
                            {board.flatMap((row, r) =>
                                row.map((cell, c) => {
                                    const isHovered = placementOffsets
                                        ? placementOffsets.some((pos) => pos.r === r && pos.c === c)
                                        : false;
                                    const isCellHit = cell.isHit;
                                    const isCellMiss = isCellHit && !cell.hasShip;
                                    const isCellShipHit = isCellHit && cell.hasShip;
                                    const isSunkShipCell = cell.hasShip && sunkShipIds.includes(cell.shipId);
                                    const isRevealedEnemyShipCell = isEnemy && isSunkShipCell;
                                    const sunkCellIndex = sunkEffect?.boardSide === boardSide
                                        ? sunkEffect.cells.findIndex(pos => pos.row === r && pos.col === c)
                                        : -1;
                                    const isSunkChainCell = sunkCellIndex >= 0;
                                    const playerCellBg = cell.hasShip ? "bg-transparent" : "bg-surface-container/50";
                                    const baseCellBg = isEnemy
                                        ? (isSunkShipCell || isRevealedEnemyShipCell
                                            ? "bg-transparent"
                                            : "bg-surface-container hover:bg-white/10")
                                        : playerCellBg;
                                    const isDraggableShipCell = !isEnemy && gameState === 'READY' && cell.hasShip;
                                    const cursorClass = draggedShip
                                        ? "cursor-grabbing"
                                        : (isDraggableShipCell ? "cursor-grab" : "cursor-pointer");

                                    return (
                                        <div
                                            key={`${r}-${c}`}
                                            onMouseEnter={() => !isEnemy && handlePlayerCellHover(r, c)}
                                            onMouseLeave={() => !isEnemy && setHoverCell(null)}
                                            onMouseDown={(event) => !isEnemy && handlePlayerCellMouseDown(event, r, c)}
                                            onMouseUp={() => !isEnemy && handlePlayerCellMouseUp(r, c)}
                                            onContextMenu={(event) => !isEnemy && handlePlayerCellContextMenu(event, r, c)}
                                            onClick={() => isEnemy ? handleEnemyCellClick(r, c) : handlePlayerCellClick(r, c)}
                                            className={`ocean-cell relative ${cursorClass} overflow-visible transition-all duration-300 ${baseCellBg} ${
                                                isRevealedEnemyShipCell ? "enemy-ship-cell-revealed" : ""
                                            } ${
                                                isHovered
                                                    ? (canPlace ? "bg-secondary/50 shadow-[0_0_15px_#a5e7ff]" : "bg-error/50")
                                                    : ""
                                            }`}
                                        >
                                            {isSunkChainCell && (
                                                <div
                                                    className="chain-explosion"
                                                    style={{ "--chain-delay": `${sunkCellIndex * 150}ms` }}
                                                    aria-hidden="true"
                                                >
                                                    <span className="chain-fire" />
                                                    <span className="chain-ring" />
                                                    <span className="chain-bubble chain-bubble-one" />
                                                    <span className="chain-bubble chain-bubble-two" />
                                                </div>
                                            )}
                                            {isCellMiss && !cell.autoMarked && (
                                                <div className={`shot-effect shot-miss ${
                                                    cell.autoMarked ? "shot-auto-marked" : ""
                                                }`} aria-hidden="true">
                                                    <span className="miss-wave miss-wave-one" />
                                                    <span className="miss-wave miss-wave-two" />
                                                    <span className="miss-column" />
                                                    <span className="miss-droplet miss-droplet-one" />
                                                    <span className="miss-droplet miss-droplet-two" />
                                                    <span className="miss-droplet miss-droplet-three" />
                                                    <span className="miss-dot" />
                                                </div>
                                            )}
                                            {false && isCellShipHit && (
                                                <div className="shot-effect shot-hit" aria-hidden="true">
                                                    <span className="hit-shockwave" />
                                                    <span className="hit-fireball" />
                                                    <span className="hit-smoke hit-smoke-one" />
                                                    <span className="hit-smoke hit-smoke-two" />
                                                    <span className="hit-spark hit-spark-one" />
                                                    <span className="hit-spark hit-spark-two" />
                                                    <span className="hit-spark hit-spark-three" />
                                                    <span className="hit-mark">X</span>
                                                    <span className="text-error font-black text-xl drop-shadow-[0_0_5px_rgba(255,0,0,0.8)]">✕</span>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="game-shell bg-background text-on-background font-body-md min-h-screen selection:bg-secondary/30 flex flex-col">
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

            <main className="game-main flex-1 w-full max-w-[1440px] mx-auto px-gutter flex flex-col lg:flex-row">
                
                {/* Boards Section */}
                <div className="game-board-column flex-1 flex flex-col">
                    {/* Status Header */}
                    <div className="game-status glass-card rounded-xl border border-white/10 flex justify-between items-center">
                        <div>
                            <h2 className="font-display-lg text-xl uppercase tracking-widest text-on-surface">
                                {gameState === 'PLACEMENT' || gameState === 'READY' ? "Deploy Your Fleet" : "Sector Command"}
                            </h2>
                            <p className="text-on-surface-variant text-sm mt-1">
                                {gameState === 'PLACEMENT' && "Right-click to rotate ships (L/T shapes supported)."}
                                {gameState === 'READY' && (selectedShip
                                    ? "Move the selected ship or right-click to rotate it, then press Ready."
                                    : "Select any ship to move or rotate it, then press Ready.")}
                                {gameState === 'PLAYER_TURN' && <span className="text-secondary glow-text">Your turn! Target enemy waters.</span>}
                                {gameState === 'BOT_TURN' && <span className="text-error">Enemy is firing! Brace for impact!</span>}
                                {gameState === 'GAME_OVER' && (winner === 'PLAYER' ? <span className="text-green-400">Sector Secured!</span> : <span className="text-error">Fleet Annihilated!</span>)}
                            </p>
                        </div>
                        {gameState === 'READY' && (
                            <button
                                onClick={beginBattle}
                                className="bg-secondary text-on-secondary-fixed font-bold px-8 py-2 rounded-sm hover:bg-secondary-container transition-all active:scale-95 tracking-widest"
                            >
                                READY
                            </button>
                        )}
                        {(gameState === 'PLAYER_TURN' || gameState === 'BOT_TURN') && (
                            <div className="text-center">
                                <span className="text-[10px] text-on-surface-variant uppercase font-bold tracking-widest">Time</span>
                                <div className={`text-3xl font-black ${turnTimer <= 10 ? 'text-error animate-pulse' : 'text-secondary'}`}>
                                    {turnTimer}s
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="game-boards flex flex-col lg:flex-row justify-center items-center lg:items-start">
                        {/* Player Board */}
                        <div className="battle-board-section flex flex-col items-center">
                            <div className="board-heading">
                                <h3 className="font-bold text-secondary tracking-widest uppercase">Your Fleet</h3>
                                <div className="fleet-image-panel fleet-image-panel-placeholder" aria-hidden="true" />
                            </div>
                            {renderBoard(playerBoard, false, "player")}
                        </div>
                        
                        {/* Enemy Board */}
                        <div className="battle-board-section flex flex-col items-center">
                            <div className="board-heading enemy-board-heading">
                                <h3 className="font-bold text-error tracking-widest uppercase">
                                    {gameState === 'PLACEMENT' || gameState === 'READY' ? "Enemy Waters (Scanning...)" : "Enemy Waters"}
                                </h3>
                                
                                <div className="fleet-image-panel">
                                    <div className="fleet-image-list">
                                    {gameState !== 'PLACEMENT' && gameState !== 'READY' && shipsToPlace.map((ship, idx) => {
                                        const isSunk = enemyShipsSunk.includes(ship.id);
                                        const offsets = getShipOffsets(ship, ship.rotations[0]);
                                        const rowCount = Math.max(...offsets.map(([row]) => row)) + 1;
                                        const colCount = Math.max(...offsets.map(([, col]) => col)) + 1;
                                        return (
                                            <div
                                                key={idx}
                                                className={`fleet-shape-item ${isSunk ? "is-sunk" : ""}`}
                                                title={ship.label}
                                            >
                                                <span
                                                    className="fleet-shape-grid"
                                                    style={{
                                                        gridTemplateColumns: `repeat(${colCount}, 6px)`,
                                                        gridTemplateRows: `repeat(${rowCount}, 6px)`,
                                                    }}
                                                >
                                                    {offsets.map(([row, col]) => (
                                                        <span
                                                            key={`${row}-${col}`}
                                                            className="fleet-shape-cell"
                                                            style={{
                                                                gridRow: row + 1,
                                                                gridColumn: col + 1,
                                                            }}
                                                        />
                                                    ))}
                                                </span>
                                            </div>
                                        );
                                    })}
                                    {(gameState === 'PLACEMENT' || gameState === 'READY') && (
                                        <span className="enemy-fleet-scanning">Scanning...</span>
                                    )}
                                    </div>
                                </div>
                            </div>

                            <div className={`transition-opacity duration-700 ${gameState === 'PLACEMENT' || gameState === 'READY' ? 'opacity-20 pointer-events-none' : 'opacity-100'}`}>
                                {renderBoard(enemyBoard, true, "enemy")}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Battle Log Section */}
                <div className="game-log-column w-full lg:w-[350px] flex flex-col gap-4">
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

            {sunkEffect && (
                <div className={`sunk-announcement ${
                    sunkEffect.boardSide === "enemy" ? "sunk-announcement-victory" : "sunk-announcement-danger"
                }`}>
                    <span className="sunk-announcement-line" />
                    <strong>
                        {sunkEffect.boardSide === "enemy" ? "ENEMY" : "YOUR"} {sunkEffect.shipLabel.toUpperCase()} SUNK!
                    </strong>
                    <span className="sunk-announcement-line" />
                </div>
            )}

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
