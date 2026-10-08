import { ApprovedVideo, CuratedPlaylist } from '../types';
import { readJson, storageKeys, writeJson } from '../repositories/storage';
import { ParentSession, parentSessionService } from './auth/parentSession';
import { id } from '../utils/id';

/** Membership never approves content: always resolve against the child's filtered library. */
export function playlistVideos(playlist: CuratedPlaylist, allowedVideos: ApprovedVideo[]): ApprovedVideo[] {
  const byId = new Map(allowedVideos.map((video) => [video.id, video]));
  return [...new Set(playlist.videoIds)].flatMap((id) => byId.get(id) ? [byId.get(id)!] : []);
}

export function shuffleVideos(videos: ApprovedVideo[], random = Math.random): ApprovedVideo[] {
  const result = [...videos];
  for (let index = result.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}

/** A playlist queue ends, rather than falling through to unrelated library videos. */
export function nextQueuedVideo(queueIds: string[], currentId: string, allowedVideos: ApprovedVideo[]): ApprovedVideo | undefined {
  const index = queueIds.indexOf(currentId);
  if (index < 0) return undefined;
  const allowed = new Map(allowedVideos.map((video) => [video.id, video]));
  for (const id of queueIds.slice(index + 1)) {
    const video = allowed.get(id);
    if (video) return video;
  }
  return undefined;
}

export const playlistService = {
  async getAll(): Promise<CuratedPlaylist[]> {
    const stored = await readJson<unknown>(storageKeys.playlists, []);
    if (!Array.isArray(stored)) return [];
    const seen = new Set<string>();
    return stored.flatMap((row) => {
      if (!row || typeof row.id !== 'string' || !row.id.trim() || seen.has(row.id) || typeof row.name !== 'string' || !row.name.trim() || !Array.isArray(row.videoIds)) return [];
      seen.add(row.id);
      return [{ id: row.id, name: row.name.trim().slice(0, 80), videoIds: [...new Set<string>(row.videoIds.filter((value: unknown) => typeof value === 'string'))] }];
    });
  },
  async save(session: ParentSession, draft: CuratedPlaylist, playlists: CuratedPlaylist[], videos: ApprovedVideo[]) {
    parentSessionService.require('edit playlists');
    const name = draft.name.trim();
    if (!name || name.length > 80) throw new Error('Use a playlist name between 1 and 80 characters.');
    const known = new Set(videos.map((video) => video.id));
    if (draft.videoIds.some((id) => !known.has(id))) throw new Error('A video in this playlist is no longer in your library.');
    const playlist = { id: draft.id || id('playlist'), name, videoIds: [...new Set(draft.videoIds)] };
    const next = [...playlists.filter((item) => item.id !== playlist.id), playlist];
    await writeJson(storageKeys.playlists, next);
    return next;
  },
  async remove(session: ParentSession, playlistId: string, playlists: CuratedPlaylist[]) {
    parentSessionService.require('delete playlists');
    const next = playlists.filter((item) => item.id !== playlistId);
    await writeJson(storageKeys.playlists, next);
    return next;
  },
};
