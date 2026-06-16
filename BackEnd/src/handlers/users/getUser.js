const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");

const { DynamoDBDocumentClient, GetCommand } = require("@aws-sdk/lib-dynamodb");



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



        const resUser = await docClient.send(new GetCommand({

            TableName: "User",

            Key: { userId: resEmail.Item.userId }

        }));



        const userData = resUser.Item || {};
        if (process.env.AVATAR_BUCKET_NAME) {
            userData.avatarUrl = `https://${process.env.AVATAR_BUCKET_NAME}.s3.amazonaws.com/avatars/${resEmail.Item.userId}.jpg`;
        }

        return {

            statusCode: 200,

            headers: { "Access-Control-Allow-Origin": "*" },

            body: JSON.stringify(userData)

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