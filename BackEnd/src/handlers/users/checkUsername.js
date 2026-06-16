const { ScanCommand } = require("@aws-sdk/lib-dynamodb");
const { documentClient } = require("../../lib/dynamodb");
const { getErrorResponse, json } = require("../../lib/http");

exports.handler = async (event) => {
  try {
    const username = String(event.queryStringParameters?.username || "").trim();

    if (!username) {
      return json(400, {
        error: {
          message: "Username is required.",
        },
      });
    }

    const response = await documentClient.send(
      new ScanCommand({
        TableName: "User",
        Limit: 1,
        FilterExpression: "username = :username",
        ExpressionAttributeValues: {
          ":username": username,
        },
      }),
    );

    return json(200, {
      available: (response.Items || []).length === 0,
    });
  } catch (error) {
    console.error("checkUsername failed", error);
    return getErrorResponse(error);
  }
};
