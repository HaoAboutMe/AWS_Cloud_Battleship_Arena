const { getErrorResponse, json, parseJsonBody } = require("../lib/http");
const { resetRoomForRematch } = require("../services/roomService");

exports.handler = async (event) => {
  try {
    const body = parseJsonBody(event);
    const room = await resetRoomForRematch({
      roomCode: event.pathParameters?.roomCode,
      player: body.player,
    });

    return json(200, { room });
  } catch (error) {
    console.error("rematchRoom failed", error);
    return getErrorResponse(error);
  }
};
