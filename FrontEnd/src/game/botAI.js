import { fireAt } from "./GameLogic";

let botState = {
    mode: 'HUNT',
    targetQueue: [], // Dành cho Normal Bot (BFS)
    hits: [],        // Dành cho Hard Bot (danh sách ô hit của tàu hiện tại)
    sunkShipIds: new Set() // Dành cho Hard Bot (danh sách shipId đã chìm)
};

export function resetBotAI() {
    botState = {
        mode: 'HUNT',
        targetQueue: [],
        hits: [],
        sunkShipIds: new Set()
    };
}

export function getBotMove(board, difficulty) {
    let move;
    if (difficulty === 'hard') {
        move = getHardMove(board);
    } else if (difficulty === 'normal') {
        move = getNormalMove(board);
    } else {
        move = getEasyMove(board);
    }

    const result = fireAt(board, move.row, move.col);
    
    if (difficulty === 'normal') {
        updateNormalBotState(board, move, result);
    } else if (difficulty === 'hard') {
        updateHardBotState(board, move, result);
    }

    return { row: move.row, col: move.col, result };
}

function getEasyMove(board) {
    let row, col;
    while (true) {
        row = Math.floor(Math.random() * 10);
        col = Math.floor(Math.random() * 10);
        if (!board[row][col].isHit) {
            return { row, col };
        }
    }
}

function getNormalMove(board) {
    if (botState.mode === 'TARGET' && botState.targetQueue.length > 0) {
        while (botState.targetQueue.length > 0) {
            const nextTarget = botState.targetQueue.shift(); // BFS: dùng shift() để lấy phần tử đầu tiên
            if (!board[nextTarget.row][nextTarget.col].isHit) {
                return nextTarget;
            }
        }
    }
    
    botState.mode = 'HUNT';
    return getEasyMove(board);
}

function updateNormalBotState(board, move, result) {
    if (result.result === 'HIT') {
        if (result.isSunk) {
            botState.targetQueue = [];
            botState.mode = 'HUNT';
        } else {
            botState.mode = 'TARGET';
            
            const r = move.row;
            const c = move.col;
            const adjacent = [
                { row: r - 1, col: c },
                { row: r + 1, col: c },
                { row: r, col: c - 1 },
                { row: r, col: c + 1 }
            ];
            
            // Trộn ngẫu nhiên các ô lân cận để bắn ngẫu nhiên hướng
            adjacent.sort(() => Math.random() - 0.5);
            
            for (const cell of adjacent) {
                if (cell.row >= 0 && cell.row < 10 && cell.col >= 0 && cell.col < 10) {
                    if (!board[cell.row][cell.col].isHit) {
                        const exists = botState.targetQueue.some(q => q.row === cell.row && q.col === cell.col);
                        if (!exists) {
                            botState.targetQueue.push(cell);
                        }
                    }
                }
            }
        }
    }
}

// === CÁC HELPER CHO HARD BOT ===

function getShipBounds(offsets) {
    let maxR = 0;
    let maxC = 0;
    offsets.forEach(([r, c]) => {
        maxR = Math.max(maxR, r);
        maxC = Math.max(maxC, c);
    });
    return { rows: maxR + 1, cols: maxC + 1 };
}

function rotateOffsets(offsets) {
    return offsets.map(([r, c]) => [c, -r]);
}

function normalizeOffsets(offsets) {
    let minR = Infinity;
    let minC = Infinity;
    offsets.forEach(([r, c]) => {
        minR = Math.min(minR, r);
        minC = Math.min(minC, c);
    });
    return offsets.map(([r, c]) => [r - minR, c - minC]);
}

function getAllRotations(offsets) {
    const rotations = [];
    let current = offsets;
    
    const serialize = (offs) => offs.slice().sort((a,b) => a[0] - b[0] || a[1] - b[1]).map(o => o.join(',')).join(';');
    const seen = new Set();
    
    for (let i = 0; i < 4; i++) {
        const normalized = normalizeOffsets(current);
        const key = serialize(normalized);
        if (!seen.has(key)) {
            seen.add(key);
            rotations.push(normalized);
        }
        current = rotateOffsets(current);
    }
    return rotations;
}

function getSurvivingShips(board) {
    const ships = {};
    for (let r = 0; r < 10; r++) {
        for (let c = 0; c < 10; c++) {
            const cell = board[r][c];
            if (cell.hasShip) {
                const id = cell.shipId;
                if (!ships[id]) {
                    ships[id] = {
                        id,
                        length: cell.shipLength,
                        typeId: cell.shipTypeId,
                        originRow: cell.shipOriginRow,
                        originCol: cell.shipOriginCol,
                        rotation: cell.shipRotation,
                        cells: []
                    };
                }
                ships[id].cells.push({ row: r, col: c, isHit: cell.isHit });
            }
        }
    }
    
    const surviving = [];
    for (const id in ships) {
        const ship = ships[id];
        const isSunk = ship.cells.every(c => c.isHit);
        if (!isSunk) {
            const minRow = Math.min(...ship.cells.map(c => c.row));
            const minCol = Math.min(...ship.cells.map(c => c.col));
            const offsets = ship.cells.map(c => [c.row - minRow, c.col - minCol]);
            surviving.push({
                id: ship.id,
                size: ship.length,
                offsets: offsets
            });
        }
    }
    return surviving;
}

// === HARD BOT LOGIC ===

function getHardMove(board) {
    const survivingShips = getSurvivingShips(board);
    
    // Nếu không còn tàu nào (trên lý thuyết), bắn ngẫu nhiên
    if (survivingShips.length === 0) {
        return getEasyMove(board);
    }
    
    const prob = Array(10).fill(null).map(() => Array(10).fill(0));
    const isHunt = (botState.mode === 'HUNT' || botState.hits.length === 0);
    
    let maxCovered = 0;
    
    // Ở Target Mode: Tìm số ô hit nhiều nhất có thể khớp được bởi một con tàu đơn lẻ
    if (!isHunt) {
        for (const ship of survivingShips) {
            const rotations = getAllRotations(ship.offsets);
            for (const offsets of rotations) {
                const bounds = getShipBounds(offsets);
                for (let r = 0; r <= 10 - bounds.rows; r++) {
                    for (let c = 0; c <= 10 - bounds.cols; c++) {
                        let covered = 0;
                        let isValid = true;
                        
                        for (const [dr, dc] of offsets) {
                            const nr = r + dr;
                            const nc = c + dc;
                            const cell = board[nr][nc];
                            if (cell.isHit) {
                                const isCurrentHit = botState.hits.some(hit => hit.row === nr && hit.col === nc);
                                if (!isCurrentHit) {
                                    isValid = false;
                                    break;
                                }
                            }
                        }
                        if (!isValid) continue;
                        
                        for (const hit of botState.hits) {
                            if (offsets.some(([dr, dc]) => r + dr === hit.row && c + dc === hit.col)) {
                                covered++;
                            }
                        }
                        if (covered > maxCovered) {
                            maxCovered = covered;
                        }
                    }
                }
            }
        }
    }
    
    // Tính toán bản đồ xác suất (Probability Map)
    for (const ship of survivingShips) {
        const rotations = getAllRotations(ship.offsets);
        for (const offsets of rotations) {
            const bounds = getShipBounds(offsets);
            for (let r = 0; r <= 10 - bounds.rows; r++) {
                for (let c = 0; c <= 10 - bounds.cols; c++) {
                    let isValid = true;
                    let covered = 0;
                    
                    if (!isHunt) {
                        for (const hit of botState.hits) {
                            if (offsets.some(([dr, dc]) => r + dr === hit.row && c + dc === hit.col)) {
                                covered++;
                            }
                        }
                        // Chỉ cho phép các cấu hình khớp tối đa số ô hit
                        if (covered < maxCovered || covered === 0) continue;
                    }
                    
                    for (const [dr, dc] of offsets) {
                        const nr = r + dr;
                        const nc = c + dc;
                        const cell = board[nr][nc];
                        if (cell.isHit) {
                            if (isHunt) {
                                isValid = false;
                                break;
                            } else {
                                const isCurrentHit = botState.hits.some(hit => hit.row === nr && hit.col === nc);
                                if (!isCurrentHit) {
                                    isValid = false;
                                    break;
                                }
                            }
                        }
                    }
                    
                    if (isValid) {
                        for (const [dr, dc] of offsets) {
                            const nr = r + dr;
                            const nc = c + dc;
                            if (!board[nr][nc].isHit) {
                                prob[nr][nc] += 1;
                            }
                        }
                    }
                }
            }
        }
    }
    
    // Chọn nước đi tốt nhất
    let maxProb = -1;
    let bestMoves = [];
    
    for (let r = 0; r < 10; r++) {
        for (let c = 0; c < 10; c++) {
            if (board[r][c].isHit) continue;
            
            let score = prob[r][c];
            
            if (isHunt) {
                // Hunt mode: ưu tiên các ô theo mô hình lưới bàn cờ (Checkerboard)
                if ((r + c) % 2 === 0) {
                    score += 1000;
                }
            }
            
            if (score > maxProb) {
                maxProb = score;
                bestMoves = [{ row: r, col: c }];
            } else if (score === maxProb) {
                bestMoves.push({ row: r, col: c });
            }
        }
    }
    
    // Fallback: nếu không tìm thấy nước đi nào có xác suất > 0 (ví dụ trường hợp đặc biệt không khớp),
    // bắn vào ô lân cận các ô đã hit, hoặc ngẫu nhiên.
    if (maxProb <= 0 || bestMoves.length === 0) {
        if (!isHunt && botState.hits.length > 0) {
            const fallbackTargets = [];
            for (const hit of botState.hits) {
                const adj = [
                    { row: hit.row - 1, col: hit.col },
                    { row: hit.row + 1, col: hit.col },
                    { row: hit.row, col: hit.col - 1 },
                    { row: hit.row, col: hit.col + 1 }
                ];
                for (const cell of adj) {
                    if (cell.row >= 0 && cell.row < 10 && cell.col >= 0 && cell.col < 10) {
                        if (!board[cell.row][cell.col].isHit) {
                            fallbackTargets.push(cell);
                        }
                    }
                }
            }
            if (fallbackTargets.length > 0) {
                return fallbackTargets[Math.floor(Math.random() * fallbackTargets.length)];
            }
        }
        return getEasyMove(board);
    }
    
    return bestMoves[Math.floor(Math.random() * bestMoves.length)];
}

function updateHardBotState(board, move, result) {
    if (result.result === 'HIT') {
        if (result.isSunk) {
            botState.sunkShipIds.add(result.shipId);
            botState.hits = [];
            botState.mode = 'HUNT';
        } else {
            botState.mode = 'TARGET';
            botState.hits.push({ row: move.row, col: move.col });
        }
    }
}
