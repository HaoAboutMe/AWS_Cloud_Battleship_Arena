export function createBoard() {
    const board = [];
    const rows = 10;
    const cols = 10;

    for (let row = 0; row < rows; row++) {
        board[row] = [];
        for (let col = 0; col < cols; col++) {
            board[row][col] = {
                row: row,
                col: col,
                hasShip: false,
                isHit: false
            };
        }
    }
    
    return board;
}

export function canPlaceShip(board, row, col, length, isHorizontal) {
    if (isHorizontal) {
        if (col + length > 10) return false;
    } else {
        if (row + length > 10) return false;
    }
    for (let i = 0; i < length; i++) {
        const r = isHorizontal ? row : row + i;
        const c = isHorizontal ? col + i : col;
        if (board[r][c].hasShip) return false;
    }
    return true;
}

export function placeShip(board, row, col, length, isHorizontal) {
    if (canPlaceShip(board, row, col, length, isHorizontal)) {
        for (let i = 0; i < length; i++) {
            const r = isHorizontal ? row : row + i;
            const c = isHorizontal ? col + i : col;
            board[r][c].hasShip = true;
            board[r][c].shipLength = length;
        }
        return true;
    }
    return false;
}


export function placeShipsRandomly(board) {
    const shipLengths = [5, 4, 3, 2];

    for (const length of shipLengths) {
        let placed = false;

        while (!placed) {
            const isHorizontal = Math.random() > 0.5;
            const startRow = Math.floor(Math.random() * 10);
            const startCol = Math.floor(Math.random() * 10);

            let canPlace = true;

            if (isHorizontal) {
                if (startCol + length > 10) canPlace = false;
            } else {
                if (startRow + length > 10) canPlace = false;
            }

            if (canPlace) {
                for (let i = 0; i < length; i++) {
                    const r = isHorizontal ? startRow : startRow + i;
                    const c = isHorizontal ? startCol + i : startCol;
                    if (board[r][c].hasShip) {
                        canPlace = false;
                        break;
                    }
                }
            }

            if (canPlace) {
                for (let i = 0; i < length; i++) {
                    const r = isHorizontal ? startRow : startRow + i;
                    const c = isHorizontal ? startCol + i : startCol;
                    board[r][c].hasShip = true;
                    board[r][c].shipLength = length;
                }
                placed = true;
            }
        }
    }
}

export function checkShipSunk(board, length) {
    let total = 0;
    let hit = 0;
    for (let r = 0; r < 10; r++) {
        for (let c = 0; c < 10; c++) {
            if (board[r][c].hasShip && board[r][c].shipLength === length) {
                total++;
                if (board[r][c].isHit) hit++;
            }
        }
    }
    return total > 0 && total === hit;
}

export function fireAt(board, row, col) {
    const cell = board[row][col];

    if (cell.isHit) {
        return { result: "ALREADY_HIT" };
    }

    cell.isHit = true;

    if (cell.hasShip) {
        const isSunk = checkShipSunk(board, cell.shipLength);
        return { result: "HIT", shipLength: cell.shipLength, isSunk };
    } else {
        return { result: "MISS" };
    }
}

export function checkShipDestroyed(ship) {
    for (const cell of ship.cells) {
        if (!cell.isHit) {
            return false;
        }
    }
    return true;
}

export function checkVictory(board) {
    for (let row = 0; row < board.length; row++) {
        for (let col = 0; col < board[row].length; col++) {
            const cell = board[row][col];
            if (cell.hasShip && !cell.isHit) {
                return false;
            }
        }
    }
    return true;
}
