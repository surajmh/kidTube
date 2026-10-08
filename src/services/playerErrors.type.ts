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
