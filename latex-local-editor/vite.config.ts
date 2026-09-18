import {defineConfig} from "vite";
import react from "@vitejs/plugin-react";

const apiPort = Number(process.env.THESIS_LATEX_EDITOR_API_PORT || 5185);
const clientPort = Number(process.env.THESIS_LATEX_EDITOR_PORT || 5184);
const apiTarget = `http://127.0.0.1:${apiPort}`;

export default defineConfig({
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    port: clientPort,
    strictPort: true,
    proxy: {
      "/api": {target: apiTarget, changeOrigin: true},
      "/ws": {target: apiTarget, ws: true},
    },
  },
  preview: {
    host: "127.0.0.1",
    port: clientPort,
    strictPort: true,
    proxy: {
      "/api": {target: apiTarget, changeOrigin: true},
      "/ws": {target: apiTarget, ws: true},
    },
  },
  build: {outDir: "dist", emptyOutDir: true},
  optimizeDeps: {include: ["pdfjs-dist"]},
});
