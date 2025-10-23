import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/main.ts"],
  format: ["esm"],
  target: "es2020",
  outDir: "module/scripts",
  sourcemap: true,
  clean: true,
  dts: false,
  minify: false,
  treeshake: true
});
