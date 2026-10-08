import { useEffect, useState } from 'react';

/** Per-video player option state (speed, quality, captions, settings panel). */
export function usePlayerOptions(youtubeVideoId: string) {
  const [speed, setSpeed] = useState(1);
  const [quality, setQuality] = useState(0);
  const [captionTrack, setCaptionTrack] = useState<string | null>(null);
  const [captionScale, setCaptionScale] = useState(1);
  const [tracks, setTracks] = useState<{ captions: { id: string; label: string }[]; heights: number[] }>({ captions: [], heights: [] });
  const [optionsOpen, setOptionsOpen] = useState(false);
  useEffect(() => {
    setTracks({ captions: [], heights: [] });
    setCaptionTrack(null);
    setQuality(0);
    setOptionsOpen(false);
  }, [youtubeVideoId]);
  return { speed, setSpeed, quality, setQuality, captionTrack, setCaptionTrack, captionScale, setCaptionScale, tracks, setTracks, optionsOpen, setOptionsOpen };
}
