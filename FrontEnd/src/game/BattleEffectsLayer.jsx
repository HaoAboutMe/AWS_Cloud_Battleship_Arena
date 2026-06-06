import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

const rand = (min, max) => min + (Math.random() * (max - min));
const randInt = (min, max) => Math.floor(rand(min, max + 1));

const circle = (scene, x, y, radius, color, alpha = 1) => {
    const shape = scene.add.graphics();
    shape.fillStyle(color, alpha);
    shape.fillCircle(0, 0, radius);
    shape.setPosition(x, y);
    return shape;
};

const ring = (scene, x, y, radius, color, alpha = 1, width = 2) => {
    const shape = scene.add.graphics();
    shape.lineStyle(width, color, alpha);
    shape.strokeCircle(0, 0, radius);
    shape.setPosition(x, y);
    return shape;
};

const tweenOut = (scene, target, config) => {
    scene.tweens.add({
        targets: target,
        ...config,
        onComplete: () => target.destroy(),
    });
};

const playMiss = (scene, x, y) => {
    [0, 130].forEach((delay, index) => {
        const wave = ring(scene, x, y, 5, 0xcdf7ff, 0.95 - (index * 0.2), 2);
        wave.setScale(0.25);
        scene.time.delayedCall(delay, () => {
            tweenOut(scene, wave, {
                scaleX: 3.4,
                scaleY: 2.2,
                alpha: 0,
                duration: 900,
                ease: "Quad.easeOut",
            });
        });
    });

    const column = circle(scene, x, y + 5, 6, 0xdff9ff, 0.9);
    column.setScale(0.2, 0.1);
    tweenOut(scene, column, {
        y: y - 12,
        scaleX: 0.65,
        scaleY: 1.5,
        alpha: 0,
        duration: 300,
        ease: "Quad.easeOut",
    });

    for (let index = 0; index < 7; index += 1) {
        const angle = rand(-2.8, -0.35);
        const distance = randInt(12, 23);
        const drop = circle(scene, x, y, rand(1.2, 2.1), 0xeffcff, 0.95);
        tweenOut(scene, drop, {
            x: x + (Math.cos(angle) * distance),
            y: y + (Math.sin(angle) * distance),
            alpha: 0,
            duration: randInt(420, 560),
            ease: "Cubic.easeOut",
        });
    }
};

const playHit = (scene, x, y, compact = false) => {
    const wave = ring(scene, x, y, 6, 0xffd287, 0.95, 2);
    tweenOut(scene, wave, {
        scale: compact ? 2.6 : 3.5,
        alpha: 0,
        duration: compact ? 480 : 720,
        ease: "Cubic.easeOut",
    });

    const fireball = circle(scene, x, y, compact ? 11 : 15, 0xff6328, 0.95);
    fireball.setScale(0.15);
    tweenOut(scene, fireball, {
        scale: compact ? 1.2 : 1.45,
        alpha: 0,
        angle: 18,
        duration: compact ? 480 : 680,
        ease: "Back.easeOut",
    });

    const core = circle(scene, x - 2, y - 2, compact ? 5 : 8, 0xfff8ce, 1);
    core.setScale(0.2);
    tweenOut(scene, core, {
        scale: compact ? 1.2 : 1.6,
        alpha: 0,
        duration: compact ? 280 : 430,
        ease: "Expo.easeOut",
    });

    const sparkCount = compact ? 5 : 10;
    for (let index = 0; index < sparkCount; index += 1) {
        const angle = rand(0, Math.PI * 2);
        const distance = randInt(14, compact ? 25 : 36);
        const spark = circle(scene, x, y, rand(1, 2), index % 3 ? 0xff8c32 : 0xfff1a6, 1);
        tweenOut(scene, spark, {
            x: x + (Math.cos(angle) * distance),
            y: y + (Math.sin(angle) * distance),
            scale: 0.2,
            alpha: 0,
            duration: randInt(380, 680),
            ease: "Cubic.easeOut",
        });
    }

    for (let index = 0; index < (compact ? 2 : 4); index += 1) {
        const smoke = circle(
            scene,
            x + randInt(-5, 5),
            y + randInt(-1, 5),
            randInt(5, 8),
            index % 2 ? 0x252b30 : 0x555d63,
            0.72
        );
        smoke.setScale(0.35);
        scene.time.delayedCall(180 + (index * 90), () => {
            tweenOut(scene, smoke, {
                x: smoke.x + randInt(-8, 8),
                y: smoke.y - randInt(20, 34),
                scale: rand(1.1, 1.45),
                alpha: 0,
                duration: randInt(760, 1200),
                ease: "Sine.easeOut",
            });
        });
    }
};

const emitSmokePlume = (scene, x, y, compact = false) => {
    const puffCount = compact ? 2 : 3;

    for (let index = 0; index < puffCount; index += 1) {
        const smoke = circle(
            scene,
            x + randInt(-7, 7),
            y + randInt(-3, 4),
            randInt(compact ? 5 : 6, compact ? 8 : 10),
            index % 2 ? 0x171b1e : 0x3d4347,
            rand(0.52, 0.76)
        );
        smoke.setScale(rand(0.35, 0.55));

        tweenOut(scene, smoke, {
            x: smoke.x + randInt(-13, 13),
            y: smoke.y - randInt(28, 48),
            scale: rand(1.15, 1.65),
            alpha: 0,
            duration: randInt(1200, 1900),
            delay: index * 110,
            ease: "Sine.easeOut",
        });
    }
};

const emitPersistentSmoke = (scene, x, y) => {
    const smoke = circle(
        scene,
        x + randInt(-6, 6),
        y + randInt(-3, 3),
        randInt(5, 8),
        Math.random() > 0.45 ? 0x171b1e : 0x41484c,
        rand(0.48, 0.68)
    );
    smoke.setScale(rand(0.4, 0.58));

    tweenOut(scene, smoke, {
        x: smoke.x + randInt(-12, 12),
        y: smoke.y - randInt(30, 46),
        scale: rand(1.1, 1.5),
        alpha: 0,
        duration: randInt(1400, 2000),
        ease: "Sine.easeOut",
    });
};

const playLingeringSmoke = (scene, x, y, compact = false) => {
    [420, 1050, 1750, 2550, 3450, 4450, 5550].forEach((delay) => {
        scene.time.delayedCall(delay, () => emitSmokePlume(scene, x, y, compact));
    });
};

const playBubbles = (scene, x, y, delay) => {
    [0, 150].forEach((extraDelay, index) => {
        scene.time.delayedCall(delay + extraDelay, () => {
            const bubble = ring(scene, x + (index ? 12 : -12), y + 8, index ? 3 : 4, 0xd2f7ff, 0.9, 2);
            tweenOut(scene, bubble, {
                y: y - 24,
                scale: 1.25,
                alpha: 0,
                duration: 850,
                ease: "Sine.easeOut",
            });
        });
    });
};

const BattleEffectsLayer = forwardRef(function BattleEffectsLayer(
    { width, height, cellSize, cellGap, boardSide, smokeCells = [] },
    ref
) {
    const hostRef = useRef(null);
    const sceneRef = useRef(null);
    const gameRef = useRef(null);
    const queueRef = useRef([]);
    const sleepTimerRef = useRef(null);
    const smokeCellsRef = useRef([]);
    const smokeEventRef = useRef(null);

    const wakeFor = (scene, duration) => {
        scene.game.loop.wake();
        scene.scene.wake();
        window.clearTimeout(sleepTimerRef.current);
        sleepTimerRef.current = window.setTimeout(() => {
            if (sceneRef.current !== scene) return;
            if (smokeCellsRef.current.length > 0) return;
            scene.scene.sleep();
            scene.game.loop.sleep();
        }, duration);
    };

    const cellCenter = (row, col) => ({
        x: col * (cellSize + cellGap) + (cellSize / 2),
        y: row * (cellSize + cellGap) + (cellSize / 2),
    });

    const startPersistentSmoke = (scene) => {
        smokeEventRef.current?.remove(false);
        smokeEventRef.current = null;

        if (smokeCellsRef.current.length === 0) return;

        const emitAll = () => {
            smokeCellsRef.current.forEach((cell, index) => {
                scene.time.delayedCall(index * 55, () => {
                    if (!smokeCellsRef.current.some(
                        current => current.row === cell.row && current.col === cell.col
                    )) return;
                    const { x, y } = cellCenter(cell.row, cell.col);
                    emitPersistentSmoke(scene, x, y);
                });
            });
        };

        emitAll();
        smokeEventRef.current = scene.time.addEvent({
            delay: 1050,
            loop: true,
            callback: emitAll,
        });
    };

    const run = (command) => {
        const scene = sceneRef.current;
        if (!scene) {
            queueRef.current.push(command);
            return;
        }

        if (command.type === "miss") {
            wakeFor(scene, 1100);
            const { x, y } = cellCenter(command.row, command.col);
            playMiss(scene, x, y);
        }

        if (command.type === "sync-smoke") {
            smokeCellsRef.current = command.cells;
            window.clearTimeout(sleepTimerRef.current);

            if (command.cells.length === 0) {
                smokeEventRef.current?.remove(false);
                smokeEventRef.current = null;
                wakeFor(scene, 2100);
                return;
            }

            scene.game.loop.wake();
            scene.scene.wake();
            startPersistentSmoke(scene);
        }

        if (command.type === "hit") {
            wakeFor(scene, 8500);
            const { x, y } = cellCenter(command.row, command.col);
            playHit(scene, x, y);
            playLingeringSmoke(scene, x, y);
            scene.cameras.main.shake(160, 0.009);
        }

        if (command.type === "sunk") {
            const cells = command.cells || [];
            wakeFor(scene, 8500);
            cells.forEach((cell, index) => {
                const { x, y } = cellCenter(cell.row, cell.col);
                const delay = index * 150;
                scene.time.delayedCall(delay, () => playHit(scene, x, y, true));
                scene.time.delayedCall(delay, () => playLingeringSmoke(scene, x, y, true));
                playBubbles(scene, x, y, delay + 280);
            });

            const shipElement = document.querySelector(
                `[data-board-side="${boardSide}"][data-ship-id="${command.shipId}"]`
            );
            if (shipElement) {
                const state = { y: 0, scale: 1, opacity: 1 };
                scene.tweens.add({
                    targets: state,
                    y: 9,
                    scale: 0.94,
                    opacity: 0.46,
                    delay: 150,
                    duration: 1750,
                    ease: "Cubic.easeIn",
                    onUpdate: () => {
                        shipElement.style.transform = `translateY(${state.y}px) scale(${state.scale})`;
                        shipElement.style.opacity = String(state.opacity);
                    },
                });
            }
        }

        if (command.type === "banner") {
            const banner = document.querySelector(".sunk-announcement");
            if (!banner) return;

            wakeFor(scene, 2400);
            const state = { scale: 0.72, opacity: 0, blur: 7 };
            const updateBanner = () => {
                banner.style.transform = `translate(-50%, -50%) scale(${state.scale})`;
                banner.style.opacity = String(state.opacity);
                banner.style.filter = `blur(${state.blur}px)`;
            };
            const finishBanner = () => {
                scene.tweens.add({
                    targets: state,
                    scale: 0.96,
                    opacity: 0,
                    duration: 580,
                    ease: "Quad.easeIn",
                    onUpdate: updateBanner,
                });
            };
            const holdBanner = () => {
                scene.tweens.add({
                    targets: state,
                    scale: 1,
                    opacity: 1,
                    duration: 1350,
                    onUpdate: updateBanner,
                    onComplete: finishBanner,
                });
            };
            scene.tweens.add({
                targets: state,
                scale: 1.06,
                opacity: 1,
                blur: 0,
                duration: 420,
                ease: "Back.easeOut",
                onUpdate: updateBanner,
                onComplete: holdBanner,
            });
        }
    };

    useImperativeHandle(ref, () => ({
        playMiss(row, col) {
            run({ type: "miss", row, col });
        },
        playHit(row, col) {
            run({ type: "hit", row, col });
        },
        playSunk(cells, shipId) {
            run({ type: "sunk", cells, shipId });
        },
        animateBanner() {
            run({ type: "banner" });
        },
    }));

    const smokeSignature = smokeCells
        .map(cell => `${cell.row}:${cell.col}`)
        .sort()
        .join("|");

    useEffect(() => {
        run({ type: "sync-smoke", cells: smokeCells });
        // The signature prevents restarting emitters on unrelated React renders.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [smokeSignature]);

    useEffect(() => {
        let cancelled = false;

        import("phaser").then(({ default: Phaser }) => {
            if (cancelled || !hostRef.current) return;

            gameRef.current = new Phaser.Game({
                type: Phaser.CANVAS,
                width,
                height,
                parent: hostRef.current,
                transparent: true,
                banner: false,
                audio: { noAudio: true },
                fps: { target: 30, min: 15, forceSetTimeOut: true },
                scene: {
                    create() {
                        sceneRef.current = this;
                        const commands = queueRef.current;
                        queueRef.current = [];
                        if (commands.length === 0) {
                            this.scene.sleep();
                            this.game.loop.sleep();
                            return;
                        }
                        commands.forEach(run);
                    },
                },
            });
        });

        return () => {
            cancelled = true;
            window.clearTimeout(sleepTimerRef.current);
            smokeEventRef.current?.remove(false);
            smokeEventRef.current = null;
            smokeCellsRef.current = [];
            sceneRef.current = null;
            queueRef.current = [];
            gameRef.current?.destroy(true);
            gameRef.current = null;
        };
        // The Phaser instance only needs rebuilding when its canvas dimensions change.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [height, width]);

    return <div ref={hostRef} className="phaser-battle-effects" aria-hidden="true" />;
});

export default BattleEffectsLayer;
