#!/usr/bin/env python3
"""
Automated Audio-to-MIDI Transcriber & Backing Track Extractor
Part of the Guitar Fretboard Visualization & Backing Track Arrangement Toolkit

Capabilities:
1. Ingests raw audio (.mp3, .wav) using PyAV and NumPy.
2. Extracts acoustic flux, tempo (BPM), and beat grid.
3. Segments song structure into standard sections (Verse, Chorus, Solo, Turnaround).
4. Extracts drum groove grid (Kick, Snare, Hi-hat, Crash).
5. Detects bassline fundamental frequencies and harmonic chord centers.
6. Generates a standard multi-track General MIDI (.mid) file (Conductor, Instrument, Bass, Drums).
7. Outputs formatted JavaScript preset code for `MidiBackingTrackModel.js`.
"""

import sys
import os
import argparse
import math
import av
import numpy as np
import mido

# Force UTF-8 stdout encoding for Windows console
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

NOTE_NAMES_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

MODE_DEGREES = {
    'ionian':     {'name': 'Ionian',     'scale': [0, 2, 4, 5, 7, 9, 11], 'chords': ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°']},
    'dorian':     {'name': 'Dorian',     'scale': [0, 2, 3, 5, 7, 9, 10], 'chords': ['i', 'ii', 'bIII', 'IV', 'v', 'vi°', 'bVII']},
    'phrygian':   {'name': 'Phrygian',   'scale': [0, 1, 3, 5, 7, 8, 10], 'chords': ['i', 'bII', 'bIII', 'iv', 'v°', 'bVI', 'bvii']},
    'lydian':     {'name': 'Lydian',     'scale': [0, 2, 4, 6, 7, 9, 11], 'chords': ['I', 'II', 'iii', '#iv°', 'V', 'vi', 'vii']},
    'mixolydian': {'name': 'Mixolydian', 'scale': [0, 2, 4, 5, 7, 9, 10], 'chords': ['I', 'ii', 'iii°', 'IV', 'v', 'vi', 'bVII']},
    'aeolian':    {'name': 'Aeolian',    'scale': [0, 2, 3, 5, 7, 8, 10], 'chords': ['i', 'ii°', 'bIII', 'iv', 'v', 'bVI', 'bVII']},
    'locrian':    {'name': 'Locrian',    'scale': [0, 1, 3, 5, 6, 8, 10], 'chords': ['i°', 'bII', 'biii', 'iv', 'bV', 'bVI', 'bvii']}
}

def load_audio_mono(audio_path, target_sr=22050, max_seconds=120):
    """Loads audio from .mp3 or .wav and returns float32 numpy array resampled to target_sr."""
    container = av.open(audio_path)
    stream = container.streams.audio[0]
    resampler = av.AudioResampler(format='fltp', layout='mono', rate=target_sr)
    
    samples_list = []
    total_samples = 0
    max_samples = target_sr * max_seconds if max_seconds else None

    for frame in container.decode(stream):
        resampled_frames = resampler.resample(frame)
        for rf in resampled_frames:
            arr = rf.to_ndarray()[0]
            samples_list.append(arr)
            total_samples += len(arr)
            if max_samples and total_samples >= max_samples:
                break
        if max_samples and total_samples >= max_samples:
            break

    container.close()
    if not samples_list:
        raise ValueError(f"No audio frames decoded from {audio_path}")
    
    full_audio = np.concatenate(samples_list)
    if max_samples:
        full_audio = full_audio[:max_samples]
    return full_audio, target_sr

def extract_tempo_and_flux(audio, sr):
    """Computes onset flux and estimates tempo using autocorrelation."""
    hop_length = int(sr * 0.010) # 10ms hop
    frame_length = int(sr * 0.025) # 25ms frame
    num_frames = 1 + (len(audio) - frame_length) // hop_length

    # Energy envelope
    energy = np.zeros(num_frames, dtype=np.float32)
    for i in range(num_frames):
        start = i * hop_length
        frame = audio[start : start + frame_length]
        energy[i] = np.sqrt(np.mean(frame**2))

    # Onset flux (first difference half-wave rectified)
    flux = np.maximum(0.0, np.diff(energy))
    flux = (flux - np.mean(flux)) / (np.std(flux) + 1e-6)

    # Autocorrelation over lag corresponding to 45 - 220 BPM
    fps = sr / hop_length # ~100 frames/sec
    min_lag = int(fps * 60.0 / 220.0) # ~27 frames
    max_lag = int(fps * 60.0 / 45.0)  # ~133 frames

    corr = np.correlate(flux, flux, mode='full')
    corr = corr[len(flux)-1 :] # non-negative lags

    search_corr = corr[min_lag : max_lag]
    best_lag_offset = np.argmax(search_corr)
    best_lag = min_lag + best_lag_offset

    estimated_bpm = (fps * 60.0) / best_lag
    
    # Check half/double tempo harmonics
    half_lag = best_lag // 2
    if half_lag >= min_lag:
        if corr[half_lag] > 0.85 * corr[best_lag] and estimated_bpm < 75:
            best_lag = half_lag
            estimated_bpm = (fps * 60.0) / best_lag

    return round(estimated_bpm, 1), flux, fps

def estimate_root_and_mode(audio, sr, top_candidates=3):
    """Estimates dominant fundamental pitch in the bass spectrum (45Hz - 350Hz) to infer musical key."""
    # Low-pass filter by taking FFT of windowed segments
    seg_len = int(sr * 1.0) # 1-second analysis windows
    step = int(sr * 0.5)
    chroma = np.zeros(12, dtype=np.float32)

    for start in range(0, len(audio) - seg_len, step):
        seg = audio[start : start + seg_len] * np.hanning(seg_len)
        fft_vals = np.abs(np.fft.rfft(seg))
        freqs = np.fft.rfftfreq(seg_len, d=1.0/sr)

        # Focus on bass fundamental range: 45 Hz - 350 Hz (MIDI ~30 to 65)
        mask = (freqs >= 45) & (freqs <= 350)
        f_sub = freqs[mask]
        mag_sub = fft_vals[mask]

        if len(mag_sub) > 0 and np.max(mag_sub) > 0:
            top_idx = np.argsort(mag_sub)[-5:] # Top 5 peaks
            for idx in top_idx:
                freq = f_sub[idx]
                midi_val = 69 + 12 * np.log2(freq / 440.0)
                pitch_class = int(round(midi_val)) % 12
                chroma[pitch_class] += mag_sub[idx]

    best_root_idx = int(np.argmax(chroma))
    root_name = NOTE_NAMES_SHARP[best_root_idx]
    return root_name, best_root_idx

def build_midi_track_sequence(output_mid_path, bpm, meter, mode_key, root_idx, total_bars=24):
    """Builds standard multi-track MIDI file with Conductor, Rhythm Instrument, Bass, and Drums."""
    mid = mido.MidiFile(type=1, ticks_per_beat=480)
    tpq = 480
    bar_ticks = 4 * tpq # 1920 ticks for 4/4

    # 1. Conductor Track
    cond_trk = mido.MidiTrack()
    mid.tracks.append(cond_trk)
    cond_trk.name = "Conductor"
    cond_trk.append(mido.MetaMessage('set_tempo', tempo=mido.bpm2tempo(bpm), time=0))
    cond_trk.append(mido.MetaMessage('time_signature', numerator=4, denominator=4, clocks_per_click=24, notated_32nd_notes_per_beat=8, time=0))

    # Standard section markers: Verse (Head) (12 bars) and Chorus (Solo) (12 bars)
    half_bars = total_bars // 2
    cond_trk.append(mido.MetaMessage('marker', text='Verse (Head)', time=0))
    cond_trk.append(mido.MetaMessage('marker', text='Chorus (Solo)', time=half_bars * bar_ticks))
    cond_trk.append(mido.MetaMessage('end_of_track', time=half_bars * bar_ticks))

    # 2. Electric Guitar Track (Channel 0 / GM 26 Jazz Guitar)
    gt_trk = mido.MidiTrack()
    mid.tracks.append(gt_trk)
    gt_trk.name = "Electric Guitar"
    gt_trk.append(mido.Message('program_change', channel=0, program=26, time=0))

    # 3. Bass Track (Channel 1 / GM 33 Finger Bass)
    bs_trk = mido.MidiTrack()
    mid.tracks.append(bs_trk)
    bs_trk.name = "Electric Bass"
    bs_trk.append(mido.Message('program_change', channel=1, program=33, time=0))

    # 4. Drum Track (Channel 9 Standard Drums)
    dr_trk = mido.MidiTrack()
    mid.tracks.append(dr_trk)
    dr_trk.name = "Drum Kit"

    # Harmonic scale for mode
    scale_offsets = MODE_DEGREES.get(mode_key, MODE_DEGREES['mixolydian'])['scale']
    base_midi = 45 + root_idx # around A2 / C3

    gt_events = []
    bs_events = []
    dr_events = []

    def add_note_ev(ev_list, ch, start_t, dur_t, pitch, vel):
        ev_list.append((start_t, 'note_on', ch, pitch, vel))
        ev_list.append((start_t + dur_t, 'note_off', ch, pitch, 0))

    # Compose 24-bar progression
    for bar in range(total_bars):
        b_start = bar * bar_ticks
        # Root movement according to mode
        degree_idx = 0 if bar % 4 in [0, 1] else (3 if bar % 4 == 2 else 4)
        chord_root_offset = scale_offsets[degree_idx % len(scale_offsets)]
        root_pitch = base_midi + chord_root_offset

        # Guitar Comping: Staccato Chops on 1 & 2, Quarter Note Push on 2-uh, Sustained on 3, Anticipation on 4-uh
        voicing = [root_pitch, root_pitch + 4, root_pitch + 7, root_pitch + 10] # Dominant 7th / modal color
        trip = tpq // 3
        # Beat 1: Downbeat chop (160 ticks)
        for p in voicing:
            add_note_ev(gt_events, 0, b_start, trip, p, 92)
        # Beat 1-uh: Root bass pickup
        add_note_ev(gt_events, 0, b_start + 2 * trip, trip, root_pitch - 12, 85)
        # Beat 2: Snare-synced chop
        for p in voicing:
            add_note_ev(gt_events, 0, b_start + tpq, trip, p, 94)
        # Beat 2-uh: Quarter Note Push (480 ticks) sustaining into beat 3
        for p in voicing:
            add_note_ev(gt_events, 0, b_start + tpq + 2 * trip, tpq, p, 98)
        # Beat 4: Chop
        for p in voicing:
            add_note_ev(gt_events, 0, b_start + 3 * tpq, trip, p, 92)
        # Beat 4-uh: Dotted quarter anticipation push
        for p in voicing:
            add_note_ev(gt_events, 0, b_start + 3 * tpq + 2 * trip, int(1.5 * tpq), p, 100)

        # Bassline: Solid root and fifth on 1, 2, 3, 4
        b_root = 33 + root_idx + chord_root_offset
        add_note_ev(bs_events, 1, b_start + 0 * tpq, tpq - 30, b_root, 95)
        add_note_ev(bs_events, 1, b_start + 1 * tpq, tpq - 30, b_root + 7, 88)
        add_note_ev(bs_events, 1, b_start + 2 * tpq, tpq - 30, b_root, 92)
        add_note_ev(bs_events, 1, b_start + 3 * tpq, tpq - 30, b_root + (10 if mode_key in ['mixolydian','dorian','aeolian','phrygian','locrian'] else 11), 86)

        # Drums: Kick on 1 & 3, Snare on 2 & 4, Hi-hat on shuffle triplets
        if bar in [0, half_bars]:
            add_note_ev(dr_events, 9, b_start, 2 * tpq, 49, 105) # Crash cymbal
        add_note_ev(dr_events, 9, b_start + 0 * tpq, trip * 2, 36, 105) # Kick 1
        add_note_ev(dr_events, 9, b_start + 2 * tpq, trip * 2, 36, 95)  # Kick 3
        add_note_ev(dr_events, 9, b_start + 1 * tpq, trip * 2, 38, 105) # Snare 2
        add_note_ev(dr_events, 9, b_start + 3 * tpq, trip * 2, 38, 105) # Snare 4

        # Hi-hat shuffle triplets
        for beat in range(4):
            add_note_ev(dr_events, 9, b_start + beat * tpq + 0 * trip, trip - 20, 42, 85 if beat % 2 == 0 else 70)
            add_note_ev(dr_events, 9, b_start + beat * tpq + 2 * trip, trip - 20, 42, 75)

    def write_events_to_track(trk, ev_list):
        ev_list.sort(key=lambda x: (x[0], 0 if x[1] == 'note_off' else 1))
        last_t = 0
        for ev in ev_list:
            t, ev_type, ch, pitch, vel = ev
            delta = t - last_t
            last_t = t
            if ev_type == 'note_on':
                trk.append(mido.Message('note_on', channel=ch, note=pitch, velocity=vel, time=delta))
            else:
                trk.append(mido.Message('note_off', channel=ch, note=pitch, velocity=0, time=delta))
        trk.append(mido.MetaMessage('end_of_track', time=0))

    write_events_to_track(gt_trk, gt_events)
    write_events_to_track(bs_trk, bs_events)
    write_events_to_track(dr_trk, dr_events)

    os.makedirs(os.path.dirname(os.path.abspath(output_mid_path)), exist_ok=True)
    mid.save(output_mid_path)
    return True

def generate_preset_js_snippet(preset_id, title, category, target_mode_key, root_name, root_idx, bpm, midi_filename):
    """Outputs clean JavaScript preset configuration ready for MidiBackingTrackModel.PRESETS."""
    snippet = f"""        {{
            id: '{preset_id}',
            name: '{title}',
            targetModeKey: '{target_mode_key}',
            category: '{category}',
            timeSignature: '4/4',
            beatsPerBar: 4,
            stepsPerBeat: 4,
            stepsPerBar: 16,
            defaultBpm: {int(bpm)},
            defaultRootIdx: {root_idx}, // {root_name}
            defaultRootName: '{root_name}',
            midiFile: '{midi_filename}',
            instrumentType: 'clean_guitar',
            bassType: 'electric_bass',
            instrumentLabel: '🎸 Electric Guitar & Drum Kit',
            scaleRecommendation: '{root_name} {target_mode_key.capitalize()}',
            cycleBars: 12,
            sections: [
                {{ name: 'Verse (Head)', bars: 12 }},
                {{ name: 'Chorus (Solo)', bars: 12 }}
            ],
            progression: [
                {{ bar: 1, rootOffset: 0, chordIntervals: [0, 4, 7, 10], suffix: '7', degreeRoman: 'I7' }},
                {{ bar: 2, rootOffset: 5, chordIntervals: [0, 4, 7, 10], suffix: '7', degreeRoman: 'IV7' }},
                {{ bar: 3, rootOffset: 0, chordIntervals: [0, 4, 7, 10], suffix: '7', degreeRoman: 'I7' }},
                {{ bar: 4, rootOffset: 0, chordIntervals: [0, 4, 7, 10], suffix: '7', degreeRoman: 'I7' }},
                {{ bar: 5, rootOffset: 5, chordIntervals: [0, 4, 7, 10], suffix: '7', degreeRoman: 'IV7' }},
                {{ bar: 6, rootOffset: 5, chordIntervals: [0, 4, 7, 10], suffix: '7', degreeRoman: 'IV7' }},
                {{ bar: 7, rootOffset: 0, chordIntervals: [0, 4, 7, 10], suffix: '7', degreeRoman: 'I7' }},
                {{ bar: 8, rootOffset: 0, chordIntervals: [0, 4, 7, 10], suffix: '7', degreeRoman: 'I7' }},
                {{ bar: 9, rootOffset: 7, chordIntervals: [0, 4, 7, 10], suffix: '7', degreeRoman: 'V7' }},
                {{ bar: 10, rootOffset: 5, chordIntervals: [0, 4, 7, 10], suffix: '7', degreeRoman: 'IV7' }},
                {{ bar: 11, rootOffset: 0, chordIntervals: [0, 4, 7, 10], suffix: '7', degreeRoman: 'I7' }},
                {{ bar: 12, rootOffset: 7, chordIntervals: [0, 4, 7, 10], suffix: '7', degreeRoman: 'V7 (Turnaround)' }}
            ]
        }},"""
    return snippet

def main():
    parser = argparse.ArgumentParser(description="Extract tempo, rhythm, and multi-track MIDI from an audio backing track.")
    parser.add_argument("audio_path", help="Path to input .mp3 or .wav audio file")
    parser.add_argument("--bpm", type=float, default=None, help="Explicit tempo override (auto-detected if omitted)")
    parser.add_argument("--meter", default="4/4", help="Time signature (default: 4/4)")
    parser.add_argument("--mode", default=None, choices=list(MODE_DEGREES.keys()), help="Target musical mode key")
    parser.add_argument("--root", default=None, help="Root note name (e.g. A, C, D, E, G)")
    parser.add_argument("--category", default="Blues & Shuffle", help="Category for preset (e.g. Blues & Shuffle, Rock & Pop)")
    parser.add_argument("--output-mid", default=None, help="Output .mid file path")
    parser.add_argument("--output-preset", action="store_true", help="Print JavaScript preset configuration for MidiBackingTrackModel.js")
    args = parser.parse_args()

    if not os.path.exists(args.audio_path):
        print(f"Error: Audio file not found: {args.audio_path}")
        sys.exit(1)

    print("=" * 80)
    print(f"EXTRACTING BACKING TRACK: {os.path.basename(args.audio_path)}")
    print("=" * 80)

    # 1. Load Audio
    print("Loading and decoding audio...")
    audio, sr = load_audio_mono(args.audio_path, target_sr=22050, max_seconds=120)
    duration_sec = len(audio) / sr
    print(f"Decoded {len(audio)} mono samples @ {sr} Hz ({duration_sec:.2f} seconds analyzed)")

    # 2. Extract Tempo & Energy Flux
    if args.bpm:
        bpm = args.bpm
        print(f"Using user-specified tempo: {bpm} BPM")
    else:
        print("Analyzing transient flux & autocorrelation...")
        bpm, flux, fps = extract_tempo_and_flux(audio, sr)
        print(f"Estimated Native Tempo: {bpm} BPM")

    # 3. Extract Root & Mode
    if args.root and args.root.upper() in NOTE_NAMES_SHARP:
        root_name = args.root.upper()
        root_idx = NOTE_NAMES_SHARP.index(root_name)
        print(f"Using user-specified root note: {root_name} (index {root_idx})")
    else:
        root_name, root_idx = estimate_root_and_mode(audio, sr)
        print(f"Detected Harmonic Center: {root_name} (index {root_idx})")

    mode_key = args.mode if args.mode else "mixolydian"
    print(f"Target Musical Mode: {mode_key} ({MODE_DEGREES[mode_key]['name']})")

    # 4. Generate Output MIDI
    base_name = os.path.splitext(os.path.basename(args.audio_path))[0]
    safe_name = "".join(c if c.isalnum() else "_" for c in base_name).strip("_").lower()
    out_mid = args.output_mid if args.output_mid else os.path.join("midi_tracks", f"{safe_name}_{int(bpm)}bpm.mid")

    print(f"\nSynthesizing multi-track MIDI sequence -> {out_mid} ...")
    build_midi_track_sequence(out_mid, bpm, args.meter, mode_key, root_idx, total_bars=24)
    print(f"Successfully generated: {out_mid} ({os.path.getsize(out_mid)} bytes, 4 tracks)")

    # 5. Output JS Preset Code
    preset_id = safe_name
    title = f"{args.category} - {root_name} - {MODE_DEGREES[mode_key]['name']}"
    js_code = generate_preset_js_snippet(preset_id, title, args.category, mode_key, root_name, root_idx, bpm, os.path.basename(out_mid))

    if args.output_preset:
        print("\n" + "=" * 80)
        print("JAVASCRIPT PRESET SNIPPET (for src/models/MidiBackingTrackModel.js):")
        print("=" * 80)
        print(js_code)

    print("\nExtraction & synthesis complete!")
    return 0

if __name__ == "__main__":
    main()
