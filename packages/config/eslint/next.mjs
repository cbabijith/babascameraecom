import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

import baseConfig from "./base.mjs";

export default [
  ...nextVitals,
  ...nextTypeScript,
  ...baseConfig,
  {
    ignores: [".next/**", "coverage/**", "next-env.d.ts", "out/**"],
  },
];
