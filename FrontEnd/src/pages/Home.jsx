import { Link } from "react-router-dom";
import { useEffect, useState } from "react";

function Home() {
  const [isLightMode, setIsLightMode] = useState(false);
  const [botDifficulty, setBotDifficulty] = useState("easy");

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
    // Subtle mouse tracking glow effect for cards
    const cards = document.querySelectorAll(".glass-card");
    const handleMouseMove = (e) => {
      const card = e.currentTarget;
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      card.style.setProperty("--mouse-x", `${x}px`);
      card.style.setProperty("--mouse-y", `${y}px`);
      card.style.background = `radial-gradient(400px circle at ${x}px ${y}px, rgba(165, 231, 255, 0.05), transparent 40%)`;
    };

    const handleMouseLeave = (e) => {
      e.currentTarget.style.background = "rgba(18, 33, 49, 0.4)";
    };

    cards.forEach((card) => {
      card.addEventListener("mousemove", handleMouseMove);
      card.addEventListener("mouseleave", handleMouseLeave);
    });

    return () => {
      cards.forEach((card) => {
        card.removeEventListener("mousemove", handleMouseMove);
        card.removeEventListener("mouseleave", handleMouseLeave);
      });
    };
  }, []);

  return (
    <div className="bg-background text-on-background font-body-md min-h-screen selection:bg-secondary/30">
      {/*  TopNavBar  */}
      <header className="w-full top-0 sticky z-50 border-b border-white/5 bg-surface/40 backdrop-blur-xl shadow-[0_0_20px_rgba(0,210,255,0.1)]">
        <div className="flex justify-between items-center w-full px-gutter max-w-[1440px] mx-auto h-12">
          <div className="flex items-center gap-8">
            <span className="font-display-lg text-[24px] font-black text-secondary tracking-tighter uppercase">
              Cloud Battleship Arena
            </span>
            <nav className="hidden md:flex gap-6 items-center">
              <a
                className="font-label-md text-label-md text-secondary border-b-2 border-secondary pb-1 transition-all"
                href="#"
              >
                Home
              </a>
              <a
                className="font-label-md text-label-md text-on-surface-variant hover:text-secondary transition-colors transition-all"
                href="#"
              >
                Leaderboard
              </a>
              <a
                className="font-label-md text-label-md text-on-surface-variant hover:text-secondary transition-colors transition-all"
                href="#"
              >
                Profile
              </a>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={toggleTheme}
              className="material-symbols-outlined text-on-surface-variant hover:text-secondary active:scale-95 transition-all p-2 rounded-full hover:bg-white/5"
            >
              {isLightMode ? 'dark_mode' : 'light_mode'}
            </button>
            <button className="material-symbols-outlined text-on-surface-variant hover:text-secondary active:scale-95 transition-all p-2 rounded-full hover:bg-white/5">
              notifications
            </button>
            <button className="material-symbols-outlined text-on-surface-variant hover:text-secondary active:scale-95 transition-all p-2 rounded-full hover:bg-white/5">
              settings
            </button>
            <div className="flex items-center gap-3 pl-4 border-l border-white/10">
              <div className="text-right">
                <p className="font-label-md text-label-md text-on-surface">
                  Commander
                </p>
                <span className="text-[10px] font-bold text-[#FFD700] uppercase tracking-widest bg-[#FFD700]/10 px-1.5 py-0.5 rounded-sm">
                  Admiral
                </span>
              </div>
              <img
                alt="User profile with rank badge"
                className="w-10 h-10 rounded-full border border-secondary/30 p-0.5 bg-surface-container"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBaat_LefR8zmWVQ9CHx0bp9dTekwkF9c9AQAo9FxlAx2bSsRi_lWU3tRBK1vdpC50zM3NdKJAB5hHd5ZusN0HuCxBcpe1IbzSlreCalSVomkgeQwYwz9iKrXYvj55d42PgtFMDfCUosVO6NBFPXtM_vVCTYDxnC7xz1DxkbcIvRSfpehGpD-kbu7XuQbuktassmbGVExYQy0GTNC_jJHX3hmbFNDIdyfqO5-uwHYbgPtFdacF4kVhq0AnscPv4dWSz-e_6DYUDMSxe"
              />
            </div>
          </div>
        </div>
      </header>
      <main className="max-w-[1440px] mx-auto px-gutter pb-6 overflow-hidden flex flex-col gap-6">
        {/*  Hero Section  */}
        <section className="relative flex flex-col md:flex-row items-center gap-8 overflow-hidden py-2">
          <div className="flex-1 z-10">
            <h1 className="font-display-lg text-on-surface mb-2 leading-tight text-[32px]">
              Command your <span className="text-secondary glow-text">fleet.</span>
              <br />
              Outsmart your enemies.
            </h1>
            <p className="font-body-lg text-on-surface-variant max-w-xl text-sm mb-4">
              Experience the next generation of strategic naval warfare. Deploy
              your armada across the cloud-bound ocean and dominate the
              leaderboard in high-stakes tactical combat.
            </p>
            <div className="flex gap-4">
              <button className="bg-secondary text-on-secondary-fixed font-label-md text-label-md px-8 py-3 rounded-sm hover:bg-secondary-container transition-all active:scale-95 flex items-center gap-2">
                <span
                  className="material-symbols-outlined text-[18px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  rocket_launch
                </span>
                START MISSION
              </button>
              <button className="border border-secondary/50 text-secondary font-label-md text-label-md px-8 py-3 rounded-sm hover:bg-secondary/5 transition-all active:scale-95">
                LEARN TACTICS
              </button>
            </div>
          </div>
          <div className="flex-1 relative">
            <div className="absolute inset-0 ocean-wave -z-10 animate-pulse"></div>
            <img
              alt="Tactical naval combat view from above with neon ships and radar sweeps"
              className="w-56 h-auto ml-auto drop-shadow-[0_0_50px_rgba(0,210,255,0.2)] rounded-xl transform hover:scale-105 transition-transform duration-700"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuB1yTSkvD5vp5gcRLUr8zR_w8VZ0l7fR_f1CecqhdDez07y_DahvV-W3SraDfp39kdhNRrldcW-qs7SVQuv-z2zg-i7iht-ATRqpri4Pwf4egVN3npAuHUqi-qIFlJV4qLAVmDWC3FMzkha-vo2EuAwguKQEkqVxGD88JsoYr6ADKrsWRtGYJrzKI60w-L3en7RhnXByJql8W_2WWw269Mdavu_pIUOYWj8FXkYzz3EaPooWH2A5xyNitffhU_CIvVrZidsrEvFFhd7"
            />
          </div>
        </section>
        {/*  Game Modes Section  */}
        <section className="">
          <div className="flex items-center gap-3 mb-4">
            <span className="material-symbols-outlined text-secondary">
              grid_view
            </span>
            <h2 className="font-headline-md text-headline-md text-on-surface uppercase tracking-tight">
              Deployment Modes
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/*  Mode 1: Play vs Bot  */}
            <div className="glass-card p-8 rounded-xl flex flex-col group h-full">
              <div className="mb-6 w-12 h-12 flex items-center justify-center bg-secondary/10 rounded-lg text-secondary group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-3xl">
                  smart_toy
                </span>
              </div>
              <h3 className="font-title-lg text-title-lg text-on-surface mb-2">
                Play vs Bot
              </h3>
              <p className="font-body-md text-body-md text-on-surface-variant mb-8 flex-grow">
                Sharpen your strategic edge against our advanced tactical AI.
                Choose from Recruit to Elite difficulty levels.
              </p>
              <div className="flex flex-col gap-4">
                <div className="flex gap-2">
                  <span className="text-[10px] px-2 py-1 bg-surface-container text-on-surface-variant font-bold uppercase rounded-sm border border-white/5">
                    AI Opponent
                  </span>
                  <span className="text-[10px] px-2 py-1 bg-surface-container text-on-surface-variant font-bold uppercase rounded-sm border border-white/5">
                    Practice
                  </span>
                </div>
                
                <div className="flex flex-col gap-2 mb-1">
                  <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">Select Difficulty:</span>
                  <select 
                    value={botDifficulty} 
                    onChange={(e) => setBotDifficulty(e.target.value)}
                    className="bg-surface-container/50 text-secondary font-label-md p-2 rounded-sm border border-secondary/20 outline-none focus:border-secondary transition-colors cursor-pointer"
                  >
                    <option value="easy">Recruit (Easy)</option>
                    <option value="normal">Veteran (Normal)</option>
                    <option value="hard">Elite (Hard)</option>
                  </select>
                </div>

                <Link to={`/game?mode=pve&difficulty=${botDifficulty}`} className="w-full block">
                  <button className="w-full bg-secondary text-on-secondary-fixed font-label-md text-label-md py-3 rounded-sm hover:bg-secondary-container transition-all active:scale-95 tracking-widest">
                    BATTLE NOW
                  </button>
                </Link>
              </div>
            </div>
            {/*  Mode 2: Play vs Player  */}
            <div className="glass-card p-6 rounded-xl flex flex-col group h-full border-secondary/20 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-2">
                <span className="text-[10px] bg-secondary text-on-secondary-fixed px-2 py-0.5 font-black uppercase rounded-bl-sm">
                  Competitive
                </span>
              </div>
              <div className="mb-4 w-12 h-12 flex items-center justify-center bg-secondary/10 rounded-lg text-secondary group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-3xl">groups</span>
              </div>
              <h3 className="font-title-lg text-title-lg text-on-surface mb-2">
                Play vs Player
              </h3>
              <p className="font-body-md text-body-md text-on-surface-variant mb-4 flex-grow">
                Match against global commanders in real-time ranked battles.
                Climb the tiers and claim your glory.
              </p>
              <div className="flex flex-col gap-4">
                <div className="flex gap-2">
                  <span className="text-[10px] px-2 py-1 bg-secondary/20 text-secondary font-bold uppercase rounded-sm border border-secondary/20">
                    Online Matchmaking
                  </span>
                </div>
                <button 
                  onClick={() => alert("This mode is under development.")}
                  className="w-full bg-secondary opacity-50 cursor-not-allowed text-on-secondary-fixed font-label-md text-label-md py-3 rounded-sm hover:bg-secondary-container transition-all active:scale-95 tracking-widest"
                >
                  JOIN QUEUE
                </button>
              </div>
            </div>
            {/*  Mode 3: Create Private Room  */}
            <div className="glass-card p-6 rounded-xl flex flex-col group h-full">
              <div className="mb-4 w-12 h-12 flex items-center justify-center bg-secondary/10 rounded-lg text-secondary group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-3xl">
                  key
                </span>
              </div>
              <h3 className="font-title-lg text-title-lg text-on-surface mb-2">
                Private Room
              </h3>
              <p className="font-body-md text-body-md text-on-surface-variant mb-4 flex-grow">
                Host a custom engagement with friends. Share a secure room code
                and define your own naval rules.
              </p>
              <div className="flex flex-col gap-4">
                <div className="flex gap-2">
                  <span className="text-[10px] px-2 py-1 bg-surface-container text-on-surface-variant font-bold uppercase rounded-sm border border-white/5">
                    Custom Match
                  </span>
                </div>
                <button 
                  onClick={() => alert("This mode is under development.")}
                  className="w-full bg-transparent opacity-50 cursor-not-allowed border border-secondary text-secondary font-label-md text-label-md py-3 rounded-sm hover:bg-secondary/10 transition-all active:scale-95 tracking-widest"
                >
                  CREATE ROOM
                </button>
              </div>
            </div>
          </div>
        </section>
        {/*  Secondary Content Row  */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/*  Leaderboard Preview  */}
          <div className="lg:col-span-5 glass-card p-4 rounded-xl">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-secondary">
                  emoji_events
                </span>
                <h3 className="font-headline-md text-[18px] text-on-surface uppercase tracking-tight">
                  Top 3 Commanders
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
              View Full Leaderboard
            </button>
          </div>
          {/*  Player Statistics Widget  */}
          <div className="flex flex-col gap-6 lg:col-span-7">
            <div className="glass-card rounded-xl h-full border-l-4 border-l-secondary p-4">
              <div className="flex items-center gap-3 mb-4">
                <span className="material-symbols-outlined text-secondary">
                  analytics
                </span>
                <h3 className="font-headline-md text-[20px] text-on-surface">
                  Service Record
                </h3>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-end border-b border-white/5 pb-2">
                  <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-widest">
                    Rank Tier
                  </span>
                  <span className="font-headline-md text-[18px] text-[#FFD700] glow-text">
                    Admiral IV
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-surface-container/30 p-4 rounded-sm border border-white/5">
                    <p className="text-[10px] text-on-surface-variant uppercase font-bold mb-1">
                      Total Engagements
                    </p>
                    <p className="text-xl font-black text-on-surface">1,248</p>
                  </div>
                  <div className="bg-surface-container/30 p-4 rounded-sm border border-white/5">
                    <p className="text-[10px] text-on-surface-variant uppercase font-bold mb-1">
                      Victories
                    </p>
                    <p className="text-xl font-black text-secondary">848</p>
                  </div>
                  <div className="bg-surface-container/30 p-4 rounded-sm border border-white/5">
                    <p className="text-[10px] text-on-surface-variant uppercase font-bold mb-1">
                      Defeats
                    </p>
                    <p className="text-xl font-black text-error">400</p>
                  </div>
                  <div className="bg-surface-container/30 p-4 rounded-sm border border-white/5">
                    <p className="text-[10px] text-on-surface-variant uppercase font-bold mb-1">
                      Win Rate
                    </p>
                    <p className="text-xl font-black text-secondary">68.0%</p>
                  </div>
                </div>
                <div className="pt-4">
                  <div className="flex justify-between text-[10px] font-bold uppercase text-on-surface-variant mb-2">
                    <span>XP to Next Rank</span>
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
