const { getErrorResponse, json, parseJsonBody } = require("../lib/http");
const { findMatchmakingRoom } = require("../services/roomService");

exports.handler = async (event) => {
  if (event.source === 'aws.events' || event['detail-type'] === 'Scheduled Event') {
    console.log("Warm up ping received! Máy chủ đã được làm ấm!");
    return { statusCode: 200, body: 'Warmed' };
  }
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
