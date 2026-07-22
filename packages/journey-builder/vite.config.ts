import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Browser-only authoring tool. The preview pane will eventually mount
// teleportal-gds renderers in an iframe; for now it's a placeholder.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // govuk-frontend's CSS still carries IE-era `@media screen\0` hacks that
  // LightningCSS rejects during minification; errorRecovery strips them.
  // nhsuk-frontend bleeding is handled at build time instead: see
  // scripts/scope-nhsuk-css.mjs (predev/prebuild) — Vite 8's LightningCSS
  // transformer does not run postcss configs.
  css: {
    lightningcss: {
      errorRecovery: true,
    },
  },
  server: {
    port: 5173,
  },
});
