const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
} = require("@aws-sdk/lib-dynamodb");
const {
  buildRankUpdate,
  calculateRankDelta,
  getRankForRp,
} = require("../../services/rankService");

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "OPTIONS,POST",
};

const getRealUserId = async (email, fallbackId) => {
  if (!email) return fallbackId;

  try {
    const response = await docClient.send(new GetCommand({
      TableName: "EmailIndex",
      Key: { email },
    }));
    return response.Item ? response.Item.userId : fallbackId;
  } catch (error) {
    console.error("Failed to resolve user id from email", error);
    return fallbackId;
  }
};

const getUser = async (userId) => {
  if (!userId) return {};

  const response = await docClient.send(new GetCommand({
    TableName: "User",
    Key: { userId },
  }));

  return response.Item || {};
};

const updateCasualStats = async ({ winnerId, loserId }) => {
  await Promise.all([
    docClient.send(new UpdateCommand({
      TableName: "User",
      Key: { userId: winnerId },
      UpdateExpression: [
        "SET wins = if_not_exists(wins, :zero) + :one",
        "totalGames = if_not_exists(totalGames, :zero) + :one",
      ].join(", "),
      ExpressionAttributeValues: { ":zero": 0, ":one": 1 },
    })),
    docClient.send(new UpdateCommand({
      TableName: "User",
      Key: { userId: loserId },
      UpdateExpression: [
        "SET losses = if_not_exists(losses, :zero) + :one",
        "totalGames = if_not_exists(totalGames, :zero) + :one",
      ].join(", "),
      ExpressionAttributeValues: { ":zero": 0, ":one": 1 },
    })),
  ]);
};

const updateRankedStats = async ({
  winnerId,
  loserId,
  winnerStats,
  loserStats,
}) => {
  const [winnerUser, loserUser] = await Promise.all([
    getUser(winnerId),
    getUser(loserId),
  ]);
  const winnerRank = winnerUser.rank || getRankForRp(winnerUser.rankPoints).id;
  const loserRank = loserUser.rank || getRankForRp(loserUser.rankPoints).id;
  const winnerDelta = calculateRankDelta({
    isWinner: true,
    playerStats: winnerStats,
    playerRank: winnerRank,
    opponentRank: loserRank,
  });
  const loserDelta = calculateRankDelta({
    isWinner: false,
    playerStats: loserStats,
    playerRank: loserRank,
    opponentRank: winnerRank,
  });
  const winnerRankUpdate = buildRankUpdate({
    currentUser: winnerUser,
    delta: winnerDelta,
    isWinner: true,
  });
  const loserRankUpdate = buildRankUpdate({
    currentUser: loserUser,
    delta: loserDelta,
    isWinner: false,
  });

  await Promise.all([
    docClient.send(new UpdateCommand({
      TableName: "User",
      Key: { userId: winnerId },
      UpdateExpression: [
        "SET rankPoints = :rankPoints",
        "#rank = :rank",
        "peakRank = :peakRank",
        "winStreak = :winStreak",
        "rankedWins = if_not_exists(rankedWins, :zero) + :one",
        "rankedMatches = if_not_exists(rankedMatches, :zero) + :one",
      ].join(", "),
      ExpressionAttributeNames: { "#rank": "rank" },
      ExpressionAttributeValues: {
        ":rankPoints": winnerRankUpdate.newRp,
        ":rank": winnerRankUpdate.newRank,
        ":peakRank": winnerRankUpdate.peakRank,
        ":winStreak": winnerRankUpdate.nextWinStreak,
        ":zero": 0,
        ":one": 1,
      },
    })),
    docClient.send(new UpdateCommand({
      TableName: "User",
      Key: { userId: loserId },
      UpdateExpression: [
        "SET rankPoints = :rankPoints",
        "#rank = :rank",
        "peakRank = :peakRank",
        "winStreak = :winStreak",
        "rankedLosses = if_not_exists(rankedLosses, :zero) + :one",
        "rankedMatches = if_not_exists(rankedMatches, :zero) + :one",
      ].join(", "),
      ExpressionAttributeNames: { "#rank": "rank" },
      ExpressionAttributeValues: {
        ":rankPoints": loserRankUpdate.newRp,
        ":rank": loserRankUpdate.newRank,
        ":peakRank": loserRankUpdate.peakRank,
        ":winStreak": loserRankUpdate.nextWinStreak,
        ":zero": 0,
        ":one": 1,
      },
    })),
  ]);

  return {
    mode: "ranked",
    winner: winnerRankUpdate,
    loser: loserRankUpdate,
  };
};

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
  if (event.requestContext?.http?.method === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders, body: "" };
  }

  try {
    const body = typeof event.body === "string" ? JSON.parse(event.body) : event;
    const mode = String(body.mode || "casual").toLowerCase();

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
      mode,
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
    if (p1.userId !== p2.userId) { 
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

    // 3. Xử lý cập nhật Rank (Nếu là đấu hạng)
    const ranked = mode === "ranked"
      ? await updateRankedStats({
          winnerId: realWinnerId,
          loserId,
          winnerStats: body.winnerStats || {},
          loserStats: body.loserStats || {},
        })
      : null;

    // 4. Update thông số casual (bỏ qua nếu là guest)
    if (!realWinnerId.startsWith("guest_")) {
      await docClient.send(new UpdateCommand({
        TableName: "User",
        Key: { userId: realWinnerId },
        UpdateExpression: "SET wins = if_not_exists(wins, :zero) + :one, totalGames = if_not_exists(totalGames, :zero) + :one",
        ExpressionAttributeValues: { ":zero": 0, ":one": 1 }
      }));
    }

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
      headers: corsHeaders,
      body: JSON.stringify({ 
        message: "Match saved with dual-write and stats updated",
        ranked
      })
    };
  } catch (err) {
    console.error("saveMatchHistory failed", err);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: err.message })
    };
  }
};
