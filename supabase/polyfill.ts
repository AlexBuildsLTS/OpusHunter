/**
 * lib/polyfill.ts (Web/Shared)
 * ----------------------------------------------------------------------------
 * This file handles web-specific polyfills and safety patches for legacy or
 * buggy browser APIs that cause React Native Web libraries to crash.
 * ----------------------------------------------------------------------------
 */

declare global {
  interface Navigator {
    getBattery?: () => Promise<{
      charging: boolean;
      chargingTime: number;
      dischargingTime: number;
      level: number;
      addEventListener: (type: string, listener: EventListenerOrEventListenerObject) => void;
      removeEventListener: (type: string, listener: EventListenerOrEventListenerObject) => void;
      
      onchargingchange: ((ev: Event) => any) | null;
      onchargingtimechange: ((ev: Event) => any) | null;
      ondischargingtimechange: ((ev: Event) => any) | null;
      onlevelchange: ((ev: Event) => any) | null;

      [key: string]: any;
    }>;
  }
}

if (typeof window !== 'undefined' && typeof navigator !== 'undefined') {
  /**
   * 🔋 BATTERY API SAFETY PATCH
   * Fixes: "battery.addEventListener is not a function"
   * Reason: 'react-native-device-info' attempts to use the Battery Status API, 
   * which is deprecated or partially implemented in some browsers (e.g., Chrome on Linux/Web).
   */
  if (!navigator.getBattery) {
    navigator.getBattery = async () => ({
      charging: true,
      chargingTime: 0,
      dischargingTime: Infinity,
      level: 1,
      addEventListener: function() {},
      removeEventListener: function() {},
      onchargingchange: null,
      onchargingtimechange: null,
      ondischargingtimechange: null,
      onlevelchange: null,
    } as any);
  } else {
    // Some browsers have getBattery but not a full EventTarget implementation.
    const originalGetBattery = navigator.getBattery.bind(navigator);
    navigator.getBattery = async function() {
      try {
        const battery = await originalGetBattery();
        if (battery && typeof battery.addEventListener !== 'function') {
          Object.defineProperty(battery, 'addEventListener', { value: function() {}, writable: true });
          Object.defineProperty(battery, 'removeEventListener', { value: function() {}, writable: true });
        }
        return battery;
      } catch (e) {
        return {
          charging: true,
          chargingTime: 0,
          dischargingTime: Infinity,
          level: 1,
          addEventListener: function() {},
          removeEventListener: function() {},
          onchargingchange: null,
          onchargingtimechange: null,
          ondischargingtimechange: null,
          onlevelchange: null,
        } as any;
      }
    };
  }
}

export { };