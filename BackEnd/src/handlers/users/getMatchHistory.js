const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, QueryCommand, GetCommand } = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

exports.handler = async (event) => {
    try {
        const email = event.queryStringParameters?.email;

        if (!email) {
            return {
                statusCode: 400,
                headers: { "Access-Control-Allow-Origin": "*" },
                body: JSON.stringify({ message: "Missing email parameter" })
            };
        }

        // 1. Lấy userId từ email
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

        // 2. Query lịch sử đấu
        let limit = parseInt(event.queryStringParameters?.limit, 10);
        if (isNaN(limit) || limit <= 0) {
            limit = 10;
        }

        const resHistory = await docClient.send(new QueryCommand({
            TableName: process.env.MATCH_HISTORY_TABLE || "MatchHistoryV2",
            KeyConditionExpression: "userId = :uid",
            ExpressionAttributeValues: {
                ":uid": userId
            },
            ScanIndexForward: false, // Sắp xếp giảm dần theo endedAt (mới nhất lên trên)
            Limit: limit // Lấy tối đa limit trận gần nhất
        }));

        const matches = resHistory.Items || [];

        // 3. Mask room code
        const maskedMatches = matches.map(match => {
            let maskedRoomCode = match.roomCode;
            if (maskedRoomCode && maskedRoomCode.length >= 4) {
                maskedRoomCode = maskedRoomCode.substring(0, 3) + "*".repeat(maskedRoomCode.length - 3);
            } else if (maskedRoomCode) {
                maskedRoomCode = "***";
            }
            return { ...match, roomCode: maskedRoomCode };
        });

        return {
            statusCode: 200,
            headers: { "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify(maskedMatches)
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
