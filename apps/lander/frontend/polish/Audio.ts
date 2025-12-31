/**
 * @fileoverview Audio system with hooks for sound effects and music.
 * Provides placeholders that can be connected to actual audio assets.
 */

import * as Phaser from 'phaser';

/**
 * Sound effect identifiers.
 */
export type SoundEffectId =
  | 'thrust'
  | 'thrustLoop'
  | 'thrustEnd'
  | 'landingPerfect'
  | 'landingGood'
  | 'landingRough'
  | 'crash'
  | 'explosion'
  | 'laserWarning'
  | 'laserFire'
  | 'enemyAlert'
  | 'enemyChase'
  | 'collectCoin'
  | 'collectStar'
  | 'collectFuel'
  | 'itemPickup'
  | 'itemUse'
  | 'levelComplete'
  | 'levelFail'
  | 'menuSelect'
  | 'menuConfirm'
  | 'menuBack';

/**
 * Music track identifiers.
 */
export type MusicTrackId =
  | 'menuTheme'
  | 'gameplayAmbient'
  | 'tensionLoop'
  | 'victoryStinger'
  | 'defeatStinger';

/**
 * Sound effect configuration.
 */
export interface SoundConfig {
  /** Volume (0-1) */
  volume: number;
  /** Whether to loop */
  loop?: boolean;
  /** Playback rate */
  rate?: number;
  /** Random pitch variation (+/-) */
  pitchVariance?: number;
}

/**
 * Default sound configurations.
 */
const DEFAULT_SOUND_CONFIGS: Record<SoundEffectId, SoundConfig> = {
  thrust: { volume: 0.5 },
  thrustLoop: { volume: 0.4, loop: true },
  thrustEnd: { volume: 0.3 },
  landingPerfect: { volume: 0.7 },
  landingGood: { volume: 0.6 },
  landingRough: { volume: 0.6 },
  crash: { volume: 0.8 },
  explosion: { volume: 0.7 },
  laserWarning: { volume: 0.4, pitchVariance: 0.1 },
  laserFire: { volume: 0.5 },
  enemyAlert: { volume: 0.5 },
  enemyChase: { volume: 0.4, loop: true },
  collectCoin: { volume: 0.4, pitchVariance: 0.2 },
  collectStar: { volume: 0.5 },
  collectFuel: { volume: 0.5 },
  itemPickup: { volume: 0.5 },
  itemUse: { volume: 0.6 },
  levelComplete: { volume: 0.7 },
  levelFail: { volume: 0.6 },
  menuSelect: { volume: 0.3 },
  menuConfirm: { volume: 0.4 },
  menuBack: { volume: 0.3 },
};

/**
 * Audio manager for handling sound effects and music.
 *
 * This class provides hooks for audio that can be connected to
 * actual sound files. Without audio files loaded, calls are no-ops.
 *
 * ## Adding Audio Assets
 *
 * To add actual audio:
 * 1. Add audio files to `assets/audio/`
 * 2. Load in scene preload:
 *    ```typescript
 *    this.load.audio('thrust', 'assets/audio/thrust.mp3');
 *    ```
 * 3. Register with AudioManager:
 *    ```typescript
 *    audioManager.registerSound('thrust', this.sound.add('thrust'));
 *    ```
 *
 * ## Tuning Notes
 *
 * - Keep thrust loop volume low to avoid fatigue
 * - Use pitch variance on collection sounds for variety
 * - Layer crash sounds with rumble for impact
 * - Music should duck during important SFX
 */
export class AudioManager {
  private scene: Phaser.Scene | null = null;
  private sounds: Map<SoundEffectId, Phaser.Sound.BaseSound> = new Map();
  private music: Map<MusicTrackId, Phaser.Sound.BaseSound> = new Map();
  private currentMusic: MusicTrackId | null = null;

  private masterVolume = 1.0;
  private sfxVolume = 1.0;
  private musicVolume = 0.6;
  private muted = false;

  /**
   * Initialize the audio manager with a scene.
   */
  init(scene: Phaser.Scene): void {
    this.scene = scene;
  }

  /**
   * Register a sound effect.
   */
  registerSound(id: SoundEffectId, sound: Phaser.Sound.BaseSound): void {
    this.sounds.set(id, sound);
  }

  /**
   * Register a music track.
   */
  registerMusic(id: MusicTrackId, sound: Phaser.Sound.BaseSound): void {
    this.music.set(id, sound);
  }

  /**
   * Play a sound effect.
   */
  playSfx(id: SoundEffectId, configOverride?: Partial<SoundConfig>): void {
    if (this.muted) return;

    const sound = this.sounds.get(id);
    if (!sound) {
      // Silent no-op when sound not loaded
      console.debug(`[Audio] SFX not loaded: ${id}`);
      return;
    }

    const config = {
      ...DEFAULT_SOUND_CONFIGS[id],
      ...configOverride,
    };

    // Apply pitch variance
    let rate = config.rate ?? 1;
    if (config.pitchVariance) {
      rate *= 1 + (Math.random() - 0.5) * 2 * config.pitchVariance;
    }

    // Calculate final volume
    const volume = config.volume * this.sfxVolume * this.masterVolume;

    sound.play({
      volume,
      loop: config.loop ?? false,
      rate,
    });
  }

  /**
   * Stop a looping sound effect.
   */
  stopSfx(id: SoundEffectId): void {
    const sound = this.sounds.get(id);
    if (sound?.isPlaying) {
      sound.stop();
    }
  }

  /**
   * Play a music track.
   */
  playMusic(id: MusicTrackId, fadeInMs = 1000): void {
    if (this.currentMusic === id) return;

    // Fade out current music
    if (this.currentMusic) {
      this.stopMusic(fadeInMs);
    }

    const track = this.music.get(id);
    if (!track) {
      console.debug(`[Audio] Music not loaded: ${id}`);
      return;
    }

    this.currentMusic = id;
    const volume = this.musicVolume * this.masterVolume;

    track.play({
      volume: 0,
      loop: true,
    });

    // Fade in
    if (this.scene && track instanceof Phaser.Sound.WebAudioSound) {
      this.scene.tweens.add({
        targets: track,
        volume: { from: 0, to: this.muted ? 0 : volume },
        duration: fadeInMs,
        ease: 'Linear',
      });
    }
  }

  /**
   * Stop current music.
   */
  stopMusic(fadeOutMs = 1000): void {
    if (!this.currentMusic) return;

    const track = this.music.get(this.currentMusic);
    if (!track) return;

    if (this.scene && fadeOutMs > 0 && track instanceof Phaser.Sound.WebAudioSound) {
      this.scene.tweens.add({
        targets: track,
        volume: 0,
        duration: fadeOutMs,
        ease: 'Linear',
        onComplete: () => {
          track.stop();
        },
      });
    } else {
      track.stop();
    }

    this.currentMusic = null;
  }

  /**
   * Set master volume.
   */
  setMasterVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    this.updateMusicVolume();
  }

  /**
   * Set SFX volume.
   */
  setSfxVolume(volume: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, volume));
  }

  /**
   * Set music volume.
   */
  setMusicVolume(volume: number): void {
    this.musicVolume = Math.max(0, Math.min(1, volume));
    this.updateMusicVolume();
  }

  /**
   * Update music volume for current track.
   */
  private updateMusicVolume(): void {
    if (!this.currentMusic) return;

    const track = this.music.get(this.currentMusic);
    if (track && track instanceof Phaser.Sound.WebAudioSound) {
      track.setVolume(
        this.muted ? 0 : this.musicVolume * this.masterVolume
      );
    }
  }

  /**
   * Mute all audio.
   */
  mute(): void {
    this.muted = true;
    this.updateMusicVolume();
  }

  /**
   * Unmute all audio.
   */
  unmute(): void {
    this.muted = false;
    this.updateMusicVolume();
  }

  /**
   * Toggle mute state.
   */
  toggleMute(): boolean {
    if (this.muted) {
      this.unmute();
    } else {
      this.mute();
    }
    return this.muted;
  }

  /**
   * Check if audio is muted.
   */
  isMuted(): boolean {
    return this.muted;
  }

  /**
   * Clean up resources.
   */
  destroy(): void {
    this.stopMusic(0);

    for (const sound of this.sounds.values()) {
      sound.destroy();
    }
    for (const track of this.music.values()) {
      track.destroy();
    }

    this.sounds.clear();
    this.music.clear();
    this.scene = null;
  }
}

// Singleton instance
let audioManagerInstance: AudioManager | null = null;

/**
 * Get the global AudioManager instance.
 */
export function getAudioManager(): AudioManager {
  if (!audioManagerInstance) {
    audioManagerInstance = new AudioManager();
  }
  return audioManagerInstance;
}

/**
 * Destroy the global AudioManager instance.
 */
export function destroyAudioManager(): void {
  if (audioManagerInstance) {
    audioManagerInstance.destroy();
    audioManagerInstance = null;
  }
}

/**
 * Convenience wrapper for common game sounds.
 */
export const GameSounds = {
  playThrust: () => getAudioManager().playSfx('thrust'),
  startThrustLoop: () => getAudioManager().playSfx('thrustLoop'),
  stopThrustLoop: () => getAudioManager().stopSfx('thrustLoop'),
  playLandingPerfect: () => getAudioManager().playSfx('landingPerfect'),
  playLandingGood: () => getAudioManager().playSfx('landingGood'),
  playLandingRough: () => getAudioManager().playSfx('landingRough'),
  playCrash: () => getAudioManager().playSfx('crash'),
  playExplosion: () => getAudioManager().playSfx('explosion'),
  playCollectCoin: () => getAudioManager().playSfx('collectCoin'),
  playCollectStar: () => getAudioManager().playSfx('collectStar'),
  playCollectFuel: () => getAudioManager().playSfx('collectFuel'),
  playLevelComplete: () => getAudioManager().playSfx('levelComplete'),
  playLevelFail: () => getAudioManager().playSfx('levelFail'),
};
