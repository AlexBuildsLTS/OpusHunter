/**
 * babel.config.cjs
 * VeraxAI Core: NativeWind v4, Reanimated v4 Worklets & Production Hardening
 *
 * FIX (2026-06-22): Removed 'react-native-reanimated/plugin' from Babel plugins.
 *
 * WHY: react-native-reanimated v4 (4.x) no longer uses a Babel plugin for its
 * worklets transformation. Instead, it hooks into Metro via
 * `wrapWithReanimatedMetroConfig()` in metro.config.cjs (already present).
 * The old Babel plugin path internally calls `require('react-native-worklets/plugin')`
 * which does NOT exist in react-native-worklets@0.7.x, causing the
 * "Cannot find module 'react-native-worklets/plugin'" crash at Metro startup.
 *
 * The metro.config.cjs already has `wrapWithReanimatedMetroConfig(config)` as
 * the final export — that is the ONLY integration point needed for Reanimated v4.
 */
module.exports = function (api) {
  // Cache the configuration based on the environment (development vs production)
  api.cache.using(() => process.env.NODE_ENV);

  const isProd = api.env("production");

  // Base plugins required for VeraxAI architecture
  // NOTE: 'react-native-reanimated/plugin' intentionally removed for Reanimated v4.
  // Reanimated v4 uses wrapWithReanimatedMetroConfig() in metro.config.cjs instead.
  const plugins = [
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
  ];

  // STRATEGIC INJECTION: Strip all console logs ONLY in production.
  // We preserve 'error' and 'warn' for catastrophic crash reporting.
  if (isProd) {
    plugins.push(["transform-remove-console", { exclude: ["error", "warn"] }]);
  }

  return {
    presets: [
      [
        "babel-preset-expo",
        {
          jsxImportSource: "nativewind",
          unstable_transformImportMeta: true,
        },
      ],
      "nativewind/babel",
    ],
    plugins: plugins,
  };
};
