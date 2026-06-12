import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import CommandHeader from "../components/CommandHeader";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import "./HomeHeader.css";
import "./Home.css";

function Home() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const {
    user: currentUser,
    attributes,
    loading: authLoading,
    logout,
  } = useAuth();
  const [authToast, setAuthToast] = useState(() => {
    if (location.state?.authEvent === "signed-in") {
      return {
        titleKey: "home.signedInTitle",
        messageKey: "home.signedInBody",
      };
    }
    if (location.state?.authEvent === "signed-out") {
      return {
        titleKey: "home.signedOutTitle",
        messageKey: "home.signedOutBody",
      };
    }
    return null;
  });
  const [isLightMode, setIsLightMode] = useState(false);
  const [botDifficulty, setBotDifficulty] = useState("easy");
  const [stats] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("battleshipStats")) || {
        totalMatches: 0,
        wins: 0,
        losses: 0,
        totalShots: 0,
        totalHits: 0,
      };
    } catch {
      return { totalMatches: 0, wins: 0, losses: 0, totalShots: 0, totalHits: 0 };
    }
  });
  const [activeModeTab, setActiveModeTab] = useState('bot');
  const [activeStatsTab, setActiveStatsTab] = useState('record');

  const toggleTheme = (e) => {
    // Fallback for browsers that don't support view transitions
    if (!document.startViewTransition) {
      document.documentElement.classList.toggle('light-mode-active');
      setIsLightMode(!isLightMode);
      return;
    }

    const x = e.clientX;
    const y = e.clientY;
    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );
    const isDark = !isLightMode;

    const transition = document.startViewTransition(() => {
      document.documentElement.classList.toggle('light-mode-active');
      setIsLightMode(isDark);
    });

    transition.ready.then(() => {
      document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${endRadius}px at ${x}px ${y}px)`
          ],
        },
        {
          duration: 700,
          easing: 'ease-in-out',
          pseudoElement: '::view-transition-new(root)',
        }
      );
    });
  };

  useEffect(() => {
    // Track the pointer for the card highlight without overriding theme colors.
    const cards = document.querySelectorAll(".glass-card");
    const handleMouseMove = (e) => {
      const card = e.currentTarget;
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      card.style.setProperty("--mouse-x", `${x}px`);
      card.style.setProperty("--mouse-y", `${y}px`);
    };

    cards.forEach((card) => {
      card.addEventListener("mousemove", handleMouseMove);
    });

    return () => {
      cards.forEach((card) => {
        card.removeEventListener("mousemove", handleMouseMove);
      });
    };
  }, []);

  useEffect(() => {
    if (!authToast) return undefined;
    const timer = window.setTimeout(() => setAuthToast(null), 4200);
    return () => window.clearTimeout(timer);
  }, [authToast]);

  const handleLogout = async () => {
    try {
      await logout();
      localStorage.removeItem("battleshipSession");
      setAuthToast({
        type: "success",
        titleKey: "home.signedOutTitle",
        messageKey: "home.signedOutBody",
      });
      navigate("/", { replace: true, state: null });
    } catch {
      setAuthToast({
        type: "error",
        titleKey: "home.signOutErrorTitle",
        messageKey: "home.signOutErrorBody",
      });
    }
  };

  return (
    <div id="top" className="home-page bg-background text-on-background font-body-md min-h-screen selection:bg-secondary/30">
      <CommandHeader
        currentUser={currentUser}
        attributes={attributes}
        authLoading={authLoading}
        isLightMode={isLightMode}
        onToggleTheme={toggleTheme}
        onLogout={handleLogout}
      />

      {authToast && (
        <div
          className={`command-toast ${authToast.type === "error" ? "is-error" : ""}`}
          role="status"
          aria-live="polite"
        >
          <span className="command-toast-icon" aria-hidden="true"><i /></span>
          <span>
            <strong>{t(authToast.titleKey)}</strong>
            <small>{t(authToast.messageKey)}</small>
          </span>
          <button type="button" onClick={() => setAuthToast(null)} aria-label={t("common.dismiss")}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
      )}
      <main className="home-main max-w-[1440px] mx-auto px-gutter pb-6 overflow-hidden flex flex-col gap-6">
        {/*  Hero Section  */}
        <section className="home-hero relative grid grid-cols-1 md:grid-cols-2 items-center gap-x-8 gap-y-4 md:gap-y-6 py-2">
          <div className="z-10 order-1 md:col-start-1 md:row-start-1 self-end text-center md:text-left">
            <h1 className="font-display-lg text-on-surface leading-tight text-[24px] md:text-[32px]">
              {t("home.heroOne")} <span className="text-secondary glow-text">{t("home.heroFleet")}</span>
              <br />
              {t("home.heroTwo")}
            </h1>
          </div>

          <div className="relative order-2 md:col-start-2 md:row-start-1 md:row-span-2 flex justify-center md:justify-end w-full py-4 md:py-0">
            <div className="absolute inset-0 ocean-wave -z-10 animate-pulse"></div>
            <img
              alt="Tactical naval combat view from above with neon ships and radar sweeps"
              className="w-64 sm:w-72 md:w-80 h-auto drop-shadow-[0_0_50px_rgba(0,210,255,0.2)] rounded-xl transform hover:scale-105 transition-transform duration-700"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuB1yTSkvD5vp5gcRLUr8zR_w8VZ0l7fR_f1CecqhdDez07y_DahvV-W3SraDfp39kdhNRrldcW-qs7SVQuv-z2zg-i7iht-ATRqpri4Pwf4egVN3npAuHUqi-qIFlJV4qLAVmDWC3FMzkha-vo2EuAwguKQEkqVxGD88JsoYr6ADKrsWRtGYJrzKI60w-L3en7RhnXByJql8W_2WWw269Mdavu_pIUOYWj8FXkYzz3EaPooWH2A5xyNitffhU_CIvVrZidsrEvFFhd7"
            />
          </div>

          <div className="z-10 order-3 md:col-start-1 md:row-start-2 self-start flex flex-col sm:flex-row gap-3 md:gap-4 w-full">
            <button className="home-tactics-button w-full sm:w-auto justify-center border border-secondary/50 text-secondary font-label-md text-label-md px-8 py-3 rounded-sm transition-all active:scale-95">
              {t("home.learn")}
            </button>
          </div>
        </section>
        {/*  Game Modes Section  */}
        <section id="deployment" className="command-section-anchor">
          <div className="home-section-heading flex items-center gap-3 mb-4">
            <span className="material-symbols-outlined text-secondary">
              grid_view
            </span>
            <h2 className="font-headline-md text-headline-md text-on-surface uppercase tracking-tight">
              {t("home.deployment")}
            </h2>
          </div>
          {/* Mobile Tabs */}
          <div className="md:hidden flex bg-surface-container/30 rounded-lg p-1 mb-4">
            <button 
              onClick={() => setActiveModeTab('bot')}
              className={`flex-1 py-2 text-xs font-bold uppercase rounded-md transition-all ${activeModeTab === 'bot' ? 'bg-secondary text-on-secondary-fixed shadow-[0_0_10px_rgba(0,210,255,0.2)]' : 'text-on-surface-variant'}`}
            >
              {t("home.bot")}
            </button>
            <button 
              onClick={() => setActiveModeTab('player')}
              className={`flex-1 py-2 text-xs font-bold uppercase rounded-md transition-all ${activeModeTab === 'player' ? 'bg-secondary text-on-secondary-fixed shadow-[0_0_10px_rgba(0,210,255,0.2)]' : 'text-on-surface-variant'}`}
            >
              {t("home.player")}
            </button>
            <button 
              onClick={() => setActiveModeTab('room')}
              className={`flex-1 py-2 text-xs font-bold uppercase rounded-md transition-all ${activeModeTab === 'room' ? 'bg-secondary text-on-secondary-fixed shadow-[0_0_10px_rgba(0,210,255,0.2)]' : 'text-on-surface-variant'}`}
            >
              {t("home.room")}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/*  Mode 1: Play vs Bot  */}
            <div className={`home-mode-card glass-card p-6 md:p-8 rounded-xl flex flex-col group h-full ${activeModeTab !== 'bot' ? 'hidden md:flex' : 'flex'}`}>
              <div className="flex items-center gap-4 mb-4 md:mb-6">
                <div className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center bg-secondary/10 rounded-lg text-secondary group-hover:scale-110 transition-transform shrink-0">
                  <span className="material-symbols-outlined text-2xl md:text-3xl">
                    smart_toy
                  </span>
                </div>
                <h3 className="font-title-lg text-[20px] md:text-title-lg text-on-surface leading-tight">
                  {t("home.playBot")}
                </h3>
              </div>
              <p className="font-body-md text-body-md text-on-surface-variant mb-6 md:mb-8 flex-grow">
                {t("home.botBody")}
              </p>
              <div className="flex flex-col gap-4">
                <div className="flex gap-2">
                  <span className="text-[10px] px-2 py-1 bg-surface-container text-on-surface-variant font-bold uppercase rounded-sm border border-white/5">
                    {t("home.aiOpponent")}
                  </span>
                  <span className="text-[10px] px-2 py-1 bg-surface-container text-on-surface-variant font-bold uppercase rounded-sm border border-white/5">
                    {t("home.practice")}
                  </span>
                </div>
                
                <div className="flex flex-col gap-2 mb-1">
                  <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">{t("home.difficulty")}</span>
                  <select 
                    value={botDifficulty} 
                    onChange={(e) => setBotDifficulty(e.target.value)}
                    className="bg-surface-container/50 text-secondary font-label-md p-2 rounded-sm border border-secondary/20 outline-none focus:border-secondary transition-colors cursor-pointer"
                  >
                    <option value="easy">{t("home.easy")}</option>
                    <option value="normal">{t("home.normal")}</option>
                    <option value="hard">{t("home.hard")}</option>
                  </select>
                </div>

                <Link to={`/game?mode=pve&difficulty=${botDifficulty}`} className="w-full block">
                  <button className="w-full bg-secondary text-on-secondary-fixed font-label-md text-label-md py-3 rounded-sm hover:bg-secondary-container transition-all active:scale-95 tracking-widest">
                    {t("home.battle")}
                  </button>
                </Link>
              </div>
            </div>
            {/*  Mode 2: Play vs Player  */}
            <div className={`home-mode-card glass-card p-6 rounded-xl flex flex-col group h-full border-secondary/20 relative overflow-hidden ${activeModeTab !== 'player' ? 'hidden md:flex' : 'flex'}`}>
              <div className="absolute top-0 right-0 p-2">
                <span className="text-[10px] bg-secondary text-on-secondary-fixed px-2 py-0.5 font-black uppercase rounded-bl-sm">
                  {t("home.competitive")}
                </span>
              </div>
              <div className="flex items-center gap-4 mb-4 mt-2 md:mt-0">
                <div className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center bg-secondary/10 rounded-lg text-secondary group-hover:scale-110 transition-transform shrink-0">
                  <span className="material-symbols-outlined text-2xl md:text-3xl">groups</span>
                </div>
                <h3 className="font-title-lg text-[20px] md:text-title-lg text-on-surface leading-tight pr-16">
                  {t("home.playPlayer")}
                </h3>
              </div>
              <p className="font-body-md text-body-md text-on-surface-variant mb-4 flex-grow">
                {t("home.playerBody")}
              </p>
              <div className="flex flex-col gap-4">
                <div className="flex gap-2">
                  <span className="text-[10px] px-2 py-1 bg-secondary/20 text-secondary font-bold uppercase rounded-sm border border-secondary/20">
                    {t("home.matchmaking")}
                  </span>
                </div>
                <button 
                  onClick={() => alert(t("home.underDevelopment"))}
                  className="w-full bg-secondary opacity-50 cursor-not-allowed text-on-secondary-fixed font-label-md text-label-md py-3 rounded-sm hover:bg-secondary-container transition-all active:scale-95 tracking-widest"
                >
                  {t("home.joinQueue")}
                </button>
              </div>
            </div>
            {/*  Mode 3: Create Private Room  */}
            <div className={`home-mode-card glass-card p-6 rounded-xl flex flex-col group h-full ${activeModeTab !== 'room' ? 'hidden md:flex' : 'flex'}`}>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center bg-secondary/10 rounded-lg text-secondary group-hover:scale-110 transition-transform shrink-0">
                  <span className="material-symbols-outlined text-2xl md:text-3xl">
                    key
                  </span>
                </div>
                <h3 className="font-title-lg text-[20px] md:text-title-lg text-on-surface leading-tight">
                  {t("home.privateRoom")}
                </h3>
              </div>
              <p className="font-body-md text-body-md text-on-surface-variant mb-4 flex-grow">
                {t("home.roomBody")}
              </p>
              <div className="flex flex-col gap-4">
                <div className="flex gap-2">
                  <span className="text-[10px] px-2 py-1 bg-surface-container text-on-surface-variant font-bold uppercase rounded-sm border border-white/5">
                    {t("home.customMatch")}
                  </span>
                </div>
                <button 
                  onClick={() => alert(t("home.underDevelopment"))}
                  className="w-full bg-transparent opacity-50 cursor-not-allowed border border-secondary text-secondary font-label-md text-label-md py-3 rounded-sm hover:bg-secondary/10 transition-all active:scale-95 tracking-widest"
                >
                  {t("home.createRoom")}
                </button>
              </div>
            </div>
          </div>
        </section>
        {/*  Secondary Content Row  */}
        <section id="records" className="command-section-anchor">
          {/* Mobile Tabs */}
          <div className="lg:hidden flex bg-surface-container/30 rounded-lg p-1 mb-4">
            <button 
              onClick={() => setActiveStatsTab('record')}
              className={`flex-1 py-2 text-xs font-bold uppercase rounded-md transition-all ${activeStatsTab === 'record' ? 'bg-secondary text-on-secondary-fixed shadow-[0_0_10px_rgba(0,210,255,0.2)]' : 'text-on-surface-variant'}`}
            >
              {t("home.serviceRecord")}
            </button>
            <button 
              onClick={() => setActiveStatsTab('leaderboard')}
              className={`flex-1 py-2 text-xs font-bold uppercase rounded-md transition-all ${activeStatsTab === 'leaderboard' ? 'bg-secondary text-on-secondary-fixed shadow-[0_0_10px_rgba(0,210,255,0.2)]' : 'text-on-surface-variant'}`}
            >
              {t("home.topCommanders")}
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/*  Leaderboard Preview  */}
            <div id="leaderboard" className={`home-stats-card command-section-anchor lg:col-span-5 glass-card p-4 rounded-xl ${activeStatsTab !== 'leaderboard' ? 'hidden lg:block' : 'block'}`}>
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-secondary">
                  emoji_events
                </span>
                <h3 className="font-headline-md text-[18px] text-on-surface uppercase tracking-tight">
                  {t("home.topThree")}
                </h3>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-2 bg-white/5 rounded-sm">
                <div className="w-6 h-6 rounded-full bg-[#FFD700]/20 flex items-center justify-center font-bold text-[#FFD700] text-xs">
                  1
                </div>
                <img
                  alt="Commander Avatar"
                  className="w-6 h-6 rounded-full"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuAS3z6urK3fvR8xGr9Kiy9fDPlYG-F9al9-KmluBpXOzu-QMVa2cJjM8WubGwh014LQ2Ht813nBgJBwedr_YjpSelFZ5zVMxrPdwCgagH5NSUoCwmTVTdH3caaVlXgU6nEZm4VkHM_HDNM93d7ohZjAEuSwzNahcKHym93fnxz9pDvj6tOPU28Az03dcaXYmzdj9tHJIhng4wDDS7eWm7a9lkL7Z_aGua4YtsBpUpuYISfyBDDDYbHiFSaDXGGxGRjpgsqk6AvWlN_x"
                />
                <span className="font-body-md text-on-surface text-sm">
                  GhostFleet_X
                </span>
                <span className="ml-auto font-body-md text-secondary glow-text text-sm">
                  92.4%
                </span>
              </div>
              <div className="flex items-center gap-3 p-2 bg-white/5 rounded-sm">
                <div className="w-6 h-6 rounded-full bg-[#C0C0C0]/20 flex items-center justify-center font-bold text-[#C0C0C0] text-xs">
                  2
                </div>
                <img
                  alt="Commander Avatar"
                  className="w-6 h-6 rounded-full"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuAl3MZ7oAPAhR9d0pZ8KP_zJxVGTlLWv-ULJ2qGBbedDmG5YVGSY-5k0pha5YmRw3YJvFzipDqT-1IVRVKWV0MxJ7Un4vT1AVjFthxuNR2tn7_nn0aitSeQjb6ZkIaBOQsVF5Td2222jU7rd8Y_LC8red6jLw2vRjmE_4H30q-5NIQ8yMRlQlUaw8fv0hYd8SZsHCZ31iqPjVdJnz4EXv8P4zWIORPSyMeFNzqmBTQM6mBocflueqNpS6VXcn-KuW3V6TCnjU3UzZPu"
                />
                <span className="font-body-md text-on-surface text-sm">
                  SteelRain_99
                </span>
                <span className="ml-auto font-body-md text-secondary text-sm">
                  88.1%
                </span>
              </div>
              <div className="flex items-center gap-3 p-2 bg-white/5 rounded-sm">
                <div className="w-6 h-6 rounded-full bg-[#CD7F32]/20 flex items-center justify-center font-bold text-[#CD7F32] text-xs">
                  3
                </div>
                <img
                  alt="Commander Avatar"
                  className="w-6 h-6 rounded-full"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuDdEhClJgw8xkGUc_fHZz0S_uUO4P1V20OX88TxFYdmo_mbTU_l5qf-8skAV8T588zyx_fPbKMTQsVRjnEXRnxRHCAhBmDradpO63eY7kcGf-eE6BAWyh5Fx-r7C_JeQaRQBjayzaxcfTT9ETv4Gowbg8gvi1p8DOttSMsgNpbKpX3bwDYzVmWnQjY6AL1kfNwGSh8pmgXjGfLTEICFl_9AcqiC985Vy22pybPvtX-0Og_BfqZJjmfT4lZWwl2LapkyCcGZTuFRzwpu"
                />
                <span className="font-body-md text-on-surface text-sm">
                  DeepSeaKraken
                </span>
                <span className="ml-auto font-body-md text-secondary text-sm">
                  85.6%
                </span>
              </div>
            </div>
            <button className="w-full mt-4 border border-secondary/30 text-secondary font-label-md text-[10px] py-2 rounded-sm hover:bg-secondary/5 transition-all uppercase tracking-widest">
              {t("home.fullLeaderboard")}
            </button>
          </div>
          {/*  Player Statistics Widget  */}
          <div className={`flex flex-col gap-6 lg:col-span-7 ${activeStatsTab !== 'record' ? 'hidden lg:flex' : 'flex'}`}>
            <div className="home-stats-card glass-card rounded-xl h-full border-l-4 border-l-secondary p-4">
              <div className="flex items-center gap-3 mb-4">
                <span className="material-symbols-outlined text-secondary">
                  analytics
                </span>
                <h3 className="font-headline-md text-[20px] text-on-surface">
                  {t("home.serviceRecord")}
                </h3>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-end border-b border-white/5 pb-2">
                  <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-widest">
                    {t("home.rankTier")}
                  </span>
                  <span className="font-headline-md text-[18px] text-[#FFD700] glow-text">
                    Admiral IV
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-surface-container/30 p-4 rounded-sm border border-white/5">
                    <p className="text-[10px] text-on-surface-variant uppercase font-bold mb-1">
                      {t("home.totalEngagements")}
                    </p>
                    <p className="text-xl font-black text-on-surface">{stats.totalMatches}</p>
                  </div>
                  <div className="bg-surface-container/30 p-4 rounded-sm border border-white/5">
                    <p className="text-[10px] text-on-surface-variant uppercase font-bold mb-1">
                      {t("home.victories")}
                    </p>
                    <p className="text-xl font-black text-secondary">{stats.wins}</p>
                  </div>
                  <div className="bg-surface-container/30 p-4 rounded-sm border border-white/5">
                    <p className="text-[10px] text-on-surface-variant uppercase font-bold mb-1">
                      {t("home.defeats")}
                    </p>
                    <p className="text-xl font-black text-error">{stats.losses}</p>
                  </div>
                  <div className="bg-surface-container/30 p-4 rounded-sm border border-white/5">
                    <p className="text-[10px] text-on-surface-variant uppercase font-bold mb-1">
                      {t("home.winRate")}
                    </p>
                    <p className="text-xl font-black text-secondary">
                      {stats.totalMatches > 0 ? ((stats.wins / stats.totalMatches) * 100).toFixed(1) : 0}%
                    </p>
                  </div>
                </div>
                <div className="pt-4">
                  <div className="flex justify-between text-[10px] font-bold uppercase text-on-surface-variant mb-2">
                    <span>{t("home.xp")}</span>
                    <span>85%</span>
                  </div>
                  <div className="w-full h-2 bg-surface-container rounded-full overflow-hidden">
                    <div
                      className="h-full bg-secondary shadow-[0_0_10px_#a5e7ff]"
                      style={{ width: "85%" }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          </div>
        </section>
      </main>
      {/*  Background Decorative Elements  */}
      <div className="fixed inset-0 -z-50 pointer-events-none opacity-20">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-secondary/10 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-primary-container/20 rounded-full blur-[150px]"></div>
      </div>
    </div>
  );
}

export default Home;
