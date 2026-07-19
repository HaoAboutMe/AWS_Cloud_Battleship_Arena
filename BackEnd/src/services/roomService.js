const { randomUUID } = require("node:crypto");
const {
  DeleteCommand,
  GetCommand,
  PutCommand,
  ScanCommand,
} = require("@aws-sdk/lib-dynamodb");
const { documentClient } = require("../lib/dynamodb");
const { SHIP_DEFS, getShipOffsets } = require("../config/shipDefs");
const { getRankForRp, getRankIndex } = require("./rankService");

const ROOMS_TABLE = process.env.ROOMS_TABLE;
const ROOM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const ROOM_TTL_SECONDS = 60 * 60 * 6;
const MAX_PLAYERS = 2;
const BOARD_SIZE = 10;
const FLEET_CELL_LIMIT = 15;
const FLEET_MIN_SHIPS = 2;
const FLEET_MAX_SHIPS = 4;
const RANKED_MAX_RANK_GAP = 1;

const nowIso = () => new Date().toISOString();

const buildTtl = () => Math.floor(Date.now() / 1000) + ROOM_TTL_SECONDS;

const createHttpError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const validateFleetBoard = (board) => {
  const ships = Array.isArray(board?.ships) ? board.ships : [];
  if (ships.length < FLEET_MIN_SHIPS) {
    throw createHttpError(400, "Fleet must contain at least 2 ships.");
  }
  if (ships.length > FLEET_MAX_SHIPS) {
    throw createHttpError(400, "Fleet cannot contain more than 4 ships.");
  }

  const occupiedCells = new Set();
  const usedShipTypes = new Set();
  let totalCells = 0;

  for (const ship of ships) {
    if (!Number.isInteger(ship.row) || !Number.isInteger(ship.col)) {
      throw createHttpError(400, "Ship coordinates must be integers.");
    }

    const isCustom = ship.shipTypeId === "custom" || (ship.baseOffsets && !SHIP_DEFS.some(candidate => candidate.id === ship.shipTypeId));
    let shipSize = 0;
    let offsets = [];

    if (isCustom) {
      if (!ship.baseOffsets || !Array.isArray(ship.baseOffsets) || ship.baseOffsets.length === 0) {
        throw createHttpError(400, "Custom ship must have baseOffsets.");
      }
      shipSize = ship.baseOffsets.length;
      if (shipSize < 2 || shipSize > 13) {
        throw createHttpError(400, `Custom ship size must be between 2 and 13 cells. Found ${shipSize}.`);
      }
      offsets = ship.baseOffsets;
    } else {
      const shipDef = SHIP_DEFS.find((candidate) => candidate.id === ship.shipTypeId);
      if (!shipDef) {
        throw createHttpError(400, `Unknown ship type: ${ship.shipTypeId || "missing"}.`);
      }
      if (usedShipTypes.has(shipDef.id)) {
        throw createHttpError(400, `Ship type ${shipDef.id} can only be selected once.`);
      }
      if (!shipDef.rotations.includes(ship.rotation)) {
        throw createHttpError(400, `Invalid rotation for ${shipDef.id}.`);
      }
      usedShipTypes.add(shipDef.id);
      shipSize = shipDef.size;
      offsets = getShipOffsets(shipDef, ship.rotation);
    }

    totalCells += shipSize;
    for (const [rowOffset, colOffset] of offsets) {
      const row = ship.row + rowOffset;
      const col = ship.col + colOffset;
      if (row < 0 || col < 0 || row >= BOARD_SIZE || col >= BOARD_SIZE) {
        throw createHttpError(400, "Ship is outside the board.");
      }
      const cellKey = `${row}:${col}`;
      if (occupiedCells.has(cellKey)) {
        throw createHttpError(400, "Ships cannot overlap.");
      }
      occupiedCells.add(cellKey);
    }
  }

  if (totalCells !== FLEET_CELL_LIMIT || occupiedCells.size !== FLEET_CELL_LIMIT) {
    throw createHttpError(400, "Fleet must occupy exactly 15 cells.");
  }
};

const createRoomCode = () => {
  let code = "";

  for (let index = 0; index < 6; index += 1) {
    code +=
      ROOM_CODE_ALPHABET[Math.floor(Math.random() * ROOM_CODE_ALPHABET.length)];
  }

  return code;
};

const normalizePlayer = (input = {}) => ({
  userId: String(input.userId || input.email || `guest-${randomUUID()}`),
  baseUserId: input.baseUserId ? String(input.baseUserId) : undefined,
  displayName: String(input.displayName || input.email || "Commander"),
  email: input.email ? String(input.email) : undefined,
  avatarUrl: input.avatarUrl || input.picture ? String(input.avatarUrl || input.picture) : undefined,
  rank: input.rank ? String(input.rank).toLowerCase() : undefined,
  rankPoints: Number.isFinite(Number(input.rankPoints))
    ? Math.max(0, Math.round(Number(input.rankPoints)))
    : undefined,
  joinedAt: nowIso(),
  lobbyReady: false,
  fleetReady: false,
});

const getUserByEmail = async (email) => {
  if (!email) return null;

  const emailResponse = await documentClient.send(
    new GetCommand({
      TableName: "EmailIndex",
      Key: { email },
    }),
  );

  if (!emailResponse.Item?.userId) return null;

  const userResponse = await documentClient.send(
    new GetCommand({
      TableName: "User",
      Key: { userId: emailResponse.Item.userId },
    }),
  );

  return userResponse.Item || null;
};

const withRankSnapshot = async (player) => {
  const user = await getUserByEmail(player.email).catch((error) => {
    console.error("Unable to load ranked matchmaking profile", error);
    return null;
  });
  const rankPoints = Number.isFinite(Number(user?.rankPoints))
    ? Math.max(0, Math.round(Number(user.rankPoints)))
    : Number.isFinite(Number(player.rankPoints))
      ? Math.max(0, Math.round(Number(player.rankPoints)))
      : 0;
  const rank = String(user?.rank || player.rank || getRankForRp(rankPoints).id)
    .toLowerCase();

  return {
    ...player,
    rank,
    rankPoints,
  };
};

const getMatchmakingRankIndex = (player = {}) => {
  const rank = String(player.rank || getRankForRp(player.rankPoints || 0).id)
    .toLowerCase();
  return getRankIndex(rank);
};

const isRankedCompatible = (room, player) => {
  const opponent = (room.players || [])[0];
  if (!opponent) return true;

  const rankGap = Math.abs(
    getMatchmakingRankIndex(opponent) - getMatchmakingRankIndex(player),
  );

  return rankGap <= RANKED_MAX_RANK_GAP;
};

const getMatchmakingScore = (room, player, mode) => {
  if (mode !== "ranked") return 0;

  const opponent = (room.players || [])[0] || {};
  return Math.abs(Number(opponent.rankPoints || 0) - Number(player.rankPoints || 0));
};

const isSamePlayer = (candidate, player) => {
  if (candidate.userId === player.userId) return true;
  if (candidate.email && player.email && candidate.email === player.email)
    return true;
  if (
    candidate.baseUserId &&
    player.baseUserId &&
    candidate.baseUserId !== "guest" &&
    candidate.baseUserId === player.baseUserId
  )
    return true;
  return false;
};

const getRoom = async (roomCode) => {
  const response = await documentClient.send(
    new GetCommand({
      TableName: ROOMS_TABLE,
      Key: {
        roomCode,
      },
    }),
  );

  return response.Item || null;
};

const putRoom = async (room) => {
  await documentClient.send(
    new PutCommand({
      TableName: ROOMS_TABLE,
      Item: room,
    }),
  );

  return room;
};

const deleteRoom = async (roomCode) => {
  await documentClient.send(
    new DeleteCommand({
      TableName: ROOMS_TABLE,
      Key: {
        roomCode,
      },
    }),
  );
};

const createRoom = async ({ player, difficulty = "easy", matchmakingMode }) => {
  const host = normalizePlayer(player);
  const room = {
    roomCode: createRoomCode(),
    status: "WAITING",
    difficulty,
    matchmakingMode: matchmakingMode ? String(matchmakingMode) : undefined,
    hostUserId: host.userId,
    players: [host],
    createdAt: nowIso(),
    updatedAt: nowIso(),
    ttl: buildTtl(),
  };

  await documentClient.send(
    new PutCommand({
      TableName: ROOMS_TABLE,
      Item: room,
      ConditionExpression: "attribute_not_exists(roomCode)",
    }),
  );

  return room;
};

const findMatchmakingRoom = async ({
  player,
  difficulty = "easy",
  mode = "casual",
}) => {
  const normalizedMode = String(mode || "casual")
    .trim()
    .toLowerCase();
  const normalizedPlayer = normalizePlayer(player);
  const nextPlayer = normalizedMode === "ranked"
    ? await withRankSnapshot(normalizedPlayer)
    : normalizedPlayer;
  const response = await documentClient.send(
    new ScanCommand({
      TableName: ROOMS_TABLE,
      Limit: 25,
      FilterExpression: "#status = :waiting AND matchmakingMode = :mode",
      ExpressionAttributeNames: {
        "#status": "status",
      },
      ExpressionAttributeValues: {
        ":waiting": "WAITING",
        ":mode": normalizedMode,
      },
    }),
  );

  const candidate = (response.Items || [])
    .filter((room) => {
      const players = room.players || [];
      return (
        players.length < MAX_PLAYERS &&
        !players.some((candidatePlayer) =>
          isSamePlayer(candidatePlayer, nextPlayer),
        ) &&
        (normalizedMode !== "ranked" || isRankedCompatible(room, nextPlayer))
      );
    })
    .sort((first, second) => {
      const scoreGap = getMatchmakingScore(first, nextPlayer, normalizedMode) -
        getMatchmakingScore(second, nextPlayer, normalizedMode);
      if (scoreGap !== 0) return scoreGap;

      return String(first.createdAt || "").localeCompare(
        String(second.createdAt || ""),
      );
    })[0];

  if (candidate) {
    return joinRoom({ roomCode: candidate.roomCode, player: nextPlayer });
  }

  return createRoom({
    player: nextPlayer,
    difficulty,
    matchmakingMode: normalizedMode,
  });
};

const joinRoom = async ({ roomCode, player }) => {
  const normalizedCode = String(roomCode || "")
    .trim()
    .toUpperCase();
  const room = await getRoom(normalizedCode);

  if (!room) {
    throw createHttpError(404, "Room not found.");
  }

  if (room.status !== "WAITING") {
    throw createHttpError(409, "Room is not accepting players.");
  }

  const nextPlayer = normalizePlayer(player);
  const existingPlayers = room.players || [];
  const isAlreadyJoined = existingPlayers.some((candidate) =>
    isSamePlayer(candidate, nextPlayer),
  );

  if (!isAlreadyJoined && existingPlayers.length >= MAX_PLAYERS) {
    throw createHttpError(409, "Room is full.");
  }

  const players = isAlreadyJoined
    ? existingPlayers
    : [...existingPlayers, nextPlayer];
  const nextRoom = {
    ...room,
    players,
    status: players.length >= MAX_PLAYERS ? "READY" : "WAITING",
    updatedAt: nowIso(),
    ttl: buildTtl(),
  };

  return putRoom(nextRoom);
};

const markPlayerLobbyReady = async ({ roomCode, player }) => {
  const normalizedCode = String(roomCode || "")
    .trim()
    .toUpperCase();
  const room = await getRoom(normalizedCode);

  if (!room) {
    throw createHttpError(404, "Room not found.");
  }

  const nextPlayer = normalizePlayer(player);
  const existingPlayers = room.players || [];
  const playerIndex = existingPlayers.findIndex((candidate) =>
    isSamePlayer(candidate, nextPlayer),
  );

  if (playerIndex === -1) {
    if (existingPlayers.length >= MAX_PLAYERS) {
      throw createHttpError(409, "Room is full.");
    }

    existingPlayers.push(nextPlayer);
  }

  const players = existingPlayers.map((candidate) => {
    if (!isSamePlayer(candidate, nextPlayer)) {
      return candidate;
    }

    return {
      ...candidate,
      userId: candidate.userId || nextPlayer.userId,
      baseUserId: candidate.baseUserId || nextPlayer.baseUserId,
      displayName: nextPlayer.displayName,
      email: nextPlayer.email,
      lobbyReady: true,
      lobbyReadyAt: nowIso(),
    };
  });

  const allLobbyReady =
    players.length >= MAX_PLAYERS &&
    players.every((candidate) => candidate.lobbyReady);
  const nextRoom = {
    ...room,
    players,
    status: allLobbyReady
      ? "DEPLOYING"
      : players.length >= MAX_PLAYERS
        ? "READY"
        : "WAITING",
    updatedAt: nowIso(),
    ttl: buildTtl(),
  };

  return putRoom(nextRoom);
};

const markPlayerReady = async ({ roomCode, player, board }) => {
  const normalizedCode = String(roomCode || "")
    .trim()
    .toUpperCase();
  const room = await getRoom(normalizedCode);

  if (!room) {
    throw createHttpError(404, "Room not found.");
  }

  validateFleetBoard(board);

  const nextPlayer = normalizePlayer(player);
  const existingPlayers = room.players || [];
  const playerIndex = existingPlayers.findIndex((candidate) =>
    isSamePlayer(candidate, nextPlayer),
  );

  if (playerIndex === -1) {
    if (existingPlayers.length >= MAX_PLAYERS) {
      throw createHttpError(409, "Room is full.");
    }

    existingPlayers.push(nextPlayer);
  }

  const players = existingPlayers.map((candidate) => {
    if (!isSamePlayer(candidate, nextPlayer)) {
      return candidate;
    }

    return {
      ...candidate,
      userId: candidate.userId || nextPlayer.userId,
      baseUserId: candidate.baseUserId || nextPlayer.baseUserId,
      displayName: nextPlayer.displayName,
      email: nextPlayer.email,
      fleetReady: true,
      board,
      fleetReadyAt: nowIso(),
    };
  });

  const allFleetReady =
    players.length >= MAX_PLAYERS &&
    players.every((candidate) => candidate.fleetReady);
  const nextRoom = {
    ...room,
    players,
    status: allFleetReady
      ? "IN_PROGRESS"
      : players.length >= MAX_PLAYERS
        ? "DEPLOYING"
        : "WAITING",
    updatedAt: nowIso(),
    startedAt: allFleetReady ? room.startedAt || nowIso() : room.startedAt,
    ttl: buildTtl(),
    ...(allFleetReady ? {
      hits1: [],
      misses1: [],
      hits2: [],
      misses2: [],
      currentTurnUserId: players[0].userId,
    } : {}),
  };

  return putRoom(nextRoom);
};

const resetRoomForRematch = async ({ roomCode, player }) => {
  const normalizedCode = String(roomCode || "")
    .trim()
    .toUpperCase();
  const room = await getRoom(normalizedCode);

  if (!room) {
    throw createHttpError(404, "Room not found.");
  }

  const requestingPlayer = normalizePlayer(player);
  const existingPlayers = room.players || [];
  const isRoomPlayer = existingPlayers.some((candidate) =>
    isSamePlayer(candidate, requestingPlayer),
  );

  if (!isRoomPlayer) {
    throw createHttpError(403, "Only room players can request a rematch.");
  }

  const players = existingPlayers.map((candidate) => ({
    ...candidate,
    lobbyReady: false,
    fleetReady: false,
    board: undefined,
    lobbyReadyAt: undefined,
    fleetReadyAt: undefined,
  }));

  const nextRoom = {
    ...room,
    players,
    status: players.length >= MAX_PLAYERS ? "READY" : "WAITING",
    startedAt: undefined,
    updatedAt: nowIso(),
    rematchRequestedAt: nowIso(),
    ttl: buildTtl(),
  };

  return putRoom(nextRoom);
};

const leaveRoom = async ({ roomCode, player }) => {
  const normalizedCode = String(roomCode || "")
    .trim()
    .toUpperCase();
  const room = await getRoom(normalizedCode);

  if (!room) {
    throw createHttpError(404, "Room not found.");
  }

  const leavingPlayer = normalizePlayer(player);
  const remainingPlayers = (room.players || [])
    .filter((candidate) => !isSamePlayer(candidate, leavingPlayer))
    .map((candidate) => ({
      ...candidate,
      lobbyReady: false,
      fleetReady: false,
      board: undefined,
      lobbyReadyAt: undefined,
      fleetReadyAt: undefined,
    }));

  const nextRoom = {
    ...room,
    players: remainingPlayers,
    hostUserId: remainingPlayers[0]?.userId,
    status: remainingPlayers.length >= MAX_PLAYERS ? "READY" : "WAITING",
    startedAt: undefined,
    updatedAt: nowIso(),
    ttl: buildTtl(),
  };

  if (remainingPlayers.length === 0) {
    await deleteRoom(normalizedCode);
    return {
      ...nextRoom,
      matchmakingMode: undefined,
      status: "CLOSED",
      deleted: true,
    };
  }

  return putRoom(nextRoom);
};

module.exports = {
  createRoom,
  deleteRoom,
  findMatchmakingRoom,
  getRoom,
  joinRoom,
  leaveRoom,
  markPlayerLobbyReady,
  markPlayerReady,
  resetRoomForRematch,
};
