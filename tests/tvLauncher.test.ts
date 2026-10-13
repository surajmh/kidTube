jest.mock('@expo/config-plugins', () => ({
  withAndroidManifest: (config: unknown, action: (config: unknown) => unknown) => action(config),
  withDangerousMod: (config: unknown) => config,
}));

const withKidTubeYouTubePlayer = require('../app.plugin');

test('TV launcher survives repeated prebuilds and preserves the mobile launcher', () => {
  const activity = {
    $: { 'android:name': '.MainActivity' } as Record<string, string>,
    'intent-filter': [{
      action: [{ $: { 'android:name': 'android.intent.action.MAIN' } }],
      category: [{ $: { 'android:name': 'android.intent.category.LAUNCHER' } }],
    }],
  };
  const config = { modResults: { manifest: { application: [{ activity: [activity] }] } } };

  withKidTubeYouTubePlayer(config);
  withKidTubeYouTubePlayer(config);

  expect(activity.$['android:banner']).toBe('@drawable/tv_banner');
  expect(activity['intent-filter'][0].category.map((category) => category.$['android:name'])).toEqual([
    'android.intent.category.LAUNCHER',
    'android.intent.category.LEANBACK_LAUNCHER',
  ]);
});
