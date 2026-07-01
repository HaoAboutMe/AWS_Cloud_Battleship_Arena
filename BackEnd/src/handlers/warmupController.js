const { LambdaClient, InvokeCommand } = require("@aws-sdk/client-lambda");

const client = new LambdaClient({});

exports.handler = async (event) => {
  const functionsToWarm = [
    'WebSocketConnect',
    'CreateRoom',
    'JoinRoom',
    'MatchmakeRoom',
    'RematchRoom'
  ];

  const warmupPayload = {
    source: "aws.events",
    "detail-type": "Scheduled Event"
  };

  let successCount = 0;

  const promises = functionsToWarm.map(async (funcName) => {
    try {
      const command = new InvokeCommand({
        FunctionName: funcName,
        InvocationType: 'Event',
        Payload: Buffer.from(JSON.stringify(warmupPayload))
      });
      
      const response = await client.send(command);
      console.log(`✅ Đã ping thành công hàm: ${funcName} | StatusCode: ${response.StatusCode}`);
      successCount++;
    } catch (error) {
      console.error(`❌ Lỗi khi ping hàm ${funcName}:`, error);
    }
  });

  await Promise.all(promises);

  return {
    statusCode: 200,
    body: JSON.stringify(`WarmUpController hoàn tất. Ping thành công: ${successCount}/${functionsToWarm.length} hàm.`)
  };
};
