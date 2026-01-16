/**
 * Haptic feedback hook for mobile devices.
 * Uses the Vibration API to provide tactile feedback.
 */

type HapticType = 'success' | 'warning' | 'error' | 'light' | 'medium' | 'heavy';

// Vibration patterns in milliseconds
const hapticPatterns: Record<HapticType, number | number[]> = {
  light: 15,
  medium: 30,
  heavy: 60,
  success: [40, 80, 40], // Sweet double-tap
  warning: [80, 60, 80, 60, 80], // Triple pulse warning
  error: [120, 80, 200], // Long buzz for error/invalid
};

export function useHapticFeedback() {
  const isSupported = typeof navigator !== 'undefined' && 'vibrate' in navigator;

  const triggerHaptic = (type: HapticType = 'medium') => {
    if (!isSupported) {
      console.log('Haptic feedback not supported on this device');
      return false;
    }

    try {
      const pattern = hapticPatterns[type];
      navigator.vibrate(pattern);
      console.log(`Haptic feedback triggered: ${type}`);
      return true;
    } catch (error) {
      console.warn('Haptic feedback failed:', error);
      return false;
    }
  };

  // Sweet double-tap for successful check-in
  const triggerScanSuccess = () => {
    if (!isSupported) return false;
    
    try {
      // Two quick, satisfying taps
      navigator.vibrate([50, 100, 50]);
      return true;
    } catch (error) {
      console.warn('Haptic feedback failed:', error);
      return false;
    }
  };

  // Strong buzz for invalid/expired QR
  const triggerScanError = () => {
    if (!isSupported) return false;
    
    try {
      // Longer, more noticeable error vibration
      navigator.vibrate([150, 100, 250]);
      return true;
    } catch (error) {
      console.warn('Haptic feedback failed:', error);
      return false;
    }
  };

  // Warning pattern for expired/blocked
  const triggerScanWarning = () => {
    if (!isSupported) return false;
    
    try {
      // Triple short pulses
      navigator.vibrate([60, 50, 60, 50, 60]);
      return true;
    } catch (error) {
      console.warn('Haptic feedback failed:', error);
      return false;
    }
  };

  return { 
    triggerHaptic, 
    triggerScanSuccess,
    triggerScanError,
    triggerScanWarning,
    isSupported 
  };
}
