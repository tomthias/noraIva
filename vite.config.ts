import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Base path per GitHub Pages (da configurare con il nome della repo)
  base: "/noraIva/",
});
