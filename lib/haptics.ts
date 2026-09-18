import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";

/**
 * Universal Haptic Engine for Everything
 * Uses @capacitor/haptics on Android/iOS native runtime,
 * with web navigator.vibrate fallback for mobile browsers.
 */

class HapticManager {
  private isNative: boolean = false;

  constructor() {
    if (typeof window !== "undefined") {
      this.isNative = Capacitor.isNativePlatform();
    }
  }

  /**
   * Light impact - subtle click (tab switch, toggle, menu tap)
   */
  async impactLight() {
    try {
      if (this.isNative) {
        await Haptics.impact({ style: ImpactStyle.Light });
      } else if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(10);
      }
    } catch {
      // Ignore vibration errors
    }
  }

  /**
   * Medium impact - standard button press / card interaction
   */
  async impactMedium() {
    try {
      if (this.isNative) {
        await Haptics.impact({ style: ImpactStyle.Medium });
      } else if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(20);
      }
    } catch {
      // Ignore vibration errors
    }
  }

  /**
   * Heavy impact - significant event
   */
  async impactHeavy() {
    try {
      if (this.isNative) {
        await Haptics.impact({ style: ImpactStyle.Heavy });
      } else if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(35);
      }
    } catch {
      // Ignore vibration errors
    }
  }

  /**
   * Success notification - completing tasks, checking routines, level up
   * Double rhythmic pulse
   */
  async success() {
    try {
      if (this.isNative) {
        await Haptics.notification({ type: NotificationType.Success });
      } else if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate([15, 50, 25]);
      }
    } catch {
      // Ignore vibration errors
    }
  }

  /**
   * Warning notification - penalty deductions, relapse, delete
   * Sharp alert buzz
   */
  async warning() {
    try {
      if (this.isNative) {
        await Haptics.notification({ type: NotificationType.Warning });
      } else if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate([30, 40, 40]);
      }
    } catch {
      // Ignore vibration errors
    }
  }

  /**
   * Selection tick - scrolling through options, tab changes
   */
  async selection() {
    try {
      if (this.isNative) {
        await Haptics.selectionStart();
      } else if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(8);
      }
    } catch {
      // Ignore vibration errors
    }
  }
}

export const haptics = new HapticManager();
