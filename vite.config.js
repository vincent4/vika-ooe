import { defineConfig } from "vite";

export default defineConfig({
  root: ".",
  // Rod-relative asset-stier (/assets/…) så CSS/JS også virker på /de/ (relative ./assets fejler dér).
  // Lokal forhåndsvisning: npm run preview (eller åbn via dev-server), ikke file:// på dist/index.html.
  base: "/",
  plugins: [
    {
      name: "serve-de-locale",
      configureServer(server) {
        server.middlewares.use((req, _res, next) => {
          const raw = req.url ?? "";
          const pathOnly = raw.split("?")[0] ?? "";
          if (
            pathOnly === "/de" ||
            pathOnly === "/de/" ||
            pathOnly === "/en" ||
            pathOnly === "/en/"
          ) {
            req.url = "/index.html" + (raw.includes("?") ? "?" + raw.split("?")[1] : "");
          }
          next();
        });
      },
    },
  ],
});
