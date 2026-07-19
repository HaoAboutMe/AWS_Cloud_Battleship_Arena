const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, GetCommand } = require("@aws-sdk/lib-dynamodb");

const s3Client = new S3Client({});
const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient);

exports.handler = async (event) => {
    try {
        const email = event.requestContext?.authorizer?.jwt?.claims?.email || event.queryStringParameters?.email;
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
        const userId = resEmail.Item.userId;
        const bucketName = process.env.AVATAR_BUCKET_NAME;

        const key = `avatars/${userId}.jpg`;

        const command = new PutObjectCommand({
            Bucket: bucketName,
            Key: key,
            ContentType: "image/jpeg",
            CacheControl: "max-age=0, must-revalidate"
        });

        // Get Presigned URL valid for 5 minutes
        const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });
        
        // Public URL 
        const publicUrl = `https://${bucketName}.s3.amazonaws.com/${key}`;

        return {
            statusCode: 200,
            headers: { "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ uploadUrl, publicUrl })
        };
    } catch (error) {
        console.error("ERROR generating presigned URL:", error);
        return {
            statusCode: 500,
            headers: { "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ message: "Internal server error" })
        };
    }
};
