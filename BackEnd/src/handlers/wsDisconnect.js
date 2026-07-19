const { deleteConnection } = require("../services/connectionService");

exports.handler = async (event) => {
  const connectionId = event.requestContext.connectionId;

  try {
    await deleteConnection(connectionId);
    return { statusCode: 200, body: "Disconnected." };
  } catch (error) {
    console.error("wsDisconnect failed", error);
    return { statusCode: 500, body: "Disconnect failed." };
  }
};
