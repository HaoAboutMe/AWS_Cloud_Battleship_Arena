const { ApiGatewayManagementApiClient, PostToConnectionCommand } = require("@aws-sdk/client-apigatewaymanagementapi");
const { deleteConnection, listConnectionsByRoom, updateConnectionRoom } = require("../services/connectionService");
const { GetCommand, PutCommand, UpdateCommand, DeleteCommand } = require("@aws-sdk/lib-dynamodb");
const { documentClient } = require("../lib/dynamodb");
const { buildRankUpdate, calculateRankDelta, getRankForRp } = require("../services/rankService");
const { randomUUID } = require("crypto");

const SHIP_DEFS = [
  {
    id: "carrier",
    size: 5,
    baseOffsets: [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]],
    rotations: [0, 90, 180, 270],
  },
  {
    id: "zship",
    size: 4,
    baseOffsets: [[0, 1], [1, 1], [1, 0], [2, 0]],
    rotations: [0, 90, 180, 270],
  },
  {
    id: "destroyer",
    size: 4,
    baseOffsets: [[0, 0], [1, 0], [2, 0], [2, 1]],
    rotations: [0, 90, 180, 270],
  },
  {
    id: "patrol",
    size: 2,
    baseOffsets: [[0, 0], [0, 1]],
    rotations: [0, 90, 180, 270],
  },
];

const rotateOffsetsClockwise = (offsets) => offsets.map(([r, c]) => [c, -r]);

const normalizeOffsets = (offsets) => {
  let minR = Infinity;
  let minC = Infinity;
  offsets.forEach(([r, c]) => {
    minR = Math.min(minR, r);
    minC = Math.min(minC, c);
  });
  return offsets.map(([r, c]) => [r - minR, c - minC]);
};

const applyRotation = (baseOffsets, rotation) => {
  let offsets = baseOffsets.map(([r, c]) => [r, c]);
  const steps = Math.round(rotation / 90) % 4;
  for (let i = 0; i < steps; i++) {
    offsets = rotateOffsetsClockwise(offsets);
  }
  return normalizeOffsets(offsets);
};

const getShipOffsets = (shipDef, rotation) => {
  const safeRotation = shipDef.rotations.includes(rotation)
    ? rotation
    : shipDef.rotations[0];
  return applyRotation(shipDef.baseOffsets, safeRotation);
};

const getOccupiedCells = (ships) => {
  const occupied = [];
  for (const ship of ships) {
    const shipDef = SHIP_DEFS.find(d => d.id === ship.shipTypeId);
    if (!shipDef) continue;
    const offsets = getShipOffsets(shipDef, ship.rotation);
    for (const [dr, dc] of offsets) {
      occupied.push({
        row: ship.row + dr,
        col: ship.col + dc,
        shipId: ship.shipId,
        shipTypeId: ship.shipTypeId,
        shipLength: shipDef.size
      });
    }
  }
  return occupied;
};

const isShipSunk = (shipId, occupiedCells, hitsList) => {
  const shipCells = occupiedCells.filter(c => c.shipId === shipId);
  return shipCells.every(sc => hitsList.some(h => h.row === sc.row && h.col === sc.col));
};

const getShipCells = (shipId, occupiedCells) => {
  return occupiedCells.filter(c => c.shipId === shipId).map(c => ({ row: c.row, col: c.col }));
};

const getRealUserIdAndName = async (email, fallbackId, fallbackName) => {
  const cleanFallbackId = fallbackId ? String(fallbackId).split(':')[0] : fallbackId;
  if (!email) return { userId: cleanFallbackId, username: fallbackName };
  try {
    const resEmail = await documentClient.send(new GetCommand({
      TableName: "EmailIndex",
      Key: { email: email }
    }));
    if (!resEmail.Item) return { userId: cleanFallbackId, username: fallbackName };

    const resUser = await documentClient.send(new GetCommand({
      TableName: "User",
      Key: { userId: resEmail.Item.userId }
    }));
    if (!resUser.Item) return { userId: resEmail.Item.userId, username: fallbackName };

    return { userId: resUser.Item.userId, username: resUser.Item.username || fallbackName };
  } catch (e) {
    console.error("Error resolving real user ID:", e);
    return { userId: cleanFallbackId, username: fallbackName };
  }
};

const getAvatarUrl = (userId) => {
  const bucket = process.env.AVATAR_BUCKET_NAME;
  if (!bucket || userId.startsWith("guest_")) return null;
  return `https://${bucket}.s3.amazonaws.com/avatars/${userId}.jpg`;
};

const getUser = async (userId) => {
  if (!userId) return {};
  const response = await documentClient.send(new GetCommand({
    TableName: "User",
    Key: { userId },
  }));
  return response.Item || {};
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
  const winnerRank = winnerUser.rank || getRankForRp(winnerUser.rankPoints || 0).id;
  const loserRank = loserUser.rank || getRankForRp(loserUser.rankPoints || 0).id;
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
    documentClient.send(new UpdateCommand({
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
    documentClient.send(new UpdateCommand({
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

const saveMatch = async ({ room, winnerId, leaverId = null }) => {
  const mode = String(room.matchmakingMode || "casual").toLowerCase();
  const player1 = room.players[0];
  const player2 = room.players[1];

  const p1 = await getRealUserIdAndName(player1.email, player1.userId, player1.displayName || "Guest");
  const p2 = await getRealUserIdAndName(player2.email, player2.userId, player2.displayName || "Guest");
  
  const cleanWinnerId = winnerId ? String(winnerId).split(':')[0] : "";
  const cleanP1Id = player1.userId ? String(player1.userId).split(':')[0] : "";
  const winnerPlayer = cleanWinnerId === cleanP1Id ? player1 : player2;
  const realWinnerId = await getRealUserIdAndName(winnerPlayer.email, winnerPlayer.userId, "Guest").then(res => res.userId);

  p1.avatarUrl = getAvatarUrl(p1.userId);
  p2.avatarUrl = getAvatarUrl(p2.userId);

  const endedAt = new Date().toISOString();

  // Calculate shots and misses for match history
  const player1Shots = (room.hits1 || []).length + (room.misses1 || []).length;
  const player1Misses = (room.misses1 || []).length;
  const player2Shots = (room.hits2 || []).length + (room.misses2 || []).length;
  const player2Misses = (room.misses2 || []).length;

  const baseMatchData = {
    matchId: randomUUID(),
    roomCode: room.roomCode,
    mode,
    player1Id: p1.userId,
    player1Name: p1.username,
    player1Avatar: p1.avatarUrl,
    player2Id: p2.userId,
    player2Name: p2.username,
    player2Avatar: p2.avatarUrl,
    winnerId: realWinnerId,
    endedAt: endedAt,
    player1Shots,
    player1Misses,
    player2Shots,
    player2Misses,
    leaverId: leaverId ? String(leaverId).split(':')[0] : null
  };

  // Write for Player 1
  await documentClient.send(new PutCommand({
    TableName: process.env.MATCH_HISTORY_TABLE || "MatchHistoryV2",
    Item: {
      ...baseMatchData,
      userId: p1.userId
    }
  }));

  // Write for Player 2
  if (p1.userId !== p2.userId) { 
    await documentClient.send(new PutCommand({
      TableName: process.env.MATCH_HISTORY_TABLE || "MatchHistoryV2",
      Item: {
        ...baseMatchData,
        userId: p2.userId
      }
    }));
  }

  const loserId = realWinnerId === p1.userId ? p2.userId : p1.userId;

  let ranked = null;
  if (mode === "ranked") {
    const winnerStats = {
      turns: player1Shots,
      shots: realWinnerId === p1.userId ? player1Shots : player2Shots,
      hits: realWinnerId === p1.userId ? (player1Shots - player1Misses) : (player2Shots - player2Misses),
      misses: realWinnerId === p1.userId ? player1Misses : player2Misses,
      shipsDestroyed: 4,
    };
    const loserStats = {
      turns: player1Shots,
      shots: realWinnerId === p1.userId ? player2Shots : player1Shots,
      hits: realWinnerId === p1.userId ? (player2Shots - player2Misses) : (player1Shots - player1Misses),
      misses: realWinnerId === p1.userId ? player2Misses : player1Misses,
      shipsDestroyed: 0,
    };

    ranked = await updateRankedStats({
      winnerId: realWinnerId,
      loserId,
      winnerStats,
      loserStats,
    });
  }

  // Update casual stats
  if (!realWinnerId.startsWith("guest_")) {
    await documentClient.send(new UpdateCommand({
      TableName: "User",
      Key: { userId: realWinnerId },
      UpdateExpression: "SET wins = if_not_exists(wins, :zero) + :one, totalGames = if_not_exists(totalGames, :zero) + :one",
      ExpressionAttributeValues: { ":zero": 0, ":one": 1 }
    }));
  }

  if (!loserId.startsWith("guest_")) {
    await documentClient.send(new UpdateCommand({
      TableName: "User",
      Key: { userId: loserId },
      UpdateExpression: "SET losses = if_not_exists(losses, :zero) + :one, totalGames = if_not_exists(totalGames, :zero) + :one",
      ExpressionAttributeValues: { ":zero": 0, ":one": 1 }
    }));
  }

  return { ranked };
};

const parseMessage = (event) => {
  if (!event.body) {
    return {};
  }

  try {
    return JSON.parse(event.body);
  } catch {
    return {};
  }
};

const createManagementClient = (event) => {
  const { domainName, stage } = event.requestContext;

  return new ApiGatewayManagementApiClient({
    endpoint: `https://${domainName}/${stage}`,
  });
};

const postToConnection = async ({ client, connectionId, payload }) => {
  try {
    await client.send(
      new PostToConnectionCommand({
        ConnectionId: connectionId,
        Data: Buffer.from(JSON.stringify(payload)),
      }),
    );
  } catch (error) {
    if (error.statusCode === 410 || error.$metadata?.httpStatusCode === 410) {
      await deleteConnection(connectionId);
      return;
    }

    throw error;
  }
};

exports.handler = async (event) => {
  const connectionId = event.requestContext.connectionId;
  const message = parseMessage(event);
  const action = String(message.action || "").toUpperCase();
  const client = createManagementClient(event);

  try {
    if (action === "PING") {
      await postToConnection({
        client,
        connectionId,
        payload: {
          type: "PONG",
          sentAt: new Date().toISOString(),
        },
      });
      return { statusCode: 200, body: "Pong." };
    }

    if (action === "SUBSCRIBE_ROOM") {
      const roomCode = String(message.roomCode || "").trim().toUpperCase();
      await updateConnectionRoom({ connectionId, roomCode });
      await postToConnection({
        client,
        connectionId,
        payload: {
          type: "ROOM_SUBSCRIBED",
          roomCode,
        },
      });
      return { statusCode: 200, body: "Subscribed." };
    }

    if (action === "BROADCAST_ROOM") {
      const roomCode = String(message.roomCode || "").trim().toUpperCase();
      const connections = await listConnectionsByRoom(roomCode);
      await Promise.all(
        connections.map((connection) =>
          postToConnection({
            client,
            connectionId: connection.connectionId,
            payload: {
              type: "ROOM_EVENT",
              roomCode,
              payload: message.payload || {},
            },
          }),
        ),
      );

      return { statusCode: 200, body: "Broadcasted." };
    }

    if (action === "SHOOT") {
      const roomCode = String(message.roomCode || "").trim().toUpperCase();
      const row = Number(message.row);
      const col = Number(message.col);
      const shotId = message.shotId;

      // 1. Get calling connection to verify user identity
      const connRes = await documentClient.send(new GetCommand({
        TableName: process.env.CONNECTIONS_TABLE,
        Key: { connectionId }
      }));
      const conn = connRes.Item;
      if (!conn) {
        return { statusCode: 404, body: "Connection not found." };
      }
      const rawUserId = conn.userId;
      const cleanUserId = rawUserId ? String(rawUserId).split(':')[0] : "";

      // 2. Get Room
      const roomRes = await documentClient.send(new GetCommand({
        TableName: process.env.ROOMS_TABLE,
        Key: { roomCode }
      }));
      const room = roomRes.Item;
      if (!room || room.status !== "IN_PROGRESS") {
        return { statusCode: 400, body: "Room not in progress." };
      }

      // Sanitize turn owner
      const cleanTurnUserId = room.currentTurnUserId ? String(room.currentTurnUserId).split(':')[0] : "";

      // 3. Verify turn
      if (cleanTurnUserId !== cleanUserId) {
        console.log(`[SHOOT] Turn verification failed: room.currentTurnUserId=${room.currentTurnUserId} (clean=${cleanTurnUserId}), connection userId=${rawUserId} (clean=${cleanUserId})`);
        return { statusCode: 400, body: "Not your turn." };
      }

      // 4. Calculate shooter and opponent (Identify Roles & Find Opponent's Board)
      const p1 = room.players[0];
      const p2 = room.players[1];
      const cleanP1Id = p1 && p1.userId ? String(p1.userId).split(':')[0] : "";
      const cleanP2Id = p2 && p2.userId ? String(p2.userId).split(':')[0] : "";
      const isPlayer1 = cleanP1Id === cleanUserId;
      const shooter = isPlayer1 ? p1 : p2;
      const opponent = isPlayer1 ? p2 : p1;
      const cleanShooterId = isPlayer1 ? cleanP1Id : cleanP2Id;
      const cleanOpponentId = isPlayer1 ? cleanP2Id : cleanP1Id;

      const currentHits = isPlayer1 ? (room.hits1 || []) : (room.hits2 || []);
      const currentMisses = isPlayer1 ? (room.misses1 || []) : (room.misses2 || []);

      // Check if already shot
      const alreadyShot = currentHits.some(h => h.row === row && h.col === col) ||
                          currentMisses.some(m => m.row === row && m.col === col);
      if (alreadyShot) {
        return { statusCode: 400, body: "Coordinate already shot." };
      }

      // Calculate opponent's occupied cells
      const opponentShips = opponent.board?.ships || [];
      const occupiedCells = getOccupiedCells(opponentShips);
      
      // Flatten Coordinates into an array of strings (e.g. "row,col")
      const opponentCoordinates = occupiedCells.map(c => `${c.row},${c.col}`);
      const shotCoordinateStr = `${row},${col}`;
      
      // === ĐẶT CAMERA THEO DÕI LOGIC ===
      console.log("=== DEBUG BẮN TÀU ===");
      console.log("1. Đạn bay đến (shotCoordinateStr):", shotCoordinateStr);
      console.log("2. Tọa độ tàu địch (opponentCoordinates):", opponentCoordinates);
      console.log("3. Tàu địch gốc (chưa flatten):", JSON.stringify(opponentShips));
      // ===================================

      // Evaluate Shot
      const isHit = opponentCoordinates.includes(shotCoordinateStr);
      const hitCell = isHit ? occupiedCells.find(c => c.row === row && c.col === col) : null;

      let shotResult = { result: "MISS" };
      let sunkCells = [];
      if (isHit && hitCell) {
        const { shipId, shipTypeId, shipLength } = hitCell;
        const newHits = [...currentHits, { row, col }];
        const shipSunk = isShipSunk(shipId, occupiedCells, newHits);
        if (shipSunk) {
          sunkCells = getShipCells(shipId, occupiedCells);
        }
        shotResult = {
          result: "HIT",
          shipId,
          shipLength,
          shipTypeId,
          isSunk: shipSunk
        };
      }

      const finalHits = isHit ? [...currentHits, { row, col }] : currentHits;
      const finalMisses = !isHit ? [...currentMisses, { row, col }] : currentMisses;
      const isVictory = finalHits.length === occupiedCells.length;

      // 5. Update room state (or save/cleanup if victory)
      let rankedResult = null;
      if (isVictory) {
        const updatedRoom = {
          ...room,
          hits1: isPlayer1 ? finalHits : room.hits1,
          misses1: isPlayer1 ? finalMisses : room.misses1,
          hits2: !isPlayer1 ? finalHits : room.hits2,
          misses2: !isPlayer1 ? finalMisses : room.misses2,
        };
        const saveRes = await saveMatch({ room: updatedRoom, winnerId: cleanUserId });
        rankedResult = saveRes.ranked;

        // Delete Room
        await documentClient.send(new DeleteCommand({
          TableName: process.env.ROOMS_TABLE,
          Key: { roomCode }
        }));
      } else {
        // Update room with new shot and next turn
        const nextTurnUserId = isHit ? cleanUserId : cleanOpponentId;
        await documentClient.send(new UpdateCommand({
          TableName: process.env.ROOMS_TABLE,
          Key: { roomCode },
          UpdateExpression: isPlayer1
            ? "SET hits1 = :hits, misses1 = :misses, currentTurnUserId = :nextTurn"
            : "SET hits2 = :hits, misses2 = :misses, currentTurnUserId = :nextTurn",
          ExpressionAttributeValues: {
            ":hits": finalHits,
            ":misses": finalMisses,
            ":nextTurn": nextTurnUserId
          }
        }));
      }

      // Send SHOOT_RESULT response to the current client to prevent timeout
      await postToConnection({
        client,
        connectionId: connectionId,
        payload: {
          action: "SHOOT_RESULT",
          result: isHit ? "hit" : "miss",
          coordinate: String.fromCharCode(65 + col) + (row + 1),
        },
      });

      // 6. Broadcast results to both clients
      const connections = await listConnectionsByRoom(roomCode);
      const nextTurnUserId = isVictory ? null : (isHit ? cleanUserId : cleanOpponentId);

      if (isVictory) {
        // Broadcast the final shot result first so that clients can show the hit/sink animation
        const finalShotPayload = {
          type: "PVP_SHOT_RESULT",
          shotId,
          shooterUserId: cleanUserId,
          targetUserId: cleanOpponentId,
          row,
          col,
          shotResult,
          sunkCells,
          isVictory: true,
          nextTurnUserId: null
        };
        await Promise.all(
          connections.map((connection) =>
            postToConnection({
              client,
              connectionId: connection.connectionId,
              payload: {
                type: "ROOM_EVENT",
                roomCode,
                payload: finalShotPayload,
              },
            }),
          ),
        );

        // Wait 1.5 seconds for the animations to play before ending the match
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Broadcast GAME_OVER to trigger victory/defeat modals
        const gameOverPayload = {
          type: "GAME_OVER",
          winnerId: cleanUserId,
          rankedResult
        };
        await Promise.all(
          connections.map((connection) =>
            postToConnection({
              client,
              connectionId: connection.connectionId,
              payload: {
                type: "ROOM_EVENT",
                roomCode,
                payload: gameOverPayload,
              },
            }),
          ),
        );
      } else {
        // Normal shot, not yet victory
        const eventPayload = {
          type: "PVP_SHOT_RESULT",
          shotId,
          shooterUserId: cleanUserId,
          targetUserId: cleanOpponentId,
          row,
          col,
          shotResult,
          sunkCells,
          isVictory: false,
          nextTurnUserId
        };
        await Promise.all(
          connections.map((connection) =>
            postToConnection({
              client,
              connectionId: connection.connectionId,
              payload: {
                type: "ROOM_EVENT",
                roomCode,
                payload: eventPayload,
              },
            }),
          ),
        );
      }

      return { statusCode: 200, body: "Shot processed." };
    }

    if (action === "QUIT") {
      const roomCode = String(message.roomCode || "").trim().toUpperCase();

      // 1. Get calling connection to verify user identity
      const connRes = await documentClient.send(new GetCommand({
        TableName: process.env.CONNECTIONS_TABLE,
        Key: { connectionId }
      }));
      const conn = connRes.Item;
      if (!conn) {
        return { statusCode: 404, body: "Connection not found." };
      }
      const leaverId = conn.userId;

      // 2. Get Room
      const roomRes = await documentClient.send(new GetCommand({
        TableName: process.env.ROOMS_TABLE,
        Key: { roomCode }
      }));
      const room = roomRes.Item;
      if (!room) {
        return { statusCode: 404, body: "Room not found." };
      }

      // If room is in progress, resolve the match with the opponent as the winner
      let rankedResult = null;
      let opponent = null;
      if (room.status === "IN_PROGRESS") {
        const p1 = room.players[0];
        const p2 = room.players[1];
        const cleanLeaverId = leaverId ? String(leaverId).split(':')[0] : "";
        const cleanP1Id = p1 && p1.userId ? String(p1.userId).split(':')[0] : "";
        opponent = cleanP1Id === cleanLeaverId ? p2 : p1;

        // Save Match History (opponent wins)
        const saveRes = await saveMatch({ room, winnerId: opponent.userId, leaverId: cleanLeaverId });
        rankedResult = saveRes.ranked;
      }

      // Delete Room
      await documentClient.send(new DeleteCommand({
        TableName: process.env.ROOMS_TABLE,
        Key: { roomCode }
      }));

      // Broadcast event to other players
      const connections = await listConnectionsByRoom(roomCode);
      const eventPayload = {
        type: "GAME_OVER",
        winnerId: opponent ? String(opponent.userId).split(':')[0] : null,
        reason: "opponent_left",
        rankedResult
      };

      await Promise.all(
        connections.map((connection) =>
          postToConnection({
            client,
            connectionId: connection.connectionId,
            payload: {
              type: "ROOM_EVENT",
              roomCode,
              payload: eventPayload,
            },
          }),
        ),
      );

      return { statusCode: 200, body: "Quit processed." };
    }

    await postToConnection({
      client,
      connectionId,
      payload: {
        type: "ERROR",
        message: "Unsupported action.",
      },
    });

    return { statusCode: 400, body: "Unsupported action." };
  } catch (error) {
    console.error("wsMessage failed", error);
    return { statusCode: 500, body: "Message failed." };
  }
};
