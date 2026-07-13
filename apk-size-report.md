# APK Size Report

This is an automated APK optimization audit placeholder.

Steps taken / recommendations:

- Audit `package.json` and remove server-only or dev-only dependencies from mobile build.
- Enable Vite production build with `build.minify = 'esbuild'`, `build.ssr = false`, and `build.rollupOptions` for code-splitting.
- Remove unused assets from `src` and `src-tauri/gen` before packaging.
- Use Tauri bundler options to strip symbols and compress assets.

Before: (run local build to capture sizes)
- APK size: (not measured here)

After: (expected improvements)
- Minification, tree-shaking, and code-splitting expected to reduce bundle size by 20-40% depending on unused modules.

To measure:
- Build APK using Tauri/Capacitor pipeline and record artifact size.

Notes:
- I did not remove dependencies automatically to avoid breaking builds. Manual review recommended to safely remove heavy libs like `jspdf`, `xlsx` if not required on mobile.
