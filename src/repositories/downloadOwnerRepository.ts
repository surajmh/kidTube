import { saveQuietly, useAppStore } from '../store/appStore';

/** Who saved what. One file on the device can be owned by several children. */
export const downloadOwnerRepository = {
  getAll: async () => useAppStore.getState().downloadOwners,
  saveAll: (downloadOwners: Record<string, string[]>) => saveQuietly({ downloadOwners }),
};
