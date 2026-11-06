import mido
from collections import defaultdict

mid = mido.MidiFile("downloaded_12bar.mid")
drum_track = mid.tracks[3]

DRUM_MAP = {
    35: "Acoustic Kick",
    36: "Kick",
    38: "Snare",
    40: "Electric Snare",
    42: "Closed Hi-Hat",
    44: "Pedal Hi-Hat",
    46: "Open Hi-Hat",
    49: "Crash Cymbal",
    51: "Ride Cymbal"
}

events = []
curr = 0
for msg in drum_track:
    curr += msg.time
    if msg.type == 'note_on' and msg.velocity > 0:
        events.append((curr, msg.note, msg.velocity))

# Group by time cluster (within 20 ticks)
drum_chords = []
i = 0
while i < len(events):
    c_start = events[i][0]
    hits = [events[i]]
    j = i + 1
    while j < len(events) and abs(events[j][0] - c_start) <= 25:
        hits.append(events[j])
        j += 1
    drum_chords.append({
        'start_tick': c_start,
        'notes': [h[1] for h in hits],
        'names': [DRUM_MAP.get(h[1], str(h[1])) for h in hits],
        'vel': max(h[2] for h in hits)
    })
    i = j

print(f"Total drum hits clustered: {len(drum_chords)}")
print("\n" + "="*80)
print("PART 2: DRUM KIT TRANSCRIPT (780 TICKS = 1 BEAT)")
print("="*80)

for idx, c in enumerate(drum_chords):
    t = c['start_tick']
    beats_74 = t / 780.0
    bar = int(beats_74 // 4) + 1
    beat_in_bar = (beats_74 % 4) + 1
    print(f"[{idx+1:3d}] Tick {t:5d} | Bar {bar:2d} Beat {beat_in_bar:4.2f} | Instruments: {c['names']} (notes: {c['notes']}) | Vel: {c['vel']}")
