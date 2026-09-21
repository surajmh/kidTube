import { PIN_FAILURE_COPY } from '../shared/pinFailure.helper';

export const PARENT_OVERRIDE_COPY = {
  ...PIN_FAILURE_COPY,
  grantFailed: 'That override could not be saved.',
} as const;
