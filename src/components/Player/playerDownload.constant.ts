export const DOWNLOAD_COPY = {
  download: 'Download',
  tryAgain: 'Try again',
  downloaded: 'Downloaded',
  preparing: 'Getting ready…',
  chooseQuality: 'Choose quality',
  cancel: 'Cancel',
  failed: "Can't download this video right now.",
};

export const QUALITY_LABELS: { min: number; label: string }[] = [
  { min: 1080, label: 'Best' },
  { min: 720, label: 'HD' },
  { min: 0, label: 'Saves data' },
];
