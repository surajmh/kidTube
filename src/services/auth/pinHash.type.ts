export type PinRecord = {
  version: 2;
  salt: string;
  iterations: number;
  hash: string;
};
