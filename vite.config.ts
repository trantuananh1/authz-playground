import path from "node:path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  // GitHub Pages serves the site from /<repo>/; everywhere else it lives at the root
  base: process.env.PAGES_BASE ?? "/",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "./src") },
  },
  // the production build is served through a Cloudflare quick tunnel
  preview: { allowedHosts: [".trycloudflare.com"] },
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: "codemirror", test: /node_modules[\\/](@codemirror|@lezer|@uiw|codemirror)/ },
            { name: "graph", test: /node_modules[\\/](@xyflow|@dagrejs|d3-)/ },
            { name: "vendor", test: /node_modules/ },
          ],
        },
      },
    },
  },
})
