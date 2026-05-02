import { defineConfig } from "vite";

export default defineConfig({
  root: ".",
  // Rod-relative /assets/… virker på /, /de/ og /en/ (./assets fejler under /de/).
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
