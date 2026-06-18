const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand } = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

exports.handler = async (event) => {
    console.log("EVENT:", JSON.stringify(event, null, 2));

    try {
        const attrs = event.request.userAttributes;
        const email = attrs.email;
        const provider = event.userName || 'unknown';

        if (!email) {
            console.error("ERROR: Missing email in userAttributes.");
            return event;
        }

        let provider_name = "email";
        if (provider.includes("facebook")) provider_name = "facebook";
        else if (provider.includes("google")) provider_name = "google";

        const res = await docClient.send(new GetCommand({
            TableName: "EmailIndex",
            Key: { email: email }
        }));

        if (!res.Item) {
            const user_id = attrs.sub || event.userName;
            const customUsername = attrs.preferred_username || `${email.split('@')[0]}#VIE`;

            await docClient.send(new PutCommand({
                TableName: "User",
                Item: {
                    userId: user_id,
                    email: email,
                    cognitoSub: user_id,
                    providers: new Set([provider_name]), 
                    username: customUsername,
                    avatarUrl: '/avatars/default.png',
                    wins: 0,
                    losses: 0,
                    totalGames: 0,
                    rank: "bronze",
                    rankPoints: 0,
                    peakRank: "bronze",
                    rankedWins: 0,
                    rankedLosses: 0,
                    rankedMatches: 0,
                    winStreak: 0,
                    createdAt: new Date().toISOString()
                }
            }));

            await docClient.send(new PutCommand({
                TableName: "EmailIndex",
                Item: {
                    email: email,
                    userId: user_id
                }
            }));
        } else {
            const user_id = res.Item.userId;

            await docClient.send(new UpdateCommand({
                TableName: "User",
                Key: { userId: user_id },
                UpdateExpression: "ADD providers :p",
                ExpressionAttributeValues: {
                    ":p": new Set([provider_name])
                },
                ConditionExpression: "attribute_exists(userId)"
            }));
        }

        return event;

    } catch (e) {
        console.error("ERROR DYNAMODB:", e);
        return event; 
    }
};
