/**
 * @fileoverview Polish utilities exports.
 */

export type {
  ShakeConfig,
  FlashConfig,
  ParticleBurstConfig,
} from './Effects';

export {
  SHAKE_PRESETS,
  FLASH_PRESETS,
  PARTICLE_PRESETS,
  applyScreenShake,
  applyScreenFlash,
  createParticleBurst,
  playLandingFeedback,
  SlowMotionEffect,
  applyHitstop,
} from './Effects';

export type {
  SoundEffectId,
  MusicTrackId,
  SoundConfig,
} from './Audio';

export {
  AudioManager,
  getAudioManager,
  destroyAudioManager,
  GameSounds,
} from './Audio';
