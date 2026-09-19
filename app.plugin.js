const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withNestlingYouTubePlayer(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    const permissions = manifest['uses-permission'] ?? [];
    if (!permissions.some((permission) => permission.$?.['android:name'] === 'android.permission.INTERNET')) {
      permissions.push({ $: { 'android:name': 'android.permission.INTERNET' } });
    }
    manifest['uses-permission'] = permissions;
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
};
