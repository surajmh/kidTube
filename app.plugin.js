const { withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');
const fs = require('node:fs/promises');
const path = require('node:path');

module.exports = function withKidTubeYouTubePlayer(config) {
  config = withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    const permissions = manifest['uses-permission'] ?? [];
    if (!permissions.some((permission) => permission.$?.['android:name'] === 'android.permission.INTERNET')) {
      permissions.push({ $: { 'android:name': 'android.permission.INTERNET' } });
    }
    manifest['uses-permission'] = permissions;
    const activity = manifest.application?.[0]?.activity?.find((item) => item.$?.['android:name'] === '.MainActivity');
    if (activity) {
      activity.$['android:banner'] = '@drawable/tv_banner';
      const launcher = activity['intent-filter']?.find((filter) =>
        filter.action?.some((action) => action.$?.['android:name'] === 'android.intent.action.MAIN')
      );
      if (launcher) {
        const categories = launcher.category ?? [];
        if (!categories.some((category) => category.$?.['android:name'] === 'android.intent.category.LEANBACK_LAUNCHER')) {
          categories.push({ $: { 'android:name': 'android.intent.category.LEANBACK_LAUNCHER' } });
        }
        launcher.category = categories;
      }
      activity.$['android:supportsPictureInPicture'] = 'true';
      activity.$['android:resizeableActivity'] = 'true';
      const changes = new Set((activity.$['android:configChanges'] ?? '').split('|').filter(Boolean));
      changes.add('smallestScreenSize');
      activity.$['android:configChanges'] = [...changes].join('|');
    }
    const features = manifest['uses-feature'] ?? [];
    if (!features.some((feature) => feature.$?.['android:name'] === 'android.software.leanback')) {
      features.push({ $: { 'android:name': 'android.software.leanback', 'android:required': 'false' } });
    }
    if (!features.some((feature) => feature.$?.['android:name'] === 'android.hardware.touchscreen')) {
      features.push({ $: { 'android:name': 'android.hardware.touchscreen', 'android:required': 'false' } });
    }
    manifest['uses-feature'] = features;
    return config;
  });
  return withDangerousMod(config, ['android', async (config) => {
    const destination = path.join(config.modRequest.platformProjectRoot, 'app/src/main/res/drawable-xhdpi');
    await fs.mkdir(destination, { recursive: true });
    await fs.copyFile(path.join(config.modRequest.projectRoot, 'assets/tv-banner.png'), path.join(destination, 'tv_banner.png'));
    return config;
  }]);
};
