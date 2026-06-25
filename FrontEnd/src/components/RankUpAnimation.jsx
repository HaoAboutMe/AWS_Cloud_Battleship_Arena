import { useEffect, useRef } from "react";
import Phaser from "phaser";
import { getRankMeta } from "../game/rankConfig";
import { playSound } from "../services/soundService";
import "./RankUpAnimation.css";

/* ─── Per-rank FX config ──────────────────────────────────────────────────── */
const RANK_FX = {
  bronze:   { primary: 0xd4874a, secondary: 0xff9c55, glow: "#d4874a",  embers: true,  lightning: false, beam: false,  vortex: false, count: 36 },
  silver:   { primary: 0xdce8f2, secondary: 0x88c0d8, glow: "#cfd8e3",  embers: false, lightning: false, beam: false,  vortex: false, count: 44 },
  gold:     { primary: 0xffd84a, secondary: 0xffb830, glow: "#f7c948",  embers: true,  lightning: false, beam: false,  vortex: false, count: 56 },
  platinum: { primary: 0x4fd1c5, secondary: 0x00e5d8, glow: "#4fd1c5",  embers: false, lightning: true,  beam: false,  vortex: false, count: 64 },
  diamond:  { primary: 0x7dd3fc, secondary: 0xb57bff, glow: "#7dd3fc",  embers: false, lightning: true,  beam: false,  vortex: true,  count: 72 },
  master:   { primary: 0xb57bff, secondary: 0xff5fd8, glow: "#a78bfa",  embers: false, lightning: true,  beam: true,   vortex: false, count: 82 },
  admiral:  { primary: 0xff4d6d, secondary: 0xff9f45, glow: "#ff4d6d",  embers: true,  lightning: true,  beam: true,   vortex: false, count: 95 },
};

/* ─── Scene builder ───────────────────────────────────────────────────────── */
const buildRankUpScene = ({ hasOldRank, oldRank, newRank, onComplete }) => {
  const oldMeta = hasOldRank ? getRankMeta(oldRank) : null;
  const newMeta = getRankMeta(newRank || "bronze");
  const fx      = RANK_FX[newMeta.id] || RANK_FX.bronze;

  return class RankUpScene extends Phaser.Scene {
    constructor() { super("RankUpScene"); }

    preload() {
      if (oldMeta) this.load.image("oldBadge", oldMeta.badge);
      this.load.image("newBadge", newMeta.badge);
    }

    create() {
      const { width, height } = this.scale;
      const cx = width  / 2;
      const cy = height / 2 - 20;

      this.cameras.main.setBackgroundColor("rgba(0,0,0,0)");
      this._makeTextures();

      /* Layers (back → front) */
      this._addSmoke(cx, cy);
      const rays = this._addRays(cx, cy, width, height);
      const { ringContainer, rings } = this._addRings(cx, cy);
      const halo = this._addHalo(cx, cy);

      const oldBadge = oldMeta
        ? this.add.image(cx, cy, "oldBadge").setScale(0.88).setAlpha(1)
        : null;

      const newBadge = this.add.image(cx, cy, "newBadge").setScale(0.55).setAlpha(0);

      const texts = this._addTexts(cx, height);

      /* Bring rings/halo in front of badges */
      this.children.bringToTop(halo);

      /* Run sequence */
      if (hasOldRank && oldBadge) {
        this._sequenceWithOld({ cx, cy, width, height, oldBadge, newBadge, halo, rings, ringContainer, rays, texts });
      } else {
        this._sequenceFirstRank({ cx, cy, width, height, newBadge, halo, rings, ringContainer, rays, texts });
      }
    }

    /* ── Texture generation ── */
    _makeTextures() {
      const dot = this.make.graphics({ add: false });
      dot.fillStyle(0xffffff).fillCircle(6, 6, 6);
      dot.generateTexture("pt_dot", 12, 12); dot.destroy();

      const star = this.make.graphics({ add: false });
      star.fillStyle(0xffffff).fillRect(5, 0, 6, 16).fillRect(0, 5, 16, 6);
      star.generateTexture("pt_star", 16, 16); star.destroy();

      const line = this.make.graphics({ add: false });
      line.fillStyle(0xffffff).fillRect(0, 0, 32, 2);
      line.generateTexture("pt_line", 32, 2); line.destroy();

      const ember = this.make.graphics({ add: false });
      ember.fillStyle(0xffffff).fillTriangle(4, 0, 0, 10, 8, 10);
      ember.generateTexture("pt_ember", 8, 10); ember.destroy();
    }

    /* ── Smoke ── */
    _addSmoke(cx, cy) {
      const smokeColor = RANK_FX[newMeta.id]?.vortex ? 0x200044 : 0x081828;
      for (let i = 0; i < 4; i++) {
        const g = this.add.ellipse(
          Phaser.Math.Between(cx - 160, cx + 160),
          Phaser.Math.Between(cy + 50, cy + 180),
          Phaser.Math.Between(200, 380), Phaser.Math.Between(60, 130),
          smokeColor, Phaser.Math.FloatBetween(0.05, 0.12),
        );
        this.tweens.add({
          targets: g, x: g.x + Phaser.Math.Between(-20, 20),
          scaleX: { from: 1, to: 1.3 }, scaleY: { from: 1, to: 0.75 },
          alpha: { from: g.alpha, to: g.alpha * 0.3 },
          duration: Phaser.Math.Between(3000, 5500),
          yoyo: true, repeat: -1, ease: "Sine.easeInOut",
          delay: Phaser.Math.Between(0, 1000),
        });
      }
    }

    /* ── Light rays ── */
    _addRays(cx, cy, width, height) {
      const c = this.add.container(cx, cy).setAlpha(0);
      const n = 8;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const L = Math.max(width, height) * 0.80;
        c.add(this.add.triangle(
          0, 0,
          0, 0,
          Math.cos(a - 0.03) * L, Math.sin(a - 0.03) * L,
          Math.cos(a + 0.03) * L, Math.sin(a + 0.03) * L,
          fx.primary, 0.035,
        ));
      }
      this.tweens.add({ targets: c, angle: 360, duration: 45000, repeat: -1, ease: "Linear" });
      return c;
    }

    /* ── Rings ── */
    _addRings(cx, cy) {
      const ringContainer = this.add.container(cx, cy).setAlpha(0).setScale(0.5);
      const rings = [180, 128, 76, 44].map((r, i) => {
        const ring = this.add.circle(0, 0, r, 0, 0).setStrokeStyle(1.5, fx.primary, 0.32);
        ringContainer.add(ring);
        this.tweens.add({
          targets: ring,
          scale: { from: 0.88, to: 1.12 }, alpha: { from: 0.42, to: 0.08 },
          duration: 1100, yoyo: true, repeat: -1,
          delay: i * 170, ease: "Sine.easeInOut",
        });
        return ring;
      });
      return { ringContainer, rings };
    }

    /* ── Halo ── */
    _addHalo(cx, cy) {
      const h = this.add.circle(cx, cy, 115, fx.primary, 0).setAlpha(0);
      return h;
    }

    /* ── Texts ── */
    _addTexts(cx, height) {
      const shared = {
        fontFamily: "'Arial Black', Impact, sans-serif",
        shadow: { offsetX: 0, offsetY: 0, color: fx.glow, blur: 24, fill: true },
      };
      const title = this.add.text(cx, height - 118, "✦  PROMOTED  ✦", {
        ...shared, fontSize: "28px", color: "#ffffff", letterSpacing: 6,
      }).setOrigin(0.5).setAlpha(0);

      const sub = this.add.text(cx, height - 76, `TO  ${newMeta.label.toUpperCase()}`, {
        ...shared, fontSize: "22px", color: fx.glow, letterSpacing: 5,
      }).setOrigin(0.5).setAlpha(0);

      const vi = this.add.text(cx, height - 44, newMeta.viLabel.toUpperCase(), {
        fontFamily: "'Arial', sans-serif", fontSize: "12px",
        color: "rgba(200,225,245,0.55)", letterSpacing: 9,
      }).setOrigin(0.5).setAlpha(0);

      return { title, sub, vi };
    }

    /* ════════════════════════════════════════════════
       SEQUENCE A – First ever rank (no old badge)
       Dramatic "materialise from void" entrance
    ════════════════════════════════════════════════ */
    _sequenceFirstRank({ cx, cy, width, height, newBadge, halo, rings, ringContainer, rays, texts }) {
      /* Rings + rays fade in slowly */
      this.tweens.add({ targets: [ringContainer, rays], alpha: 1, scale: 1, duration: 700, ease: "Sine.easeOut" });

      /* Badge materialises: scale 0 → 1.25 → 1 with glow */
      this.tweens.add({
        targets: newBadge,
        alpha: { from: 0, to: 1 },
        scale: { from: 0.05, to: 1.25 },
        duration: 800,
        ease: "Back.easeOut",
        delay: 300,
        onStart: () => {
          /* Halo brightens as badge appears */
          this.tweens.add({
            targets: halo, alpha: 0.28, scale: { from: 0.5, to: 1.5 },
            duration: 700, ease: "Quad.easeOut",
          });
        },
        onComplete: () => {
          /* Settle */
          this.tweens.add({ targets: newBadge, scale: 1.0, duration: 320, ease: "Back.easeOut" });
          /* Camera flash */
          this.cameras.main.flash(280, 255, 255, 255, false, null, null, 0.25);
          /* Idle float */
          this.tweens.add({ targets: newBadge, y: "-=10", duration: 2000, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
          /* Halo pulse */
          this.tweens.add({ targets: halo, alpha: { from: 0.12, to: 0.04 }, scale: { from: 1, to: 1.6 }, duration: 1400, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });

          /* Particles */
          this._burst(cx, cy);
          this._radialSparks(cx, cy);
          if (fx.lightning)  this._lightning(cx, cy);
          if (fx.beam)       this._beam(cx, cy, height);
          if (fx.vortex)     this._vortex(cx, cy);
          if (fx.embers)     this._embers(cx, cy);

          rings.forEach(r => r.setStrokeStyle(1.5, fx.secondary, 0.48));

          /* Text stagger */
          this._showTexts(texts);
        },
      });

      this.time.delayedCall(4200, () => onComplete?.());
    }

    /* ════════════════════════════════════════════════
       SEQUENCE B – Normal promotion (has old badge)
       Old badge trembles → implodes → new badge springs in
    ════════════════════════════════════════════════ */
    _sequenceWithOld({ cx, cy, width, height, oldBadge, newBadge, halo, rings, ringContainer, rays, texts }) {
      /* Rings + rays fade in */
      this.tweens.add({ targets: [ringContainer, rays], alpha: 1, scale: 1, duration: 600, ease: "Sine.easeOut" });

      /* Phase 1 – old badge trembles */
      this.time.delayedCall(350, () => {
        this._tremble(oldBadge, () => {
          /* Phase 2 – implode old badge */
          this.tweens.add({
            targets: oldBadge,
            alpha: 0, scale: 0.25,
            duration: 520,
            ease: "Cubic.easeIn",
            onComplete: () => this._revealNew({ cx, cy, width, height, newBadge, halo, rings, rays, texts }),
          });
        });
      });

      this.time.delayedCall(4600, () => onComplete?.());
    }

    /* Tremble helper – small rapid oscillation */
    _tremble(target, onDone) {
      let count = 0;
      const max = 5;
      const shake = () => {
        if (count >= max) { target.setAngle(0); onDone(); return; }
        count++;
        const dir = count % 2 === 0 ? 3 : -3;
        this.tweens.add({
          targets: target, angle: dir, x: target.x + (count % 2 === 0 ? 3 : -3),
          duration: 55, ease: "Linear",
          onComplete: shake,
        });
      };
      shake();
    }

    /* Reveal new badge after old is gone */
    _revealNew({ cx, cy, width, height, newBadge, halo, rings, rays, texts }) {
      /* Flash */
      this.cameras.main.flash(200, 255, 255, 255, false, null, null, 0.20);

      /* Shockwave */
      this._shockwave(cx, cy, width, height);

      /* Halo on */
      this.tweens.add({ targets: halo, alpha: 0.30, scale: { from: 0.4, to: 1.4 }, duration: 500, ease: "Quad.easeOut" });

      /* Badge spring in */
      this.tweens.add({
        targets: newBadge,
        alpha: 1,
        scale: { from: 0.3, to: 1.28 },
        duration: 580,
        ease: "Back.easeOut",
        onComplete: () => {
          this.tweens.add({ targets: newBadge, scale: 1.0, duration: 300, ease: "Back.easeOut" });
          this.tweens.add({ targets: newBadge, y: "-=10", duration: 2000, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
          this.tweens.add({ targets: halo, alpha: { from: 0.12, to: 0.04 }, scale: { from: 1, to: 1.6 }, duration: 1400, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
          this.cameras.main.shake(100, 0.005);

          this._burst(cx, cy);
          this._radialSparks(cx, cy);
          if (fx.lightning)  this._lightning(cx, cy);
          if (fx.beam)       this._beam(cx, cy, height);
          if (fx.vortex)     this._vortex(cx, cy);
          if (fx.embers)     this._embers(cx, cy);

          rings.forEach(r => r.setStrokeStyle(1.5, fx.secondary, 0.48));
          this.tweens.add({ targets: rays, alpha: 0.40, duration: 400, ease: "Quad.easeOut", yoyo: true, hold: 300 });

          this._showTexts(texts);
        },
      });
    }

    /* ── Shockwave ── */
    _shockwave(cx, cy, width, height) {
      [{ r: 28, w: 5, a: 0.85, d: 540 }, { r: 18, w: 2, a: 0.55, d: 380 }].forEach(({ r, w, a, d }) => {
        const sw = this.add.circle(cx, cy, r, 0, 0).setStrokeStyle(w, fx.secondary, a);
        this.tweens.add({
          targets: sw,
          scale: Math.max(width, height) * 0.7 / r,
          alpha: 0, duration: d, ease: "Cubic.easeOut",
          onComplete: () => sw.destroy(),
        });
      });
    }

    /* ── Burst particles ── */
    _burst(cx, cy) {
      const colors = [0xffffff, fx.primary, fx.secondary];
      ["pt_dot", "pt_star"].forEach((key, i) => {
        const em = this.add.particles(cx, cy, key, {
          speed: { min: 70, max: i === 0 ? 280 : 180 },
          angle: { min: 0, max: 360 },
          lifespan: { min: 800, max: 1600 },
          scale: { start: 0.85, end: 0 },
          alpha: { start: 1, end: 0 },
          tint: colors,
          gravityY: 80,
          blendMode: "ADD",
          emitting: false,
        });
        em.explode(i === 0 ? fx.count : Math.floor(fx.count * 0.35), cx, cy);
        this.time.delayedCall(2000, () => em.destroy());
      });
    }

    /* ── Radial sparks ── */
    _radialSparks(cx, cy) {
      const n = 20 + Math.floor(fx.count / 5);
      for (let i = 0; i < n; i++) {
        const a   = (i / n) * Math.PI * 2 + Phaser.Math.FloatBetween(-0.12, 0.12);
        const r0  = Phaser.Math.Between(50, 100);
        const r1  = r0 + Phaser.Math.Between(55, 150);
        const col = Phaser.Math.RND.pick([0xffffff, fx.primary, fx.secondary]);
        const s   = this.add.rectangle(
          cx + Math.cos(a) * r0, cy + Math.sin(a) * r0,
          Phaser.Math.Between(16, 36), 2.5, col, 0.88,
        ).setRotation(a);
        this.tweens.add({
          targets: s,
          x: cx + Math.cos(a) * r1, y: cy + Math.sin(a) * r1,
          alpha: 0, scaleX: 0.15,
          duration: Phaser.Math.Between(380, 750), ease: "Cubic.easeOut",
          onComplete: () => s.destroy(),
        });
      }
    }

    /* ── Embers (bronze / gold / admiral) ── */
    _embers(cx, cy) {
      const em = this.add.particles(cx, cy - 30, "pt_ember", {
        speed: { min: 30, max: 90 },
        angle: { min: 240, max: 300 },
        lifespan: { min: 1200, max: 2200 },
        scale: { start: 0.9, end: 0 },
        alpha: { start: 0.9, end: 0 },
        tint: [fx.primary, fx.secondary, 0xffdd88],
        blendMode: "ADD",
        frequency: 60,
        quantity: 2,
      });
      this.time.delayedCall(2000, () => em.stop());
      this.time.delayedCall(4000, () => em.destroy());
    }

    /* ── Lightning (platinum / diamond / master / admiral) ── */
    _lightning(cx, cy) {
      const boltCount = fx.beam ? 10 : 6;
      for (let b = 0; b < boltCount; b++) {
        this.time.delayedCall(b * 55, () => {
          const angle = Phaser.Math.FloatBetween(-Math.PI * 0.4, Math.PI * 0.4) - Math.PI / 2;
          const len   = Phaser.Math.Between(100, 210);
          const segs  = 8;
          const pts   = [[cx, cy]];
          for (let s = 1; s <= segs; s++) {
            const t = s / segs;
            pts.push([
              cx + Math.cos(angle) * len * t + Phaser.Math.Between(-16, 16),
              cy + Math.sin(angle) * len * t + Phaser.Math.Between(-8,  8),
            ]);
          }
          const g = this.add.graphics().lineStyle(2, fx.secondary, 0.92);
          g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
          pts.slice(1).forEach(([x, y]) => g.lineTo(x, y)); g.strokePath();
          this.tweens.add({ targets: g, alpha: 0, duration: 300, ease: "Quad.easeOut", onComplete: () => g.destroy() });
        });
      }
    }

    /* ── Vertical beam (master / admiral) ── */
    _beam(cx, cy, height) {
      [[8, 0.78, 280], [55, 0.22, 500]].forEach(([w, a, dur], i) => {
        const b = this.add.rectangle(cx, cy, w, height * 2, i === 0 ? fx.secondary : fx.primary, a);
        b.setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
        this.tweens.add({
          targets: b, alpha: { from: 0, to: a },
          scaleX: { from: 0.1, to: i === 0 ? 3 : 2 },
          duration: dur, ease: "Quad.easeOut",
          yoyo: true, hold: 80,
          onComplete: () => b.destroy(),
        });
      });
      /* Upward particle trail */
      const up = this.add.particles(cx, cy - 50, "pt_dot", {
        speed: { min: 100, max: 300 }, angle: { min: 265, max: 275 },
        lifespan: { min: 500, max: 900 },
        scale: { start: 0.7, end: 0 }, alpha: { start: 1, end: 0 },
        tint: [fx.primary, fx.secondary, 0xffffff],
        blendMode: "ADD", emitting: false,
      });
      up.explode(35, cx, cy - 50);
      this.time.delayedCall(1000, () => up.destroy());
    }

    /* ── Vortex swirl (diamond) ── */
    _vortex(cx, cy) {
      const steps = 60;
      for (let i = 0; i < steps; i++) {
        const t      = i / steps;
        const angle  = t * Math.PI * 8;
        const radius = t * 130;
        const dot    = this.add.circle(
          cx + Math.cos(angle) * radius,
          cy + Math.sin(angle) * radius,
          Phaser.Math.Between(2, 5),
          Phaser.Math.RND.pick([fx.primary, fx.secondary, 0xffffff]),
          0.85,
        );
        dot.setBlendMode(Phaser.BlendModes.ADD);
        this.tweens.add({
          targets: dot,
          x: dot.x + Math.cos(angle + Math.PI / 2) * 40,
          y: dot.y + Math.sin(angle + Math.PI / 2) * 40,
          alpha: 0, scale: 0,
          duration: Phaser.Math.Between(500, 1100),
          delay: i * 12,
          ease: "Quad.easeOut",
          onComplete: () => dot.destroy(),
        });
      }
    }

    /* ── Show texts with stagger ── */
    _showTexts({ title, sub, vi }) {
      this.time.delayedCall(820, () => {
        [title, sub, vi].forEach((t, i) => {
          this.tweens.add({
            targets: t, alpha: 1, y: "-=14",
            duration: 600, delay: i * 130, ease: "Sine.easeOut",
          });
        });
      });
    }
  };
};

/* ─── React component ─────────────────────────────────────────────────────── */
function RankUpAnimation({ oldRank, newRank, onComplete }) {
  const containerRef = useRef(null);
  const gameRef      = useRef(null);
  const hasOldRank   = Boolean(oldRank);

  useEffect(() => {
    if (!containerRef.current) return undefined;
    playSound("rankUp", { minGap: 1200 });

    gameRef.current = new Phaser.Game({
      type: Phaser.AUTO,
      parent: containerRef.current,
      width: 580,
      height: 540,
      transparent: true,
      backgroundColor: "rgba(0,0,0,0)",
      scene: buildRankUpScene({ hasOldRank, oldRank, newRank, onComplete }),
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    });

    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, [newRank, oldRank, hasOldRank, onComplete]);

  return (
    <div className="rank-up-overlay" role="dialog" aria-modal="true" aria-label="Rank promotion">
      <div className="rank-up-frame" data-rank={newRank}>
        <div className="rank-up-scanlines" aria-hidden="true" />
        <div ref={containerRef} className="rank-up-canvas" />
      </div>
    </div>
  );
}

export default RankUpAnimation;
