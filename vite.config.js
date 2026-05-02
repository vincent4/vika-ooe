import { defineConfig } from "vite";

export default defineConfig({
  root: ".",
  // Relative asset-stier (./assets/…). På /de/ og /en/ indsættes <base href="…/"> i index.html,
  // så CSS/JS stadig hentes fra roden (se inline script øverst i <head>).
  base: "./",
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
