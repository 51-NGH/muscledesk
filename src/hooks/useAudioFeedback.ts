/**
 * Audio feedback hook for the admin QR scanner.
 * Generates beep sounds using Web Audio API - no external files needed.
 */

type SoundType = 'approve' | 'deny';

const audioContext = typeof window !== 'undefined' ? new (window.AudioContext || (window as any).webkitAudioContext)() : null;

function playTone(frequency: number, duration: number, type: OscillatorType = 'sine', volume: number = 0.3) {
  if (!audioContext) return;
  
  // Resume audio context if suspended (required by browsers)
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }

  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
  
  // Smooth fade out to avoid clicking
  gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
  
  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + duration);
}

/**
 * Play approval sound - pleasant ascending two-tone beep
 */
function playApproveSound() {
  if (!audioContext) return;
  
  // First tone - lower
  playTone(880, 0.15, 'sine', 0.25);
  
  // Second tone - higher (delayed)
  setTimeout(() => {
    playTone(1318.5, 0.2, 'sine', 0.25); // E6 note
  }, 100);
}

/**
 * Play denial sound - descending two-tone buzz
 */
function playDenySound() {
  if (!audioContext) return;
  
  // First tone - higher
  playTone(400, 0.15, 'square', 0.15);
  
  // Second tone - lower (delayed)
  setTimeout(() => {
    playTone(250, 0.25, 'square', 0.15);
  }, 120);
}

export function useAudioFeedback() {
  const playSound = (type: SoundType) => {
    try {
      if (type === 'approve') {
        playApproveSound();
      } else {
        playDenySound();
      }
    } catch (error) {
      console.warn('Audio feedback failed:', error);
    }
  };

  // Prepare audio context on first user interaction
  const prepareAudio = () => {
    if (audioContext && audioContext.state === 'suspended') {
      audioContext.resume();
    }
  };

  return { playSound, prepareAudio };
}
