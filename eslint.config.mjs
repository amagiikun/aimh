import nextConfig from "eslint-config-next/core-web-vitals";

/** @type {import('eslint').FlatConfig[]} */
const config = [
  ...nextConfig,
  {
    rules: {
      "@next/next/no-img-element": "off",
      "react-hooks/set-state-in-effect": "off",
    },
  },
];

export default config;
