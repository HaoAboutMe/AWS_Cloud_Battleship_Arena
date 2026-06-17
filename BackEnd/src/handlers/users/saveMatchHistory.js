const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand, UpdateCommand, GetCommand } = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const getRealUserIdAndName = async (email, fallbackId, fallbackName) => {
    if (!email) return { userId: fallbackId, username: fallbackName };
    try {
        const resEmail = await docClient.send(new GetCommand({
            TableName: "EmailIndex",
            Key: { email: email }
        }));
        if (!resEmail.Item) return { userId: fallbackId, username: fallbackName };

        const resUser = await docClient.send(new GetCommand({
            TableName: "User",
            Key: { userId: resEmail.Item.userId }
        }));
        if (!resUser.Item) return { userId: resEmail.Item.userId, username: fallbackName };

        return { userId: resUser.Item.userId, username: resUser.Item.username || fallbackName };
    } catch (e) {
        console.error("Lỗi khi tìm ID gốc:", e);
        return { userId: fallbackId, username: fallbackName };
    }
};

const getAvatarUrl = (userId) => {
    const bucket = process.env.AVATAR_BUCKET_NAME;
    if (!bucket || userId.startsWith("guest_")) return null;
    return `https://${bucket}.s3.amazonaws.com/avatars/${userId}.jpg`;
};

exports.handler = async (event) => {
    try {
        const body = typeof event.body === "string" ? JSON.parse(event.body) : event;

        // BƯỚC MỚI: Quy đổi toàn bộ ID ảo sang ID gốc và lấy Name
        const p1 = await getRealUserIdAndName(body.player1Email, body.player1Id, body.player1Name || "Guest");
        const p2 = await getRealUserIdAndName(body.player2Email, body.player2Id, body.player2Name || "Guest");
        const realWinnerId = await getRealUserIdAndName(body.winnerEmail, body.winnerId, "Guest").then(res => res.userId);

        p1.avatarUrl = getAvatarUrl(p1.userId);
        p2.avatarUrl = getAvatarUrl(p2.userId);

        const endedAt = body.endedAt || new Date().toISOString();
        const leaverId = body.leaverEmail ? (await getRealUserIdAndName(body.leaverEmail, body.leaverId, "")).userId : (body.leaverId || null);

        // 1. Lưu Match History (Dual-write)
        const baseMatchData = {
            matchId: body.matchId,
            roomCode: body.roomCode,
            player1Id: p1.userId,
            player1Name: p1.username,
            player1Avatar: p1.avatarUrl,
            player2Id: p2.userId,
            player2Name: p2.username,
            player2Avatar: p2.avatarUrl,
            winnerId: realWinnerId,
            endedAt: endedAt,
            player1Shots: typeof body.player1Shots === 'number' ? body.player1Shots : 0,
            player1Misses: typeof body.player1Misses === 'number' ? body.player1Misses : 0,
            player2Shots: typeof body.player2Shots === 'number' ? body.player2Shots : 0,
            player2Misses: typeof body.player2Misses === 'number' ? body.player2Misses : 0,
            leaverId: leaverId
        };

        // Write for Player 1
        await docClient.send(new PutCommand({
            TableName: process.env.MATCH_HISTORY_TABLE || "MatchHistoryV2",
            Item: {
                ...baseMatchData,
                userId: p1.userId
            }
        }));

        // Write for Player 2
        if (p1.userId !== p2.userId) { // Tránh ghi đè nếu vô tình chơi 1 mình (test)
            await docClient.send(new PutCommand({
                TableName: process.env.MATCH_HISTORY_TABLE || "MatchHistoryV2",
                Item: {
                    ...baseMatchData,
                    userId: p2.userId
                }
            }));
        }

        // 2. Xác định người thua (Dựa trên ID gốc)
        const loserId = realWinnerId === p1.userId ? p2.userId : p1.userId;

        // 3. Update người thắng (bỏ qua nếu là guest)
        if (!realWinnerId.startsWith("guest_")) {
            await docClient.send(new UpdateCommand({
                TableName: "User",
                Key: { userId: realWinnerId },
                UpdateExpression: "SET wins = if_not_exists(wins, :zero) + :one, totalGames = if_not_exists(totalGames, :zero) + :one",
                ExpressionAttributeValues: { ":zero": 0, ":one": 1 }
            }));
        }

        // 4. Update người thua (bỏ qua nếu là guest)
        if (!loserId.startsWith("guest_")) {
            await docClient.send(new UpdateCommand({
                TableName: "User",
                Key: { userId: loserId },
                UpdateExpression: "SET losses = if_not_exists(losses, :zero) + :one, totalGames = if_not_exists(totalGames, :zero) + :one",
                ExpressionAttributeValues: { ":zero": 0, ":one": 1 }
            }));
        }

        return {
            statusCode: 200,
            headers: { "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ message: "Match saved with dual-write and stats updated" })
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