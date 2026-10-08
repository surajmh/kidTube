import { downloadService } from '../downloadService';
import { storageKeys, writeJson } from '../../repositories/storage';
import { profileRepository } from '../../repositories/profileRepository';
import { channelRepository } from '../../repositories/channelRepository';
import { videoRepository } from '../../repositories/videoRepository';
import { watchHistoryRepository } from '../../repositories/watchHistoryRepository';
import { screenTimeRepository, settingsRepository } from '../../repositories/playbackSettingsRepository';
import {
  approvalRepository,
  categoryRepository,
  childRulesRepository,
  overrideRepository,
  profilePolicyRepository,
  requestRepository,
} from '../../repositories/parentalControlsRepository';
import { channelSyncRepository } from '../../repositories/channelSyncRepository';
import { defaultPlaybackSettings } from '../../playbackTypes';
import { defaultCategories } from '../../parentalControlsTypes';
import { parentPinService } from './parentPinService';
import { parentSessionService } from './parentSession';

/**
 * PIN recovery, the only way it can work in a local-first app with no account and no server.
 *
 * There is no "email me a link" and no remote authority to ask, so a forgotten PIN cannot be
 * recovered — only reset. To keep that from becoming a loophole for a child, the reset:
 *   - is offered only while the PIN entry is locked out (never as a normal button);
 *   - requires typing a literal confirmation phrase;
 *   - destroys the parent-configured library, approvals, rules, policies, requests, schedules,
 *     overrides and watch history, so it can never be used to *reach* the existing setup;
 *   - ends any parent session and clears the stored PIN.
 *
 * Afterwards the app returns to first-run setup, where the parent chooses a PIN again. Note this is a
 * deliberate data-loss path; it is documented in PHASE-5-HARDENING.md.
 */
export const resetConfirmationPhrase = 'RESET PARENT PIN';

export const parentResetService = {
  confirmationMatches(input: string) {
    return input.trim().toUpperCase() === resetConfirmationPhrase;
  },

  /** Wipes every piece of locally configured parental state. Irreversible by design. */
  async resetEverything(): Promise<void> {
    parentSessionService.end();

    await downloadService.clear();
    await Promise.all([
      profileRepository.saveAll([]),
      writeJson(storageKeys.playlists, []),
      channelRepository.saveAll([]),
      videoRepository.saveAll([]),
      watchHistoryRepository.saveAll([]),
      screenTimeRepository.saveAll([]),
      requestRepository.saveAll([]),
      approvalRepository.saveAll([]),
      overrideRepository.saveAll([]),
      childRulesRepository.saveAll({}),
      profilePolicyRepository.saveAll({}),
      channelSyncRepository.saveAll({}),
      // Categories and settings fall back to the shipped defaults rather than being left empty.
      categoryRepository.saveAll(defaultCategories),
      settingsRepository.save({ ...defaultPlaybackSettings }),
    ]);

    await parentPinService.clearPin();
  },
};
