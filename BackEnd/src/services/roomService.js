const { randomUUID } = require("node:crypto");
const {
  GetCommand,
  PutCommand,
  ScanCommand,
} = require("@aws-sdk/lib-dynamodb");
const { documentClient } = require("../lib/dynamodb");

const ROOMS_TABLE = process.env.ROOMS_TABLE;
const ROOM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const ROOM_TTL_SECONDS = 60 * 60 * 6;
const MAX_PLAYERS = 2;

const nowIso = () => new Date().toISOString();

const buildTtl = () => Math.floor(Date.now() / 1000) + ROOM_TTL_SECONDS;

const createHttpError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
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
  joinedAt: nowIso(),
  lobbyReady: false,
  fleetReady: false,
});

const isSamePlayer = (candidate, player) => {
  if (candidate.userId === player.userId) return true;
  if (candidate.email && player.email && candidate.email === player.email)
    return true;
  if (
    candidate.baseUserId &&
    player.baseUserId &&
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
  const nextPlayer = normalizePlayer(player);
  const normalizedMode = String(mode || "casual")
    .trim()
    .toLowerCase();
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
        )
      );
    })
    .sort((first, second) =>
      String(first.createdAt || "").localeCompare(
        String(second.createdAt || ""),
      ),
    )[0];

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
    delete nextRoom.matchmakingMode;
    nextRoom.status = "CLOSED";
  }

  return putRoom(nextRoom);
};

module.exports = {
  createRoom,
  findMatchmakingRoom,
  getRoom,
  joinRoom,
  leaveRoom,
  markPlayerLobbyReady,
  markPlayerReady,
  resetRoomForRematch,
};
