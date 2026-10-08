import { useState } from 'react';

/**
 * State shared by the channel and video lookups: what was typed, what came back, which match is
 * picked, and whether the parent wants it approved or only saved.
 */
export function useMatchLookup<T>({ find, keyOf }: { find: (query: string) => Promise<T[]>; keyOf: (item: T) => string }) {
  const [query, setQuery] = useState('');
  const [matches, setMatches] = useState<T[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [allow, setAllow] = useState(true);

  async function run(text: string = query) {
    setBusy(true);
    setError('');
    setMatches([]);
    setSelectedKey(null);
    try {
      const found = await find(text);
      setMatches(found);
      // One answer needs no extra tap.
      if (found.length === 1) setSelectedKey(keyOf(found[0]));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'That could not be looked up.');
    } finally {
      setBusy(false);
    }
  }

  function changeQuery(value: string) {
    setQuery(value);
    setMatches([]);
    setSelectedKey(null);
    setError('');
  }

  function tryExample(text: string) {
    setQuery(text);
    void run(text);
  }

  /** Runs `save` for the picked match; a failure leaves the form open with the reason shown. */
  async function submit(save: (match: T) => Promise<void>, nothingPicked: string) {
    const selected = matches.find((match) => keyOf(match) === selectedKey);
    if (!selected) {
      setError(nothingPicked);
      return;
    }
    setSaving(true);
    setError('');
    try {
      await save(selected);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'That could not be saved.');
    } finally {
      setSaving(false);
    }
  }

  const selected = matches.find((match) => keyOf(match) === selectedKey) ?? null;
  return { query, changeQuery, matches, selected, selectedKey, select: setSelectedKey, busy, saving, error, setError, allow, setAllow, run, tryExample, submit };
}
