/**
 * Audio feedback hook for the admin QR scanner.
 * Generates beep sounds using Web Audio API - no external files needed.
 * Respects user sound settings from useSoundSettings.
 */

type SoundType = 'approve' | 'deny';

let audioContext: AudioContext | null = null;

function getAudioContext() {
  if (!audioContext && typeof window !== 'undefined') {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
}

function playTone(frequency: number, duration: number, type: OscillatorType = 'sine', volume: number = 0.3) {
  const ctx = getAudioContext();
  if (!ctx) return;
  
  // Resume audio context if suspended (required by browsers)
  if (ctx.state === 'suspended') {
    ctx.resume();
  }

  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);
  
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
  
  // Smooth fade out to avoid clicking
  gainNode.gain.setValueAtTime(volume, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
  
  oscillator.start(ctx.currentTime);
  oscillator.stop(ctx.currentTime + duration);
}

/**
 * Play approval sound - pleasant ascending two-tone beep
 */
function playApproveSound(volumePercent: number = 70) {
  const volume = (volumePercent / 100) * 0.35;
  
  // First tone - lower
  playTone(880, 0.15, 'sine', volume);
  
  // Second tone - higher (delayed)
  setTimeout(() => {
    playTone(1318.5, 0.2, 'sine', volume); // E6 note
  }, 100);
}

/**
 * Play denial sound - descending two-tone buzz
 */
function playDenySound(volumePercent: number = 70) {
  const volume = (volumePercent / 100) * 0.2;
  
  // First tone - higher
  playTone(400, 0.15, 'square', volume);
  
  // Second tone - lower (delayed)
  setTimeout(() => {
    playTone(250, 0.25, 'square', volume);
  }, 120);
}

interface SoundSettings {
  enabled: boolean;
  volume: number;
  approveSound: boolean;
  denySound: boolean;
}

export function useAudioFeedback(settings?: SoundSettings) {
  const playSound = (type: SoundType) => {
    // If settings provided, respect them
    if (settings) {
      if (!settings.enabled) return;
      if (type === 'approve' && !settings.approveSound) return;
      if (type === 'deny' && !settings.denySound) return;
    }

    const volume = settings?.volume ?? 70;

    try {
      if (type === 'approve') {
        playApproveSound(volume);
      } else {
        playDenySound(volume);
      }
    } catch (error) {
      console.warn('Audio feedback failed:', error);
    }
  };

  // Prepare audio context on first user interaction
  const prepareAudio = () => {
    const ctx = getAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume();
    }
  };

  return { playSound, prepareAudio };
}
