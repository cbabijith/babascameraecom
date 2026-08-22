import { defineConfig, globalIgnores } from "eslint/config";
import nextConfig from "@babascamera/config/eslint/next";

export default defineConfig(
  nextConfig,
  {
    rules: {
      // Allow the idiomatic `x == null` (null | undefined) checks.
      eqeqeq: ["error", "smart"],
      // eslint-plugin-react-hooks v7 ships React-Compiler-era heuristics
      // (set-state-in-effect, static-components, immutability, incompatible-library).
      // The legacy storefront intentionally uses setState-in-effect data flows
      // and react-hook-form's documented API, so these stay off until a
      // compiler migration is planned.
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/static-components": "off",
      "react-hooks/immutability": "off",
      "react-hooks/incompatible-library": "off",
    },
  },
  globalIgnores([
    ".next/**",
    ".next-legacy/**",
    "legacy-src/**",
    "node_modules/**",
  ]),
);
