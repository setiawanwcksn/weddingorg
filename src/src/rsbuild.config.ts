import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';

export default defineConfig({
  html: {
    title: 'Attari Wedding Organizer',
    meta: {
      description: 'Aplikasi untuk mengelola tamu undangan pernikahan',
    },
  },
  plugins: [pluginReact()],
  source: { entry: { index: './index.tsx' } },
  output: { distPath: { root: 'dist' } },
  env: {
    VITE_API_URL: process.env.VITE_API_URL ?? 'http://localhost:8787',
  },
});
