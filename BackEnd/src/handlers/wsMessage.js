const { ApiGatewayManagementApiClient, PostToConnectionCommand } = require("@aws-sdk/client-apigatewaymanagementapi");
const { deleteConnection, listConnectionsByRoom, updateConnectionRoom } = require("../services/connectionService");

const parseMessage = (event) => {
  if (!event.body) {
    return {};
  }

  try {
    return JSON.parse(event.body);
  } catch {
    return {};
  }
};

const createManagementClient = (event) => {
  const { domainName, stage } = event.requestContext;

  return new ApiGatewayManagementApiClient({
    endpoint: `https://${domainName}/${stage}`,
  });
};

const postToConnection = async ({ client, connectionId, payload }) => {
  try {
    await client.send(
      new PostToConnectionCommand({
        ConnectionId: connectionId,
        Data: Buffer.from(JSON.stringify(payload)),
      }),
    );
  } catch (error) {
    if (error.statusCode === 410 || error.$metadata?.httpStatusCode === 410) {
      await deleteConnection(connectionId);
      return;
    }

    throw error;
  }
};

exports.handler = async (event) => {
  const connectionId = event.requestContext.connectionId;
  const message = parseMessage(event);
  const action = String(message.action || "").toUpperCase();
  const client = createManagementClient(event);

  try {
    if (action === "PING") {
      await postToConnection({
        client,
        connectionId,
        payload: {
          type: "PONG",
          sentAt: new Date().toISOString(),
        },
      });
      return { statusCode: 200, body: "Pong." };
    }

    if (action === "SUBSCRIBE_ROOM") {
      const roomCode = String(message.roomCode || "").trim().toUpperCase();
      await updateConnectionRoom({ connectionId, roomCode });
      await postToConnection({
        client,
        connectionId,
        payload: {
          type: "ROOM_SUBSCRIBED",
          roomCode,
        },
      });
      return { statusCode: 200, body: "Subscribed." };
    }

    if (action === "BROADCAST_ROOM") {
      const roomCode = String(message.roomCode || "").trim().toUpperCase();
      const connections = await listConnectionsByRoom(roomCode);
      await Promise.all(
        connections.map((connection) =>
          postToConnection({
            client,
            connectionId: connection.connectionId,
            payload: {
              type: "ROOM_EVENT",
              roomCode,
              payload: message.payload || {},
            },
          }),
        ),
      );

      return { statusCode: 200, body: "Broadcasted." };
    }

    await postToConnection({
      client,
      connectionId,
      payload: {
        type: "ERROR",
        message: "Unsupported action.",
      },
    });

    return { statusCode: 400, body: "Unsupported action." };
  } catch (error) {
    console.error("wsMessage failed", error);
    return { statusCode: 500, body: "Message failed." };
  }
};
