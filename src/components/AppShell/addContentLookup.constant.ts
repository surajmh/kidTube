export const CHANNEL_EXAMPLES = ['@Blippi', '@Cocomelon', '@Pinkfong'] as const;

export const LOOKUP_COPY = {
  channel: {
    title: 'Add channel',
    subtitle: 'Add a YouTube channel your child can watch. Paste a channel link, @handle or ID, or just type its name.',
    label: 'YouTube channel link, handle, ID or name',
    placeholder: 'https://youtube.com/@channel or a name…',
    action: 'Look up channel',
    allowTitle: 'Allow all videos from this channel',
    allowBody: 'New videos from this channel will be available for your child to watch.',
    approve: 'Approve channel',
    saveOnly: 'Save channel',
    pickFirst: 'Look up a channel and pick it first.',
    footer: "Can't find the channel?",
  },
  video: {
    title: 'Add video',
    subtitle: 'Add a YouTube video your child can watch. Paste a video link or ID, or just type its title.',
    label: 'YouTube video link, ID or title',
    placeholder: 'https://youtu.be/… or a title…',
    action: 'Look up video',
    allowTitle: 'Allow this video',
    allowBody: 'It will be available for your child to watch.',
    approve: 'Approve video',
    saveOnly: 'Save video',
    pickFirst: 'Look up a video and pick it first.',
    footer: "Can't find the video?",
  },
  examples: 'Or try an example',
  manual: 'Add manually instead',
  cancel: 'Cancel',
} as const;
