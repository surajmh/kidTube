export type ParsedYouTubeLink =
  | { kind: 'video'; id: string }
  | { kind: 'channel'; id: string }
  | { kind: 'unknown' };
