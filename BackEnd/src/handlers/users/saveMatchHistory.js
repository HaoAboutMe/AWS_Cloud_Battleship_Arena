const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
// Đừng quên thêm GetCommand vào import
const { DynamoDBDocumentClient, PutCommand, UpdateCommand, GetCommand } = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

// Hàm phụ trợ: Dịch Email sang ID gốc
const getRealUserId = async (email, fallbackId) => {
    if (!email) return fallbackId; // Nếu là Guest không có email, dùng tạm ID ảo
    try {
        const res = await docClient.send(new GetCommand({
            TableName: "EmailIndex",
            Key: { email: email }
        }));
        return res.Item ? res.Item.userId : fallbackId;
    } catch (e) {
        console.error("Lỗi khi tìm ID gốc:", e);
        return fallbackId;
    }
};

exports.handler = async (event) => {
    try {
        const body = typeof event.body === "string" ? JSON.parse(event.body) : event;

        // BƯỚC MỚI: Quy đổi toàn bộ ID ảo sang ID gốc
        const realPlayer1Id = await getRealUserId(body.player1Email, body.player1Id);
        const realPlayer2Id = await getRealUserId(body.player2Email, body.player2Id);
        const realWinnerId = await getRealUserId(body.winnerEmail, body.winnerId);

        // 1. Lưu Match History (Sử dụng ID gốc)
        await docClient.send(new PutCommand({
            TableName: "MatchHistory",
            Item: {
                matchId: body.matchId,
                roomCode: body.roomCode,
                player1Id: realPlayer1Id,
                player2Id: realPlayer2Id,
                winnerId: realWinnerId,
                endedAt: body.endedAt
            }
        }));

        // 2. Xác định người thua (Dựa trên ID gốc)
        const loserId = realWinnerId === realPlayer1Id ? realPlayer2Id : realPlayer1Id;

        // 3. Update người thắng
        await docClient.send(new UpdateCommand({
            TableName: "User",
            Key: { userId: realWinnerId },
            UpdateExpression: "SET wins = if_not_exists(wins, :zero) + :one, totalGames = if_not_exists(totalGames, :zero) + :one",
            ExpressionAttributeValues: { ":zero": 0, ":one": 1 }
        }));

        // 4. Update người thua
        await docClient.send(new UpdateCommand({
            TableName: "User",
            Key: { userId: loserId },
            UpdateExpression: "SET losses = if_not_exists(losses, :zero) + :one, totalGames = if_not_exists(totalGames, :zero) + :one",
            ExpressionAttributeValues: { ":zero": 0, ":one": 1 }
        }));

        return {
            statusCode: 200,
            headers: { "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ message: "Match saved and stats updated to REAL ID" })
        };
    } catch (err) {
        console.error(err);
        return {
            statusCode: 500,
            headers: { "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ error: err.message })
        };
    }
};