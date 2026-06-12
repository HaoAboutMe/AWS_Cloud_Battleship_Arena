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

  const checkAuth = async () => {
    try {
      const currentUser = await getLoggedInUser();
      setUser(currentUser);
      setIsAuthenticated(Boolean(currentUser));

      const [attributeResult, claimResult] = await Promise.allSettled([
        getLoggedInUserAttributes(),
        getLoggedInIdentityClaims(),
      ]);
      const userAttributes = attributeResult.status === "fulfilled"
        ? attributeResult.value
        : {};
      const identityClaims = claimResult.status === "fulfilled"
        ? claimResult.value
        : {};

      // Cognito attributes are authoritative, while ID-token claims provide
      // social profile fields that may not be returned by fetchUserAttributes.
      setAttributes({
        ...identityClaims,
        ...userAttributes,
      });
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
    } catch (error) {
      console.error("Error logging out: ", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, attributes, isAuthenticated, loading, login, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext);
}
