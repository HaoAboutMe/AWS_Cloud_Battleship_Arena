import { useEffect, useRef } from "react";
import Phaser from "phaser";
import { getRankMeta } from "../game/rankConfig";
import "./RankUpAnimation.css";

const buildRankUpScene = ({ oldRank, newRank, onComplete }) => {
  const oldMeta = getRankMeta(oldRank);
  const newMeta = getRankMeta(newRank);
  const burst = (scene, x, y, color) => {
    const emitter = scene.add.particles(x, y, "rankParticle", {
      speed: { min: 100, max: 250 },
      angle: { min: 0, max: 360 },
      lifespan: { min: 1000, max: 1500 },
      scale: { start: 0.95, end: 0 },
      alpha: { start: 0.95, end: 0 },
      tint: [0xffffff, color, 0x8feaff],
      gravityY: 50,
      blendMode: "ADD",
      emitting: false,
    });

    emitter.explode(40, x, y);
    scene.time.delayedCall(1650, () => emitter.destroy());
  };

  return class RankUpScene extends Phaser.Scene {
    constructor() {
      super("RankUpScene");
    }

    preload() {
      this.load.image("oldBadge", oldMeta.badge);
      this.load.image("newBadge", newMeta.badge);
    }

    create() {
      const { width, height } = this.scale;
      const centerX = width / 2;
      const centerY = height / 2 - 16;
      const newRankColor = Phaser.Display.Color.HexStringToColor(newMeta.color).color;

      const particleGraphic = this.make.graphics({ x: 0, y: 0, add: false });
      particleGraphic.fillStyle(0xffffff, 1);
      particleGraphic.fillCircle(4, 4, 4);
      particleGraphic.generateTexture("rankParticle", 8, 8);
      particleGraphic.destroy();

      this.cameras.main.setBackgroundColor("rgba(0, 8, 16, 0)");

      const radarCore = this.add.container(centerX, centerY);
      radarCore.setScale(0.94);
      radarCore.setAlpha(0.55);

      const ring = this.add.circle(0, 0, 170, 0x00d2ff, 0);
      ring.setStrokeStyle(2, 0x8feaff, 0.28);
      const ring2 = this.add.circle(0, 0, 115, 0x00d2ff, 0);
      ring2.setStrokeStyle(1, 0x8feaff, 0.36);
      const ring3 = this.add.circle(0, 0, 58, 0x00d2ff, 0);
      ring3.setStrokeStyle(1, 0x8feaff, 0.28);

      const sweep = this.add.graphics();
      sweep.fillStyle(0x8feaff, 0.2);
      sweep.slice(0, 0, 168, Phaser.Math.DegToRad(-18), Phaser.Math.DegToRad(26), false);
      sweep.lineTo(0, 0);
      sweep.closePath();
      sweep.fillPath();
      sweep.setAlpha(0.46);
      radarCore.add([ring, ring2, ring3, sweep]);

      const oldBadge = this.add.image(centerX, centerY, "oldBadge");
      oldBadge.setScale(0.88);
      oldBadge.setAlpha(1);

      const newBadge = this.add.image(centerX, centerY, "newBadge");
      newBadge.setScale(0.72);
      newBadge.setAlpha(0);

      const title = this.add.text(centerX, height - 112, "PROMOTED", {
        fontFamily: "Arial Black, Arial, sans-serif",
        fontSize: "34px",
        color: "#e8f8ff",
        letterSpacing: 4,
      });
      title.setOrigin(0.5);
      title.setAlpha(0);

      const subtitle = this.add.text(centerX, height - 70, `TO ${newMeta.label.toUpperCase()}`, {
        fontFamily: "Arial Black, Arial, sans-serif",
        fontSize: "20px",
        color: newMeta.color,
        letterSpacing: 3,
      });
      subtitle.setOrigin(0.5);
      subtitle.setAlpha(0);

      const fastSweep = this.tweens.add({
        targets: sweep,
        angle: 360,
        duration: 430,
        repeat: -1,
        ease: "Linear",
      });

      this.tweens.add({
        targets: [ring, ring2, ring3],
        scale: { from: 0.85, to: 1.08 },
        alpha: { from: 0.45, to: 0.2 },
        duration: 900,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });

      this.tweens.add({
        targets: radarCore,
        scale: 1,
        alpha: 0.95,
        duration: 520,
        ease: "Sine.easeOut",
      });

      this.tweens.add({
        targets: oldBadge,
        alpha: 0,
        scale: 0.42,
        angle: -8,
        duration: 720,
        ease: "Cubic.easeInOut",
        onComplete: () => {
          this.tweens.add({
            targets: newBadge,
            alpha: 1,
            scale: 1.18,
            duration: 520,
            ease: "Back.easeOut",
            onComplete: () => {
              burst(this, centerX, centerY, newRankColor);
              this.cameras.main.shake(90, 0.004);

              const shockwave = this.add.circle(centerX, centerY, 36, 0xffffff, 0);
              shockwave.setStrokeStyle(4, 0xffffff, 0.68);
              this.tweens.add({
                targets: shockwave,
                radius: Math.max(width, height) * 0.68,
                alpha: 0,
                duration: 420,
                ease: "Cubic.easeOut",
                onComplete: () => shockwave.destroy(),
              });

              for (let index = 0; index < 18; index += 1) {
                const sparkAngle = Phaser.Math.FloatBetween(0, Math.PI * 2);
                const startRadius = Phaser.Math.Between(62, 120);
                const spark = this.add.rectangle(
                  centerX + Math.cos(sparkAngle) * startRadius,
                  centerY + Math.sin(sparkAngle) * startRadius,
                  Phaser.Math.Between(18, 34),
                  2,
                  Phaser.Math.RND.pick([0xffffff, newRankColor, 0x8feaff]),
                  0.82,
                );
                spark.setRotation(sparkAngle);
                this.tweens.add({
                  targets: spark,
                  x: spark.x + Math.cos(sparkAngle) * Phaser.Math.Between(40, 100),
                  y: spark.y + Math.sin(sparkAngle) * Phaser.Math.Between(40, 100),
                  alpha: 0,
                  scaleX: 0.25,
                  duration: Phaser.Math.Between(460, 760),
                  ease: "Cubic.easeOut",
                  onComplete: () => spark.destroy(),
                });
              }

              fastSweep.stop();
              this.tweens.add({
                targets: sweep,
                angle: sweep.angle + 360,
                duration: 1450,
                repeat: -1,
                ease: "Linear",
              });

              this.tweens.add({
                targets: newBadge,
                scale: 1,
                angle: { from: -1.5, to: 0 },
                duration: 900,
                ease: "Back.easeOut",
              });
            },
          });
        },
      });

      this.tweens.add({
        targets: [title, subtitle],
        alpha: 1,
        y: "-=12",
        duration: 1000,
        delay: 1180,
        ease: "Sine.easeOut",
      });

      this.time.delayedCall(3550, () => {
        onComplete?.();
      });
    }
  };
};

function RankUpAnimation({ oldRank, newRank, onComplete }) {
  const containerRef = useRef(null);
  const gameRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return undefined;

    gameRef.current = new Phaser.Game({
      type: Phaser.AUTO,
      parent: containerRef.current,
      width: 560,
      height: 520,
      transparent: true,
      backgroundColor: "rgba(0,0,0,0)",
      scene: buildRankUpScene({ oldRank, newRank, onComplete }),
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
    });

    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, [newRank, oldRank, onComplete]);

  return (
    <div className="rank-up-overlay" role="dialog" aria-modal="true">
      <div className="rank-up-frame">
        <div ref={containerRef} className="rank-up-canvas" />
      </div>
    </div>
  );
}

export default RankUpAnimation;
