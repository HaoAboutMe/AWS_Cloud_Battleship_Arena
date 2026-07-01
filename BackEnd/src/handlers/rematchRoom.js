const { getErrorResponse, json, parseJsonBody } = require("../lib/http");
const { resetRoomForRematch } = require("../services/roomService");

exports.handler = async (event) => {
  if (event.source === 'aws.events' || event['detail-type'] === 'Scheduled Event') {
    console.log("Warm up ping received! Máy chủ đã được làm ấm!");
    return { statusCode: 200, body: 'Warmed' };
  }
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
