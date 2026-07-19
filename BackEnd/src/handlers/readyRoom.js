const { getErrorResponse, json, parseJsonBody } = require("../lib/http");
const { markPlayerReady } = require("../services/roomService");
const { sanitizeRoomForPlayer } = require("../lib/roomSanitizer");

exports.handler = async (event) => {
  try {
    const body = parseJsonBody(event);
    const room = await markPlayerReady({
      roomCode: event.pathParameters?.roomCode,
      player: body.player,
      board: body.board,
    });

    const userId = body.player?.userId;
    const sanitizedRoom = sanitizeRoomForPlayer(room, userId);

    return json(200, { room: sanitizedRoom });
  } catch (error) {
    console.error("readyRoom failed", error);
    return getErrorResponse(error);
  }
};
