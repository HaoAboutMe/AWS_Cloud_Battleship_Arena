const { SHIP_DEFS, getShipOffsets } = require("../config/shipDefs");

const getOccupiedCells = (ships) => {
  const occupied = [];
  for (const ship of ships) {
    if (ship.baseOffsets && Array.isArray(ship.baseOffsets)) {
      for (const [dr, dc] of ship.baseOffsets) {
        occupied.push({
          row: ship.row + dr,
          col: ship.col + dc,
          shipId: ship.shipId,
          shipTypeId: ship.shipTypeId || 'custom',
          shipLength: ship.baseOffsets.length
        });
      }
      continue;
    }
    const shipDef = SHIP_DEFS.find(d => d.id === ship.shipTypeId);
    if (!shipDef) continue;
    const offsets = getShipOffsets(shipDef, ship.rotation);
    for (const [dr, dc] of offsets) {
      occupied.push({
        row: ship.row + dr,
        col: ship.col + dc,
        shipId: ship.shipId,
        shipTypeId: ship.shipTypeId,
        shipLength: shipDef.size
      });
    }
  }
  return occupied;
};

const sanitizeRoomForPlayer = (room, userId) => {
  if (!room || !room.players) return room;

  // If game is over, no need to sanitize
  if (room.status === "FINISHED" || room.status === "GAME_OVER") {
    return room;
  }

  const cleanUserId = userId ? String(userId).split(':')[0] : null;

  const sanitizedPlayers = room.players.map((player, idx) => {
    const playerCleanId = player.userId ? String(player.userId).split(':')[0] : "";

    // If this is the requesting player, they can see their own board
    if (cleanUserId && playerCleanId === cleanUserId) {
      return player;
    }

    // Otherwise, this is the opponent player. We must sanitize their board.
    if (!player.board || !player.board.ships) {
      return player;
    }

    // Opponent is player index `idx`.
    // Hits against player index 0 are hits2 (player 2 shooting at player 1)
    // Hits against player index 1 are hits1 (player 1 shooting at player 2)
    const opponentHits = idx === 0 ? (room.hits2 || []) : (room.hits1 || []);

    const sanitizedShips = player.board.ships.map(ship => {
      // Calculate occupied cells for this ship
      const occupied = getOccupiedCells([ship]);
      if (occupied.length === 0) return ship;

      const isSunk = occupied.every(cell =>
        opponentHits.some(h => h.row === cell.row && h.col === cell.col)
      );

      if (isSunk) {
        // Keep sunk ship fully visible
        return {
          ...ship,
          size: occupied.length
        };
      } else {
        // Redact coordinates and offsets of afloat ships
        return {
          shipId: ship.shipId,
          shipTypeId: ship.shipTypeId,
          rotation: ship.rotation,
          // We mask row, col, baseOffsets to hide shape
          row: -99,
          col: -99,
          baseOffsets: [],
          size: occupied.length,
          isAfloat: true
        };
      }
    });

    return {
      ...player,
      board: {
        ...player.board,
        ships: sanitizedShips
      }
    };
  });

  return {
    ...room,
    players: sanitizedPlayers
  };
};

module.exports = {
  sanitizeRoomForPlayer,
  getOccupiedCells
};
