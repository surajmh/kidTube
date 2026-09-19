import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ContentProviderSettings } from '../services/content/providerSettings';
import { describeProvider } from '../services/content/providerSettingsRules';
import { colors } from './theme';
import { FocusablePressable } from './tv';

/**
 * Parent Mode > Playback > Metadata provider.
 *
 * This is the whole point of the provider boundary: the parent points the app at
 * their own deployed endpoint, and the YouTube API key lives there. Nothing
 * secret is entered here — the optional token is a proxy credential, not the
 * Google key, and the copy says so.
 */
export function ParentProviderSettings({
  settings,
  onSave,
  onDisconnect,
}: {
  settings?: ContentProviderSettings;
  onSave: (endpointUrl: string, token: string) => Promise<string | null>;
  onDisconnect: () => Promise<void>;
}) {
  const [endpointUrl, setEndpointUrl] = useState(settings?.endpointUrl ?? '');
  const [token, setToken] = useState(settings?.token ?? '');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);

  // Keep the fields in step when the stored settings change underneath us.
  useEffect(() => {
    setEndpointUrl(settings?.endpointUrl ?? '');
    setToken(settings?.token ?? '');
  }, [settings?.endpointUrl, settings?.token]);

  async function save() {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const failure = await onSave(endpointUrl, token);
      if (failure) setError(failure);
      else setNotice('Provider saved. Approved channels will load their videos automatically.');
    } finally {
      setSaving(false);
    }
  }

  const connected = Boolean(settings?.endpointUrl);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.icon}><Feather name="cloud" size={17} color={colors.purple} /></View>
        <View style={styles.headerText}>
          <Text style={styles.title}>Metadata provider</Text>
          <Text style={styles.body}>
            Channel videos are fetched from your own endpoint, so the YouTube API key never reaches this device.
            See server/youtube-proxy in the project for a ready-to-deploy one.
          </Text>
        </View>
      </View>

      <View style={styles.statusRow}>
        <Feather name={connected ? 'check-circle' : 'alert-circle'} size={13} color={connected ? colors.mintDark : colors.muted} />
        <Text style={[styles.statusText, connected && styles.statusTextOn]}>{describeProvider(settings)}</Text>
      </View>

      <Text style={styles.label}>PROVIDER URL</Text>
      <TextInput
        value={endpointUrl}
        onChangeText={setEndpointUrl}
        placeholder="https://your-worker.workers.dev"
        placeholderTextColor="#B8B1AA"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        style={styles.input}
        accessibilityLabel="Metadata provider URL"
      />

      <Text style={styles.label}>PROVIDER TOKEN (OPTIONAL)</Text>
      <TextInput
        value={token}
        onChangeText={setToken}
        placeholder="Only if your endpoint requires one"
        placeholderTextColor="#B8B1AA"
        autoCapitalize="none"
        autoCorrect={false}
        secureTextEntry
        style={styles.input}
        accessibilityLabel="Metadata provider token"
      />
      <Text style={styles.hint}>
        This is your proxy token, not your YouTube API key. The key stays on the server.
      </Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}

      <View style={styles.buttonRow}>
        <FocusablePressable accessibilityLabel="Save provider" style={styles.save} disabled={saving} onPress={() => void save()}>
          <Feather name="link" size={15} color="#fff" />
          <Text style={styles.saveText}>{saving ? 'Saving…' : 'Connect'}</Text>
        </FocusablePressable>
        {connected ? (
          <FocusablePressable
            accessibilityLabel="Disconnect provider"
            style={styles.disconnect}
            onPress={() => void onDisconnect().then(() => setNotice('Disconnected. Cached channel videos are kept.'))}
          >
            <Text style={styles.disconnectText}>Disconnect</Text>
          </FocusablePressable>
        ) : null}
      </View>

      <Text style={styles.footnote}>
        Disconnecting stops new fetches. Videos already saved stay in your library, and nothing is sent to
        YouTube until you refresh a channel.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: 20, marginTop: 18, padding: 16 },
  header: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  icon: { alignItems: 'center', backgroundColor: colors.lavender, borderRadius: 18, height: 38, justifyContent: 'center', width: 38 },
  headerText: { flex: 1 },
  title: { color: colors.ink, fontSize: 16, fontWeight: '800' },
  body: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 4 },
  statusRow: { alignItems: 'center', flexDirection: 'row', gap: 6, marginTop: 14 },
  statusText: { color: colors.muted, fontSize: 12, fontWeight: '800' },
  statusTextOn: { color: colors.mintDark },
  label: { color: colors.muted, fontSize: 11, fontWeight: '900', letterSpacing: 1, marginBottom: 7, marginTop: 16 },
  input: { backgroundColor: colors.canvas, borderRadius: 13, color: colors.ink, fontSize: 14, height: 50, paddingHorizontal: 13 },
  hint: { color: colors.muted, fontSize: 11, lineHeight: 15, marginTop: 7 },
  error: { color: colors.danger, fontSize: 12, fontWeight: '700', marginTop: 11 },
  notice: { color: colors.mintDark, fontSize: 12, fontWeight: '700', marginTop: 11 },
  buttonRow: { flexDirection: 'row', gap: 9, marginTop: 15 },
  save: { alignItems: 'center', backgroundColor: colors.purple, borderRadius: 13, flexDirection: 'row', gap: 8, justifyContent: 'center', minHeight: 50, paddingHorizontal: 20 },
  saveText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  disconnect: { alignItems: 'center', backgroundColor: colors.canvas, borderRadius: 13, justifyContent: 'center', minHeight: 50, paddingHorizontal: 16 },
  disconnectText: { color: colors.danger, fontSize: 13, fontWeight: '800' },
  footnote: { color: colors.muted, fontSize: 11, lineHeight: 15, marginTop: 13 },
});
