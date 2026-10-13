import AsyncStorage from '@react-native-async-storage/async-storage';
import type { YouTubePlaybackEvent } from '../../native/YouTubePlayer.types';
import { useEffect, useRef, useState } from 'react';

/** Per-video player option state (speed, quality, captions, settings panel). */
export function usePlayerOptions(youtubeVideoId: string, profileId?: string) {
  const [preference, setPreference] = useState<{ profileId?: string; language: string | null }>({ language: null });
  const [preferenceError, setPreferenceError] = useState('');
  const revision = useRef(0);
  const saves = useRef(Promise.resolve());
  const audioLanguage = preference.profileId === profileId ? preference.language : null;
  const [chapters, setChapters] = useState<NonNullable<YouTubePlaybackEvent['chapters']>>([]);
  useEffect(() => {
    let active = true;
    const version = ++revision.current;
    setPreferenceError('');
    if (profileId) void AsyncStorage.getItem(`player-audio:${profileId}`).then((language) => {
      if (active && revision.current === version) setPreference({ profileId, language });
    }).catch(() => { if (active) setPreferenceError('Could not load your audio preference.'); });
    return () => { active = false; };
  }, [profileId]);
  function setAudioLanguage(language: string | null) {
    ++revision.current;
    setPreference({ profileId, language });
    setPreferenceError('');
    if (profileId) saves.current = saves.current.then(() => language
      ? AsyncStorage.setItem(`player-audio:${profileId}`, language)
      : AsyncStorage.removeItem(`player-audio:${profileId}`)).catch(() => {
        setPreferenceError('Audio changed, but your preference could not be saved.');
      });
  }
  const [speed, setSpeed] = useState(1);
  const [quality, setQuality] = useState(0);
  const [captionTrack, setCaptionTrack] = useState<string | null>(null);
  const [captionScale, setCaptionScale] = useState(1);
  const [tracks, setTracks] = useState<{ captions: { id: string; label: string }[]; heights: number[]; audio: NonNullable<YouTubePlaybackEvent['audio']> }>({ captions: [], heights: [], audio: [] });
  const [optionsOpen, setOptionsOpen] = useState(false);
  useEffect(() => {
    setTracks({ captions: [], heights: [], audio: [] });
    setChapters([]);
    setCaptionTrack(null);
    setQuality(0);
    setOptionsOpen(false);
  }, [youtubeVideoId]);
  return { audioLanguage, setAudioLanguage, preferenceError, chapters, setChapters, speed, setSpeed, quality, setQuality, captionTrack, setCaptionTrack, captionScale, setCaptionScale, tracks, setTracks, optionsOpen, setOptionsOpen };
}
