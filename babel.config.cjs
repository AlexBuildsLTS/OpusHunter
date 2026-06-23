/**
 * babel.config.cjs
 * OpusHunter — Babel Configuration
 *
 * CRITICAL FIX (Vercel build crash):
 *   The previous version conditionally pushed "transform-remove-console"
 *   in production via:
 *     if (isProd) plugins.push(["transform-remove-console", ...])
 *
 *   However, babel-plugin-transform-remove-console is NOT in package.json
 *   (not in dependencies, not in devDependencies). Vercel always runs
 *   NODE_ENV=production, so every Vercel build hit this branch, Babel tried
 *   to require() the missing module, and Metro crashed:
 *     "Error: Cannot find module 'babel-plugin-transform-remove-console'"
 *
 *   FIX: Removed the plugin entirely. Console stripping is a nice-to-have
 *   optimization — it is not worth a broken deployment. If you want it back,
 *   first add the package: npm install -D babel-plugin-transform-remove-console
 *   then re-add the conditional block below.
 *
 * Reanimated v4 note:
 *   'react-native-reanimated/plugin' is intentionally absent. Reanimated v4
 *   uses wrapWithReanimatedMetroConfig() in metro.config.cjs instead.
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
      "nativewind/babel",
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
      // babel-plugin-transform-remove-console removed — package not installed.
      // To restore: npm install -D babel-plugin-transform-remove-console
      // then add: ['transform-remove-console', { exclude: ['error', 'warn'] }]
    ],
  };
};
