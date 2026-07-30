import { defineConfig, globalIgnores } from "eslint/config";
import nextConfig from "@babascamera/config/eslint/next";

export default defineConfig(
  nextConfig,
  {
    rules: {
      // These React Compiler diagnostics are not correctness rules. The admin
      // intentionally synchronizes local optimistic state from server props,
      // and dnd-kit exposes callback refs/attributes during render.
      "react-hooks/refs": "off",
      "react-hooks/set-state-in-effect": "off",
    },
  },
  globalIgnores([
    ".next/**",
    ".next-legacy/**",
    "legacy-src/**",
    "node_modules/**",
  ]),
);
