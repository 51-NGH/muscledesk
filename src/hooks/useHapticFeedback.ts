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
    console.log('[Haptic] triggerScanSuccess called, isSupported:', isSupported);
    if (!isSupported) {
      console.log('[Haptic] Vibration API not supported');
      return false;
    }
    
    try {
      // Two quick, satisfying taps
      const pattern = [50, 100, 50];
      console.log('[Haptic] Calling navigator.vibrate with pattern:', pattern);
      const result = navigator.vibrate(pattern);
      console.log('[Haptic] navigator.vibrate returned:', result);
      return result;
    } catch (error) {
      console.warn('[Haptic] Haptic feedback failed:', error);
      return false;
    }
  };

  // Strong buzz for invalid/expired QR
  const triggerScanError = () => {
    console.log('[Haptic] triggerScanError called, isSupported:', isSupported);
    if (!isSupported) return false;
    
    try {
      const pattern = [150, 100, 250];
      console.log('[Haptic] Error pattern:', pattern);
      return navigator.vibrate(pattern);
    } catch (error) {
      console.warn('[Haptic] Error haptic failed:', error);
      return false;
    }
  };

  // Warning pattern for expired/blocked
  const triggerScanWarning = () => {
    console.log('[Haptic] triggerScanWarning called, isSupported:', isSupported);
    if (!isSupported) return false;
    
    try {
      const pattern = [60, 50, 60, 50, 60];
      console.log('[Haptic] Warning pattern:', pattern);
      return navigator.vibrate(pattern);
    } catch (error) {
      console.warn('[Haptic] Warning haptic failed:', error);
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
