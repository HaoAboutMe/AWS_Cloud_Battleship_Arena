const { getErrorResponse, json, parseJsonBody } = require("../lib/http");
const { createRoom } = require("../services/roomService");

exports.handler = async (event) => {
  if (event.source === 'aws.events' || event['detail-type'] === 'Scheduled Event') {
    console.log("Warm up ping received! Máy chủ đã được làm ấm!");
    return { statusCode: 200, body: 'Warmed' };
  }
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
