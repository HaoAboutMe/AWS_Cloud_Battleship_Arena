const { getErrorResponse, json, parseJsonBody } = require("../lib/http");
const { joinRoom } = require("../services/roomService");

exports.handler = async (event) => {
  try {
    const body = parseJsonBody(event);
    const room = await joinRoom({
      roomCode: event.pathParameters?.roomCode,
      player: body.player,
    });

    return json(200, { room });
  } catch (error) {
    console.error("joinRoom failed", error);
    return getErrorResponse(error);
  }
};
