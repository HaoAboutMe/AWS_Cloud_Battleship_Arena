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
  const winnerRank = winnerUser.rank || "bronze";
  const loserRank = loserUser.rank || "bronze";
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

exports.handler = async (event) => {
  if (event.requestContext?.http?.method === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders, body: "" };
  }

  try {
    const body = typeof event.body === "string" ? JSON.parse(event.body) : event;
    const mode = String(body.mode || "casual").toLowerCase();
    const realPlayer1Id = await getRealUserId(body.player1Email, body.player1Id);
    const realPlayer2Id = await getRealUserId(body.player2Email, body.player2Id);
    const realWinnerId = await getRealUserId(body.winnerEmail, body.winnerId);
    const loserId = realWinnerId === realPlayer1Id ? realPlayer2Id : realPlayer1Id;
    const winnerStats = body.winnerStats || {};
    const loserStats = body.loserStats || {};

    await docClient.send(new PutCommand({
      TableName: "MatchHistory",
      Item: {
        matchId: body.matchId,
        roomCode: body.roomCode,
        mode,
        player1Id: realPlayer1Id,
        player2Id: realPlayer2Id,
        winnerId: realWinnerId,
        loserId,
        startedAt: body.startedAt,
        endedAt: body.endedAt,
        totalTurns: body.totalTurns || 0,
        winnerStats,
        loserStats,
        createdAt: body.createdAt || new Date().toISOString(),
      },
    }));

    const ranked = mode === "ranked"
      ? await updateRankedStats({
        winnerId: realWinnerId,
        loserId,
        winnerStats,
        loserStats,
      })
      : null;

    await updateCasualStats({ winnerId: realWinnerId, loserId });

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        message: "Match saved and stats updated.",
        ranked,
      }),
    };
  } catch (error) {
    console.error("saveMatchHistory failed", error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
