import { defineConfig } from "vite";

export default defineConfig({
  root: ".",
  // Relative URLs så dist virker ved direkte åbning af index.html og hosting i undermappe
  base: "./",
  plugins: [
    {
      name: "serve-de-locale",
      configureServer(server) {
        server.middlewares.use((req, _res, next) => {
          const raw = req.url ?? "";
          const pathOnly = raw.split("?")[0] ?? "";
          if (pathOnly === "/de" || pathOnly === "/de/") {
            req.url = "/index.html" + (raw.includes("?") ? "?" + raw.split("?")[1] : "");
          }
          next();
        });
      },
    },
  ],
});
