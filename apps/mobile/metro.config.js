const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);
const domainEntry = path.resolve(__dirname, "../../packages/domain/src/index.ts");

config.watchFolders = [path.resolve(__dirname, "../..")];
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "@skys/domain") {
    return { filePath: domainEntry, type: "sourceFile" };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
