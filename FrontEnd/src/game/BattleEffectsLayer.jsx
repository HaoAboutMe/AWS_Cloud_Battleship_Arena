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

const playImpactRipple = (scene, x, y, intensity = 1) => {
    [0, 120, 250].forEach((delay, index) => {
        scene.time.delayedCall(delay, () => {
            const ripple = ring(
                scene,
                x,
                y,
                7 + (index * 2),
                index === 0 ? 0xa9efff : 0x4bb9d6,
                0.6 - (index * 0.1),
                index === 0 ? 2 : 1
            );
            ripple.setScale(0.35);
            tweenOut(scene, ripple, {
                scaleX: (3.6 + (index * 0.55)) * intensity,
                scaleY: (2.1 + (index * 0.3)) * intensity,
                alpha: 0,
                duration: 780 + (index * 170),
                ease: "Sine.easeOut",
            });
        });
    });
};

const playMiss = (scene, x, y) => {
    playImpactRipple(scene, x, y, 1);

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
    playImpactRipple(scene, x, y, compact ? 0.75 : 1.12);

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

const playSunkFinisher = (scene, cells, cellCenter) => {
    if (cells.length === 0) return;

    const centers = cells.map(cell => cellCenter(cell.row, cell.col));
    const x = centers.reduce((sum, point) => sum + point.x, 0) / centers.length;
    const y = centers.reduce((sum, point) => sum + point.y, 0) / centers.length;

    const flash = circle(scene, x, y, 18, 0xffd36a, 0.82);
    flash.setBlendMode("ADD");
    flash.setScale(0.25);
    tweenOut(scene, flash, {
        scale: 4.2,
        alpha: 0,
        duration: 520,
        ease: "Expo.easeOut",
    });

    [0, 130].forEach((delay, index) => {
        scene.time.delayedCall(delay, () => {
            const shockwave = ring(
                scene,
                x,
                y,
                12 + (index * 5),
                index === 0 ? 0xffb347 : 0xc8f4ff,
                0.95,
                index === 0 ? 4 : 2
            );
            shockwave.setBlendMode("ADD");
            shockwave.setScale(0.35);
            tweenOut(scene, shockwave, {
                scaleX: 5.2,
                scaleY: 3.2,
                alpha: 0,
                duration: 850 + (index * 170),
                ease: "Cubic.easeOut",
            });
        });
    });

    for (let index = 0; index < 18; index += 1) {
        const angle = rand(0, Math.PI * 2);
        const distance = randInt(28, 74);
        const ember = circle(
            scene,
            x,
            y,
            rand(1.2, 2.5),
            index % 3 === 0 ? 0xfff0a8 : 0xff6a24,
            1
        );
        ember.setBlendMode("ADD");
        tweenOut(scene, ember, {
            x: x + (Math.cos(angle) * distance),
            y: y + (Math.sin(angle) * distance) + randInt(4, 18),
            scale: 0.15,
            alpha: 0,
            duration: randInt(620, 1050),
            ease: "Cubic.easeOut",
        });
    }

    const burstPoints = centers.length > 1
        ? [centers[0], centers[centers.length - 1]]
        : [centers[0]];

    burstPoints.forEach((point, index) => {
        scene.time.delayedCall(110 + (index * 150), () => {
            const blast = circle(scene, point.x, point.y, 13, 0xff5a1f, 0.96);
            blast.setBlendMode("ADD");
            blast.setScale(0.18);
            tweenOut(scene, blast, {
                scale: 2.7,
                alpha: 0,
                duration: 620,
                ease: "Expo.easeOut",
            });

            const blastCore = circle(scene, point.x, point.y, 6, 0xffffd2, 1);
            blastCore.setBlendMode("ADD");
            tweenOut(scene, blastCore, {
                scale: 2.1,
                alpha: 0,
                duration: 330,
                ease: "Cubic.easeOut",
            });
        });
    });

    for (let index = 0; index < 14; index += 1) {
        const angle = rand(0, Math.PI * 2);
        const distance = randInt(34, 88);
        const debris = scene.add.rectangle(
            x,
            y,
            randInt(2, 5),
            randInt(3, 7),
            index % 3 === 0 ? 0xd86a2b : 0x25282b,
            0.95
        );
        debris.setAngle(randInt(0, 180));
        scene.tweens.add({
            targets: debris,
            x: x + (Math.cos(angle) * distance),
            y: y + (Math.sin(angle) * distance) + randInt(10, 28),
            angle: debris.angle + randInt(160, 420),
            scaleX: 0.25,
            scaleY: 0.25,
            alpha: 0,
            duration: randInt(720, 1180),
            ease: "Cubic.easeOut",
            onComplete: () => debris.destroy(),
        });
    }
};

const animateSinkingShip = (scene, boardSide, shipId, attempt = 0) => {
    const shipElement = document.querySelector(
        `[data-board-side="${boardSide}"][data-ship-id="${shipId}"]`
    );

    if (!shipElement) {
        if (attempt < 6) {
            scene.time.delayedCall(
                40,
                () => animateSinkingShip(scene, boardSide, shipId, attempt + 1)
            );
        }
        return;
    }

    const initialOpacity = Number.parseFloat(
        window.getComputedStyle(shipElement).opacity
    ) || 1;
    const state = { y: 0, scale: 1, opacity: initialOpacity };

    shipElement.classList.add("ship-is-sinking");
    shipElement.style.willChange = "transform, opacity";

    scene.tweens.add({
        targets: state,
        y: 9,
        scale: 0.94,
        opacity: 0.46,
        delay: 150,
        duration: 1750,
        ease: "Cubic.easeIn",
        onUpdate: () => {
            shipElement.style.transform = `translate3d(0, ${state.y}px, 0) scale(${state.scale})`;
            shipElement.style.opacity = String(state.opacity);
        },
        onComplete: () => {
            shipElement.classList.remove("ship-is-sinking");
            shipElement.style.willChange = "";
        },
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
    const wakeDeadlineRef = useRef(0);
    const smokeCellsRef = useRef([]);
    const smokeEventRef = useRef(null);

    const scheduleSleep = (scene) => {
        window.clearTimeout(sleepTimerRef.current);

        const remaining = Math.max(0, wakeDeadlineRef.current - Date.now());
        sleepTimerRef.current = window.setTimeout(() => {
            if (sceneRef.current !== scene) return;
            if (smokeCellsRef.current.length > 0) return;

            const nextRemaining = wakeDeadlineRef.current - Date.now();
            if (nextRemaining > 16) {
                scheduleSleep(scene);
                return;
            }

            wakeDeadlineRef.current = 0;
            scene.scene.sleep();
            scene.game.loop.sleep();
        }, remaining);
    };

    const wakeFor = (scene, duration) => {
        scene.game.loop.wake();
        scene.scene.wake();
        scene.game.loop.resetDelta?.();
        wakeDeadlineRef.current = Math.max(
            wakeDeadlineRef.current,
            Date.now() + duration
        );
        scheduleSleep(scene);
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
            wakeFor(scene, 2200);
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

            wakeDeadlineRef.current = 0;
            scene.game.loop.wake();
            scene.scene.wake();
            scene.game.loop.resetDelta?.();
            startPersistentSmoke(scene);
        }

        if (command.type === "hit") {
            wakeFor(scene, 8500);
            const { x, y } = cellCenter(command.row, command.col);
            playHit(scene, x, y);
            playLingeringSmoke(scene, x, y);
        }

        if (command.type === "sunk") {
            const cells = command.cells || [];
            wakeFor(scene, 10000);
            playSunkFinisher(scene, cells, cellCenter);
            cells.forEach((cell, index) => {
                const { x, y } = cellCenter(cell.row, cell.col);
                const delay = index * 150;
                scene.time.delayedCall(delay, () => playHit(scene, x, y, true));
                scene.time.delayedCall(
                    delay,
                    () => playLingeringSmoke(scene, x, y, true)
                );
                playBubbles(scene, x, y, delay + 280);
            });

            animateSinkingShip(scene, boardSide, command.shipId);
        }

        if (command.type === "banner") {
            const banner = document.querySelector(".sunk-announcement");
            if (!banner) return;

            wakeFor(scene, 2400);
            const state = { scale: 0.78, opacity: 0 };
            banner.style.willChange = "transform, opacity";
            banner.style.filter = "none";
            const updateBanner = () => {
                banner.style.transform = `translate(-50%, -50%) scale(${state.scale})`;
                banner.style.opacity = String(state.opacity);
            };
            const finishBanner = () => {
                scene.tweens.add({
                    targets: state,
                    scale: 0.96,
                    opacity: 0,
                    duration: 520,
                    ease: "Sine.easeIn",
                    onUpdate: updateBanner,
                    onComplete: () => {
                        banner.style.willChange = "";
                    },
                });
            };
            const holdBanner = () => {
                scene.tweens.add({
                    targets: state,
                    scale: 1,
                    opacity: 1,
                    duration: 1280,
                    ease: "Sine.easeInOut",
                    onUpdate: updateBanner,
                    onComplete: finishBanner,
                });
            };
            scene.tweens.add({
                targets: state,
                scale: 1.04,
                opacity: 1,
                duration: 360,
                ease: "Cubic.easeOut",
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
                antialias: false,
                pixelArt: false,
                roundPixels: true,
                fps: {
                    target: 60,
                    min: 30,
                    forceSetTimeOut: false,
                    smoothStep: true,
                },
                render: {
                    antialias: false,
                    antialiasGL: false,
                    roundPixels: true,
                },
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
            wakeDeadlineRef.current = 0;
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
