import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

jest.mock('@expo/vector-icons', () => ({ Feather: () => null }));

import { ParentDashboard } from '../parentDashboard';
import type { ParentDashboardProps } from '../parentDashboard.type';

function setup(overrides: Partial<ParentDashboardProps> = {}) {
  const props: ParentDashboardProps = {
    profile: { id: 'p1', name: 'Aanya', avatar: 'sun' },
    counts: { channels: 1, videos: 300, categories: 7, pending: 0 },
    onOpen: jest.fn(),
    ...overrides,
  };
  return { ...render(<ParentDashboard {...props} />), props };
}

describe('ParentDashboard', () => {
  it('shows the family counts', () => {
    const { getByLabelText } = setup();
    expect(getByLabelText('1 channels')).toBeTruthy();
    expect(getByLabelText('300 videos')).toBeTruthy();
    expect(getByLabelText('7 categories')).toBeTruthy();
    expect(getByLabelText('0 pending')).toBeTruthy();
  });

  it('names the child being managed and opens their page', () => {
    const { getByText, getByLabelText, props } = setup();
    expect(getByText('Aanya')).toBeTruthy();
    fireEvent.press(getByLabelText('Manage children'));
    expect(props.onOpen).toHaveBeenCalledWith('children');
  });

  it('leaves the child card out when there are no profiles', () => {
    const { queryByLabelText } = setup({ profile: undefined });
    expect(queryByLabelText('Manage children')).toBeNull();
  });

  it('opens every section from its tile', () => {
    const { getByLabelText, props } = setup();
    const expected: Record<string, string> = {
      Downloads: 'downloads', Children: 'children', Activity: 'activity', Playback: 'settings', Playlists: 'playlists', Security: 'security',
    };
    for (const [label, section] of Object.entries(expected)) {
      fireEvent.press(getByLabelText(label));
      expect(props.onOpen).toHaveBeenLastCalledWith(section);
    }
  });

  it('sends "View details" to the activity page', () => {
    const { getByLabelText, props } = setup();
    fireEvent.press(getByLabelText('View details'));
    expect(props.onOpen).toHaveBeenCalledWith('activity');
  });
});
