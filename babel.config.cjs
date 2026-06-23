/**
 * babel.config.cjs
 * OpusHunter — Babel Configuration
 *
 * ROOT CAUSE OF VERCEL CRASH (resolved here):
 *
 *   The preset "nativewind/babel" chains into "react-native-css-interop/babel"
 *   which hardcodes "react-native-worklets/plugin" in its plugins array.
 *   react-native-worklets is installed as a transitive dep of reanimated but
 *   is NOT hoisted to the project root on Vercel's node_modules layout, so
 *   Babel cannot resolve it and crashes:
 *     "Cannot find module 'react-native-worklets/plugin'"
 *
 *   FIX A (this file): Remove "nativewind/babel" from presets entirely.
 *   NativeWind v4 does NOT need a Babel preset. It works exclusively through
 *   Metro (withNativeWind in metro.config.cjs). The "nativewind/babel" preset
 *   was carried over from NativeWind v2/v3 conventions and is wrong for v4.
 *   See: https://www.nativewind.dev/v4/getting-started/expo-router
 *
 *   FIX B (package.json): Add "react-native-worklets" as an explicit
 *   dependency so it is always hoisted and resolvable regardless of layout.
 *
 * Reanimated v4 note:
 *   'react-native-reanimated/plugin' is intentionally absent.
 *   Reanimated v4 uses wrapWithReanimatedMetroConfig() in metro.config.cjs.
 */

module.exports = function (api) {
  api.cache.using(() => process.env.NODE_ENV);

  return {
    presets: [
      [
        "babel-preset-expo",
        {
          jsxImportSource: "nativewind",
          unstable_transformImportMeta: true,
        },
      ],
      // "nativewind/babel" REMOVED — NativeWind v4 is Metro-only.
      // Adding it here triggers react-native-css-interop/babel which
      // requires react-native-worklets/plugin and crashes the Vercel build.
    ],
    plugins: [
      [
        "module-resolver",
        {
          root: ["./"],
          alias: {
            "@/app": "./app",
            "@/components": "./components",
            "@/constants": "./constants",
            "@/hooks": "./hooks",
            "@/lib": "./lib",
            "@/services": "./services",
            "@/store": "./store",
            "@/types": "./types",
            "@/utils": "./utils",
          },
        },
      ],
    ],
  };
};
