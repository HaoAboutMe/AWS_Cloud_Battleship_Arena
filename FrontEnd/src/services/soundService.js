import { Howl, Howler } from "howler";
import battleTheme from "../assets/sounds/music/battle-theme.mp3";
import menuTheme from "../assets/sounds/music/menu-theme.mp3";
import digitalClickSound from "../assets/sounds/sfx/digital-click.mp3";
import explosionSound from "../assets/sounds/sfx/explosion-with-debris.mp3";
import defeatSound from "../assets/sounds/sfx/game-over-sound.mp3";
import sunkSound from "../assets/sounds/sfx/sunk-sound-2.mp3";
import victorySound from "../assets/sounds/sfx/victory-sound.mp3";
import waterSplashSound from "../assets/sounds/sfx/water-splash.mp3";

const STORAGE_KEY = "battleshipSoundMuted";
const SETTINGS_STORAGE_KEY = "battleshipSoundSettings";
const UI_CLICK_CLEANUP_KEY = "__battleshipUIClickSoundCleanup";
const MUSIC_VOLUME = 0.35;
const DEFAULT_SOUND_SETTINGS = Object.freeze({
  masterVolume: 1,
  musicVolume: 1,
  battleMusicVolume: 1,
  effectsVolume: 1,
  clickVolume: 1,
});
const sounds = new Map();
const musicPlaybackIds = new Map();
const lastPlayedAt = new Map();
const listeners = new Set();
const settingsListeners = new Set();
const soundBaseVolumes = new Map([
  ["click", 0.6],
  ["ready", 0.62],
  ["miss", 0.72],
  ["hit", 0.72],
  ["explosion", 0.72],
  ["sunk", 0.64],
  ["victory", 0.74],
  ["defeat", 1],
  ["rankUp", 0.75],
]);

let initialized = false;
let uiClickListenerInstalled = false;
let muted = false;
let soundSettings = { ...DEFAULT_SOUND_SETTINGS };
let activeMusic = null;
let requestedMusic = null;
let musicTransitionId = 0;

const getStoredMuted = () => {
  try {
    return localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
};

const clampVolume = (value) => Math.max(0, Math.min(1, Number(value) || 0));

const getStoredSoundSettings = () => {
  try {
    const stored = JSON.parse(
      localStorage.getItem(SETTINGS_STORAGE_KEY) || "null",
    );
    if (!stored || typeof stored !== "object")
      return { ...DEFAULT_SOUND_SETTINGS };
    return {
      masterVolume: clampVolume(stored.masterVolume ?? 1),
      musicVolume: clampVolume(stored.musicVolume ?? 1),
      battleMusicVolume: clampVolume(stored.battleMusicVolume ?? 1),
      effectsVolume: clampVolume(stored.effectsVolume ?? 1),
      clickVolume: clampVolume(stored.clickVolume ?? 1),
    };
  } catch {
    return { ...DEFAULT_SOUND_SETTINGS };
  }
};

const getMusicTargetVolume = (name) =>
  MUSIC_VOLUME *
  (name === "battleMusic"
    ? soundSettings.battleMusicVolume
    : soundSettings.musicVolume);

const applySoundVolume = (sound, name, volume) => {
  sound.volume(volume);
  const playbackId = musicPlaybackIds.get(name);
  if (playbackId != null) sound.volume(volume, playbackId);
};

const notify = () => {
  listeners.forEach((listener) => listener(muted));
  const snapshot = { ...soundSettings, muted };
  settingsListeners.forEach((listener) => listener(snapshot));
};

const clampSample = (value) => Math.max(-1, Math.min(1, value));

const createWavDataUri = (duration, sampler, sampleRate = 44100) => {
  const sampleCount = Math.max(1, Math.floor(duration * sampleRate));
  const bytesPerSample = 2;
  const blockAlign = bytesPerSample;
  const dataSize = sampleCount * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeString = (offset, value) => {
    for (let index = 0; index < value.length; index += 1) {
      view.setUint8(offset + index, value.charCodeAt(index));
    }
  };

  writeString(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bytesPerSample * 8, true);
  writeString(36, "data");
  view.setUint32(40, dataSize, true);

  for (let index = 0; index < sampleCount; index += 1) {
    const time = index / sampleRate;
    const progress = index / sampleCount;
    const value = clampSample(sampler(time, progress));
    view.setInt16(44 + index * 2, value * 0x7fff, true);
  }

  const blob = new Blob([buffer], { type: "audio/wav" });
  return URL.createObjectURL(blob);
};

const tone = (
  frequency,
  duration,
  volume = 0.5,
  attack = 0.02,
  release = 0.2,
) =>
  createWavDataUri(duration, (time, progress) => {
    const attackGain = Math.min(1, time / attack);
    const releaseGain = Math.min(1, (1 - progress) / release);
    const envelope = Math.max(0, Math.min(attackGain, releaseGain));
    return Math.sin(Math.PI * 2 * frequency * time) * volume * envelope;
  });

const noise = (duration, volume = 0.55, lowTone = 0) =>
  createWavDataUri(duration, (time, progress) => {
    const envelope = Math.pow(1 - progress, 2.4);
    const rumble = lowTone ? Math.sin(Math.PI * 2 * lowTone * time) * 0.35 : 0;
    return ((Math.random() * 2 - 1) * volume + rumble) * envelope;
  });

const splash = () => {
  let smoothNoise = 0;
  return createWavDataUri(0.9, (time, progress) => {
    smoothNoise = smoothNoise * 0.68 + (Math.random() * 2 - 1) * 0.32;
    const impact = smoothNoise * Math.exp(-progress * 9.5) * 0.95;
    const spray = (Math.random() * 2 - 1) * Math.exp(-progress * 14) * 0.38;
    const dropletA =
      Math.sin(Math.PI * 2 * (1180 - progress * 520) * time) *
      Math.exp(-progress * 5.8) *
      0.18;
    const dropletB =
      Math.sin(Math.PI * 2 * (760 + progress * 120) * time) *
      Math.exp(-progress * 7.2) *
      0.12;
    const ripple =
      Math.sin(Math.PI * 2 * 112 * time) * Math.exp(-progress * 3.4) * 0.16;
    return (impact + spray + dropletA + dropletB + ripple) * 0.82;
  });
};

const explosion = () => {
  let crackle = 0;
  return createWavDataUri(0.95, (time, progress) => {
    crackle = crackle * 0.42 + (Math.random() * 2 - 1) * 0.58;
    const thump =
      Math.sin(Math.PI * 2 * (52 + progress * 26) * time) *
      Math.exp(-progress * 5.4) *
      1.08;
    const blast = crackle * Math.exp(-progress * 3.2) * 0.9;
    const flame = (Math.random() * 2 - 1) * Math.exp(-progress * 8.5) * 0.36;
    const metal =
      Math.sin(Math.PI * 2 * (420 - progress * 170) * time) *
      Math.exp(-progress * 6.2) *
      0.16;
    return (thump + blast + flame + metal) * 0.72;
  });
};

const sinkingExplosion = () =>
  createWavDataUri(1.45, (time, progress) => {
    const wave =
      Math.sin(Math.PI * 2 * 38 * time) * Math.exp(-progress * 2.1) * 0.48;
    const blastOne =
      Math.max(0, 1 - Math.abs(time - 0.1) / 0.18) *
      (Math.random() * 2 - 1) *
      0.78;
    const blastTwo =
      Math.max(0, 1 - Math.abs(time - 0.46) / 0.22) *
      (Math.random() * 2 - 1) *
      0.62;
    const blastThree =
      Math.max(0, 1 - Math.abs(time - 0.82) / 0.26) *
      (Math.random() * 2 - 1) *
      0.48;
    const waterRush =
      (Math.random() * 2 - 1) *
      Math.exp(-Math.max(0, progress - 0.18) * 2.7) *
      0.26;
    return (wave + blastOne + blastTwo + blastThree + waterRush) * 0.82;
  });

const sequence = (notes, volume = 0.45) => {
  const duration = notes.reduce((sum, note) => sum + note[1], 0);
  return createWavDataUri(duration, (time) => {
    let cursor = 0;
    for (const [frequency, length] of notes) {
      if (time >= cursor && time < cursor + length) {
        const local = time - cursor;
        const progress = local / length;
        const envelope = Math.sin(Math.PI * progress);
        return Math.sin(Math.PI * 2 * frequency * local) * volume * envelope;
      }
      cursor += length;
    }
    return 0;
  });
};

const createSound = (src, options = {}) =>
  new Howl({
    src: [src],
    preload: options.preload ?? false,
    html5: options.html5 ?? false,
    loop: options.loop ?? false,
    volume: options.volume ?? 0.6,
    pool: options.pool ?? 4,
  });

const ensureSounds = () => {
  if (initialized) return;
  initialized = true;
  muted = getStoredMuted();
  soundSettings = getStoredSoundSettings();
  Howler.volume(soundSettings.masterVolume);
  Howler.mute(muted);

  sounds.set(
    "click",
    createSound(digitalClickSound, { volume: 0.5, pool: 10, preload: true }),
  );
  sounds.set(
    "ready",
    createSound(digitalClickSound, { volume: 0.62, pool: 6, preload: true }),
  );
  sounds.set(
    "miss",
    createSound(waterSplashSound, { volume: 0.72, pool: 8, preload: true }),
  );
  sounds.set(
    "hit",
    createSound(explosionSound, { volume: 0.58, pool: 8, preload: true }),
  );
  sounds.set(
    "explosion",
    createSound(explosionSound, { volume: 0.58, pool: 8, preload: true }),
  );
  sounds.set(
    "sunk",
    createSound(sunkSound, { volume: 0.64, pool: 4, preload: true }),
  );
  sounds.set("victory", createSound(victorySound, { volume: 0.74, preload: true }));
  sounds.set("defeat", createSound(defeatSound, { volume: 1, preload: true }));
  sounds.set(
    "rankUp",
    createSound(
      sequence(
        [
          [659, 0.1],
          [880, 0.1],
          [1175, 0.18],
          [1568, 0.42],
        ],
        0.5,
      ),
      { volume: 0.75 },
    ),
  );
  sounds.set(
    "menuMusic",
    createSound(menuTheme, {
      loop: true,
      pool: 1,
      preload: true,
      volume: MUSIC_VOLUME,
    }),
  );
  sounds.set(
    "battleMusic",
    createSound(battleTheme, {
      loop: true,
      pool: 1,
      preload: true,
      volume: MUSIC_VOLUME,
    }),
  );

  sounds.forEach((sound, name) => {
    const volume = name.endsWith("Music")
      ? getMusicTargetVolume(name)
      : name === "click"
        ? (soundBaseVolumes.get(name) ?? 0.6) *
          soundSettings.effectsVolume *
          soundSettings.clickVolume
        : (soundBaseVolumes.get(name) ?? 0.6) * soundSettings.effectsVolume;
    applySoundVolume(sound, name, volume);
  });
};

const startRequestedMusic = () => {
  ensureSounds();
  if (muted || !requestedMusic) return;

  if (activeMusic === requestedMusic) {
    const activeSound = sounds.get(activeMusic);
    const activeId = musicPlaybackIds.get(activeMusic);
    if (activeSound?.playing(activeId)) return;
    activeMusic = null;
    musicPlaybackIds.delete(requestedMusic);
  }

  const nextMusic = sounds.get(requestedMusic);
  if (!nextMusic) return;

  const transitionId = ++musicTransitionId;
  const previousName = activeMusic;
  const previousMusic = previousName ? sounds.get(previousName) : null;
  const previousId = previousName ? musicPlaybackIds.get(previousName) : null;

  activeMusic = requestedMusic;
  nextMusic.stop();
  nextMusic.volume(0);
  const nextId = nextMusic.play();
  musicPlaybackIds.set(requestedMusic, nextId);
  nextMusic.fade(0, getMusicTargetVolume(requestedMusic), 700, nextId);

  if (previousMusic && previousId != null) {
    previousMusic.fade(previousMusic.volume(), 0, 500, previousId);
    window.setTimeout(() => {
      if (transitionId !== musicTransitionId) return;
      previousMusic.stop(previousId);
      musicPlaybackIds.delete(previousName);
    }, 520);
  }

  ["menuMusic", "battleMusic"].forEach((musicName) => {
    if (musicName === requestedMusic || musicName === previousName) return;

    const music = sounds.get(musicName);
    const playbackId = musicPlaybackIds.get(musicName);
    if (!music) return;

    if (playbackId != null && music.playing(playbackId)) {
      music.fade(music.volume(playbackId), 0, 300, playbackId);
      window.setTimeout(() => {
        if (musicPlaybackIds.get(musicName) !== playbackId) return;
        music.stop(playbackId);
        musicPlaybackIds.delete(musicName);
      }, 320);
      return;
    }

    if (music.playing()) {
      music.stop();
      musicPlaybackIds.delete(musicName);
    }
  });
};

export const syncBackgroundMusic = (pathname) => {
  requestedMusic = pathname.startsWith("/game") ? "battleMusic" : "menuMusic";
  if (initialized) startRequestedMusic();
};

export const playSound = (name, options = {}) => {
  ensureSounds();
  if (muted) return;

  if (
    name === "click" &&
    (soundSettings.clickVolume === 0 || soundSettings.effectsVolume === 0)
  ) {
    return;
  }

  const now = Date.now();
  const minGap = options.minGap ?? 45;
  const last = lastPlayedAt.get(name) || 0;
  if (now - last < minGap) return;
  lastPlayedAt.set(name, now);

  const sound = sounds.get(name);
  if (!sound) return;

  const volume = name.endsWith("Music")
    ? getMusicTargetVolume(name)
    : name === "click"
      ? (soundBaseVolumes.get(name) ?? 0.6) *
        soundSettings.effectsVolume *
        soundSettings.clickVolume
      : (soundBaseVolumes.get(name) ?? 0.6) * soundSettings.effectsVolume;

  if (volume <= 0) return;

  sound.volume(volume);
  const playbackId = sound.play();

  if ((name === "victory" || name === "defeat") && activeMusic) {
    const musicName = activeMusic;
    const music = sounds.get(musicName);
    const musicId = musicPlaybackIds.get(musicName);
    if (music && musicId != null) {
      const targetVolume = getMusicTargetVolume(musicName);
      music.fade(music.volume(musicId), targetVolume * 0.18, 220, musicId);
      sound.once("end", () => {
        if (activeMusic === musicName && requestedMusic === musicName && !muted) {
          music.fade(music.volume(musicId), targetVolume, 650, musicId);
        }
      }, playbackId);
    }
  }

  return playbackId;
};

export const installUIClickSounds = () => {
  if (typeof document === "undefined") return;

  window[UI_CLICK_CLEANUP_KEY]?.();
  window[UI_CLICK_CLEANUP_KEY] = null;

  if (uiClickListenerInstalled) return;
  uiClickListenerInstalled = true;

  const resumeMusic = async () => {
    ensureSounds();
    if (Howler.ctx?.state === "suspended") {
      try {
        await Howler.ctx.resume();
      } catch {
        // The next user interaction will let Howler retry the unlock.
      }
    }
    startRequestedMusic();
  };

  const clickHandler = (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    if (
      target.closest(
        "[data-sound='off'], .ocean-cell, .game-board, .battle-board",
      )
    )
      return;

    const interactive = target.closest(
      "button, a, select, input[type='checkbox'], input[type='radio'], [role='button'], .profile-rank-card",
    );
    if (!interactive) return;

    const customSound = interactive.getAttribute("data-sound");
    if (customSound === "off") return;
    playSound(customSound || "click", { minGap: 90 });
  };

  document.addEventListener("pointerdown", resumeMusic, { once: true });
  document.addEventListener("keydown", resumeMusic, { once: true });
  document.addEventListener("click", clickHandler, true);

  window[UI_CLICK_CLEANUP_KEY] = () => {
    document.removeEventListener("pointerdown", resumeMusic);
    document.removeEventListener("keydown", resumeMusic);
    document.removeEventListener("click", clickHandler, true);
    uiClickListenerInstalled = false;
  };
};

export const isSoundMuted = () => {
  ensureSounds();
  return muted;
};

export const setSoundMuted = (nextMuted) => {
  ensureSounds();
  muted = Boolean(nextMuted);
  Howler.mute(muted);
  try {
    localStorage.setItem(STORAGE_KEY, String(muted));
  } catch {
    // Ignore storage failures in private browsing.
  }
  if (!muted) startRequestedMusic();
  notify();
};

export const toggleSoundMuted = () => {
  setSoundMuted(!isSoundMuted());
  return muted;
};

export const getSoundSettings = () => {
  ensureSounds();
  return { ...soundSettings, muted };
};

export const setSoundSettings = (nextSettings = {}) => {
  ensureSounds();
  soundSettings = {
    masterVolume: clampVolume(
      nextSettings.masterVolume ?? soundSettings.masterVolume,
    ),
    musicVolume: clampVolume(
      nextSettings.musicVolume ?? soundSettings.musicVolume,
    ),
    battleMusicVolume: clampVolume(
      nextSettings.battleMusicVolume ?? soundSettings.battleMusicVolume,
    ),
    effectsVolume: clampVolume(
      nextSettings.effectsVolume ?? soundSettings.effectsVolume,
    ),
    clickVolume: clampVolume(
      nextSettings.clickVolume ?? soundSettings.clickVolume,
    ),
  };

  Howler.volume(soundSettings.masterVolume);
  sounds.forEach((sound, name) => {
    const volume = name.endsWith("Music")
      ? getMusicTargetVolume(name)
      : name === "click"
        ? (soundBaseVolumes.get(name) ?? 0.6) *
          soundSettings.effectsVolume *
          soundSettings.clickVolume
        : (soundBaseVolumes.get(name) ?? 0.6) * soundSettings.effectsVolume;
    applySoundVolume(sound, name, volume);
  });

  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(soundSettings));
  } catch {
    // Ignore storage failures in private browsing.
  }
  notify();
};

export const subscribeSoundPreference = (listener) => {
  ensureSounds();
  listeners.add(listener);
  listener(muted);
  return () => listeners.delete(listener);
};

export const subscribeSoundSettings = (listener) => {
  ensureSounds();
  settingsListeners.add(listener);
  listener({ ...soundSettings, muted });
  return () => settingsListeners.delete(listener);
};
