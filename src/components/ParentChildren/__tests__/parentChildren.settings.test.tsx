import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import { ChannelRulesCard } from '../parentChildren.rulesCards';
import { defaultChildContentRules } from '../../../utils/parentalControls.helper';
import { LimitsCard } from '../parentChildren.limitsCard';
import { describeProfilePolicy } from '../../../services/profilePolicyService';
import { defaultPlaybackSettings } from '../../../constants/playback.constant';
jest.mock('@expo/vector-icons', () => ({ Feather: () => null }));
const profile = { id: 'kid', name: 'Kid', avatar: 'sun' };

it('applies a channel block to the configured child and leaves selecting the current value unchanged', async () => {
  const block = jest.fn(async () => undefined);
  const view = render(<ChannelRulesCard profile={profile} profileId="kid" childRules={defaultChildContentRules('kid')}
    channels={[{ id: 'c', channelId: 'channel', name: 'Stories', approved: true }]}
    onToggleBlockChannel={block} onToggleGrantChannel={jest.fn()} onToggleInherit={jest.fn()} />);
  fireEvent.press(view.getByLabelText('Channel rules for Kid'));
  fireEvent.press(view.getByLabelText('Stories'));
  fireEvent.press(view.getByLabelText('Block Stories'));
  await act(async () => fireEvent.press(view.getByLabelText('Block Stories: Off')));
  expect(block).not.toHaveBeenCalled();
  fireEvent.press(view.getByLabelText('Block Stories'));
  await act(async () => fireEvent.press(view.getByLabelText('Block Stories: On')));
  expect(block).toHaveBeenCalledWith('kid', 'channel');
});

it('updates a child bedtime without changing the family defaults', async () => {
  const patch = jest.fn(async () => undefined);
  const summary = describeProfilePolicy(defaultPlaybackSettings);
  const view = render(<LimitsCard profile={profile} profileId="kid" globalSettings={defaultPlaybackSettings}
    override={undefined} summary={summary} patch={patch} onSetPolicy={jest.fn()} />);
  fireEvent.press(view.getByLabelText('Kid’s playback limits'));
  fireEvent.press(view.getByLabelText('Bedtime'));
  fireEvent.press(view.getByLabelText('Bedtime starts'));
  fireEvent.press(view.getByLabelText('Bedtime starts minute'));
  await act(async () => fireEvent.press(view.getByLabelText('Bedtime starts minute: 23')));
  expect(patch).toHaveBeenCalledWith({ bedtimeStartMinutes: Math.floor(defaultPlaybackSettings.bedtimeStartMinutes / 60) * 60 + 23 });
});
