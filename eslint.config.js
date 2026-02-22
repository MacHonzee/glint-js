import glintJsKitConfig from "glint-js-kit/src/config/server.eslint.config.js";

export default [
  ...glintJsKitConfig,
  {
    ignores: ["node_modules/**", "coverage/**"],
  },
];
