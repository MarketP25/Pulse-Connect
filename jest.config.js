/** @type {import('jest').Config} */
export default {
  testEnvironment: "jsdom",

  rootDir: process.cwd(),

  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],

  moduleNameMapper: {
    "\\.(css|less|scss|sass)$": "identity-obj-proxy",

    "^@pulsco/csi$": "<rootDir>/packages/csi",
    "^@pulsco/aseo-core$": "<rootDir>/packages/aseo-core",
    "^@pulsco/aseo-content-engine$": "<rootDir>/packages/aseo-content-engine",
    "^@pulsco/programmatic-seo$": "<rootDir>/packages/programmatic-seo",
    "^@pulsco/seo-schema-engine$": "<rootDir>/packages/seo-schema-engine",
    "^@pulsco/aseo-csi-adapter$": "<rootDir>/packages/aseo-csi-adapter",
    "^@pulsco/seo-realtime-engine$": "<rootDir>/packages/seo-realtime-engine",
    "^@pulsco/content-refresh-engine$": "<rootDir>/packages/content-refresh-engine",
    "^@pulsco/gso-delivery-engine$": "<rootDir>/packages/gso-delivery-engine",
    "^@pulsco/linking-engine$": "<rootDir>/packages/linking-engine",
    "^@pulsco/authority-engine$": "<rootDir>/packages/authority-engine",
    "^@pulsco/seo-control-center$": "<rootDir>/packages/seo-control-center",

    // Shared alias (adjust if needed)
    "^@/(.*)$": "<rootDir>/src/$1",

    // Fix ESM relative imports
    "^(\\.{1,2}/.*)\\.js$": "$1"
  },

  transform: {
    "^.+\\.(ts|tsx|js|jsx)$": [
      "babel-jest",
      { configFile: "./babel.config.cjs" }
    ]
  },

  extensionsToTreatAsEsm: [".ts", ".tsx"],

  testPathIgnorePatterns: [
    "/node_modules/",
    "/dist/",
    "/build/"
  ],

  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],

  passWithNoTests: true
};
