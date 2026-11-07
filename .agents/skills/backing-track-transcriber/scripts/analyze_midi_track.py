#!/usr/bin/env python3
"""
MIDI Track Inspector & Rhythmic Analyzer
Analyzes any Type 0 or Type 1 Standard MIDI file:
- Conductor track meta-events (Tempo, Time Signature, Markers)
- Track instrumentation, channels, and program numbers
- Note duration distribution (Staccato chops, Quarter notes, Half notes, etc.)
- Measure-by-measure chord voicings and rhythmic pulse
"""

import sys
import os
from collections import defaultdict, Counter
import mido

# Force UTF-8 stdout encoding for Windows console
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

GM_INSTRUMENTS = {
    0: "Acoustic Grand Piano", 1: "Bright Acoustic Piano", 4: "Electric Piano 1 (Rhodes)",
    24: "Acoustic Nylon Guitar", 25: "Acoustic Steel Guitar", 26: "Electric Jazz Guitar",
    27: "Electric Clean Guitar", 28: "Electric Muted Guitar", 29: "Overdriven Guitar",
    30: "Distortion Guitar", 31: "Guitar Harmonics", 32: "Acoustic Bass",
    33: "Electric Bass (Finger)", 34: "Electric Bass (Pick)", 35: "Fretless Bass",
    36: "Slap Bass 1", 38: "Synth Bass 1", 39: "Synth Bass 2",
    48: "String Ensemble 1", 52: "Choir Aahs", 80: "Lead 1 (Square)", 81: "Lead 2 (Sawtooth)"
}

NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

def midi_to_note_name(pitch):
    octave = (pitch // 12) - 1
    name = NOTE_NAMES[pitch % 12]
    return f"{name}{octave}"

def analyze_midi_file(file_path):
    if not os.path.exists(file_path):
        print(f"Error: File not found: {file_path}")
        return False

    mid = mido.MidiFile(file_path)
    tpq = mid.ticks_per_beat
    print("=" * 80)
    print(f"MIDI FILE ANALYSIS: {os.path.basename(file_path)}")
    print(f"Path: {file_path}")
    print(f"Type: {mid.type} | Resolution: {tpq} ticks/beat (PPQ) | Total Tracks: {len(mid.tracks)} | Length: {mid.length:.2f}s")
    print("=" * 80)

    # 1. Conductor Track & Meta Analysis
    conductor_tempo = 120.0
    time_sig = "4/4"
    markers = []

    for t_idx, trk in enumerate(mid.tracks):
        curr_tick = 0
        for msg in trk:
            curr_tick += msg.time
            if msg.type == 'set_tempo':
                conductor_tempo = mido.tempo2bpm(msg.tempo)
            elif msg.type == 'time_signature':
                time_sig = f"{msg.numerator}/{msg.denominator}"
            elif msg.type == 'marker':
                beat_pos = curr_tick / tpq
                markers.append((curr_tick, beat_pos, msg.text))

    print(f"\n[CONDUCTOR METRICS]")
    print(f"  Nominal Tempo: {conductor_tempo:.2f} BPM")
    print(f"  Time Signature: {time_sig}")
    if markers:
        print(f"  Section Markers ({len(markers)} markers):")
        for tick, beat, text in markers:
            bar_approx = int(beat // 4) + 1
            print(f"    - Bar {bar_approx:2d} (t={tick:6d}, beat {beat:6.1f}): '{text}'")
    else:
        print("  Section Markers: None")

    # 2. Track Breakdown
    for t_idx, trk in enumerate(mid.tracks):
        curr_tick = 0
        program = None
        channel = None
        notes = []
        active = {}

        for msg in trk:
            curr_tick += msg.time
            if msg.type == 'program_change':
                program = msg.program
                channel = msg.channel
            elif msg.type == 'note_on' and msg.velocity > 0:
                channel = msg.channel
                active[msg.note] = (curr_tick, msg.velocity)
            elif msg.type == 'note_off' or (msg.type == 'note_on' and msg.velocity == 0):
                if msg.note in active:
                    start_t, vel = active.pop(msg.note)
                    dur_t = curr_tick - start_t
                    notes.append({
                        'pitch': msg.note,
                        'start_tick': start_t,
                        'duration_ticks': dur_t,
                        'duration_beats': dur_t / tpq,
                        'velocity': vel
                    })

        trk_name = trk.name if trk.name else f"Track {t_idx}"
        is_drum = (channel == 9)
        inst_desc = "Standard Drum Kit (Ch 10)" if is_drum else (GM_INSTRUMENTS.get(program, f"Program {program}") if program is not None else "Unknown")

        print(f"\n[TRACK {t_idx}: {trk_name}]")
        print(f"  Channel: {channel if channel is not None else 'N/A'} | Program: {program if program is not None else 'N/A'} ({inst_desc})")
        print(f"  Total Notes Resolved: {len(notes)}")

        if not notes:
            continue

        # Velocity stats
        vels = [n['velocity'] for n in notes]
        print(f"  Velocity: Min={min(vels)}, Max={max(vels)}, Avg={sum(vels)/len(vels):.1f}")

        # Note duration categories
        durs = [n['duration_ticks'] for n in notes]
        dur_counter = Counter()
        for d in durs:
            beats = d / tpq
            if beats < 0.25:
                dur_counter["16th / grace (<0.25b)"] += 1
            elif 0.25 <= beats < 0.40:
                dur_counter["8th triplet chop (0.33b)"] += 1
            elif 0.40 <= beats < 0.70:
                dur_counter["8th note (0.5b)"] += 1
            elif 0.70 <= beats < 1.30:
                dur_counter["QUARTER NOTE (1.0b)"] += 1
            elif 1.30 <= beats < 1.70:
                dur_counter["Dotted quarter (1.5b)"] += 1
            elif 1.70 <= beats < 2.30:
                dur_counter["HALF NOTE (2.0b)"] += 1
            elif 2.30 <= beats < 3.30:
                dur_counter["Dotted half (3.0b)"] += 1
            else:
                dur_counter["WHOLE NOTE / Sustained (>=4.0b)"] += 1

        print("  Duration Articulation Histogram:")
        for category, count in dur_counter.most_common():
            pct = (count / len(notes)) * 100
            print(f"    - {category:32s}: {count:4d} notes ({pct:5.1f}%)")

        # Sample voicings for first 4 bars
        bars = defaultdict(lambda: defaultdict(list))
        for n in notes:
            bar_num = int((n['start_tick'] / tpq) // 4) + 1
            beat_num = round(((n['start_tick'] / tpq) % 4) + 1, 2)
            if bar_num <= 4:
                bars[bar_num][beat_num].append(n)

        if bars:
            print("  First 4 Bars Voicing Snapshot:")
            for b_num in sorted(bars.keys()):
                bar_events = []
                for beat_pos in sorted(bars[b_num].keys()):
                    chord = bars[b_num][beat_pos]
                    names = [midi_to_note_name(c['pitch']) for c in chord]
                    avg_dur = sum(c['duration_beats'] for c in chord) / len(chord)
                    bar_events.append(f"Beat {beat_pos}: [{','.join(names)}] ({avg_dur:.2f}b)")
                print(f"    Bar {b_num:2d}: {' | '.join(bar_events)}")

    print("\n" + "=" * 80)
    return True

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python scripts/analyze_midi_track.py <path_to_midi_file>")
        sys.exit(1)
    analyze_midi_file(sys.argv[1])
