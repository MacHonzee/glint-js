let config = require("glint-js-kit/src/config/server.eslintrc.cjs");

// Extend the base config with TypeScript support
module.exports = {
  ...config,
  // Use the base parser for JavaScript files by default
  plugins: [...(config.plugins || []), "@typescript-eslint"],
  overrides: [
    ...(config.overrides || []),
    {
      // TypeScript files - use TypeScript parser and rules
      files: ["*.ts", "*.tsx"],
      parser: "@typescript-eslint/parser",
      parserOptions: {
        project: "./tsconfig.json",
        ecmaVersion: 2022,
        sourceType: "module",
      },
      extends: [
        "plugin:@typescript-eslint/recommended",
        "plugin:@typescript-eslint/recommended-requiring-type-checking",
      ],
      rules: {
        // Type safety - keep these strict
        "@typescript-eslint/no-floating-promises": "error",
        "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],

        // Allow 'any' for gradual migration - these are too noisy
        "@typescript-eslint/no-explicit-any": "off",
        "@typescript-eslint/no-unsafe-assignment": "off",
        "@typescript-eslint/no-unsafe-member-access": "off",
        "@typescript-eslint/no-unsafe-call": "off",
        "@typescript-eslint/no-unsafe-return": "off",
        "@typescript-eslint/no-unsafe-argument": "off",

        // Allow flexibility for common patterns
        "@typescript-eslint/explicit-function-return-type": "off",
        "@typescript-eslint/no-redundant-type-constituents": "off",
        "@typescript-eslint/restrict-template-expressions": "off",
        "@typescript-eslint/require-await": "off",
        "@typescript-eslint/await-thenable": "off",
        "@typescript-eslint/ban-types": "off",
      },
    },
  ],
};
