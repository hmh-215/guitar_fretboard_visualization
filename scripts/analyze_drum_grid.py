import mido
from collections import Counter

mid = mido.MidiFile("downloaded_12bar.mid")
drum_track = mid.tracks[3]

# Find all events in drum track
drum_events = []
curr = 0
for msg in drum_track:
    curr += msg.time
    if msg.type == 'note_on' and msg.velocity > 0:
        drum_events.append((curr, msg.note, msg.velocity))

print(f"Total drum note_on events: {len(drum_events)}")
# Look at intervals between consecutive events
deltas = [drum_events[i+1][0] - drum_events[i][0] for i in range(len(drum_events)-1)]
print("Most common tick deltas between drum hits:")
for delta, count in Counter(deltas).most_common(10):
    print(f"  Delta: {delta:4d} ticks | Count: {count:3d}")

# Let's inspect kick (note 36), snare (note 38), hi-hat (note 42)
kicks = [t for t, n, v in drum_events if n == 36]
snares = [t for t, n, v in drum_events if n == 38]
hihats = [t for t, n, v in drum_events if n == 42]

print(f"\nKicks count: {len(kicks)}, Snares count: {len(snares)}, Hihats count: {len(hihats)}")
snare_deltas = [snares[i+1] - snares[i] for i in range(len(snares)-1)]
print("Most common snare-to-snare deltas:")
for delta, count in Counter(snare_deltas).most_common(10):
    print(f"  Delta: {delta:4d} ticks | Count: {count:3d}")
