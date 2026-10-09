import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import { DeArrowPreview } from '../deArrowPreview';
import { previewDeArrow } from '../../../services/deArrowService';
import { defaultPlaybackSettings } from '../../../constants/playback.constant';
jest.mock('../../../services/deArrowService', () => ({ previewDeArrow: jest.fn() }));

it('requires a loaded thumbnail and explicit parent approval, and restores without a network request', async () => {
  const videos = [{ id: 'v', youtubeVideoId: 'aaaaaaaaaaa', title: 'Original', approved: true }];
  const onChange = jest.fn();
  (previewDeArrow as jest.Mock).mockResolvedValue({ title: 'Replacement', thumbnailUrl: 'https://dearrow-thumb.ajay.app/image' });
  const view = render(<DeArrowPreview videos={videos} settings={defaultPlaybackSettings} onChange={onChange} />);
  await act(async () => fireEvent.press(view.getByLabelText('Preview replacements for Original')));
  expect(onChange).not.toHaveBeenCalled();
  fireEvent.press(view.getByText('Approve this replacement'));
  expect(onChange).not.toHaveBeenCalled();
  fireEvent(view.UNSAFE_getByType(require('react-native').Image), 'load');
  fireEvent.press(view.getByText('Approve this replacement'));
  expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ deArrowReplacements: { aaaaaaaaaaa: { title: 'Replacement', thumbnailUrl: 'https://dearrow-thumb.ajay.app/image' } } }));
  const settings = onChange.mock.calls[0][0];
  view.rerender(<DeArrowPreview videos={videos} settings={settings} onChange={onChange} />);
  fireEvent.press(view.getByLabelText('Restore original for Original'));
  expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ deArrowReplacements: {} }));
  expect(previewDeArrow).toHaveBeenCalledTimes(1);
});
