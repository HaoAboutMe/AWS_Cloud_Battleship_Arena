import { createContext, useContext, useState, useEffect } from "react";
import { Hub } from "aws-amplify/utils";
import {
  getLoggedInUser,
  getLoggedInUserAttributes,
  getLoggedInIdentityClaims,
  logoutUser,
} from "../services/authService";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [attributes, setAttributes] = useState({});
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [customAvatarUrl, setCustomAvatarUrl] = useState(() => {
    return localStorage.getItem("customAvatarUrl") || null;
  });

  const updateAvatar = (url) => {
    setCustomAvatarUrl(url);
    localStorage.setItem("customAvatarUrl", url);
  };

  const checkAuth = async () => {
    try {
      const currentUser = await getLoggedInUser();
      setUser(currentUser);
      setIsAuthenticated(Boolean(currentUser));

      const [attributeResult, claimResult] = await Promise.allSettled([
        getLoggedInUserAttributes(),
        getLoggedInIdentityClaims(),
      ]);
      const userAttributes =
        attributeResult.status === "fulfilled" ? attributeResult.value : {};
      const identityClaims =
        claimResult.status === "fulfilled" ? claimResult.value : {};

      // Cognito attributes are authoritative, while ID-token claims provide
      // social profile fields that may not be returned by fetchUserAttributes.
      const mergedAttributes = {
        ...identityClaims,
        ...userAttributes,
      };

      const email = mergedAttributes.email;
      if (email) {
        try {
          const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/user?email=${encodeURIComponent(email)}`);
          if (res.ok) {
            const dbData = await res.json();
            if (dbData && dbData.username) {
              mergedAttributes.preferred_username = dbData.username;
            }
            if (dbData && dbData.lastUsernameChange) {
              mergedAttributes.lastUsernameChange = dbData.lastUsernameChange;
            }
            if (dbData && dbData.avatarUrl) {
              mergedAttributes.picture = dbData.avatarUrl;
            }
            [
              "rank",
              "rankPoints",
              "peakRank",
              "rankedWins",
              "rankedLosses",
              "rankedMatches",
              "winStreak",
            ].forEach((field) => {
              if (dbData && dbData[field] !== undefined) {
                mergedAttributes[field] = dbData[field];
              }
            });
          }
        } catch (e) {
          console.error("Failed to fetch DB user data:", e);
        }
      }

      setAttributes(mergedAttributes);
    } catch {
      setUser(null);
      setAttributes({});
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initialAuthCheck = window.setTimeout(checkAuth, 0);

    const stopListening = Hub.listen("auth", ({ payload }) => {
      if (payload.event === "signedIn") {
        checkAuth();
        window.dispatchEvent(new Event("battleship-auth-changed"));
      }

      if (payload.event === "signedOut") {
        setUser(null);
        setAttributes({});
        setIsAuthenticated(false);
        setCustomAvatarUrl(null);
        localStorage.removeItem("customAvatarUrl");
        window.dispatchEvent(new Event("battleship-auth-changed"));
      }
    });

    return () => {
      window.clearTimeout(initialAuthCheck);
      stopListening();
    };
  }, []);

  const login = async () => {
    await checkAuth();
  };

  const logout = async () => {
    try {
      await logoutUser();
      setUser(null);
      setAttributes({});
      setIsAuthenticated(false);
      setCustomAvatarUrl(null);
      localStorage.removeItem("customAvatarUrl");
    } catch (error) {
      console.error("Error logging out: ", error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        attributes,
        isAuthenticated,
        loading,
        login,
        logout,
        checkAuth,
        customAvatarUrl,
        updateAvatar,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext);
}
