export const createUser = async (userData) => {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_API_BASE_URL}/user`,
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
export const updateUsername = async (email, newUsername, newTag) => {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_API_BASE_URL}/user/username`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, newUsername, newTag }),
      }
    );

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || `API call failed with status: ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error("Failed to update username:", error);
    throw error;
  }
};

export const getUserProfile = async (email) => {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_API_BASE_URL}/user?email=${encodeURIComponent(email)}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`API call failed with status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Failed to get user from DynamoDB:", error);
    return null;
  }
};

export const saveMatchHistory = async (payload) => {
  const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/matches/save`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error || data?.message || `API call failed with status: ${response.status}`);
  }

  return data;
};

export const getMatchHistory = async (email) => {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_API_BASE_URL}/matches?email=${encodeURIComponent(email)}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      if (response.status === 404) return [];
      throw new Error(`API call failed with status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Failed to get match history:", error);
    return [];
  }
};
