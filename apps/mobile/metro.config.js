// Monorepo-aware Metro config: lets the bundler resolve workspace packages
// (@tilemo/*) living in ../../packages/* and their node_modules.
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// 1. Watch all files in the monorepo (so edits in packages/* hot-reload).
config.watchFolders = [monorepoRoot];

// 2. Resolve modules from both the app's and the root's node_modules.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];

// 3. With pnpm's hoisted linker + disableHierarchicalLookup, resolution is
//    fast and unambiguous across the workspace.
config.resolver.disableHierarchicalLookup = true;

// 4. Dev-server entry root = the app dir. Without this, watchFolders makes
//    Metro resolve the entry (./index) from the monorepo root and fail.
config.server = { ...config.server, projectRoot };

module.exports = config;
