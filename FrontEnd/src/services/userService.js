export const createUser = async (userData) => {
  try {
    const response = await fetch(
      "https://8pqp3ldn5d.execute-api.ap-southeast-1.amazonaws.com/dev/user",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userData),
      },
    );

    if (!response.ok) {
      throw new Error(`API call failed with status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Failed to create user in DynamoDB:", error);
    // Returning null instead of throwing to prevent crashing the app
    return null;
  }
};
