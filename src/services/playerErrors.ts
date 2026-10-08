export type PlayerErrorCode =
  | 'INVALID_VIDEO_ID'
  | 'VIDEO_UNAVAILABLE'
  | 'UNSUPPORTED_FORMAT'
  | 'NETWORK_ERROR'
  | 'STREAM_EXPIRED'
  | 'PLAYBACK_FAILURE'
  | 'RESOLVER_UNAVAILABLE'
  | 'OFFLINE_UNAVAILABLE'
  | 'POLICY_BLOCKED'
  | 'UNKNOWN_ERROR';

export type PlayerError = {
  code: PlayerErrorCode;
  message: string;
  /** Transient failures the recovery loop may retry. */
  recoverable: boolean;
};

const codeMap: Record<string, PlayerErrorCode> = {
  offline_unavailable: 'OFFLINE_UNAVAILABLE',
  invalid_video_id: 'INVALID_VIDEO_ID',
  video_unavailable: 'VIDEO_UNAVAILABLE',
  unsupported_format: 'UNSUPPORTED_FORMAT',
  network_error: 'NETWORK_ERROR',
  stream_expired: 'STREAM_EXPIRED',
  playback_failure: 'PLAYBACK_FAILURE',
  resolver_unavailable: 'RESOLVER_UNAVAILABLE',
  // The native allow list refused the id: the bridge could not bypass the parental policy.
  policy_blocked: 'POLICY_BLOCKED',
};

/**
 * A deleted/private video, a bad id, or an unsupported container will never succeed by retrying -
 * the child gets a message instead of a spinner that never resolves.
 */
const recoverableCodes: PlayerErrorCode[] = [
  'NETWORK_ERROR',
  'STREAM_EXPIRED',
  'PLAYBACK_FAILURE',
  'RESOLVER_UNAVAILABLE',
  'UNKNOWN_ERROR',
];

const messages: Record<PlayerErrorCode, string> = {
  OFFLINE_UNAVAILABLE: "This saved video is no longer available. Ask a grown-up to save it again.",
  INVALID_VIDEO_ID: "This video isn't available right now.",
  VIDEO_UNAVAILABLE: "This video isn't available right now.",
  UNSUPPORTED_FORMAT: "This video isn't available right now.",
  NETWORK_ERROR: "The internet connection dropped. Let's try that again.",
  STREAM_EXPIRED: "Let's pick this video back up.",
  PLAYBACK_FAILURE: "This video couldn't start. Let's try again.",
  RESOLVER_UNAVAILABLE: "This video couldn't start. Let's try again.",
  // Deliberately vague: no technical detail is exposed to the child.
  POLICY_BLOCKED: "This video isn't available for your profile.",
  UNKNOWN_ERROR: "This video couldn't start. Let's try again.",
};

/** Recovers the error code attached by an adapter, so a blocked command is not reported as a stall. */
export function playerErrorCodeOf(error: unknown): string | undefined {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = (error as { code?: unknown }).code;
    if (typeof code === 'string') return code;
  }
  return undefined;
}

export function normalizePlayerError(event: { code?: string; message?: string }): PlayerError {
  const code = codeMap[event.code ?? ''] ?? 'UNKNOWN_ERROR';
  return { code, message: messages[code], recoverable: recoverableCodes.includes(code) };
}

export function isRecoverableErrorCode(code: PlayerErrorCode) {
  return recoverableCodes.includes(code);
}
