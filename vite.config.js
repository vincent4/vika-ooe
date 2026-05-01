import { defineConfig } from "vite";

export default defineConfig({
  root: ".",
  // Relative URLs så dist virker ved direkte åbning af index.html og hosting i undermappe
  base: "./",
});
