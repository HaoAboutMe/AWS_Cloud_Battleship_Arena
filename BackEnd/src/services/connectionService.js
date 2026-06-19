const { DeleteCommand, PutCommand, QueryCommand, UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const { documentClient } = require("../lib/dynamodb");

const CONNECTIONS_TABLE = process.env.CONNECTIONS_TABLE;
const CONNECTION_TTL_SECONDS = 60 * 60 * 6;

const buildTtl = () => Math.floor(Date.now() / 1000) + CONNECTION_TTL_SECONDS;

const saveConnection = async ({ connectionId, roomCode, userId }) => {
  await documentClient.send(
    new PutCommand({
      TableName: CONNECTIONS_TABLE,
      Item: {
        connectionId,
        roomCode: roomCode || "lobby",
        userId: userId || "anonymous",
        connectedAt: new Date().toISOString(),
        ttl: buildTtl(),
      },
    }),
  );
};

const deleteConnection = async (connectionId) => {
  await documentClient.send(
    new DeleteCommand({
      TableName: CONNECTIONS_TABLE,
      Key: {
        connectionId,
      },
    }),
  );
};

const updateConnectionRoom = async ({ connectionId, roomCode }) => {
  await documentClient.send(
    new UpdateCommand({
      TableName: CONNECTIONS_TABLE,
      Key: {
        connectionId,
      },
      UpdateExpression: "SET roomCode = :roomCode, #ttl = :ttl",
      ExpressionAttributeNames: {
        "#ttl": "ttl",
      },
      ExpressionAttributeValues: {
        ":roomCode": roomCode,
        ":ttl": buildTtl(),
      },
    }),
  );
};

const listConnectionsByRoom = async (roomCode) => {
  const response = await documentClient.send(
    new QueryCommand({
      TableName: CONNECTIONS_TABLE,
      IndexName: "byRoomCode",
      KeyConditionExpression: "roomCode = :roomCode",
      ExpressionAttributeValues: {
        ":roomCode": roomCode,
      },
    }),
  );

  return response.Items || [];
};

module.exports = {
  deleteConnection,
  listConnectionsByRoom,
  saveConnection,
  updateConnectionRoom,
};
