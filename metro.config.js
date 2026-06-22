/**
 * metro.config.js
 * OpusHunter — Metro Bundler Configuration
 *
 * FIX (identified in audit): babel.config.js explicitly states that
 * wrapWithReanimatedMetroConfig() is the integration point for Reanimated v4
 * worklet transformation — but the previous metro.config.js never called it.
 * This means worklets were silently not being transformed on native.
 *
 * Correct wrap order:
 *   1. getDefaultConfig  (Expo base)
 *   2. apply resolver tweaks
 *   3. withNativeWind    (NativeWind CSS processing)
 *   4. wrapWithReanimatedMetroConfig  (Reanimated v4 worklet transform — outermost)
 */

const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const {
  wrapWithReanimatedMetroConfig,
} = require("react-native-reanimated/metro-config");

const config = getDefaultConfig(__dirname);

// Support .mjs and .cjs module formats (required for some ESM-only packages)
config.resolver.sourceExts = [...config.resolver.sourceExts, "mjs", "cjs"];

// Disable unstable package exports to prevent resolution issues with
// packages that have non-standard exports fields
config.resolver.unstable_enablePackageExports = false;

module.exports = wrapWithReanimatedMetroConfig(
  withNativeWind(config, { input: "./global.css" }),
);
