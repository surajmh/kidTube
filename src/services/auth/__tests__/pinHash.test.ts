/**
 * The native Android derivation and the pure-TS fallback must be interchangeable: a PIN created
 * on one path has to verify on the other, or an app update would lock parents out.
 */
import { createPinRecord, createPinRecordAsync, verifyPinRecord, verifyPinRecordAsync } from '../pinHash';

describe('pinHash sync/async interop', () => {
  it('verifies a sync-created record through the async path and vice versa', async () => {
    const syncRecord = createPinRecord('4321');
    expect(await verifyPinRecordAsync(syncRecord, '4321')).toBe(true);

    const asyncRecord = await createPinRecordAsync('4321');
    expect(verifyPinRecord(asyncRecord, '4321')).toBe(true);
  });

  it('rejects a wrong PIN on both paths', async () => {
    const record = createPinRecord('4321');
    expect(await verifyPinRecordAsync(record, '1111')).toBe(false);
    expect(verifyPinRecord(record, '1111')).toBe(false);
  });
});
