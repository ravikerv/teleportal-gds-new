import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Browser-only authoring tool. The preview pane will eventually mount
// teleportal-gds renderers in an iframe; for now it's a placeholder.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
  },
});
