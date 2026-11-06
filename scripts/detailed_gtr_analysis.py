import mido
from collections import defaultdict

mid = mido.MidiFile("downloaded_12bar.mid")
ticks_per_beat = mid.ticks_per_beat

NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
def note_str(p):
    octave = (p // 12) - 1
    return f"{NOTE_NAMES[p % 12]}{octave}"

gtr_track = mid.tracks[1]
bass_track = mid.tracks[2]
drum_track = mid.tracks[3]

def parse_notes(track):
    curr = 0
    active = {}
    notes = []
    for msg in track:
        curr += msg.time
        if msg.type == 'note_on' and msg.velocity > 0:
            active[msg.note] = (curr, msg.velocity)
        elif msg.type == 'note_off' or (msg.type == 'note_on' and msg.velocity == 0):
            if msg.note in active:
                st, vel = active.pop(msg.note)
                notes.append({
                    'note': msg.note,
                    'pitch_name': note_str(msg.note),
                    'start_tick': st,
                    'start_beat': st / ticks_per_beat,
                    'dur_ticks': curr - st,
                    'dur_beat': (curr - st) / ticks_per_beat,
                    'vel': vel
                })
    return notes

gtr_notes = parse_notes(gtr_track)
bass_notes = parse_notes(bass_track)
drum_notes = parse_notes(drum_track)

print("=== ELECTRIC GUITAR BAR-BY-BAR BREAKDOWN ===")
# Group gtr by bar (assuming 4 beats per bar, 480 ticks/beat)
gtr_bars = defaultdict(list)
for n in gtr_notes:
    bar_idx = int(n['start_beat'] // 4) + 1
    beat_in_bar = (n['start_beat'] % 4) + 1
    gtr_bars[bar_idx].append((beat_in_bar, n))

for b in sorted(gtr_bars.keys()):
    items = gtr_bars[b]
    # cluster items by beat_in_bar
    clusters = defaultdict(list)
    for bib, n in items:
        clusters[round(bib, 2)].append(n)
    
    print(f"\n--- Measure {b} ---")
    for bib in sorted(clusters.keys()):
        chord = clusters[bib]
        pitches = [c['pitch_name'] for c in chord]
        raw_pitches = [c['note'] for c in chord]
        avg_dur = sum(c['dur_beat'] for c in chord) / len(chord)
        print(f"  Beat {bib:4.2f} | Notes: {pitches} ({raw_pitches}) | Dur: {avg_dur:.2f} beats | Vel: {chord[0]['vel']}")
