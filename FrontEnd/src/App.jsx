import { Routes, Route, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { AuthProvider } from "./contexts/AuthContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import {
  installUIClickSounds,
  syncBackgroundMusic,
} from "./services/soundService";

import Home from "./pages/Home";
import Lobby from "./pages/Lobby";
import Game from "./pages/Game";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import Profile from "./pages/Profile";
import RankDemo from "./pages/RankDemo";
import Leaderboard from "./pages/Leaderboard";

function App() {
  const { pathname } = useLocation();

  useEffect(() => {
    installUIClickSounds();
  }, []);

  useEffect(() => {
    syncBackgroundMusic(pathname);
  }, [pathname]);

  return (
    <LanguageProvider>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/lobby" element={<Lobby />} />
          <Route path="/game" element={<Game />} />
          <Route path="/rank-demo" element={<RankDemo />} />
        </Routes>
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;
