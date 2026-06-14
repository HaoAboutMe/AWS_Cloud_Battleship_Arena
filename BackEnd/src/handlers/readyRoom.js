const { getErrorResponse, json, parseJsonBody } = require("../lib/http");
const { markPlayerReady } = require("../services/roomService");

exports.handler = async (event) => {
  try {
    const body = parseJsonBody(event);
    const room = await markPlayerReady({
      roomCode: event.pathParameters?.roomCode,
      player: body.player,
      board: body.board,
    });

    return json(200, { room });
  } catch (error) {
    console.error("readyRoom failed", error);
    return getErrorResponse(error);
  }
};
