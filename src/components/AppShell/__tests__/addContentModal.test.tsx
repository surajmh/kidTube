import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

jest.mock('@expo/vector-icons', () => ({ Feather: () => null }));

import { AddContentModal } from '../addContentModal';
import type { AddContentModalProps } from '../addContentModal.type';

const blippi = { youtubeChannelId: 'UCaaaaaaaaaaaaaaaaaaaaaa', name: 'Blippi', subscriberCount: 20_000_000, videoCount: 1200, verified: true };
const song = { youtubeVideoId: 'aaaaaaaaaaa', title: 'Morning song', channelName: 'Songs', durationSeconds: 125 };

function setup(overrides: Partial<AddContentModalProps> = {}) {
  const props: AddContentModalProps = {
    kind: 'channel',
    channels: [],
    onAddChannel: jest.fn(async () => undefined),
    onAddVideo: jest.fn(async () => undefined),
    onFindChannels: jest.fn(async () => [blippi]),
    onFindVideos: jest.fn(async () => [song]),
    onClose: jest.fn(),
    ...overrides,
  };
  return { ...render(<AddContentModal {...props} />), props };
}

describe('AddContentModal', () => {
  it('titles itself for the kind being added', () => {
    expect(setup({ kind: 'video' }).getByText('Add video')).toBeTruthy();
    expect(setup({ kind: 'channel' }).getByText('Add channel')).toBeTruthy();
  });

  it('closes from the corner button and from Cancel', () => {
    const { getByLabelText, props } = setup();
    fireEvent.press(getByLabelText('Close'));
    fireEvent.press(getByLabelText('Cancel'));
    expect(props.onClose).toHaveBeenCalledTimes(2);
  });

  describe('channel', () => {
    it('looks up what was typed, picks the single match for you, and approves it', async () => {
      const { getByPlaceholderText, getByLabelText, findByText, props } = setup();
      fireEvent.changeText(getByPlaceholderText('https://youtube.com/@channel or a name…'), 'blippi');
      fireEvent.press(getByLabelText('Look up channel'));

      expect(await findByText('Blippi')).toBeTruthy();
      expect(props.onFindChannels).toHaveBeenCalledWith('blippi');
      expect(await findByText('20M subscribers · 1.2K videos')).toBeTruthy();

      fireEvent.press(getByLabelText('Approve channel'));
      await waitFor(() => expect(props.onClose).toHaveBeenCalled());
      expect(props.onAddChannel).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Blippi', channelId: blippi.youtubeChannelId, approved: true }),
      );
    });

    it('saves it unapproved when "allow" is switched off', async () => {
      const { getByPlaceholderText, getByLabelText, findByText, props } = setup();
      fireEvent.changeText(getByPlaceholderText('https://youtube.com/@channel or a name…'), 'blippi');
      fireEvent.press(getByLabelText('Look up channel'));
      await findByText('Blippi');

      fireEvent.press(getByLabelText('Allow all videos from this channel'));
      fireEvent.press(getByLabelText('Save channel'));
      await waitFor(() => expect(props.onAddChannel).toHaveBeenCalledWith(expect.objectContaining({ approved: false })));
    });

    it('makes the parent choose when several channels match', async () => {
      const other = { ...blippi, youtubeChannelId: 'UCbbbbbbbbbbbbbbbbbbbbbb', name: 'Blippi Wonders' };
      const { getByPlaceholderText, getByLabelText, findByText, props } = setup({ onFindChannels: jest.fn(async () => [blippi, other]) });
      fireEvent.changeText(getByPlaceholderText('https://youtube.com/@channel or a name…'), 'blippi');
      fireEvent.press(getByLabelText('Look up channel'));
      await findByText('Blippi Wonders');

      fireEvent.press(getByLabelText('Approve channel'));
      expect(await findByText('Look up a channel and pick it first.')).toBeTruthy();
      expect(props.onAddChannel).not.toHaveBeenCalled();

      fireEvent.press(getByLabelText('Pick Blippi Wonders'));
      fireEvent.press(getByLabelText('Approve channel'));
      await waitFor(() => expect(props.onAddChannel).toHaveBeenCalledWith(expect.objectContaining({ name: 'Blippi Wonders' })));
    });

    it('fills the field and looks up when an example is tapped', async () => {
      const { getByLabelText, findByText, props } = setup();
      fireEvent.press(getByLabelText('Try @Cocomelon'));
      await findByText('Blippi');
      expect(props.onFindChannels).toHaveBeenCalledWith('@Cocomelon');
    });

    it('refuses a channel that is already in the library', async () => {
      const { getByPlaceholderText, getByLabelText, findByText, props } = setup({
        channels: [{ id: 'c1', name: 'Blippi', channelId: blippi.youtubeChannelId, approved: true }],
      });
      fireEvent.changeText(getByPlaceholderText('https://youtube.com/@channel or a name…'), 'blippi');
      fireEvent.press(getByLabelText('Look up channel'));
      await findByText('20M subscribers · 1.2K videos');
      fireEvent.press(getByLabelText('Approve channel'));
      expect(await findByText('Blippi is already in your library.')).toBeTruthy();
      expect(props.onAddChannel).not.toHaveBeenCalled();
    });

    it('shows why a lookup failed and stays open', async () => {
      const { getByPlaceholderText, getByLabelText, findByText, props } = setup({
        onFindChannels: jest.fn(async () => { throw new Error('No channel found for “zzz”. Try its link or @handle.'); }),
      });
      fireEvent.changeText(getByPlaceholderText('https://youtube.com/@channel or a name…'), 'zzz');
      fireEvent.press(getByLabelText('Look up channel'));
      expect(await findByText('No channel found for “zzz”. Try its link or @handle.')).toBeTruthy();
      expect(props.onClose).not.toHaveBeenCalled();
    });

    it('offers the manual form as a fallback', async () => {
      const { getByText, findByText } = setup();
      fireEvent.press(getByText('Add manually instead.'));
      expect(await findByText('Channel name')).toBeTruthy();
    });
  });

  describe('video', () => {
    it('looks up by title and approves the pick', async () => {
      const { getByPlaceholderText, getByLabelText, findByText, props } = setup({ kind: 'video' });
      fireEvent.changeText(getByPlaceholderText('https://youtu.be/… or a title…'), 'morning song');
      fireEvent.press(getByLabelText('Look up video'));
      expect(await findByText('Morning song')).toBeTruthy();
      expect(props.onFindVideos).toHaveBeenCalledWith('morning song');

      fireEvent.press(getByLabelText('Approve video'));
      await waitFor(() => expect(props.onClose).toHaveBeenCalled());
      expect(props.onAddVideo).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Morning song', youtubeVideoId: 'aaaaaaaaaaa', channelName: 'Songs', duration: 125, approved: true }),
      );
    });

    it('offers the manual form as a fallback', async () => {
      const { getByText, findByText } = setup({ kind: 'video' });
      fireEvent.press(getByText('Add manually instead.'));
      expect(await findByText('Video title')).toBeTruthy();
    });
  });
});
