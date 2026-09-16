// Adapted from expo/config-plugins' (unpublished, PR #326) experimental
// expo-uiscene-lifecycle plugin — Xcode 27 requires apps to adopt UIKit's
// scene lifecycle to launch at all (see expo/expo#46664), and SDK 57's own
// fix for this isn't in a published npm package yet. Ported here directly
// against our actual generated AppDelegate.swift (which wraps the legacy
// startup code in `#if os(iOS) || os(tvOS)` — the upstream plugin's string
// match doesn't include that wrapper, so it's adjusted below to remove the
// whole conditional block, not just the code inside it).
//
// Remove this plugin (and expo-uiscene-lifecycle from package.json, if we
// ever add it) once Expo ships a real fix for this in the SDK itself.

const { withAppDelegate, withInfoPlist } = require('expo/config-plugins');

const ORIGINAL_APP_DELEGATE = 'class AppDelegate: ExpoAppDelegate {';
const SCENE_APP_DELEGATE =
  'class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider {';
const LEGACY_STARTUP_BLOCK = `
#if os(iOS) || os(tvOS)
    window = UIWindow(frame: UIScreen.main.bounds)
    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: launchOptions)
#endif
`;

const SCENE_MANIFEST = {
  UIApplicationSupportsMultipleScenes: false,
  UISceneConfigurations: {
    UIWindowSceneSessionRoleApplication: [
      {
        UISceneConfigurationName: 'Default Configuration',
        UISceneDelegateClassName: 'EXExpoAppSceneDelegate',
      },
    ],
  },
};

function withUISceneLifecycle(config) {
  config = withAppDelegate(config, (config) => {
    if (config.modResults.language !== 'swift') {
      throw new Error('withUISceneLifecycle requires the standard Expo SDK 57 Swift AppDelegate.');
    }
    let contents = config.modResults.contents;
    if (!contents.includes(SCENE_APP_DELEGATE)) {
      if (!contents.includes(ORIGINAL_APP_DELEGATE) || !contents.includes(LEGACY_STARTUP_BLOCK)) {
        throw new Error(
          'withUISceneLifecycle: AppDelegate.swift doesn\'t match the expected SDK 57 template — check it by hand.'
        );
      }
      contents = contents
        .replace(ORIGINAL_APP_DELEGATE, SCENE_APP_DELEGATE)
        .replace(LEGACY_STARTUP_BLOCK, '\n');
    }
    config.modResults.contents = contents;
    return config;
  });

  return withInfoPlist(config, (config) => {
    config.modResults.UIApplicationSceneManifest = SCENE_MANIFEST;
    return config;
  });
}

module.exports = withUISceneLifecycle;
