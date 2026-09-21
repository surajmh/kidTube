import { sanitisePin, validateChange } from '../parentSecurity.helper';

describe('sanitisePin', () => {
  it('keeps only digits', () => {
    expect(sanitisePin('1a2b3c4d')).toBe('1234');
  });

  it('caps at the PIN length so the field cannot hold more', () => {
    expect(sanitisePin('123456')).toBe('1234');
  });

  it('survives an empty or entirely non-numeric entry', () => {
    expect(sanitisePin('')).toBe('');
    expect(sanitisePin('abc')).toBe('');
  });
});

describe('validateChange', () => {
  it('passes a well-formed change', () => {
    expect(validateChange('1234', '8765', '8765')).toBeNull();
  });

  it('reports an incomplete form before anything else', () => {
    expect(validateChange('12', '8765', '8765')).toMatch(/all three/i);
    expect(validateChange('1234', '87', '8765')).toMatch(/all three/i);
    expect(validateChange('1234', '8765', '87')).toMatch(/all three/i);
  });

  it('catches a mistyped confirmation', () => {
    expect(validateChange('1234', '8765', '8760')).toMatch(/do not match/i);
  });

  it('rejects a new PIN identical to the current one', () => {
    expect(validateChange('1234', '1234', '1234')).toMatch(/already your PIN/i);
  });

  it('never echoes the PIN back in a message', () => {
    const messages = [
      validateChange('12', '8765', '8765'),
      validateChange('1234', '8765', '8760'),
      validateChange('1234', '1234', '1234'),
    ];
    for (const message of messages) {
      expect(message).not.toMatch(/\d{4}/);
    }
  });
});
