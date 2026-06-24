const BOARD_SIZE = 10;

export const SHIP_DEFS = [
    {
        id: "carrier",
        label: "Carrier",
        size: 5,
        baseOffsets: [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]],
        rotations: [0, 90, 180, 270],
    },
    {
        id: "zship",
        label: "Z Ship",
        size: 4,
        baseOffsets: [[0, 1], [1, 1], [1, 0], [2, 0]],
        rotations: [0, 90, 180, 270],
    },
    {
        id: "destroyer",
        label: "Destroyer",
        size: 4,
        baseOffsets: [[0, 0], [1, 0], [2, 0], [2, 1]],
        rotations: [0, 90, 180, 270],
    },
    {
        id: "patrol",
        label: "Patrol",
        size: 2,
        baseOffsets: [[0, 0], [0, 1]],
        rotations: [0, 90, 180, 270],
    },
    {
        id: "gunboat",
        label: "Gunboat",
        size: 4,
        baseOffsets: [[0, 1], [1, 0], [1, 1], [1, 2]],
        rotations: [0, 90, 180, 270],
    },
    {
        id: "warship",
        label: "Warship",
        size: 5,
        baseOffsets: [[0, 0], [0, 1], [0, 2], [1, 1], [2, 1]],
        rotations: [0, 90, 180, 270],
    },
    {
        id: "cruiser",
        label: "Cruiser",
        size: 3,
        baseOffsets: [[0, 0], [1, 0], [2, 0]],
        rotations: [0, 90, 180, 270],
    },
    {
        id: "flagship",
        label: "Flagship",
        size: 6,
        baseOffsets: [[0, 0], [0, 1], [1, 0], [1, 1], [2, 0], [2, 1]],
        rotations: [0, 90, 180, 270],
    },
    {
        id: "frigate",
        label: "Frigate",
        size: 4,
        baseOffsets: [[0, 0], [1, 0], [2, 0], [3, 0]],
        rotations: [0, 90, 180, 270],
    },
    {
        id: "lancer",
        label: "Lancer",
        size: 5,
        baseOffsets: [[0, 0], [1, 0], [1, 1], [2, 0], [2, 1]],
        rotations: [0, 90, 180, 270],
    },
];

const LEGACY_SHIP_DEFS = [5, 4, 3, 2].map((length) => ({
    id: `legacy-${length}`,
    label: `Legacy-${length}`,
    size: length,
    baseOffsets: Array.from({ length }, (_, i) => [0, i]),
    rotations: [0, 90, 180, 270],
}));

const rotateOffsetsClockwise = (offsets) => offsets.map(([r, c]) => [c, -r]);

const normalizeOffsets = (offsets) => {
    let minR = Infinity;
    let minC = Infinity;
    offsets.forEach(([r, c]) => {
        minR = Math.min(minR, r);
        minC = Math.min(minC, c);
    });
    return offsets.map(([r, c]) => [r - minR, c - minC]);
};

const applyRotation = (baseOffsets, rotation) => {
    let offsets = baseOffsets.map(([r, c]) => [r, c]);
    const steps = Math.round(rotation / 90) % 4;
    for (let i = 0; i < steps; i++) {
        offsets = rotateOffsetsClockwise(offsets);
    }
    return normalizeOffsets(offsets);
};

export function getShipOffsets(shipDef, rotation) {
    const safeRotation = shipDef.rotations.includes(rotation)
        ? rotation
        : shipDef.rotations[0];
    return applyRotation(shipDef.baseOffsets, safeRotation);
}

export function getShipBounds(offsets) {
    let maxR = 0;
    let maxC = 0;
    offsets.forEach(([r, c]) => {
        maxR = Math.max(maxR, r);
        maxC = Math.max(maxC, c);
    });
    return { rows: maxR + 1, cols: maxC + 1 };
}

const normalizeShipArgs = (shipOrLength, rotationOrIsHorizontal) => {
    if (typeof shipOrLength === "object" && shipOrLength !== null) {
        const shipDef = shipOrLength;
        const rotation = shipDef.rotations.includes(rotationOrIsHorizontal)
            ? rotationOrIsHorizontal
            : shipDef.rotations[0];
        return { shipDef, rotation };
    }

    const length = Number(shipOrLength);
    const shipDef = LEGACY_SHIP_DEFS.find((def) => def.size === length) || {
        id: `legacy-${length}`,
        label: `Legacy-${length}`,
        size: length,
        baseOffsets: Array.from({ length }, (_, i) => [0, i]),
        rotations: [0, 90, 180, 270],
    };
    const isHorizontal = Boolean(rotationOrIsHorizontal);
    const rotation = isHorizontal ? 0 : 90;
    return { shipDef, rotation };
};

export function createBoard() {
    const board = [];
    const rows = BOARD_SIZE;
    const cols = BOARD_SIZE;

    for (let row = 0; row < rows; row++) {
        board[row] = [];
        for (let col = 0; col < cols; col++) {
            board[row][col] = {
                row: row,
                col: col,
                hasShip: false,
                isHit: false,
                shipId: null,
                shipTypeId: null,
                shipRotation: null,
                shipLength: null,
                shipRoot: false,
                shipBounds: null,
                shipOriginRow: null,
                shipOriginCol: null,
            };
        }
    }
    
    return board;
}

export function canPlaceShip(board, row, col, shipOrLength, rotationOrIsHorizontal) {
    const { shipDef, rotation } = normalizeShipArgs(shipOrLength, rotationOrIsHorizontal);
    const offsets = getShipOffsets(shipDef, rotation);

    for (const [dr, dc] of offsets) {
        const r = row + dr;
        const c = col + dc;
        if (r < 0 || c < 0 || r >= BOARD_SIZE || c >= BOARD_SIZE) return false;
        if (board[r][c].hasShip) return false;
    }

    return true;
}

let nextShipId = 1;

export function placeShip(board, row, col, shipOrLength, rotationOrIsHorizontal) {
    const { shipDef, rotation } = normalizeShipArgs(shipOrLength, rotationOrIsHorizontal);
    if (!canPlaceShip(board, row, col, shipDef, rotation)) return false;

    const offsets = getShipOffsets(shipDef, rotation);
    const bounds = getShipBounds(offsets);
    const shipId = nextShipId++;

    offsets.forEach(([dr, dc]) => {
        const r = row + dr;
        const c = col + dc;
        board[r][c].hasShip = true;
        board[r][c].shipLength = shipDef.size;
        board[r][c].shipId = shipId;
        board[r][c].shipTypeId = shipDef.id;
        board[r][c].shipRotation = rotation;
        board[r][c].shipOriginRow = row;
        board[r][c].shipOriginCol = col;
    });

    const [rootDr, rootDc] = offsets[0];
    const rootCell = board[row + rootDr][col + rootDc];
    rootCell.shipRoot = true;
    rootCell.shipBounds = bounds;
    rootCell.shipOriginRow = row;
    rootCell.shipOriginCol = col;
    rootCell.shipTypeId = shipDef.id;
    rootCell.shipRotation = rotation;
    rootCell.shipLength = shipDef.size;
    rootCell.shipId = shipId;

    return true;
}


export function placeShipsRandomly(board, shipDefs = LEGACY_SHIP_DEFS) {
    for (const shipDef of shipDefs) {
        let placed = false;
        let attempts = 0;

        while (!placed && attempts < 500) {
            const rotation = shipDef.rotations[Math.floor(Math.random() * shipDef.rotations.length)];
            const offsets = getShipOffsets(shipDef, rotation);
            const bounds = getShipBounds(offsets);
            const startRow = Math.floor(Math.random() * (BOARD_SIZE - bounds.rows + 1));
            const startCol = Math.floor(Math.random() * (BOARD_SIZE - bounds.cols + 1));

            if (placeShip(board, startRow, startCol, shipDef, rotation)) {
                placed = true;
            }
            attempts++;
        }
    }
}

export function checkShipSunk(board, shipId) {
    let total = 0;
    let hit = 0;
    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            if (board[r][c].hasShip && board[r][c].shipId === shipId) {
                total++;
                if (board[r][c].isHit) hit++;
            }
        }
    }
    return total > 0 && total === hit;
}

export function markWaterAroundSunkShip(board, shipId, markWater = true) {
    const shipCells = [];

    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            if (board[r][c].hasShip && board[r][c].shipId === shipId) {
                shipCells.push({ row: r, col: c });
            }
        }
    }

    if (!markWater) return shipCells;

    shipCells.forEach(({ row, col }) => {
        for (let r = row - 1; r <= row + 1; r++) {
            for (let c = col - 1; c <= col + 1; c++) {
                if (r < 0 || c < 0 || r >= BOARD_SIZE || c >= BOARD_SIZE) continue;
                const cell = board[r][c];
                if (!cell.hasShip && !cell.isHit) {
                    cell.isHit = true;
                    cell.autoMarked = true;
                }
            }
        }
    });

    return shipCells;
}

export function fireAt(board, row, col) {
    const cell = board[row][col];

    if (cell.isHit) {
        return { result: "ALREADY_HIT" };
    }

    cell.isHit = true;

    if (cell.hasShip) {
        const isSunk = checkShipSunk(board, cell.shipId);
        return {
            result: "HIT",
            shipId: cell.shipId,
            shipLength: cell.shipLength,
            shipTypeId: cell.shipTypeId,
            isSunk
        };
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

export function getConnectedComponents(board) {
    const visited = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(false));
    const components = [];
    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];

    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            if (board[r][c].hasShip && !visited[r][c]) {
                const comp = [];
                const q = [[r, c]];
                visited[r][c] = true;
                while (q.length > 0) {
                    const [cr, cc] = q.shift();
                    comp.push({ row: cr, col: cc });
                    for (const [dr, dc] of dirs) {
                        const nr = cr + dr, nc = cc + dc;
                        if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE) {
                            if (board[nr][nc].hasShip && !visited[nr][nc]) {
                                visited[nr][nc] = true;
                                q.push([nr, nc]);
                            }
                        }
                    }
                }
                components.push(comp);
            }
        }
    }
    return components;
}
