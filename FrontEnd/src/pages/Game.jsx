import { useEffect, useRef } from "react";
import Phaser from "phaser";
import GameConfig from "../game/GameConfig";
import { Link } from "react-router-dom";

function Game() {
    const gameRef = useRef(null);

    useEffect(() => {
        if (!gameRef.current) {
            GameConfig.parent = "game-container";
            gameRef.current = new Phaser.Game(GameConfig);
        }

        return () => {
            gameRef.current?.destroy(true);
            gameRef.current = null;
        };
    }, []);

    return (
        <div className="bg-background text-on-background font-body-md min-h-screen selection:bg-secondary/30">
            {/* TopNavBar */}
            <header className="w-full top-0 sticky z-50 border-b border-white/5 bg-surface/40 backdrop-blur-xl shadow-[0_0_20px_rgba(0,210,255,0.1)]">
                <div className="flex justify-between items-center w-full px-gutter max-w-[1440px] mx-auto h-12">
                    <div className="flex items-center gap-8">
                        <Link to="/" className="font-display-lg text-[24px] font-black text-secondary tracking-tighter uppercase hover:text-white transition-colors">
                            Cloud Battleship Arena
                        </Link>
                    </div>
                    <div className="flex items-center gap-4">
                        <Link to="/" className="material-symbols-outlined text-on-surface-variant hover:text-secondary active:scale-95 transition-all p-2 rounded-full hover:bg-white/5">
                            home
                        </Link>
                    </div>
                </div>
            </header>

            <main className="max-w-[1440px] mx-auto px-gutter py-6 overflow-hidden flex flex-col items-center">
                <h1 className="font-display-lg text-on-surface mb-6 leading-tight text-[32px] text-center">
                    Sector <span className="text-secondary glow-text">Command</span>
                </h1>
                
                <div className="glass-card p-4 md:p-8 rounded-xl flex justify-center shadow-2xl relative border-secondary/20 w-full max-w-fit">
                    {/* The Phaser Game Canvas will inject here */}
                    <div id="game-container" className="rounded-lg overflow-hidden border border-white/10 shadow-[0_0_30px_rgba(0,210,255,0.1)]"></div>
                </div>
            </main>
            
            {/* Background Decorative Elements */}
            <div className="fixed inset-0 -z-50 pointer-events-none opacity-20">
                <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-secondary/10 rounded-full blur-[120px] animate-pulse"></div>
                <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-primary-container/20 rounded-full blur-[150px]"></div>
            </div>
        </div>
    );
}

export default Game;