const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL;

const assertApiConfigured = () => {
  if (!API_BASE_URL) {
    throw new Error("Missing VITE_API_BASE_URL in FrontEnd/.env.");
  }
};

const requestJson = async (path, options = {}) => {
  assertApiConfigured();

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "content-type": "application/json",
      ...(options.headers || {}),
    },
  });

  let data;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const message = data?.error?.message || `Request failed with status ${response.status}.`;
    throw new Error(message);
  }

  return data;
};

export const createRoom = async ({ difficulty = "easy", player }) => {
  const data = await requestJson("/rooms", {
    method: "POST",
    body: JSON.stringify({
      difficulty,
      player,
    }),
  });

  return data.room;
};

export const joinRoom = async ({ roomCode, player }) => {
  const normalizedRoomCode = String(roomCode || "").trim().toUpperCase();

  if (!normalizedRoomCode) {
    throw new Error("Room code is required.");
  }

  const data = await requestJson(`/rooms/${encodeURIComponent(normalizedRoomCode)}/join`, {
    method: "POST",
    body: JSON.stringify({
      player,
    }),
  });

  return data.room;
};

export const findMatch = async ({ mode = "casual", difficulty = "easy", player }) => {
  const data = await requestJson("/matchmaking", {
    method: "POST",
    body: JSON.stringify({
      mode,
      difficulty,
      player,
    }),
  });

  return data.room;
};

export const getRoom = async (roomCode) => {
  const normalizedRoomCode = String(roomCode || "").trim().toUpperCase();

  if (!normalizedRoomCode) {
    throw new Error("Room code is required.");
  }

  const data = await requestJson(`/rooms/${encodeURIComponent(normalizedRoomCode)}`);
  return data.room;
};

export const markPlayerReady = async ({ roomCode, player, board }) => {
  const normalizedRoomCode = String(roomCode || "").trim().toUpperCase();

  if (!normalizedRoomCode) {
    throw new Error("Room code is required.");
  }

  const data = await requestJson(`/rooms/${encodeURIComponent(normalizedRoomCode)}/ready`, {
    method: "POST",
    body: JSON.stringify({
      player,
      board,
    }),
  });

  return data.room;
};

export const markLobbyReady = async ({ roomCode, player }) => {
  const normalizedRoomCode = String(roomCode || "").trim().toUpperCase();

  if (!normalizedRoomCode) {
    throw new Error("Room code is required.");
  }

  const data = await requestJson(`/rooms/${encodeURIComponent(normalizedRoomCode)}/lobby-ready`, {
    method: "POST",
    body: JSON.stringify({
      player,
    }),
  });

  return data.room;
};

export const resetRoomForRematch = async ({ roomCode, player }) => {
  const normalizedRoomCode = String(roomCode || "").trim().toUpperCase();

  if (!normalizedRoomCode) {
    throw new Error("Room code is required.");
  }

  const data = await requestJson(`/rooms/${encodeURIComponent(normalizedRoomCode)}/rematch`, {
    method: "POST",
    body: JSON.stringify({
      player,
    }),
  });

  return data.room;
};

export const leaveRoom = async ({ roomCode, player }) => {
  const normalizedRoomCode = String(roomCode || "").trim().toUpperCase();

  if (!normalizedRoomCode) {
    throw new Error("Room code is required.");
  }

  const data = await requestJson(`/rooms/${encodeURIComponent(normalizedRoomCode)}/leave`, {
    method: "POST",
    body: JSON.stringify({
      player,
    }),
  });

  return data.room;
};

export const getRoomPlayerId = (baseUserId = "guest", roomCode = "global") => {
  const safeBaseUserId = String(baseUserId || "guest");
  const safeRoomCode = String(roomCode || "global").trim().toUpperCase();
  const storageKey = `battleshipRoomPlayerId:${safeBaseUserId}:${safeRoomCode}`;
  const existingId = sessionStorage.getItem(storageKey);

  if (existingId) {
    return existingId;
  }

  const nextId = `${baseUserId}:${crypto.randomUUID()}`;
  sessionStorage.setItem(storageKey, nextId);
  return nextId;
};

export const createRoomSocket = ({ roomCode, userId, onMessage, onOpen, onClose, onError }) => {
  if (!WS_BASE_URL) {
    throw new Error("Missing VITE_WS_BASE_URL in FrontEnd/.env.");
  }

  const url = new URL(WS_BASE_URL);
  if (roomCode) url.searchParams.set("roomCode", String(roomCode).trim().toUpperCase());
  if (userId) url.searchParams.set("userId", String(userId));

  const socket = new WebSocket(url.toString());

  socket.addEventListener("open", (event) => {
    onOpen?.(event);
  });

  socket.addEventListener("message", (event) => {
    try {
      onMessage?.(JSON.parse(event.data), event);
    } catch {
      onMessage?.(event.data, event);
    }
  });

  socket.addEventListener("close", (event) => {
    onClose?.(event);
  });

  socket.addEventListener("error", (event) => {
    onError?.(event);
  });

  return socket;
};

export const sendSocketMessage = (socket, message) => {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    return false;
  }

  socket.send(JSON.stringify(message));
  return true;
};
