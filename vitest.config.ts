import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  plugins: [react() as any],
  test: {
    environment: "happy-dom",
    setupFiles: ["./vitest.setup.ts"],
    globals: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@modules": path.resolve(__dirname, "./src/modules"),
      "@shared": path.resolve(__dirname, "./src/shared"),
      "@components": path.resolve(__dirname, "./src/shared/components"),
      "@hooks": path.resolve(__dirname, "./src/shared/hooks"),
      "@types": path.resolve(__dirname, "./src/shared/types"),
      "@services": path.resolve(__dirname, "./src/services"),
      "@lib": path.resolve(__dirname, "./src/lib"),
    },
  },
});
