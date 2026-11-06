import mido

mid = mido.MidiFile("midi_tracks/01_blues_12bar_a7_74bpm.mid")
print(f"Type: {mid.type}, Ticks/beat: {mid.ticks_per_beat}, Tracks: {len(mid.tracks)}")

for i, track in enumerate(mid.tracks):
    print(f"\n--- Track {i}: {track.name} (length: {len(track)}) ---")
    curr = 0
    note_events = []
    active = {}
    for msg in track:
        curr += msg.time
        if msg.type in ['set_tempo', 'time_signature', 'marker', 'program_change']:
            print(f"  t={curr:5d} ({curr/480:.2f}b) | {msg}")
        elif msg.type == 'note_on' and msg.velocity > 0:
            active[msg.note] = (curr, msg.velocity)
        elif msg.type == 'note_off' or (msg.type == 'note_on' and msg.velocity == 0):
            if msg.note in active:
                st, vel = active.pop(msg.note)
                note_events.append((st, curr - st, msg.note, vel))
    
    print(f"  Total resolved notes: {len(note_events)}")
    # Print sample of resolved notes
    durations = [d for st, d, n, v in note_events]
    from collections import Counter
    print(f"  Duration histogram (ticks): {Counter(durations).most_common(6)}")
