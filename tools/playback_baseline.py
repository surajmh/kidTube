#!/usr/bin/env python3
"""Capture opt-in player diagnostics and raw Android UI/memory evidence; stdlib only."""
import argparse
import hashlib
import json
from pathlib import Path
import statistics
import shlex
import subprocess
import time

PACKAGE = 'com.family.kidtube'


def summarize(lines):
    sessions = {}
    malformed = 0
    for line in lines:
        try:
            event = json.loads(line)
            if not isinstance(event, dict) or not {'session', 'event', 'elapsedMs'} <= event.keys():
                raise ValueError('invalid diagnostic event')
        except (ValueError, TypeError):
            malformed += 1
            continue
        row = sessions.setdefault(event['session'], {'videoId': event.get('videoId'), 'events': []})
        row['events'].append(event)
    timings = []
    for row in sessions.values():
        events = sorted(row['events'], key=lambda e: e['elapsedMs'])
        frames = [e for e in events if e['event'] == 'first_frame']
        row['nativeStartToFrameMs'] = frames[0].get('nativeStartToFrameMs') if frames else None
        if row['nativeStartToFrameMs'] is not None and any(e['event'] == 'start' for e in events):
            timings.append(row['nativeStartToFrameMs'])
        row['reportedDroppedFrames'] = sum(e.get('count', 0) for e in events if e['event'] == 'dropped_frames')
        row['failures'] = [e for e in events if e['event'] == 'failure']
        # Buffering includes startup, seeks and paused loading; retain intent rather than calling all spells rebuffers.
        spells, pending = [], None
        for event in events:
            if event['event'] == 'state' and event.get('state') == 2 and pending is None:
                pending = event
            elif pending is not None and ((event['event'] == 'state' and event.get('state') != 2)
                                          or event['event'] in ('stop', 'release')):
                spells.append({'durationMs': event['elapsedMs'] - pending['elapsedMs'],
                               'playWhenReady': pending.get('playWhenReady'), 'closedBy': event['event']})
                pending = None
        row['bufferingSpells'] = spells
        row['openBufferingSinceMs'] = pending['elapsedMs'] if pending else None
        row['startedInCapture'] = any(e['event'] == 'start' for e in events)
    return {'sessions': sessions, 'nativeStartToFrameMedianMs': statistics.median(timings) if timings else None,
            'firstFrameSamples': len(timings), 'malformedLines': malformed}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--serial', required=True)
    parser.add_argument('--scenario', required=True)
    parser.add_argument('--network', required=True, help='Describe Wi-Fi/mobile data and any interruption')
    parser.add_argument('--seconds', type=int, default=60)
    parser.add_argument('--output', type=Path, required=True, help='A new output directory')
    parser.add_argument('--apk', type=Path, required=True, help='Exact APK manually installed for this run')
    args = parser.parse_args()
    if args.seconds <= 0 or not args.apk.is_file():
        parser.error('seconds must be positive and apk must exist')
    adb = ['adb', '-s', args.serial]

    def read(*command):
        arguments = ['shell', shlex.join(command[1:])] if command[0] == 'shell' else list(command)
        result = subprocess.run(adb + arguments, text=True, capture_output=True, timeout=30, check=True)
        return result.stdout.strip()

    if read('get-state') != 'device':
        parser.error('device is not authorized/connected')
    read('shell', 'pm', 'path', PACKAGE)
    args.output.mkdir(parents=True, exist_ok=False)
    metadata = {'scenario': args.scenario, 'network': args.network, 'serial': args.serial,
                'model': read('shell', 'getprop', 'ro.product.model'),
                'android': read('shell', 'getprop', 'ro.build.version.release'),
                'apkSha256': hashlib.sha256(args.apk.read_bytes()).hexdigest(),
                'apkIdentity': 'Supplied APK; verify it matches the installed APK before recording.',
                'gitRevision': subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip(),
                'gitDiff': subprocess.check_output(['git', 'diff', 'HEAD'], text=True),
                'startedAtUtc': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())}
    previous = read('shell', 'getprop', 'log.tag.KidTubePerf')
    metadata['previousLogProperty'] = previous
    (args.output / 'metadata.json').write_text(json.dumps(metadata, indent=2) + '\n')
    process = None
    try:
        read('shell', 'setprop', 'log.tag.KidTubePerf', 'DEBUG')
        read('shell', 'dumpsys', 'gfxinfo', PACKAGE, 'reset')
        # -T 1 avoids importing earlier sessions without clearing the device's log buffers.
        with (args.output / 'events.jsonl').open('w') as log, (args.output / 'logcat-errors.txt').open('w') as errors:
            process = subprocess.Popen(adb + ['logcat', '-v', 'raw', '-T', '1', 'KidTubePerf:I', '*:S'], stdout=log, stderr=errors)
            print(f'Capture active for {args.seconds}s. Perform {args.scenario} now.', flush=True)
            try:
                process.wait(timeout=args.seconds)
                if process.returncode:
                    raise RuntimeError('logcat failed; see logcat-errors.txt')
            except subprocess.TimeoutExpired:
                pass
            except KeyboardInterrupt:
                print('Saving partial capture.', flush=True)
            finally:
                if process.poll() is None:
                    process.terminate()
                    process.wait(timeout=10)
        for name, command in [('gfxinfo', ('shell', 'dumpsys', 'gfxinfo', PACKAGE, 'framestats')),
                              ('meminfo', ('shell', 'dumpsys', 'meminfo', PACKAGE)),
                              ('thermal', ('shell', 'dumpsys', 'thermalservice')),
                              ('package', ('shell', 'dumpsys', 'package', PACKAGE))]:
            (args.output / f'{name}.txt').write_text(read(*command) + '\n')
    finally:
        report = summarize((args.output / 'events.jsonl').read_text().splitlines()) if (args.output / 'events.jsonl').exists() else summarize([])
        (args.output / 'summary.json').write_text(json.dumps(report, indent=2) + '\n')
        read('shell', 'setprop', 'log.tag.KidTubePerf', previous)
    print(f'Saved {args.output / "summary.json"}; first-frame samples: {report["firstFrameSamples"]}')


if __name__ == '__main__':
    main()
