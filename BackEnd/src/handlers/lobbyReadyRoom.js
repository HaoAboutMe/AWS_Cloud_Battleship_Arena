const { getErrorResponse, json, parseJsonBody } = require("../lib/http");
const { markPlayerLobbyReady } = require("../services/roomService");
const { sanitizeRoomForPlayer } = require("../lib/roomSanitizer");

exports.handler = async (event) => {
  try {
    const body = parseJsonBody(event);
    const room = await markPlayerLobbyReady({
      roomCode: event.pathParameters?.roomCode,
      player: body.player,
    });

    const userId = body.player?.userId;
    const sanitizedRoom = sanitizeRoomForPlayer(room, userId);

    return json(200, { room: sanitizedRoom });
  } catch (error) {
    console.error("lobbyReadyRoom failed", error);
    return getErrorResponse(error);
  }
};
