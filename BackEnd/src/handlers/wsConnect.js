const { saveConnection } = require("../services/connectionService");

exports.handler = async (event) => {
  if (event.source === 'aws.events' || event['detail-type'] === 'Scheduled Event') {
    console.log("Warm up ping received! Máy chủ đã được làm ấm!");
    return { statusCode: 200, body: 'Warmed' };
  }
  const connectionId = event.requestContext.connectionId;
  const roomCode = event.queryStringParameters?.roomCode;
  const userId = event.queryStringParameters?.userId;

  try {
    await saveConnection({ connectionId, roomCode, userId });
    return { statusCode: 200, body: "Connected." };
  } catch (error) {
    console.error("wsConnect failed", error);
    return { statusCode: 500, body: "Connection failed." };
  }
};
