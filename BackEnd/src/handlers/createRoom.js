const { getErrorResponse, json, parseJsonBody } = require("../lib/http");
const { createRoom } = require("../services/roomService");

exports.handler = async (event) => {
  try {
    const body = parseJsonBody(event);
    const room = await createRoom({
      difficulty: body.difficulty,
      player: body.player,
    });

    return json(201, { room });
  } catch (error) {
    console.error("createRoom failed", error);
    return getErrorResponse(error);
  }
};
