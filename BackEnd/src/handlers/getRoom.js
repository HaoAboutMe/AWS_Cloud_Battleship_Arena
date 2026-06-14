const { getErrorResponse, json } = require("../lib/http");
const { getRoom } = require("../services/roomService");

exports.handler = async (event) => {
  try {
    const roomCode = String(event.pathParameters?.roomCode || "").trim().toUpperCase();
    const room = await getRoom(roomCode);

    if (!room) {
      return json(404, {
        error: {
          message: "Room not found.",
        },
      });
    }

    return json(200, { room });
  } catch (error) {
    console.error("getRoom failed", error);
    return getErrorResponse(error);
  }
};
