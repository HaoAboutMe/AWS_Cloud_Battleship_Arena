const { getErrorResponse, json, parseJsonBody } = require("../lib/http");
const { findMatchmakingRoom } = require("../services/roomService");

exports.handler = async (event) => {
  try {
    const body = parseJsonBody(event);
    const room = await findMatchmakingRoom({
      difficulty: body.difficulty,
      mode: body.mode,
      player: body.player,
    });

    return json(200, { room });
  } catch (error) {
    console.error("matchmakeRoom failed", error);
    return getErrorResponse(error);
  }
};
