import mido
from collections import defaultdict

mid = mido.MidiFile("downloaded_12bar.mid")
ticks_per_beat = mid.ticks_per_beat # 480

PITCH_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
def p_name(p):
    return f"{PITCH_NAMES[p % 12]}{(p // 12) - 1}"

# Drum GM map
DRUM_MAP = {
    35: "Acoustic Bass Drum",
    36: "Bass Drum 1 (Kick)",
    38: "Acoustic Snare",
    40: "Electric Snare",
    42: "Closed Hi-Hat",
    44: "Pedal Hi-Hat",
    46: "Open Hi-Hat",
    49: "Crash Cymbal 1",
    51: "Ride Cymbal 1"
}

def analyze_track(track_idx, track_name):
    track = mid.tracks[track_idx]
    events = []
    curr = 0
    active = {}
    for msg in track:
        curr += msg.time
        if msg.type == 'note_on' and msg.velocity > 0:
            active[msg.note] = (curr, msg.velocity)
        elif msg.type == 'note_off' or (msg.type == 'note_on' and msg.velocity == 0):
            if msg.note in active:
                st, vel = active.pop(msg.note)
                events.append({
                    'note': msg.note,
                    'start_tick': st,
                    'end_tick': curr,
                    'dur_ticks': curr - st,
                    'vel': vel
                })
    events.sort(key=lambda x: x['start_tick'])
    return events

gtr_events = analyze_track(1, "Guitar")
drum_events = analyze_track(3, "Drums")

print(f"Guitar notes: {len(gtr_events)}")
print(f"Drum notes: {len(drum_events)}")

# In Songscription, tempo is 500000 (120 BPM, 480 ticks/quarter note in MIDI).
# But as we discovered, each actual quarter-note beat of the slow blues track is ~780 ticks!
# Let's check both representations:
# 1) Raw MIDI ticks and 120-bpm beats
# 2) Normalized to native ~74 BPM blues tempo (1 beat = ~780 ticks)

print("\n" + "="*80)
print("PART 1: ELECTRIC GUITAR FULL CHORD & RHYTHM TRANSCRIPT")
print("="*80)

# Group guitar events by time cluster (within 20 ticks)
gtr_chords = []
i = 0
while i < len(gtr_events):
    c_start = gtr_events[i]['start_tick']
    chord_notes = [gtr_events[i]]
    j = i + 1
    while j < len(gtr_events) and abs(gtr_events[j]['start_tick'] - c_start) <= 25:
        chord_notes.append(gtr_events[j])
        j += 1
    avg_dur = sum(n['dur_ticks'] for n in chord_notes) / len(chord_notes)
    gtr_chords.append({
        'start_tick': c_start,
        'notes': [n['note'] for n in chord_notes],
        'pitches': [p_name(n['note']) for n in chord_notes],
        'avg_dur': avg_dur,
        'vel': chord_notes[0]['vel']
    })
    i = j

for idx, c in enumerate(gtr_chords):
    t = c['start_tick']
    dur = c['avg_dur']
    # If 780 ticks is a quarter note:
    beats_74 = t / 780.0
    dur_beats_74 = dur / 780.0
    bar_74 = int(beats_74 // 4) + 1
    beat_in_bar_74 = (beats_74 % 4) + 1
    
    # Classify duration in 74 BPM
    dur_label = ""
    if dur_beats_74 < 0.4:
        dur_label = "8th note / staccato (choke)"
    elif 0.4 <= dur_beats_74 < 0.75:
        dur_label = "8th / dotted 8th note"
    elif 0.75 <= dur_beats_74 < 1.4:
        dur_label = "QUARTER NOTE"
    elif 1.4 <= dur_beats_74 < 2.5:
        dur_label = "HALF NOTE"
    elif 2.5 <= dur_beats_74 < 3.5:
        dur_label = "DOTTED HALF NOTE"
    else:
        dur_label = "WHOLE NOTE"
        
    print(f"[{idx+1:2d}] Tick {t:5d} | Bar {bar_74:2d} Beat {beat_in_bar_74:4.2f} | Chord: {c['pitches']} | Dur: {dur:4.0f} ticks ({dur_beats_74:.2f} beats -> {dur_label})")
