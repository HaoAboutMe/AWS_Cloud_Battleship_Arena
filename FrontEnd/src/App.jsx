import { Routes, Route, useLocation } from "react-router-dom";
import { Suspense, lazy, useEffect } from "react";
import { AuthProvider } from "./contexts/AuthContext";
import { LanguageProvider } from "./contexts/LanguageContext";

const Home = lazy(() => import("./pages/Home"));
const Lobby = lazy(() => import("./pages/Lobby"));
const Game = lazy(() => import("./pages/Game"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const Profile = lazy(() => import("./pages/Profile"));
const RankDemo = lazy(() => import("./pages/RankDemo"));
const Leaderboard = lazy(() => import("./pages/Leaderboard"));

const loadSoundService = () => import("./services/soundService");

const runWhenIdle = (task) => {
  if (typeof window === "undefined") return undefined;
  if ("requestIdleCallback" in window) {
    const id = window.requestIdleCallback(task, { timeout: 1500 });
    return () => window.cancelIdleCallback(id);
  }
  const id = window.setTimeout(task, 250);
  return () => window.clearTimeout(id);
};

function RouteFallback() {
  return <div className="min-h-screen bg-background" />;
}

function App() {
  const { pathname } = useLocation();

  useEffect(() => {
    return runWhenIdle(() => {
      loadSoundService().then(({ installUIClickSounds }) => {
        installUIClickSounds();
      });
    });
  }, []);

  useEffect(() => {
    return runWhenIdle(() => {
      loadSoundService().then(({ syncBackgroundMusic }) => {
        syncBackgroundMusic(pathname);
      });
    });
  }, [pathname]);

  return (
    <LanguageProvider>
      <AuthProvider>
        <Suspense fallback={<RouteFallback />}>
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
        </Suspense>
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;
