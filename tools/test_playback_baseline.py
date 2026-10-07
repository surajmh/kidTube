import json
import unittest
from playback_baseline import summarize


class BaselineTest(unittest.TestCase):
    def test_failed_switched_and_incomplete_sessions_are_not_successes(self):
        def event(session, name, elapsed, **extra):
            return json.dumps(dict(session=session, event=name, elapsedMs=elapsed, videoId=session, **extra))
        report = summarize([
            'not json', '[]',
            event('a', 'start', 0), event('a', 'state', 10, state=2, playWhenReady=True),
            event('a', 'state', 110, state=3), event('a', 'first_frame', 120, nativeStartToFrameMs=120),
            event('a', 'first_frame', 150, nativeStartToFrameMs=150),
            event('a', 'dropped_frames', 200, count=4),
            event('b', 'start', 300), event('b', 'failure', 310, code='network_error'),
            event('b', 'state', 320, state=2, playWhenReady=False), event('b', 'stop', 350),
            event('c', 'start', 400), event('c', 'state', 410, state=2),
        ])
        self.assertEqual(report['nativeStartToFrameMedianMs'], 120)
        self.assertEqual(report['firstFrameSamples'], 1)
        self.assertEqual(report['sessions']['a']['reportedDroppedFrames'], 4)
        self.assertEqual(report['sessions']['a']['bufferingSpells'][0]['durationMs'], 100)
        self.assertIsNone(report['sessions']['b']['nativeStartToFrameMs'])
        self.assertFalse(report['sessions']['b']['bufferingSpells'][0]['playWhenReady'])
        self.assertEqual(report['sessions']['c']['openBufferingSinceMs'], 410)
        self.assertEqual(report['malformedLines'], 2)
        self.assertIsNone(summarize([])['nativeStartToFrameMedianMs'])
        partial = summarize([event('old', 'first_frame', 500, nativeStartToFrameMs=80)])
        self.assertEqual(partial['firstFrameSamples'], 0)


if __name__ == '__main__':
    unittest.main()
