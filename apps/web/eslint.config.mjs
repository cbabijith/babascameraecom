import { defineConfig, globalIgnores } from "eslint/config";
import nextConfig from "@babascamera/config/eslint/next";

export default defineConfig(
  nextConfig,
  globalIgnores([
    ".next/**",
    ".next-legacy/**",
    "legacy-src/**",
    "node_modules/**",
  ]),
);
