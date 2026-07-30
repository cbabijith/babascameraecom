import { FlatCompat } from "@eslint/eslintrc";
import { realpathSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname } from "node:path";

import baseConfig from "./base.mjs";

const require = createRequire(import.meta.url);
const nextConfigDirectory = dirname(realpathSync(require.resolve("eslint-config-next")));

const compat = new FlatCompat({
  baseDirectory: nextConfigDirectory,
  resolvePluginsRelativeTo: nextConfigDirectory,
});

export default [
  ...baseConfig,
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [".next/**", "coverage/**", "next-env.d.ts", "out/**"],
  },
];
