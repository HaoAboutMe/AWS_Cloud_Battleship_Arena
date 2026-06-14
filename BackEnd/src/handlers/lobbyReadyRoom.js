const { getErrorResponse, json, parseJsonBody } = require("../lib/http");
const { markPlayerLobbyReady } = require("../services/roomService");

exports.handler = async (event) => {
  try {
    const body = parseJsonBody(event);
    const room = await markPlayerLobbyReady({
      roomCode: event.pathParameters?.roomCode,
      player: body.player,
    });

    return json(200, { room });
  } catch (error) {
    console.error("lobbyReadyRoom failed", error);
    return getErrorResponse(error);
  }
};
