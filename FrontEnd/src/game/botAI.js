import { fireAt } from "./GameLogic";

let state = {
    mode: 'HUNT',
    initialHit: null,
    lastHit: null,
    direction: null,
    stack: []
};

export function resetBotAI() {
    state = {
        mode: 'HUNT',
        initialHit: null,
        lastHit: null,
        direction: null,
        stack: []
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
    
    if (difficulty === 'normal' || difficulty === 'hard') {
        updateBotState(board, move, result);
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
    if (state.mode === 'TARGET' && state.stack.length > 0) {
        while (state.stack.length > 0) {
            const nextTarget = state.stack.pop();
            if (!board[nextTarget.row][nextTarget.col].isHit) {
                return nextTarget;
            }
        }
    }
    
    state.mode = 'HUNT';
    return getEasyMove(board);
}

function getHardMove(board) {
    if (state.mode === 'TARGET' && state.stack.length > 0) {
        while (state.stack.length > 0) {
            const nextTarget = state.stack.pop();
            if (!board[nextTarget.row][nextTarget.col].isHit) {
                return nextTarget;
            }
        }
    }
    
    state.mode = 'HUNT';
    
    // Hard bot: Probability Search (Checkerboard)
    let potentialMoves = [];
    for (let r = 0; r < 10; r++) {
        for (let c = 0; c < 10; c++) {
            // Checkerboard pattern
            if (!board[r][c].isHit && (r + c) % 2 === 0) {
                potentialMoves.push({row: r, col: c});
            }
        }
    }
    
    if (potentialMoves.length > 0) {
        const idx = Math.floor(Math.random() * potentialMoves.length);
        return potentialMoves[idx];
    }
    
    return getEasyMove(board);
}

function updateBotState(board, move, result) {
    if (result.result === 'HIT') {
        if (result.isSunk) {
            // Wipe memory and return to hunt
            resetBotAI();
        } else {
            if (state.mode === 'HUNT') {
                state.mode = 'TARGET';
                state.initialHit = move;
                state.lastHit = move;
                addAdjacentToStack(board, move.row, move.col);
            } else {
                if (!state.direction && state.initialHit) {
                    if (move.row === state.initialHit.row) {
                        state.direction = 'HORIZONTAL';
                    } else if (move.col === state.initialHit.col) {
                        state.direction = 'VERTICAL';
                    }
                }
                
                state.lastHit = move;
                
                if (state.direction === 'HORIZONTAL') {
                    // Try to go left and right
                    state.stack = [];
                    if (move.col > 0 && !board[move.row][move.col - 1].isHit) state.stack.push({row: move.row, col: move.col - 1});
                    if (move.col < 9 && !board[move.row][move.col + 1].isHit) state.stack.push({row: move.row, col: move.col + 1});
                    
                    if (state.initialHit.col > 0 && !board[state.initialHit.row][state.initialHit.col - 1].isHit) state.stack.push({row: state.initialHit.row, col: state.initialHit.col - 1});
                    if (state.initialHit.col < 9 && !board[state.initialHit.row][state.initialHit.col + 1].isHit) state.stack.push({row: state.initialHit.row, col: state.initialHit.col + 1});
                } else if (state.direction === 'VERTICAL') {
                    // Try to go up and down
                    state.stack = [];
                    if (move.row > 0 && !board[move.row - 1][move.col].isHit) state.stack.push({row: move.row - 1, col: move.col});
                    if (move.row < 9 && !board[move.row + 1][move.col].isHit) state.stack.push({row: move.row + 1, col: move.col});
                    
                    if (state.initialHit.row > 0 && !board[state.initialHit.row - 1][state.initialHit.col].isHit) state.stack.push({row: state.initialHit.row - 1, col: state.initialHit.col});
                    if (state.initialHit.row < 9 && !board[state.initialHit.row + 1][state.initialHit.col].isHit) state.stack.push({row: state.initialHit.row + 1, col: state.initialHit.col});
                }
            }
        }
    }
}

function addAdjacentToStack(board, r, c) {
    const dirs = [];
    if (r > 0 && !board[r-1][c].isHit) dirs.push({row: r-1, col: c});
    if (r < 9 && !board[r+1][c].isHit) dirs.push({row: r+1, col: c});
    if (c > 0 && !board[r][c-1].isHit) dirs.push({row: r, col: c-1});
    if (c < 9 && !board[r][c+1].isHit) dirs.push({row: r, col: c+1});
    
    dirs.sort(() => Math.random() - 0.5);
    state.stack.push(...dirs);
}
