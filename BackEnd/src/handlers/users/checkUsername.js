const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, QueryCommand } = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

exports.handler = async (event) => {
    try {
        const username = event.queryStringParameters?.username;
        if (!username) {
            return {
                statusCode: 400,
                headers: { "Access-Control-Allow-Origin": "*" },
                body: JSON.stringify({ message: "Missing username parameter" })
            };
        }

        const res = await docClient.send(new QueryCommand({
            TableName: "User",
            IndexName: "UsernameIndex",
            KeyConditionExpression: "username = :u",
            ExpressionAttributeValues: {
                ":u": username
            }
        }));

        const isTaken = res.Items && res.Items.length > 0;

        return {
            statusCode: 200,
            headers: { "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ isTaken })
        };
    } catch (e) {
        console.error("ERROR DYNAMODB:", e);
        return {
            statusCode: 500,
            headers: { "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ message: "Internal server error" })
        };
    }
};
