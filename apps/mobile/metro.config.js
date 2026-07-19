const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');
const appNodeModules = path.resolve(projectRoot, 'node_modules');

const config = getDefaultConfig(projectRoot);

// Only use workspace root in local development, not in EAS Build
const fs = require('fs');
if (fs.existsSync(path.join(workspaceRoot, 'package.json'))) {
  config.watchFolders = [workspaceRoot];
  config.resolver.nodeModulesPaths = [
    appNodeModules,
    path.resolve(workspaceRoot, 'node_modules'),
  ];
}

const defaultResolveRequest = require('metro-resolver').resolve;

const forceLocal = [
  'react',
  'react-native-screens',
  'react-native-svg',
  'react-native-reanimated',
  'react-native-safe-area-context',
  'react-native-gesture-handler',
];

config.resolver.resolveRequest = (context, moduleName, platform) => {
  const isReactSubpath = moduleName === 'react' || moduleName.startsWith('react/');
  const isForced = isReactSubpath || forceLocal.includes(moduleName);

  if (isForced) {
    const targetFile = isReactSubpath
      ? (moduleName === 'react'
          ? path.join(appNodeModules, 'react', 'index.js')
          : path.join(appNodeModules, moduleName))
      : null;

    if (targetFile) {
      try {
        const resolved = require.resolve(targetFile);
        return { type: 'sourceFile', filePath: resolved };
      } catch {}
    }

    try {
      const resolved = require.resolve(moduleName, { paths: [appNodeModules] });
      return { type: 'sourceFile', filePath: resolved };
    } catch {}
  }

  return defaultResolveRequest(context, moduleName, platform);
};

module.exports = config;
