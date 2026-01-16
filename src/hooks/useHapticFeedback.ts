/**
 * Haptic feedback hook for mobile devices.
 * Uses the Vibration API to provide tactile feedback.
 */

type HapticType = 'success' | 'warning' | 'error' | 'light' | 'medium' | 'heavy';

// Vibration patterns in milliseconds
const hapticPatterns: Record<HapticType, number | number[]> = {
  light: 10,
  medium: 25,
  heavy: 50,
  success: [50, 50, 100], // Short, pause, longer
  warning: [100, 50, 100], // Medium, pause, medium
  error: [50, 30, 50, 30, 100], // Rapid pattern ending with longer
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

  // Special method for QR scan success - strong haptic
  const triggerScanSuccess = () => {
    if (!isSupported) return false;
    
    try {
      // Strong double vibration for clear feedback
      navigator.vibrate([100, 80, 150]);
      return true;
    } catch (error) {
      console.warn('Haptic feedback failed:', error);
      return false;
    }
  };

  return { 
    triggerHaptic, 
    triggerScanSuccess,
    isSupported 
  };
}
