const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, QueryCommand } = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

exports.handler = async (event) => {
  try {
    const { rank, limit = 5 } = event.queryStringParameters || {};

    if (!rank) {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({ message: "Missing rank parameter" }),
      };
    }

    const processItems = (items) => {
      return items.map(item => {
        if (process.env.AVATAR_BUCKET_NAME && item.userId) {
          item.avatarUrl = `https://${process.env.AVATAR_BUCKET_NAME}.s3.amazonaws.com/avatars/${item.userId}.jpg`;
        }
        return item;
      });
    };

    if (rank === "all") {
      const allRanks = ["unranked", "bronze", "silver", "gold", "platinum", "diamond", "master", "admiral"];
      const promises = allRanks.map(async (r) => {
        const cmd = new QueryCommand({
          TableName: "User",
          IndexName: "RankLeaderboardIndex",
          KeyConditionExpression: "#r = :rank",
          ExpressionAttributeNames: { "#r": "rank" },
          ExpressionAttributeValues: { ":rank": r },
          ScanIndexForward: false,
          Limit: parseInt(limit, 10),
        });
        const res = await docClient.send(cmd);
        return res.Items || [];
      });
      const results = await Promise.all(promises);
      const flattened = results.flat();
      flattened.sort((a, b) => (b.rankPoints || 0) - (a.rankPoints || 0));
      
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify(processItems(flattened.slice(0, parseInt(limit, 10)))),
      };
    }

    const command = new QueryCommand({
      TableName: "User",
      IndexName: "RankLeaderboardIndex",
      KeyConditionExpression: "#r = :rank",
      ExpressionAttributeNames: {
        "#r": "rank",
      },
      ExpressionAttributeValues: {
        ":rank": rank,
      },
      ScanIndexForward: false, // Descending order
      Limit: parseInt(limit, 10),
    });

    const response = await docClient.send(command);

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify(processItems(response.Items || [])),
    };
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ message: "Internal server error" }),
    };
  }
};
