const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, GetCommand, QueryCommand, UpdateCommand } = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

exports.handler = async (event) => {
    try {
        const body = JSON.parse(event.body || "{}");
        const { newUsername, newTag } = body;
        const email = event.requestContext?.authorizer?.jwt?.claims?.email || body.email;

        if (!email || !newUsername || !newTag) {
            return {
                statusCode: 400,
                headers: { "Access-Control-Allow-Origin": "*" },
                body: JSON.stringify({ message: "Missing required fields" })
            };
        }

        const fullUsername = `${newUsername}#${newTag}`;

        // Step 1: Get userId from EmailIndex
        const resEmail = await docClient.send(new GetCommand({
            TableName: "EmailIndex",
            Key: { email }
        }));

        if (!resEmail.Item) {
            return {
                statusCode: 404,
                headers: { "Access-Control-Allow-Origin": "*" },
                body: JSON.stringify({ message: "User not found" })
            };
        }
        const userId = resEmail.Item.userId;

        // Step 2: Get User to check cooldown
        const resUser = await docClient.send(new GetCommand({
            TableName: "User",
            Key: { userId }
        }));

        if (!resUser.Item) {
            return {
                statusCode: 404,
                headers: { "Access-Control-Allow-Origin": "*" },
                body: JSON.stringify({ message: "User profile not found" })
            };
        }

        const lastUsernameChange = resUser.Item.lastUsernameChange;
        const now = Date.now();
        if (lastUsernameChange) {
            const daysSinceChange = (now - new Date(lastUsernameChange).getTime()) / (1000 * 60 * 60 * 24);
            if (daysSinceChange < 30) {
                const daysToWait = Math.ceil(30 - daysSinceChange);
                return {
                    statusCode: 403,
                    headers: { "Access-Control-Allow-Origin": "*" },
                    body: JSON.stringify({ message: `Bạn cần chờ ${daysToWait} ngày nữa để đổi tên.` })
                };
            }
        }

        // Step 3: Check if fullUsername exists
        const resUsernameCheck = await docClient.send(new QueryCommand({
            TableName: "User",
            IndexName: "UsernameIndex",
            KeyConditionExpression: "username = :u",
            ExpressionAttributeValues: {
                ":u": fullUsername
            }
        }));

        if (resUsernameCheck.Items && resUsernameCheck.Items.length > 0) {
            return {
                statusCode: 400,
                headers: { "Access-Control-Allow-Origin": "*" },
                body: JSON.stringify({ message: "Username already taken" })
            };
        }

        // Step 4: Update User
        const isoTime = new Date().toISOString();
        await docClient.send(new UpdateCommand({
            TableName: "User",
            Key: { userId },
            UpdateExpression: "SET username = :u, lastUsernameChange = :time",
            ExpressionAttributeValues: {
                ":u": fullUsername,
                ":time": isoTime
            }
        }));

        return {
            statusCode: 200,
            headers: { "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ message: "Username updated successfully", username: fullUsername })
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
