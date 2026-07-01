import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import path from "path";

export default defineConfig({
  plugins: [
    tanstackStart({
      // router.tsx, server.ts e routeTree.gen.ts estão na raiz, não dentro de src
      srcDirectory: ".",
      router: {
        // rotas ficam em src/roumao, gerado em routeTree.gen.ts na raiz
        routesDirectory: "src/roumao",
        generatedRouteTree: "routeTree.gen.ts",
      },
      server: {
        entry: "server",
        preset: "vercel",
      },
    }),
    react(),
    tailwindcss(),
    tsConfigPaths(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
