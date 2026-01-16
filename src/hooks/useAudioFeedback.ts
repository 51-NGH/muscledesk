/**
 * Enhanced Audio feedback hook for the admin QR scanner.
 * Generates professional beep sounds using Web Audio API.
 * Supports multiple sound types with pleasant, distinct tones.
 */

type SoundType = 'approve' | 'deny' | 'warning' | 'scan';

let audioContext: AudioContext | null = null;

function getAudioContext() {
  if (!audioContext && typeof window !== 'undefined') {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
}

function playTone(
  frequency: number, 
  duration: number, 
  type: OscillatorType = 'sine', 
  volume: number = 0.3,
  delay: number = 0
) {
  const ctx = getAudioContext();
  if (!ctx) return;
  
  if (ctx.state === 'suspended') {
    ctx.resume();
  }

  const startTime = ctx.currentTime + delay;
  
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);
  
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, startTime);
  
  // Smooth envelope for professional sound
  gainNode.gain.setValueAtTime(0, startTime);
  gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.01);
  gainNode.gain.setValueAtTime(volume, startTime + duration * 0.7);
  gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  
  oscillator.start(startTime);
  oscillator.stop(startTime + duration);
}

function playChord(
  frequencies: number[], 
  duration: number, 
  type: OscillatorType = 'sine', 
  volume: number = 0.15
) {
  frequencies.forEach(freq => {
    playTone(freq, duration, type, volume / frequencies.length);
  });
}

/**
 * Play approval sound - pleasant major chord arpeggio
 */
function playApproveSound(volumePercent: number = 70) {
  const volume = (volumePercent / 100) * 0.25;
  
  // C major arpeggio going up - bright and positive
  playTone(523.25, 0.12, 'sine', volume, 0);      // C5
  playTone(659.25, 0.12, 'sine', volume, 0.08);   // E5
  playTone(783.99, 0.18, 'sine', volume, 0.16);   // G5
  playTone(1046.50, 0.25, 'sine', volume * 0.8, 0.24); // C6 (softer)
}

/**
 * Play denial sound - minor/diminished descending tone
 */
function playDenySound(volumePercent: number = 70) {
  const volume = (volumePercent / 100) * 0.2;
  
  // Descending minor pattern - clear but not harsh
  playTone(440, 0.15, 'triangle', volume, 0);      // A4
  playTone(349.23, 0.15, 'triangle', volume, 0.12); // F4
  playTone(293.66, 0.25, 'triangle', volume * 0.8, 0.24); // D4
}

/**
 * Play warning sound - attention-getting but not alarming
 */
function playWarningSound(volumePercent: number = 70) {
  const volume = (volumePercent / 100) * 0.18;
  
  // Two-tone alert
  playTone(587.33, 0.12, 'sine', volume, 0);       // D5
  playTone(523.25, 0.12, 'sine', volume, 0.15);    // C5
  playTone(587.33, 0.12, 'sine', volume, 0.30);    // D5
}

/**
 * Play scan detection sound - subtle quick beep
 */
function playScanSound(volumePercent: number = 70) {
  const volume = (volumePercent / 100) * 0.1;
  playTone(1200, 0.05, 'sine', volume, 0);
}

interface SoundSettings {
  enabled: boolean;
  volume: number;
  approveSound: boolean;
  denySound: boolean;
}

export function useAudioFeedback(settings?: SoundSettings) {
  const playSound = (type: SoundType) => {
    if (settings) {
      if (!settings.enabled) return;
      if (type === 'approve' && !settings.approveSound) return;
      if ((type === 'deny' || type === 'warning') && !settings.denySound) return;
    }

    const volume = settings?.volume ?? 70;

    try {
      switch (type) {
        case 'approve':
          playApproveSound(volume);
          break;
        case 'deny':
          playDenySound(volume);
          break;
        case 'warning':
          playWarningSound(volume);
          break;
        case 'scan':
          playScanSound(volume);
          break;
      }
    } catch (error) {
      console.warn('Audio feedback failed:', error);
    }
  };

  const prepareAudio = () => {
    const ctx = getAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume();
    }
  };

  return { playSound, prepareAudio };
}