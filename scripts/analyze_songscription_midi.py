import mido
from collections import defaultdict

mid = mido.MidiFile("downloaded_12bar.mid")
ticks_per_beat = mid.ticks_per_beat
print(f"MIDI Type: {mid.type}, Ticks per Beat: {ticks_per_beat}, Tracks: {len(mid.tracks)}")

for i, track in enumerate(mid.tracks):
    print(f"\n==================== TRACK {i}: {track.name} ====================")
    current_tick = 0
    active_notes = {} # note -> (start_tick, velocity, channel)
    notes_list = []
    
    for msg in track:
        current_tick += msg.time
        if msg.type == 'note_on' and msg.velocity > 0:
            active_notes[msg.note] = (current_tick, msg.velocity, msg.channel)
        elif msg.type == 'note_off' or (msg.type == 'note_on' and msg.velocity == 0):
            if msg.note in active_notes:
                start_tick, vel, ch = active_notes.pop(msg.note)
                duration_ticks = current_tick - start_tick
                duration_beats = duration_ticks / ticks_per_beat
                start_beat = start_tick / ticks_per_beat
                notes_list.append({
                    'note': msg.note,
                    'start_tick': start_tick,
                    'start_beat': start_beat,
                    'bar': int(start_beat // 4) + 1,
                    'beat_in_bar': (start_beat % 4) + 1,
                    'duration_ticks': duration_ticks,
                    'duration_beats': duration_beats,
                    'velocity': vel,
                    'channel': ch
                })
    
    print(f"Total resolved notes: {len(notes_list)}")
    
    # Group by bar
    bars = defaultdict(list)
    for n in notes_list:
        bars[n['bar']].append(n)
        
    for bar_num in sorted(bars.keys()):
        bar_notes = bars[bar_num]
        # Group notes by start_beat (to detect chords vs single notes)
        beat_groups = defaultdict(list)
        for n in bar_notes:
            # Round beat_in_bar slightly to group simultaneous chord hits
            b_key = round(n['beat_in_bar'], 3)
            beat_groups[b_key].append(n)
            
        print(f"\n--- Bar {bar_num} (Total events: {len(bar_notes)}) ---")
        for b_pos in sorted(beat_groups.keys()):
            chord_notes = beat_groups[b_pos]
            pitches = [cn['note'] for cn in chord_notes]
            pitch_names = [mido.format_as_string(mido.Message('note_on', note=p)) for p in pitches]
            avg_dur = sum(cn['duration_beats'] for cn in chord_notes) / len(chord_notes)
            dur_type = ""
            if 0.20 <= avg_dur <= 0.38:
                dur_type = "8th / shuffle 8th"
            elif 0.40 <= avg_dur <= 0.65:
                dur_type = "8th / dotted 8th / tied"
            elif 0.80 <= avg_dur <= 1.25:
                dur_type = "QUARTER NOTE"
            elif 1.70 <= avg_dur <= 2.30:
                dur_type = "HALF NOTE"
            elif 2.70 <= avg_dur <= 3.30:
                dur_type = "DOTTED HALF NOTE"
            elif avg_dur >= 3.60:
                dur_type = "WHOLE NOTE"
            else:
                dur_type = f"{avg_dur:.2f} beats"
                
            print(f"  Beat {b_pos:5.2f} | Notes: {pitches} | Dur: {avg_dur:.2f} beats ({dur_type}) | Vel: {chord_notes[0]['velocity']}")
