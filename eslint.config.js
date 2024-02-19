import { eslintConfig } from "@toridoriv/eslint-config";

/**
 * @type {import("eslint").Linter.FlatConfig[]}
 */
export default [
  ...eslintConfig.javascript.node,
  ...eslintConfig.typescript,
  ...eslintConfig.jsdoc,
  ...eslintConfig.json,
  ...eslintConfig.markdown,
  ...eslintConfig.prettier,
];
