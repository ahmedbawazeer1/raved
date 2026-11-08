// Metro (the React Native bundler) also reads ../shared, the code shared with the web app.
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const config = getDefaultConfig(projectRoot);

config.watchFolders = [path.resolve(projectRoot, "../shared")];
config.resolver.nodeModulesPaths = [path.resolve(projectRoot, "node_modules")];

// Packages imported by shared code always come from mobile/node_modules (never the web app's copy).
const SHARED_DEPS = ["zod"];
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (SHARED_DEPS.some((d) => moduleName === d || moduleName.startsWith(`${d}/`))) {
    return context.resolveRequest({ ...context, originModulePath: path.join(projectRoot, "package.json") }, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
