import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { cloudflare } from "@cloudflare/vite-plugin";

const isTest = process.env.VITEST === "true";

export default defineConfig({
  plugins: isTest ? [react()] : [react(), cloudflare()],
  test: {
    environment: "node",
  },
});
