import os
import sys
import mido
from mido import MidiFile, MidiTrack, Message, MetaMessage

TICKS_PER_BEAT = 480
SUB = TICKS_PER_BEAT // 4  # 120 ticks per 16th note
OUT_DIR = r"midi_tracks"

os.makedirs(OUT_DIR, exist_ok=True)

def add_note(ev_list, start_tick, dur_ticks, pitch, vel=90):
    ev_list.append((start_tick, 'note_on', pitch, vel))
    ev_list.append((start_tick + dur_ticks, 'note_off', pitch, 0))

def add_chord(ev_list, start_tick, dur_ticks, pitches, vel=85):
    for p in pitches:
        add_note(ev_list, start_tick, dur_ticks, p, vel)

def save_multitrack_midi(filename, bpm, time_sig, tracks_data, markers=None):
    mid = MidiFile(ticks_per_beat=TICKS_PER_BEAT)
    us_per_beat = int(round(60_000_000 / bpm))

    # Track 0: Conductor
    cond_trk = MidiTrack()
    cond_trk.append(MetaMessage('track_name', name='Conductor', time=0))
    cond_trk.append(MetaMessage('set_tempo', tempo=us_per_beat, time=0))
    num, den = map(int, time_sig.split('/'))
    cond_trk.append(MetaMessage('time_signature', numerator=num, denominator=den, clocks_per_click=24, notated_32nd_notes_per_beat=8, time=0))

    if markers:
        # markers: list of (tick, text)
        sorted_markers = sorted(markers, key=lambda x: x[0])
        last_t = 0
        for m_tick, m_text in sorted_markers:
            delta = max(0, m_tick - last_t)
            cond_trk.append(MetaMessage('marker', text=m_text, time=delta))
            last_t = m_tick

    mid.tracks.append(cond_trk)

    for trk_name, ch, prog, events in tracks_data:
        trk = MidiTrack()
        trk.append(MetaMessage('track_name', name=trk_name, time=0))
        if ch != 9 and prog is not None:
            trk.append(Message('program_change', channel=ch, program=prog, time=0))

        timed = []
        for tick, ev_type, note, vel in events:
            timed.append((tick, ev_type, note, vel))

        timed.sort(key=lambda x: (x[0], 0 if x[1] == 'note_off' else 1))

        last_tick = 0
        for tick, ev_type, note, vel in timed:
            delta = max(0, tick - last_tick)
            trk.append(Message(ev_type, channel=ch, note=int(note), velocity=int(vel), time=delta))
            last_tick = tick

        mid.tracks.append(trk)

    dest = os.path.join(OUT_DIR, filename)
    mid.save(dest)
    print(f"Generated: {dest} ({os.path.getsize(dest)} bytes, {len(mid.tracks)} tracks)")

# =========================================================================
# 01. 12 BAR BLUES SHUFFLE IN A7 (74 BPM) - 2 DISTINCT INSTRUMENTS:
#     Track 1: Electric Guitar (GM 26 Jazz Guitar / Clean Electric)
#     Track 2: Drum Kit (GM Drum Kit, Ch 9/10)
#     Calibrated from Songscription AI authentic audio transcription
# =========================================================================
def build_blues_12bar_a7():
    bpm = 74 # Calibrated from authentic audio transcription
    # 2 choruses of 12 bars (Verse Head + Chorus Solo) = 24 bars (no intro/outro)
    bars = 24
    bar_ticks = 4 * TICKS_PER_BEAT # 1920 ticks per bar
    TRIP = TICKS_PER_BEAT // 3     # 160 ticks per 8th triplet
    Q_NOTE = TICKS_PER_BEAT        # 480 ticks (Quarter Note)
    H_NOTE = 2 * TICKS_PER_BEAT    # 960 ticks (Half Note)
    DOT_Q = int(1.5 * TICKS_PER_BEAT) # 720 ticks (Dotted Quarter Note)
    
    dr_ev, gt_ev = [], []
    markers = [
        (0, "Verse (Head)"),
        (12 * bar_ticks, "Chorus (Solo)")
    ]

    # 12-bar blues progression in A7 (24 bars: 12-bar Verse + 12-bar Chorus):
    prog_chords = [
        # Verse 1 / Head (12 bars)
        ('A7', False), ('D7', False), ('A7', False), ('A7', False),
        ('D7', False), ('D7', False), ('A7', False), ('A7', False),
        ('E7', False), ('D7', False), ('A7', False), ('E7', True),
        # Chorus 2 / Solo (12 bars)
        ('A7', False), ('D7', False), ('A7', False), ('A7', False),
        ('D7', False), ('D7', False), ('A7', False), ('A7', False),
        ('E7', False), ('D7', False), ('A7', False), ('E7', True)
    ]

    VOICINGS = {
        'A7': {
            'downbeat': [45, 52, 55, 61],        # A2, E3, G3, C#4
            'pickup': [45],                      # A2 (low root)
            'chop': [45, 52, 55, 61, 69],        # A2, E3, G3, C#4, A4
            'push': [45, 61, 64, 69],            # A2, C#4, E4, A4 (sustained quarter note)
            'weight': [45, 52, 55, 61],          # A2, E3, G3, C#4
            'cadence': [45, 55, 61, 64]          # Sustained half note
        },
        'D7': {
            'downbeat': [50, 57, 60, 66],        # D3, A3, C4, F#4
            'pickup': [50],                      # D3 (low root)
            'chop': [50, 57, 60, 66, 69],        # D3, A3, C4, F#4, A4
            'push': [50, 60, 66, 69],            # D3, C4, F#4, A4 (sustained quarter note)
            'weight': [50, 57, 60],              # D3, A3, C4
            'cadence': [50, 60, 64, 66]          # Sustained half note
        },
        'E7': {
            'downbeat': [40, 52, 56, 59, 62],    # E2, E3, G#3, B3, D4
            'pickup': [52],                      # E3
            'chop': [52, 59, 62, 68],            # E3, B3, D4, G#4
            'push': [52, 62, 68, 71],            # E3, D4, G#4, B4 (sustained quarter note)
            'weight': [52, 59, 62, 68],          # E3, B3, D4, G#4
            'cadence': [52, 62, 65, 68]          # E7#9 Hendrix / turnaround push
        }
    }

    for bar_idx, (chord_name, is_turnaround) in enumerate(prog_chords):
        b_start = bar_idx * bar_ticks
        v = VOICINGS[chord_name]

        # -------------------------------------------------------------
        # TRACK 1: ELECTRIC GUITAR (Channel 0, GM 26 Jazz Electric)
        # -------------------------------------------------------------
        if is_turnaround:
            # Turnaround cadence bar: Half Notes on Beat 1 and Beat 3
            # Beat 1: V7 push (Half Note = 960 ticks)
            add_chord(gt_ev, b_start + 0, H_NOTE - 40, v['cadence'], 95)
            # Beat 3: V7#9 push (Half Note = 960 ticks)
            add_chord(gt_ev, b_start + 2 * Q_NOTE, H_NOTE - 40, v['push'], 100)
        else:
            # Standard Blues Shuffle Comping Bar (Exact Songscription Rhythm)
            # Beat 1:
            # - Triplet 0 (downbeat): Staccato chord chop (160 ticks)
            add_chord(gt_ev, b_start + 0, TRIP, v['downbeat'], 95)
            # - Triplet 2 (push): Low string root pickup (160 ticks)
            add_chord(gt_ev, b_start + 2 * TRIP, TRIP, v['pickup'], 85)

            # Beat 2:
            # - Triplet 0 (snare sync): Staccato chord chop (160 ticks)
            add_chord(gt_ev, b_start + Q_NOTE + 0, TRIP, v['chop'], 95)
            # - Triplet 2 (Beat 2-uh): SUSTAINED QUARTER NOTE PUSH (480 ticks)
            #   Sustains right across Beat 3 downbeat!
            add_chord(gt_ev, b_start + Q_NOTE + 2 * TRIP, Q_NOTE, v['push'], 98)

            # Beat 3:
            # - Beat 3 harmonic weight: Sustained chord hit (Quarter Note)
            add_chord(gt_ev, b_start + 2 * Q_NOTE + TRIP, Q_NOTE - TRIP, v['weight'], 90)

            # Beat 4:
            # - Triplet 0: Staccato chord chop (160 ticks)
            add_chord(gt_ev, b_start + 3 * Q_NOTE + 0, TRIP, v['downbeat'], 92)
            # - Triplet 1: Low string root pickup (160 ticks)
            add_chord(gt_ev, b_start + 3 * Q_NOTE + TRIP, TRIP, v['pickup'], 80)
            # - Triplet 2 (Beat 4-uh): ANTICIPATION PUSH CHORD (Dotted Quarter Note = 720 ticks)
            #   Sustains across the barline into Beat 1 of next bar!
            add_chord(gt_ev, b_start + 3 * Q_NOTE + 2 * TRIP, DOT_Q, v['push'], 96)

        # -------------------------------------------------------------
        # TRACK 2: DRUM KIT (Channel 9 / GM Drums)
        # -------------------------------------------------------------
        # Crash cymbal on downbeat of new choruses
        if bar_idx in [0, 4, 16, 28]:
            add_note(dr_ev, b_start, Q_NOTE, 49, 110) # Crash Cymbal

        # Continuous 12/8 Closed Hi-Hat Swung Shuffle (12 triplets per bar)
        for beat in range(4):
            b_off = b_start + beat * Q_NOTE
            # Triplet 0: downbeat accent
            add_note(dr_ev, b_off + 0, TRIP - 20, 42, 85)
            # Triplet 1: light ghost
            add_note(dr_ev, b_off + TRIP, TRIP - 20, 42, 60)
            # Triplet 2: push swing
            add_note(dr_ev, b_off + 2 * TRIP, TRIP - 20, 42, 75)

        # Kick Drum (Note 36):
        # Punch on Beat 1 (t = 0) and Beat 3 (t = 2 * Q_NOTE)
        add_note(dr_ev, b_start + 0, TRIP * 2, 36, 105)
        add_note(dr_ev, b_start + 2 * Q_NOTE, TRIP * 2, 36, 95)

        # Snare Drum (Note 38):
        # Solid backbeat on Beat 2 (t = Q_NOTE) and Beat 4 (t = 3 * Q_NOTE)
        add_note(dr_ev, b_start + Q_NOTE, TRIP * 2, 38, 105)

        if is_turnaround or (bar_idx % 4 == 3):
            # Tasteful 16th-triplet turnaround snare roll on Beat 4
            roll_step = TRIP // 2 # 80 ticks
            for r in range(4):
                add_note(dr_ev, b_start + 3 * Q_NOTE + r * roll_step, roll_step, 38, 85 + r * 5)
        else:
            add_note(dr_ev, b_start + 3 * Q_NOTE, TRIP * 2, 38, 105)

    tracks = [
        ("Electric Guitar", 0, 26, gt_ev), # Jazz Electric Guitar (GM 26)
        ("Drum Kit", 9, None, dr_ev)       # Standard GM Drum Kit (Channel 10)
    ]

    # Save both canonical 74bpm and compatibility 116bpm filenames
    save_multitrack_midi("01_blues_12bar_a7_74bpm.mid", bpm, "4/4", tracks, markers)
    save_multitrack_midi("01_blues_12bar_a7_116bpm.mid", bpm, "4/4", tracks, markers)

# =========================================================================
# 02. SMOOTH NEO-SOUL GROOVE IN A DORIAN (95 BPM)
# =========================================================================
def build_dorian_smooth_a():
    bpm = 95
    bars = 32
    bar_sub = 16 * SUB
    dr_ev, bs_ev, gt_ev, rh_ev = [], [], [], []
    markers = [
        (0, "Intro Ambient"),
        (4 * bar_sub, "Theme A (Verse)"),
        (12 * bar_sub, "Groove Pocket (Chorus)"),
        (20 * bar_sub, "Solo Section"),
        (28 * bar_sub, "Outro Vamp")
    ]

    # 4-bar loop: Am9 (0) -> D9 (5) -> Am9 (0) -> Bm7 (2)
    chords_loop = [
        (0, [57, 60, 64, 67, 71]), # Am9 (A, C, E, G, B)
        (5, [62, 66, 69, 72, 76]), # D9 (D, F#, A, C, E)
        (0, [57, 60, 64, 67, 71]), # Am9
        (2, [59, 62, 66, 69])      # Bm7 (B, D, F#, A)
    ]

    for bar_idx in range(bars):
        b_start = bar_idx * bar_sub
        r_off, pitches = chords_loop[bar_idx % 4]

        # Drums: Swung Neo-Soul Pocket
        if bar_idx in [0, 4, 12, 20]:
            add_note(dr_ev, b_start, SUB*2, 49, 100) # Crash
        # 16th hats with swung groove
        for s in range(16):
            if s % 2 == 0:
                add_note(dr_ev, b_start + s*SUB, SUB, 42, 75 if s % 4 == 0 else 55)
            elif s in [3, 7, 11, 15]:
                add_note(dr_ev, b_start + s*SUB, SUB, 42, 60)
        # Snare / Rim on 4 & 12
        add_note(dr_ev, b_start + 4*SUB, SUB*2, 37, 95)
        add_note(dr_ev, b_start + 12*SUB, SUB*2, 38, 95)
        # Ghost snare on 9 & 14
        add_note(dr_ev, b_start + 9*SUB, SUB, 38, 45)
        add_note(dr_ev, b_start + 14*SUB, SUB, 38, 50)
        # Kick on 0, 6, 10
        add_note(dr_ev, b_start + 0*SUB, SUB*2, 36, 100)
        add_note(dr_ev, b_start + 6*SUB, SUB*2, 36, 85)
        add_note(dr_ev, b_start + 10*SUB, SUB*2, 36, 90)

        # Bass: Smooth syncopated pocket
        b_root = 33 + r_off
        add_note(bs_ev, b_start + 0*SUB, SUB*3, b_root, 95)
        add_note(bs_ev, b_start + 6*SUB, SUB*2, b_root + 7, 85)
        add_note(bs_ev, b_start + 10*SUB, SUB*3, b_root, 90)
        add_note(bs_ev, b_start + 14*SUB, SUB*2, b_root + 12, 80)

        # Clean Strat Guitar: Laid-back chucks
        add_chord(gt_ev, b_start + 2*SUB, SUB*3, pitches, 85)
        add_chord(gt_ev, b_start + 10*SUB, SUB*2, pitches, 75)
        add_chord(gt_ev, b_start + 13*SUB, SUB*3, pitches, 80)

        # Suitcase Rhodes: Bell-like warm chords
        add_chord(rh_ev, b_start, bar_sub - 30, [p - 12 for p in pitches[:3]] + pitches, 75)

    tracks = [
        ("Neo-Soul Kit", 9, None, dr_ev),
        ("Pocket Bass", 0, 33, bs_ev),
        ("Strat Clean Neck", 1, 27, gt_ev),
        ("Suitcase Rhodes", 2, 4, rh_ev)
    ]
    save_multitrack_midi("02_dorian_smooth_a_95bpm.mid", bpm, "4/4", tracks, markers)

# =========================================================================
# 03. DARK AMBIENT FUSION IN A LOCRIAN (68 BPM)
# =========================================================================
def build_locrian_jam_a():
    bpm = 68
    bars = 32
    bar_sub = 16 * SUB
    dr_ev, bs_ev, gt_ev, pad_ev = [], [], [], []
    markers = [
        (0, "Intro Drone"),
        (4 * bar_sub, "Verse (Dark Vamp)"),
        (12 * bar_sub, "Chorus (Locrian Tension)"),
        (20 * bar_sub, "Solo Improvisation"),
        (28 * bar_sub, "Outro Fade")
    ]

    # Am7b5 -> Bbmaj7 -> Gm7 -> Am7b5
    chords_loop = [
        (0, [57, 60, 63, 67]), # Am7b5 (A, C, Eb, G)
        (1, [58, 62, 65, 69]), # Bbmaj7 (Bb, D, F, A)
        (10, [55, 58, 62, 65]), # Gm7 (G, Bb, D, F)
        (0, [57, 60, 63, 67])  # Am7b5
    ]

    for bar_idx in range(bars):
        b_start = bar_idx * bar_sub
        r_off, pitches = chords_loop[bar_idx % 4]

        # Drums: Slow tense atmospheric pocket
        if bar_idx in [0, 4, 12, 20]:
            add_note(dr_ev, b_start, SUB*4, 49, 100) # Crash
        for s in [0, 2, 4, 6, 8, 10, 12, 14]:
            add_note(dr_ev, b_start + s*SUB, SUB, 51 if bar_idx >= 12 else 42, 65)
        # Snare on 4 & 12
        add_note(dr_ev, b_start + 4*SUB, SUB*2, 38, 95)
        add_note(dr_ev, b_start + 12*SUB, SUB*2, 38, 95)
        # Heavy sub kick on 0 and 8
        add_note(dr_ev, b_start + 0*SUB, SUB*3, 36, 110)
        add_note(dr_ev, b_start + 8*SUB, SUB*3, 36, 100)

        # Synth Bass: Heavy low root drone with fifth / octave slides
        b_root = 33 + r_off
        add_note(bs_ev, b_start + 0*SUB, SUB*6, b_root, 100)
        add_note(bs_ev, b_start + 8*SUB, SUB*6, b_root + (6 if r_off == 0 else 7), 90)

        # Clean Chorus Guitar: Ambient arpeggio picks
        for note_idx, s in enumerate([0, 3, 6, 9, 12, 14]):
            p = pitches[note_idx % len(pitches)]
            add_note(gt_ev, b_start + s*SUB, SUB*3, p, 80)

        # Dark Synth Pad
        add_chord(pad_ev, b_start, bar_sub - 20, [p - 12 for p in pitches] + pitches, 70)

    tracks = [
        ("Atmospheric Drums", 9, None, dr_ev),
        ("Dark Synth Bass", 0, 38, bs_ev),
        ("Chorus Clean Guitar", 1, 27, gt_ev),
        ("Ambient Synth Pad", 2, 89, pad_ev) # Warm Pad
    ]
    save_multitrack_midi("03_locrian_jam_a_68bpm.mid", bpm, "4/4", tracks, markers)

# =========================================================================
# 04. OPEN LIFE JAM IN A MIXOLYDIAN (120 BPM)
# =========================================================================
def build_mixolydian_open_life_a():
    bpm = 120
    bars = 36
    bar_sub = 16 * SUB
    dr_ev, bs_ev, gt_ev, pno_ev = [], [], [], []
    markers = [
        (0, "Intro Riff"),
        (4 * bar_sub, "Verse (Driving)"),
        (12 * bar_sub, "Chorus (Open Life)"),
        (20 * bar_sub, "Extended Solo"),
        (32 * bar_sub, "Outro Jam")
    ]

    # A -> G/A -> D/A -> A
    chords_loop = [
        (0, [57, 61, 64]), # A (A, C#, E)
        (10, [55, 59, 62]), # G (G, B, D)
        (5, [57, 62, 66]),  # D (A, D, F#)
        (0, [57, 61, 64])   # A
    ]

    for bar_idx in range(bars):
        b_start = bar_idx * bar_sub
        r_off, pitches = chords_loop[bar_idx % 4]

        # Drums: Upbeat Rock Jam
        if bar_idx in [0, 4, 12, 20]:
            add_note(dr_ev, b_start, SUB*2, 49, 110)
        for s in range(0, 16, 2):
            add_note(dr_ev, b_start + s*SUB, SUB, 42, 80)
        add_note(dr_ev, b_start + 4*SUB, SUB*2, 38, 105)
        add_note(dr_ev, b_start + 12*SUB, SUB*2, 38, 105)
        add_note(dr_ev, b_start + 0*SUB, SUB*2, 36, 100)
        add_note(dr_ev, b_start + 6*SUB, SUB*2, 36, 85)
        add_note(dr_ev, b_start + 10*SUB, SUB*2, 36, 95)

        # Driving Rock Bass
        b_root = 33 + r_off
        for s in [0, 2, 4, 6, 8, 10, 12, 14]:
            add_note(bs_ev, b_start + s*SUB, int(SUB * 1.6), b_root, 90)

        # Crunch Rhythm Guitar: Rhythmic open strumming
        for s in [0, 3, 6, 8, 11, 14]:
            add_chord(gt_ev, b_start + s*SUB, int(SUB * 1.8), pitches, 90)

        # Grand Piano Rock Chords
        add_chord(pno_ev, b_start + 0*SUB, SUB*4, pitches, 85)
        add_chord(pno_ev, b_start + 8*SUB, SUB*4, pitches, 85)

    tracks = [
        ("Rock Kit", 9, None, dr_ev),
        ("Electric Bass", 0, 34, bs_ev),     # Picked Bass
        ("Crunch Guitar", 1, 29, gt_ev),     # Overdriven Guitar
        ("Grand Piano", 2, 0, pno_ev)        # Acoustic Grand Piano
    ]
    save_multitrack_midi("04_mixolydian_open_life_a_120bpm.mid", bpm, "4/4", tracks, markers)

# =========================================================================
# 05. BOSSA NOVA 2-5-1-6 IN C MAJOR (128 BPM)
# =========================================================================
def build_bossa_nova_2516_c():
    bpm = 128
    bars = 36
    bar_sub = 16 * SUB
    dr_ev, bs_ev, gt_ev, fl_ev = [], [], [], []
    markers = [
        (0, "Intro Clave"),
        (4 * bar_sub, "Part A (2-5-1-6 Theme)"),
        (12 * bar_sub, "Part B (Modulated Swing)"),
        (20 * bar_sub, "Solo Flight"),
        (32 * bar_sub, "Outro Coda")
    ]

    # Dm9 -> G13 -> Cmaj9 -> A7b13
    chords_loop = [
        (2, [50, 53, 57, 60, 64]), # Dm9 (D, F, A, C, E)
        (7, [47, 53, 57, 59, 64]), # G13 (G, F, A, B, E)
        (0, [48, 52, 55, 59, 62]), # Cmaj9 (C, E, G, B, D)
        (9, [45, 52, 55, 58, 61])  # A7b13 (A, E, G, Bb, C#)
    ]

    for bar_idx in range(bars):
        b_start = bar_idx * bar_sub
        r_off, pitches = chords_loop[bar_idx % 4]

        # Drums: Bossa Nova Percussion
        if bar_idx in [0, 4, 12, 20]:
            add_note(dr_ev, b_start, SUB*2, 49, 85) # Gentle crash
        # Foot hi-hat on beats 2 & 4
        add_note(dr_ev, b_start + 4*SUB, SUB, 44, 70)
        add_note(dr_ev, b_start + 12*SUB, SUB, 44, 70)
        # Brazilian Clave cross-stick: steps 0, 3, 6, 10, 12
        for s in [0, 3, 6, 10, 12]:
            add_note(dr_ev, b_start + s*SUB, SUB, 37, 85)
        # Surdo kick: beat 1 (soft) and beat 3 (accented)
        add_note(dr_ev, b_start + 0*SUB, SUB*2, 36, 75)
        add_note(dr_ev, b_start + 8*SUB, SUB*2, 36, 95)
        # Shaker / closed hi-hat on all 16th notes
        for s in range(16):
            add_note(dr_ev, b_start + s*SUB, SUB, 42, 60 if s % 2 == 0 else 45)

        # Acoustic Thumb Bass: Root on beat 1, Fifth on beat 3
        b_root = 36 + r_off # D1 = 26 or 38
        if b_root > 40: b_root -= 12
        add_note(bs_ev, b_start + 0*SUB, SUB*3, b_root, 90)
        add_note(bs_ev, b_start + 8*SUB, SUB*3, b_root + 7, 85)

        # Nylon Guitar: Syncopated Bossa comping
        for s in [0, 3, 6, 10, 12]:
            add_chord(gt_ev, b_start + s*SUB, int(SUB * 1.8), pitches, 85)

        # Gentle Flute / Pad Sustained
        add_chord(fl_ev, b_start, bar_sub - 20, [pitches[0] + 12, pitches[2] + 12], 65)

    tracks = [
        ("Bossa Percussion", 9, None, dr_ev),
        ("Acoustic Upright Bass", 0, 32, bs_ev),
        ("Nylon Acoustic Guitar", 1, 24, gt_ev),
        ("Flute / Pad", 2, 73, fl_ev)          # Flute
    ]
    save_multitrack_midi("05_bossa_nova_2516_c_128bpm.mid", bpm, "4/4", tracks, markers)

# =========================================================================
# 06. LATIN FUNK GROOVE IN D DORIAN (115 BPM)
# =========================================================================
def build_dorian_funk_d():
    bpm = 115
    bars = 36
    bar_sub = 16 * SUB
    dr_ev, bs_ev, gt_ev, org_ev = [], [], [], []
    markers = [
        (0, "Intro Percussion"),
        (4 * bar_sub, "Verse (Latin Funk)"),
        (12 * bar_sub, "Chorus (Organ Surge)"),
        (20 * bar_sub, "Solo Vamp"),
        (32 * bar_sub, "Outro Groove")
    ]

    # Dm7 -> G7 -> Dm7 -> Em7
    chords_loop = [
        (2, [50, 57, 60, 65]), # Dm7
        (7, [47, 55, 59, 65]), # G7
        (2, [50, 57, 60, 65]), # Dm7
        (4, [52, 59, 62, 67])  # Em7
    ]

    for bar_idx in range(bars):
        b_start = bar_idx * bar_sub
        r_off, pitches = chords_loop[bar_idx % 4]

        # Drums: Latin Funk
        if bar_idx in [0, 4, 12, 20]:
            add_note(dr_ev, b_start, SUB*2, 49, 105)
        # Snappy hi-hats
        for s in range(0, 16, 2):
            add_note(dr_ev, b_start + s*SUB, SUB, 42, 85 if s in [4, 12] else 70)
        add_note(dr_ev, b_start + 4*SUB, SUB*2, 38, 105)
        add_note(dr_ev, b_start + 12*SUB, SUB*2, 38, 105)
        # Ghost snares
        add_note(dr_ev, b_start + 7*SUB, SUB, 38, 55)
        add_note(dr_ev, b_start + 15*SUB, SUB, 38, 60)
        # Funk kicks: 0, 3, 6, 10
        for s in [0, 3, 6, 10]:
            add_note(dr_ev, b_start + s*SUB, SUB, 36, 100)

        # Slap Bass: Funky octave pops
        b_root = 26 + r_off # D1 = 26
        add_note(bs_ev, b_start + 0*SUB, SUB, b_root, 105)     # slap thumb
        add_note(bs_ev, b_start + 3*SUB, SUB, b_root + 12, 95) # pop
        add_note(bs_ev, b_start + 6*SUB, SUB, b_root, 95)
        add_note(bs_ev, b_start + 10*SUB, SUB, b_root + 10, 90)
        add_note(bs_ev, b_start + 12*SUB, SUB, b_root + 12, 100)

        # Funk Guitar Chucks & Stabs
        for s in [2, 5, 8, 11, 14]:
            add_chord(gt_ev, b_start + s*SUB, SUB, pitches, 85)

        # Percussive Organ Stabs
        add_chord(org_ev, b_start + 0*SUB, SUB*2, pitches, 85)
        add_chord(org_ev, b_start + 6*SUB, SUB*3, pitches, 90)

    tracks = [
        ("Funk Kit", 9, None, dr_ev),
        ("Slap Bass", 0, 36, bs_ev),
        ("Clean Funk Guitar", 1, 27, gt_ev),
        ("Percussive Organ", 2, 17, org_ev)
    ]
    save_multitrack_midi("06_dorian_funk_d_115bpm.mid", bpm, "4/4", tracks, markers)

# =========================================================================
# 07. DARK SAD BLUES ROCK BALLAD IN A MINOR (64 BPM)
# =========================================================================
def build_dark_sad_blues_rock_am():
    bpm = 64
    bars = 32
    bar_sub = 16 * SUB
    dr_ev, bs_ev, gt_ev, org_ev = [], [], [], []
    markers = [
        (0, "Intro Arpeggio"),
        (4 * bar_sub, "Verse (Melancholy)"),
        (12 * bar_sub, "Chorus (Epic Rise)"),
        (20 * bar_sub, "Crying Solo"),
        (28 * bar_sub, "Outro Fade")
    ]

    # Am -> F -> C -> G -> Dm -> Am -> F -> E7
    chords_loop = [
        (0, [57, 60, 64]), # Am
        (8, [53, 57, 60]), # F
        (3, [48, 52, 55]), # C
        (10, [55, 59, 62]), # G
        (5, [50, 53, 57]), # Dm
        (0, [57, 60, 64]), # Am
        (8, [53, 57, 60]), # F
        (7, [52, 56, 59, 62]) # E7
    ]

    for bar_idx in range(bars):
        b_start = bar_idx * bar_sub
        r_off, pitches = chords_loop[bar_idx % 8]

        # Drums: Slow deep rock ballad
        if bar_idx in [0, 4, 12, 20]:
            add_note(dr_ev, b_start, SUB*4, 49, 110)
        for s in range(0, 16, 2):
            add_note(dr_ev, b_start + s*SUB, SUB, 42, 75)
        # Cracking snare on 4 & 12
        add_note(dr_ev, b_start + 4*SUB, SUB*2, 38, 105)
        add_note(dr_ev, b_start + 12*SUB, SUB*2, 38, 105)
        # Deep sub kick on 0, 8, 10
        add_note(dr_ev, b_start + 0*SUB, SUB*3, 36, 110)
        add_note(dr_ev, b_start + 8*SUB, SUB*2, 36, 95)
        add_note(dr_ev, b_start + 10*SUB, SUB*2, 36, 90)

        # Deep Bass: Sustained 8th notes
        b_root = 33 + (r_off if r_off < 12 else r_off - 12)
        add_note(bs_ev, b_start + 0*SUB, SUB*6, b_root, 95)
        add_note(bs_ev, b_start + 8*SUB, SUB*6, b_root, 90)

        # Clean Arpeggiated Guitar
        for step_i, s in enumerate(range(0, 16, 2)):
            p = pitches[step_i % len(pitches)]
            add_note(gt_ev, b_start + s*SUB, SUB*2, p, 85)

        # Hammond Organ Pad
        add_chord(org_ev, b_start, bar_sub - 30, [p - 12 for p in pitches] + pitches, 75)

    tracks = [
        ("Ballad Drums", 9, None, dr_ev),
        ("Deep Rock Bass", 0, 33, bs_ev),
        ("Clean Chorus Guitar", 1, 27, gt_ev),
        ("Hammond Organ Pad", 2, 17, org_ev)
    ]
    save_multitrack_midi("07_dark_sad_blues_rock_am_64bpm.mid", bpm, "4/4", tracks, markers)

# =========================================================================
# 08. DARK METAL GALLOP IN E PHRYGIAN (120 BPM)
# =========================================================================
def build_phrygian_metal_e():
    bpm = 120
    bars = 36
    bar_sub = 16 * SUB
    dr_ev, bs_ev, gt_ev = [], [], []
    markers = [
        (0, "Intro Riff Assault"),
        (4 * bar_sub, "Verse (Palm-Muted Gallop)"),
        (12 * bar_sub, "Chorus (Phrygian Stabs)"),
        (20 * bar_sub, "Lead Solo Shred"),
        (32 * bar_sub, "Outro Chugs")
    ]

    # E5 -> F5 -> G5 -> F5
    power_chords = [
        [40, 47, 52], # E5 (E2, B2, E3)
        [41, 48, 53], # F5 (F2, C3, F3)
        [43, 50, 55], # G5 (G2, D3, G3)
        [41, 48, 53]  # F5
    ]

    for bar_idx in range(bars):
        b_start = bar_idx * bar_sub
        p_chord = power_chords[bar_idx % 4]

        # Drums: 16th Double-bass metal gallop
        if bar_idx in [0, 4, 12, 20]:
            add_note(dr_ev, b_start, SUB*2, 49, 120)
        # Snares on 4 & 12
        add_note(dr_ev, b_start + 4*SUB, SUB, 38, 115)
        add_note(dr_ev, b_start + 12*SUB, SUB, 38, 115)
        # Double kicks: rapid 16ths
        for s in [0, 1, 2, 4, 6, 7, 8, 9, 10, 12, 14, 15]:
            add_note(dr_ev, b_start + s*SUB, SUB, 36, 105)
        # Closed hats
        for s in range(0, 16, 2):
            add_note(dr_ev, b_start + s*SUB, SUB, 42, 85)

        # Distorted Bass chugs
        b_root = 28 if (bar_idx % 4 == 0) else (29 if (bar_idx % 4 in [1, 3]) else 31)
        for s in range(12):
            add_note(bs_ev, b_start + s*SUB, int(SUB * 0.8), b_root, 95)
        # Accent bass on 12 & 14
        add_note(bs_ev, b_start + 12*SUB, SUB*2, b_root, 110)
        add_note(bs_ev, b_start + 14*SUB, SUB*2, b_root, 110)

        # Distorted Guitar Palm-Mute Gallop on low E/F
        for s in range(12):
            add_note(gt_ev, b_start + s*SUB, int(SUB * 0.75), 40, 85)
        # Power Chord Punch on steps 12 and 14
        add_chord(gt_ev, b_start + 12*SUB, int(SUB * 1.8), p_chord, 115)
        add_chord(gt_ev, b_start + 14*SUB, int(SUB * 1.8), p_chord, 115)

    tracks = [
        ("Metal Kit", 9, None, dr_ev),
        ("Distorted Bass", 0, 34, bs_ev),
        ("Heavy Distortion Guitar", 1, 30, gt_ev)
    ]
    save_multitrack_midi("08_phrygian_metal_e_120bpm.mid", bpm, "4/4", tracks, markers)

# =========================================================================
# 09. EMOTIONAL MELODIC ROCK BALLAD IN B MINOR (63 BPM)
# =========================================================================
def build_emotional_rock_ballad_bm():
    bpm = 63
    bars = 32
    bar_sub = 16 * SUB
    dr_ev, bs_ev, gt_ev, pno_ev = [], [], [], []
    markers = [
        (0, "Intro Piano & Guitar"),
        (4 * bar_sub, "Verse (Intimate)"),
        (12 * bar_sub, "Chorus (Power Anthem)"),
        (20 * bar_sub, "Heroic Solo"),
        (28 * bar_sub, "Outro Cadence")
    ]

    # Bm -> G -> D -> A
    chords_loop = [
        (11, [47, 54, 59, 62]), # Bm
        (7, [43, 50, 55, 59]),  # G
        (2, [50, 57, 62, 66]),  # D
        (9, [45, 52, 57, 61])   # A
    ]

    for bar_idx in range(bars):
        b_start = bar_idx * bar_sub
        r_off, pitches = chords_loop[bar_idx % 4]

        # Drums: 80s/90s power ballad
        if bar_idx in [0, 4, 12, 20]:
            add_note(dr_ev, b_start, SUB*4, 49, 110)
        for s in range(0, 16, 2):
            add_note(dr_ev, b_start + s*SUB, SUB, 42, 80)
        add_note(dr_ev, b_start + 4*SUB, SUB*2, 38, 105)
        add_note(dr_ev, b_start + 12*SUB, SUB*2, 38, 105)
        add_note(dr_ev, b_start + 0*SUB, SUB*3, 36, 105)
        add_note(dr_ev, b_start + 8*SUB, SUB*2, 36, 95)
        add_note(dr_ev, b_start + 10*SUB, SUB*2, 36, 90)

        # Electric Bass
        b_root = 35 if r_off == 11 else (31 if r_off == 7 else (38 if r_off == 2 else 33))
        add_note(bs_ev, b_start + 0*SUB, SUB*6, b_root, 95)
        add_note(bs_ev, b_start + 8*SUB, SUB*6, b_root, 90)

        # Clean Strat Guitar arpeggios
        for step_i, s in enumerate(range(0, 16, 2)):
            p = pitches[step_i % len(pitches)]
            add_note(gt_ev, b_start + s*SUB, SUB*2, p, 80)

        # Grand Piano: Rolling majestic chords
        add_chord(pno_ev, b_start + 0*SUB, SUB*4, pitches, 85)
        add_chord(pno_ev, b_start + 8*SUB, SUB*4, pitches, 80)

    tracks = [
        ("Power Ballad Kit", 9, None, dr_ev),
        ("Electric Bass", 0, 33, bs_ev),
        ("Strat Clean Arpeggio", 1, 27, gt_ev),
        ("Grand Piano", 2, 0, pno_ev)
    ]
    save_multitrack_midi("09_emotional_rock_ballad_bm_63bpm.mid", bpm, "4/4", tracks, markers)

# =========================================================================
# 10. ALIEN FUSION VAMP IN F# LOCRIAN (122 BPM)
# =========================================================================
def build_locrian_dark_fs():
    bpm = 122
    bars = 36
    bar_sub = 16 * SUB
    dr_ev, bs_ev, gt_ev, syn_ev = [], [], [], []
    markers = [
        (0, "Intro Ambient Pulse"),
        (4 * bar_sub, "Theme A (Locrian Vamp)"),
        (12 * bar_sub, "Theme B (Resolution Pushes)"),
        (20 * bar_sub, "Solo Space"),
        (32 * bar_sub, "Outro Vamp")
    ]

    # F#m7b5 -> Gmaj7 -> Em7 -> F#m7b5
    chords_loop = [
        (6, [54, 57, 60, 64]), # F#m7b5 (F#, A, C, E)
        (7, [55, 59, 62, 66]), # Gmaj7 (G, B, D, F#)
        (4, [52, 55, 59, 62]), # Em7 (E, G, B, D)
        (6, [54, 57, 60, 64])  # F#m7b5
    ]

    for bar_idx in range(bars):
        b_start = bar_idx * bar_sub
        r_off, pitches = chords_loop[bar_idx % 4]

        # Drums: Modern syncopated fusion
        if bar_idx in [0, 4, 12, 20]:
            add_note(dr_ev, b_start, SUB*2, 49, 100)
        for s in range(0, 16, 2):
            add_note(dr_ev, b_start + s*SUB, SUB, 42, 75)
        add_note(dr_ev, b_start + 4*SUB, SUB*2, 38, 100)
        add_note(dr_ev, b_start + 12*SUB, SUB*2, 38, 100)
        add_note(dr_ev, b_start + 0*SUB, SUB*2, 36, 100)
        add_note(dr_ev, b_start + 6*SUB, SUB*2, 36, 85)
        add_note(dr_ev, b_start + 10*SUB, SUB*2, 36, 90)

        # Fretless Bass
        b_root = 30 + r_off
        add_note(bs_ev, b_start + 0*SUB, SUB*3, b_root, 95)
        add_note(bs_ev, b_start + 6*SUB, SUB*3, b_root + 6, 85)
        add_note(bs_ev, b_start + 10*SUB, SUB*4, b_root, 90)

        # Clean Jazz Guitar Stabs
        add_chord(gt_ev, b_start + 2*SUB, SUB*3, pitches, 85)
        add_chord(gt_ev, b_start + 10*SUB, SUB*3, pitches, 80)

        # Modern Synth Pad
        add_chord(syn_ev, b_start, bar_sub - 20, pitches, 70)

    tracks = [
        ("Fusion Drums", 9, None, dr_ev),
        ("Fretless Bass", 0, 35, bs_ev),
        ("Clean Jazz Guitar", 1, 26, gt_ev),
        ("Synth Pad", 2, 89, syn_ev)
    ]
    save_multitrack_midi("10_locrian_dark_fs_122bpm.mid", bpm, "4/4", tracks, markers)

# =========================================================================
# 11. JAZZ 2-5-1 SWING IN C MAJOR (122 BPM)
# =========================================================================
def build_jazz_251_c():
    bpm = 122
    bars = 36
    bar_sub = 16 * SUB
    dr_ev, bs_ev, gt_ev, pno_ev = [], [], [], []
    markers = [
        (0, "Count-in / Intro"),
        (4 * bar_sub, "Head / A1 (2-5-1)"),
        (12 * bar_sub, "A2 (Extended Voicings)"),
        (20 * bar_sub, "Solo Flight 1"),
        (28 * bar_sub, "Solo Flight 2"),
        (32 * bar_sub, "Turnaround Outro")
    ]

    # 8-bar loop: Dm7 (2b) -> G7 (2b) -> Cmaj7 (2b) -> A7alt (2b)
    chords_8bar = [
        (2, [50, 53, 57, 60]),       # Bar 1: Dm7
        (2, [50, 53, 57, 60, 64]),   # Bar 2: Dm9
        (7, [47, 53, 57, 59]),       # Bar 3: G7
        (7, [47, 53, 56, 59]),       # Bar 4: G7b9
        (0, [48, 52, 55, 59]),       # Bar 5: Cmaj7
        (0, [48, 52, 55, 59, 62]),   # Bar 6: Cmaj9
        (9, [45, 52, 55, 58, 63]),   # Bar 7: A7#9
        (9, [45, 52, 55, 57, 60])    # Bar 8: A7alt
    ]

    for bar_idx in range(bars):
        b_start = bar_idx * bar_sub
        r_off, pitches = chords_8bar[bar_idx % 8]

        # Drums: Classic Medium Swing
        # Ride Cymbal "Spank-a-lang" (quarter on 1 & 3, swung dotted-8th+16th on 2 & 4)
        for s in [0, 4, 7, 8, 12, 15]:
            vel = 90 if s in [0, 8] else 75
            add_note(dr_ev, b_start + s*SUB, SUB, 51, vel)
        # Hi-hat pedal "chic" on 2 & 4
        add_note(dr_ev, b_start + 4*SUB, SUB, 44, 85)
        add_note(dr_ev, b_start + 12*SUB, SUB, 44, 85)
        # Feathered soft kick on 1, 2, 3, 4
        for s in [0, 4, 8, 12]:
            add_note(dr_ev, b_start + s*SUB, SUB, 36, 45)

        # Walking Acoustic Upright Bass (4 quarter notes per measure)
        # Root -> 3rd -> 5th -> chromatic approach to next bar
        next_bar_root = 36 + chords_8bar[(bar_idx + 1) % 8][0]
        cur_root = 36 + r_off
        w_notes = [
            cur_root,
            cur_root + (3 if r_off == 2 else 4),
            cur_root + 7,
            next_bar_root - 1
        ]
        for step_i, p in enumerate(w_notes):
            add_note(bs_ev, b_start + step_i * 4 * SUB, int(SUB * 3.6), p, 90)

        # Hollowbody Jazz Guitar: Charleston Comping (beat 1 and "and" of 2: steps 0 & 6)
        add_chord(gt_ev, b_start + 0*SUB, int(SUB * 2.5), pitches, 85)
        add_chord(gt_ev, b_start + 6*SUB, int(SUB * 3.5), pitches, 90)

        # Grand Piano: Syncopated left-hand / right-hand comp
        add_chord(pno_ev, b_start + 2*SUB, SUB*3, pitches, 80)
        add_chord(pno_ev, b_start + 10*SUB, SUB*4, pitches, 85)

    tracks = [
        ("Jazz Swing Kit", 9, None, dr_ev),
        ("Acoustic Walking Bass", 0, 32, bs_ev),
        ("Hollowbody Jazz Guitar", 1, 26, gt_ev),
        ("Grand Piano", 2, 0, pno_ev)
    ]
    save_multitrack_midi("11_jazz_251_c_122bpm.mid", bpm, "4/4", tracks, markers)

# =========================================================================
# 12. 12 BAR MINOR BLUES IN A MINOR (58 BPM)
# =========================================================================
def build_minor_blues_12bar_am():
    bpm = 58
    # 2 choruses of 12 bars (Verse Minor Head + Chorus Solo) = 24 bars (no intro/outro)
    bars = 24
    bar_sub = 16 * SUB
    dr_ev, bs_ev, gt_ev, rh_ev = [], [], [], []
    markers = [
        (0, "Verse (Minor Head)"),
        (12 * bar_sub, "Chorus (Solo)")
    ]

    prog_roots = [
        # Chorus 1 / Verse (Minor Head) (12b): Am7(4b) -> Dm7(2b) -> Am7(2b) -> F7(1b) -> E7#9(1b) -> Am7(1b) -> E7alt(1b)
        0, 0, 0, 0,  5, 5, 0, 0,  8, 7, 0, 7,
        # Chorus 2 / Solo (12b)
        0, 0, 0, 0,  5, 5, 0, 0,  8, 7, 0, 7
    ]

    for bar_idx in range(len(prog_roots)):
        b_start = bar_idx * bar_sub
        r_off = prog_roots[bar_idx]

        # Drums: Slow Minor Blues Pocket (B.B. King Style)
        if bar_idx in [0, 12]:
            add_note(dr_ev, b_start, SUB*3, 49, 105)
        # 8th note hi-hats with swing
        for s in range(0, 16, 2):
            add_note(dr_ev, b_start + s*SUB, SUB, 42, 75 if s % 4 == 0 else 60)
        # Deep snare backbeat on 4 & 12
        add_note(dr_ev, b_start + 4*SUB, SUB*2, 38, 105)
        add_note(dr_ev, b_start + 12*SUB, SUB*2, 38, 105)
        # Punchy kick on 0, 6, 10
        add_note(dr_ev, b_start + 0*SUB, SUB*2, 36, 110)
        add_note(dr_ev, b_start + 6*SUB, SUB, 36, 85)
        add_note(dr_ev, b_start + 10*SUB, SUB*2, 36, 95)

        # Slow Blues Bassline
        b_root = 33 + r_off
        add_note(bs_ev, b_start + 0*SUB, SUB*3, b_root, 95)
        add_note(bs_ev, b_start + 4*SUB, SUB*3, b_root + (3 if r_off in [0, 5] else 4), 85)
        add_note(bs_ev, b_start + 8*SUB, SUB*3, b_root + 7, 90)
        add_note(bs_ev, b_start + 12*SUB, SUB*3, b_root + 10, 85)

        # Overdriven Blues Guitar chops on beats 2 & 4
        chord_root = 57 + r_off
        chord_pitches = [chord_root, chord_root + (3 if r_off in [0, 5] else 4), chord_root + 7, chord_root + 10]
        add_chord(gt_ev, b_start + 4*SUB, SUB*2, chord_pitches, 90)
        add_chord(gt_ev, b_start + 12*SUB, SUB*3, chord_pitches, 95)

        # Suitcase Rhodes chords
        add_chord(rh_ev, b_start, bar_sub - 30, [p - 12 for p in chord_pitches[:3]] + chord_pitches, 75)

    tracks = [
        ("Blues Kit", 9, None, dr_ev),
        ("Electric Bass", 0, 33, bs_ev),
        ("Blues Overdrive Guitar", 1, 29, gt_ev),
        ("Suitcase Rhodes", 2, 4, rh_ev)
    ]
    save_multitrack_midi("12_minor_blues_12bar_am_58bpm.mid", bpm, "4/4", tracks, markers)

# =========================================================================
# 13. ACOUSTIC ROCK POP IN G MAJOR (70 BPM)
# =========================================================================
def build_rock_pop_g_70bpm():
    bpm = 70
    bars = 36
    bar_sub = 16 * SUB
    dr_ev, bs_ev, ac_ev, el_ev = [], [], [], []
    markers = [
        (0, "Intro Acoustic"),
        (4 * bar_sub, "Verse (G - D - Em - C)"),
        (12 * bar_sub, "Chorus (Em - C - G - D)"),
        (20 * bar_sub, "Guitar Solo"),
        (32 * bar_sub, "Outro Fading Strums")
    ]

    # Verse: G -> D -> Em -> C
    verse_chords = [
        (7, [43, 47, 50, 55, 59]), # G
        (2, [50, 54, 57, 62]),     # D
        (4, [40, 47, 52, 55, 59]), # Em
        (0, [48, 52, 55, 60])      # C
    ]
    # Chorus: Em -> C -> G -> D
    chorus_chords = [
        (4, [40, 47, 52, 55, 59]), # Em
        (0, [48, 52, 55, 60]),      # C
        (7, [43, 47, 50, 55, 59]), # G
        (2, [50, 54, 57, 62])      # D
    ]

    for bar_idx in range(bars):
        b_start = bar_idx * bar_sub
        is_chorus = (12 <= bar_idx < 20) or (bar_idx >= 28)
        table = chorus_chords if is_chorus else verse_chords
        r_off, pitches = table[bar_idx % 4]

        # Drums: Acoustic Singer-Songwriter pocket
        if bar_idx in [0, 4, 12, 20]:
            add_note(dr_ev, b_start, SUB*3, 49, 100)
        for s in range(0, 16, 2):
            add_note(dr_ev, b_start + s*SUB, SUB, 42, 75)
        # Cross-stick / snare on 4 & 12
        add_note(dr_ev, b_start + 4*SUB, SUB*2, 37 if not is_chorus else 38, 95)
        add_note(dr_ev, b_start + 12*SUB, SUB*2, 37 if not is_chorus else 38, 95)
        # Kick on 0, 8, 10
        add_note(dr_ev, b_start + 0*SUB, SUB*2, 36, 100)
        add_note(dr_ev, b_start + 8*SUB, SUB*2, 36, 90)
        add_note(dr_ev, b_start + 10*SUB, SUB*2, 36, 85)

        # Warm Electric Bass
        b_root = 31 + r_off
        if b_root > 38: b_root -= 12
        add_note(bs_ev, b_start + 0*SUB, SUB*5, b_root, 95)
        add_note(bs_ev, b_start + 8*SUB, SUB*5, b_root, 90)

        # Steel Acoustic Guitar: Steady 8th strumming
        for s in range(0, 16, 2):
            vel = 90 if s in [0, 4, 8, 12] else 70
            add_chord(ac_ev, b_start + s*SUB, int(SUB * 1.8), pitches, vel)

        # Clean Electric Ambient arpeggio
        for step_i, s in enumerate([0, 3, 6, 8, 11, 14]):
            p = pitches[step_i % len(pitches)] + 12
            add_note(el_ev, b_start + s*SUB, SUB*2, p, 75)

    tracks = [
        ("Acoustic Drums", 9, None, dr_ev),
        ("Electric Bass", 0, 33, bs_ev),
        ("Steel Acoustic Guitar", 1, 25, ac_ev),
        ("Clean Electric Ambient", 2, 27, el_ev)
    ]
    save_multitrack_midi("13_rock_pop_g_70bpm.mid", bpm, "4/4", tracks, markers)

# =========================================================================
# 14. STEVE VAI VIRTUOSO ROCK IN E LYDIAN (130 BPM)
# =========================================================================
def build_vai_lydian_e():
    bpm = 130
    bars = 36
    bar_sub = 16 * SUB
    dr_ev, bs_ev, gt_ev, syn_ev = [], [], [], []
    markers = [
        (0, "Intro Ambient Float"),
        (4 * bar_sub, "Verse (Lydian Mystery)"),
        (12 * bar_sub, "Chorus (Modulation)"),
        (20 * bar_sub, "Virtuoso Solo Flight"),
        (32 * bar_sub, "Outro E Pedal")
    ]

    # Emaj7#11 -> F#/E -> Emaj7 -> F#/E
    chords_loop = [
        (4, [40, 52, 59, 63, 70]), # Emaj7#11 (E, E, B, D#, A#)
        (6, [40, 54, 58, 61, 66]), # F#/E (E pedal with F#, A#, C#, F#)
        (4, [40, 52, 59, 63, 68]), # Emaj7 (E, E, B, D#, G#)
        (6, [40, 54, 58, 61, 66])  # F#/E
    ]

    for bar_idx in range(bars):
        b_start = bar_idx * bar_sub
        r_off, pitches = chords_loop[bar_idx % 4]

        # Drums: Progressive Rock Drive
        if bar_idx in [0, 4, 12, 20]:
            add_note(dr_ev, b_start, SUB*2, 49, 115)
        # Open / closed hi-hat wash
        for s in range(0, 16, 2):
            add_note(dr_ev, b_start + s*SUB, SUB, 46 if s in [6, 14] else 42, 85)
        add_note(dr_ev, b_start + 4*SUB, SUB*2, 38, 110)
        add_note(dr_ev, b_start + 12*SUB, SUB*2, 38, 110)
        # Driving kicks: 0, 3, 8, 10
        add_note(dr_ev, b_start + 0*SUB, SUB*2, 36, 110)
        add_note(dr_ev, b_start + 3*SUB, SUB, 36, 90)
        add_note(dr_ev, b_start + 8*SUB, SUB*2, 36, 100)
        add_note(dr_ev, b_start + 10*SUB, SUB*2, 36, 95)

        # Driving Low E Pedal Bass
        for s in range(0, 16, 2):
            add_note(bs_ev, b_start + s*SUB, int(SUB * 1.6), 28, 95)

        # Strat Clean Neck Pickup Comping
        for s in [0, 3, 6, 8, 11, 14]:
            add_chord(gt_ev, b_start + s*SUB, int(SUB * 2.2), pitches, 85)

        # Ethereal Synth Strings
        add_chord(syn_ev, b_start, bar_sub - 30, [p for p in pitches[1:]], 75)

    tracks = [
        ("Prog Rock Kit", 9, None, dr_ev),
        ("Pedal Bass", 0, 34, bs_ev),
        ("Strat Clean Rhythm", 1, 27, gt_ev),
        ("Ethereal Synth Pad", 2, 89, syn_ev)
    ]
    save_multitrack_midi("14_vai_lydian_e_130bpm.mid", bpm, "4/4", tracks, markers)

# =========================================================================
# 15. ACID JAZZ FUSION JAM TRACK IN D MINOR (3/4, 154 BPM)
# =========================================================================
def build_acid_jazz_34_dm():
    bpm = 154
    bars = 32
    time_sig = "3/4"
    bar_ticks = 3 * TICKS_PER_BEAT # 1440 ticks per bar
    Q = TICKS_PER_BEAT # 480
    E = Q // 2 # 240
    dr_ev, bs_ev, gt_ev, syn_ev = [], [], [], []
    markers = [
        (0, "Intro (Jazz Waltz)"),
        (4 * bar_ticks, "Verse (Acid Groove)"),
        (12 * bar_ticks, "Chorus (Organ Surge)"),
        (20 * bar_ticks, "Solo Flight"),
        (28 * bar_ticks, "Outro Vamp")
    ]
    # Dm9 (root 2) -> Gm9 (root 7) -> Am7 (root 9) -> Dm9 (root 2)
    chords_loop = [
        (2, [50, 57, 60, 64, 69]), # Dm9: D3, A3, C4, E4, A4
        (7, [55, 62, 65, 69, 74]), # Gm9: G3, D4, F4, A4, D5
        (9, [57, 64, 67, 71, 76]), # Am9: A3, E4, G4, B4, E5
        (2, [50, 57, 60, 64, 69])  # Dm9
    ]
    for b in range(bars):
        b_start = b * bar_ticks
        r_off, pitches = chords_loop[b % 4]
        # Drums: Jazz waltz pocket (Kick on 1, snare rim on 2 & 3, ride swung on 1, 2, 2-and, 3)
        if b in [0, 4, 12, 20]:
            add_note(dr_ev, b_start, Q, 49, 105) # Crash
        add_note(dr_ev, b_start + 0, Q, 36, 100) # Kick 1
        add_note(dr_ev, b_start + Q, E, 38, 92)  # Snare 2
        add_note(dr_ev, b_start + 2 * Q, E, 38, 88) # Snare 3
        # Swung Ride Cymbal (GM 51)
        add_note(dr_ev, b_start + 0, E, 51, 85)
        add_note(dr_ev, b_start + Q, E, 51, 90)
        add_note(dr_ev, b_start + Q + int(E * 0.6), E, 51, 75)
        add_note(dr_ev, b_start + 2 * Q, E, 51, 88)

        # Walking / syncopated jazz waltz bassline (Finger Bass GM 33)
        b_root = 38 + r_off # D2 etc.
        add_note(bs_ev, b_start + 0, Q - 30, b_root, 95)
        add_note(bs_ev, b_start + Q, Q - 30, b_root + 7, 88)
        add_note(bs_ev, b_start + 2 * Q, Q - 30, b_root + (10 if r_off in [2, 7, 9] else 11), 85)

        # Electric Clean Guitar (GM 27) Staccato chops & pushes
        add_chord(gt_ev, b_start + 0, E, pitches, 85)
        add_chord(gt_ev, b_start + Q + int(E * 0.6), Q, pitches, 95) # Push into beat 3

        # Suitcase Rhodes (GM 4)
        add_chord(syn_ev, b_start, bar_ticks - 40, pitches, 75)

    tracks = [
        ("Jazz Waltz Kit", 9, None, dr_ev),
        ("Acoustic / Electric Bass", 0, 33, bs_ev),
        ("Clean Jazz Guitar", 1, 26, gt_ev),
        ("Rhodes Electric Piano", 2, 4, syn_ev)
    ]
    return "15_acid_jazz_34_dm_154bpm.mid", bpm, time_sig, tracks, markers

# =========================================================================
# 16. SOFT ROCK IN E MINOR (5/4, 110 BPM)
# =========================================================================
def build_soft_rock_54_em():
    bpm = 110
    bars = 32
    time_sig = "5/4"
    bar_ticks = 5 * TICKS_PER_BEAT # 2400 ticks per bar
    Q = TICKS_PER_BEAT # 480
    E = Q // 2 # 240
    dr_ev, bs_ev, gt_ev, syn_ev = [], [], [], []
    markers = [
        (0, "Intro (5/4 Pulse)"),
        (4 * bar_ticks, "Verse (3+2 Groove)"),
        (12 * bar_ticks, "Chorus (Anthem)"),
        (20 * bar_ticks, "Solo Section"),
        (28 * bar_ticks, "Outro Vamp")
    ]
    # Em7 (root 4) -> Cmaj7 (root 0) -> D7 (root 2) -> Em7 (root 4)
    chords_loop = [
        (4, [52, 59, 62, 67]), # Em7: E3, B3, D4, G4
        (0, [48, 55, 60, 64]), # Cmaj7: C3, G3, C4, E4
        (2, [50, 57, 62, 66]), # D: D3, A3, D4, F#4
        (4, [52, 59, 62, 67])  # Em7
    ]
    for b in range(bars):
        b_start = b * bar_ticks
        r_off, pitches = chords_loop[b % 4]
        # 5/4 Drums: 3 + 2 division
        # Kick on 1 & 4 (t=0, t=3*Q), Snare on 2 & 5 (t=Q, t=4*Q)
        if b in [0, 4, 12, 20]:
            add_note(dr_ev, b_start, Q, 49, 105) # Crash
        add_note(dr_ev, b_start + 0, Q, 36, 105)      # Kick 1
        add_note(dr_ev, b_start + Q, Q, 38, 100)      # Snare 2
        add_note(dr_ev, b_start + 2 * Q, Q, 36, 85)   # Kick 3 ghost
        add_note(dr_ev, b_start + 3 * Q, Q, 36, 105)  # Kick 4 (pulse of 2)
        add_note(dr_ev, b_start + 4 * Q, Q, 38, 100)  # Snare 5
        # Closed Hi-Hat 8th notes across all 5 beats
        for beat in range(5):
            add_note(dr_ev, b_start + beat * Q, E, 42, 85 if beat % 3 == 0 else 70)
            add_note(dr_ev, b_start + beat * Q + E, E, 42, 65)

        # Bassline (Finger Bass GM 33) 3+2 phrasing
        b_root = 40 + (r_off - 4) % 12
        add_note(bs_ev, b_start + 0, Q - 40, b_root, 95)
        add_note(bs_ev, b_start + 2 * Q, Q - 40, b_root + 7, 88)
        add_note(bs_ev, b_start + 3 * Q, Q - 40, b_root, 98)
        add_note(bs_ev, b_start + 4 * Q, Q - 40, b_root + 10, 85)

        # Acoustic / Clean Guitar Comping (GM 25)
        add_chord(gt_ev, b_start + 0, Q, pitches, 90)
        add_chord(gt_ev, b_start + 2 * Q, Q, pitches, 85)
        add_chord(gt_ev, b_start + 3 * Q, int(1.8 * Q), pitches, 95) # Push on 4

        # Soft Strings (GM 48)
        add_chord(syn_ev, b_start, bar_ticks - 50, pitches, 70)

    tracks = [
        ("Rock Drum Kit", 9, None, dr_ev),
        ("Electric Bass", 0, 33, bs_ev),
        ("Steel Acoustic Guitar", 1, 25, gt_ev),
        ("Warm Synth Pad", 2, 89, syn_ev)
    ]
    return "16_soft_rock_54_em_110bpm.mid", bpm, time_sig, tracks, markers

# =========================================================================
# 17. ROCK BALLAD IN A MAJOR (6/8, 80 BPM DOTTED QUARTER)
# =========================================================================
def build_rock_ballad_68_a():
    bpm = 80 # Dotted quarter = 80 -> eighth = 240
    bars = 32
    time_sig = "6/8"
    # In 6/8, denominator is 8, so 1 eighth note = TICKS_PER_BEAT // 2 = 240 ticks.
    # 6 eighth notes per bar = 6 * 240 = 1440 ticks per bar.
    E_NOTE = TICKS_PER_BEAT // 2 # 240 ticks
    bar_ticks = 6 * E_NOTE # 1440 ticks
    dr_ev, bs_ev, gt_ev, syn_ev = [], [], [], []
    markers = [
        (0, "Intro (6/8 Arpeggio)"),
        (4 * bar_ticks, "Verse (A - E - F#m - D)"),
        (12 * bar_ticks, "Chorus (Soaring Lead)"),
        (20 * bar_ticks, "Solo Section"),
        (28 * bar_ticks, "Outro Cadence")
    ]
    # A (root 9) -> E (root 4) -> F#m (root 6) -> D (root 2)
    chords_loop = [
        (9, [45, 52, 57, 61, 64]), # A: A2, E3, A3, C#4, E4
        (4, [40, 47, 52, 56, 59]), # E: E2, B2, E3, G#3, B3
        (6, [42, 49, 54, 57, 61]), # F#m: F#2, C#3, F#3, A3, C#4
        (2, [38, 45, 50, 54, 57])  # D: D2, A2, D3, F#3, A3
    ]
    for b in range(bars):
        b_start = b * bar_ticks
        r_off, pitches = chords_loop[b % 4]
        # 6/8 Drums: Kick on beat 1 (t=0), Snare backbeat on beat 4 (t=3*E_NOTE = 720)
        if b in [0, 4, 12, 20]:
            add_note(dr_ev, b_start, 3 * E_NOTE, 49, 105) # Crash on 1
        add_note(dr_ev, b_start + 0, 2 * E_NOTE, 36, 105)        # Kick 1
        add_note(dr_ev, b_start + 2 * E_NOTE, E_NOTE, 36, 80)     # Kick 3 ghost
        add_note(dr_ev, b_start + 3 * E_NOTE, 2 * E_NOTE, 38, 105) # Snare 4 backbeat
        add_note(dr_ev, b_start + 5 * E_NOTE, E_NOTE, 36, 85)     # Kick 6 push

        # Continuous 8th note hi-hats (steps 0, 1, 2, 3, 4, 5)
        for s in range(6):
            add_note(dr_ev, b_start + s * E_NOTE, E_NOTE - 20, 42, 85 if s in [0, 3] else 65)

        # Bassline (Finger Bass GM 33): Root on 1, fifth on 4
        b_root = 33 + (r_off - 9) % 12
        add_note(bs_ev, b_start + 0, 3 * E_NOTE - 30, b_root, 95)
        add_note(bs_ev, b_start + 3 * E_NOTE, 3 * E_NOTE - 30, b_root + 7, 90)

        # Clean Strat 6/8 Arpeggio picking (GM 27)
        for i, p in enumerate(pitches):
            add_note(gt_ev, b_start + i * E_NOTE, int(E_NOTE * 1.8), p, 85)
        add_note(gt_ev, b_start + 5 * E_NOTE, int(E_NOTE * 1.8), pitches[1], 80)

        # Grand Piano warm body (GM 0)
        add_chord(syn_ev, b_start, bar_ticks - 40, pitches, 75)

    tracks = [
        ("Power Ballad Kit", 9, None, dr_ev),
        ("Electric Bass", 0, 33, bs_ev),
        ("Clean Strat Arpeggio", 1, 27, gt_ev),
        ("Acoustic Grand Piano", 2, 0, syn_ev)
    ]
    return "17_rock_ballad_68_a_80bpm.mid", bpm, time_sig, tracks, markers

# =========================================================================
# 18. SOUL JAM IN C MAJOR (6/8, 65 BPM)
# =========================================================================
def build_soul_jam_68_c():
    bpm = 65
    bars = 32
    time_sig = "6/8"
    E_NOTE = TICKS_PER_BEAT // 2 # 240 ticks
    bar_ticks = 6 * E_NOTE # 1440 ticks
    dr_ev, bs_ev, gt_ev, syn_ev = [], [], [], []
    markers = [
        (0, "Intro (Soul Groove)"),
        (4 * bar_ticks, "Verse (C - Am - F - G)"),
        (12 * bar_ticks, "Chorus (Motown Soul)"),
        (20 * bar_ticks, "Solo Flight"),
        (28 * bar_ticks, "Outro Vamp")
    ]
    # Cmaj7 (0) -> Am7 (9) -> Fmaj7 (5) -> G7 (7)
    chords_loop = [
        (0, [48, 55, 60, 64]), # Cmaj7
        (9, [45, 52, 57, 60]), # Am7
        (5, [41, 48, 53, 57]), # Fmaj7
        (7, [43, 50, 55, 59])  # G7
    ]
    for b in range(bars):
        b_start = b * bar_ticks
        r_off, pitches = chords_loop[b % 4]
        # Soul 6/8 Drums: Kick on 1, deep snare on 4
        if b in [0, 4, 12, 20]:
            add_note(dr_ev, b_start, 3 * E_NOTE, 49, 100)
        add_note(dr_ev, b_start + 0, 2 * E_NOTE, 36, 105)
        add_note(dr_ev, b_start + 3 * E_NOTE, 2 * E_NOTE, 38, 105)
        for s in range(6):
            add_note(dr_ev, b_start + s * E_NOTE, E_NOTE - 20, 42, 80 if s in [0, 3] else 60)

        # Motown walking / arpeggiated bassline
        b_root = 36 + r_off
        add_note(bs_ev, b_start + 0, E_NOTE * 2, b_root, 95)
        add_note(bs_ev, b_start + 2 * E_NOTE, E_NOTE, b_root + 4, 85)
        add_note(bs_ev, b_start + 3 * E_NOTE, E_NOTE * 2, b_root + 7, 90)
        add_note(bs_ev, b_start + 5 * E_NOTE, E_NOTE, b_root + 9, 85)

        # Suitcase Rhodes & Clean Guitar comping
        add_chord(gt_ev, b_start + 0, 3 * E_NOTE, pitches, 85)
        add_chord(gt_ev, b_start + 3 * E_NOTE, 3 * E_NOTE, pitches, 90)
        add_chord(syn_ev, b_start, bar_ticks - 30, pitches, 75)

    tracks = [
        ("Motown Soul Kit", 9, None, dr_ev),
        ("Soul Electric Bass", 0, 33, bs_ev),
        ("Clean Rhythm Guitar", 1, 27, gt_ev),
        ("Suitcase Rhodes", 2, 4, syn_ev)
    ]
    return "18_soul_jam_68_c_65bpm.mid", bpm, time_sig, tracks, markers

# =========================================================================
# 19. PROGRESSIVE ROCK IN A MINOR (7/8, 146 BPM)
# =========================================================================
def build_prog_rock_78_am():
    bpm = 146 # Eighth note pulse
    bars = 32
    time_sig = "7/8"
    E_NOTE = TICKS_PER_BEAT // 2 # 240 ticks
    bar_ticks = 7 * E_NOTE # 1680 ticks
    dr_ev, bs_ev, gt_ev, syn_ev = [], [], [], []
    markers = [
        (0, "Intro (7/8 Riff)"),
        (4 * bar_ticks, "Theme (2+2+3 Prog)"),
        (12 * bar_ticks, "Chorus (Heavier Riff)"),
        (20 * bar_ticks, "Solo Improvisation"),
        (28 * bar_ticks, "Outro Climax")
    ]
    # Am (9) -> G (7) -> F (5) -> Em (4)
    chords_loop = [
        (9, [45, 52, 57, 60]), # Am
        (7, [43, 50, 55, 59]), # G
        (5, [41, 48, 53, 57]), # F
        (4, [40, 47, 52, 55])  # Em
    ]
    for b in range(bars):
        b_start = b * bar_ticks
        r_off, pitches = chords_loop[b % 4]
        # 7/8 Subdivision: 2 + 2 + 3 (Hits on eighths 0, 2, 4)
        if b in [0, 4, 12, 20]:
            add_note(dr_ev, b_start, 2 * E_NOTE, 49, 105)
        add_note(dr_ev, b_start + 0 * E_NOTE, E_NOTE, 36, 110) # Kick 1 (group 1)
        add_note(dr_ev, b_start + 2 * E_NOTE, E_NOTE, 38, 105) # Snare 3 (group 2)
        add_note(dr_ev, b_start + 4 * E_NOTE, E_NOTE, 36, 105) # Kick 5 (group 3)
        add_note(dr_ev, b_start + 6 * E_NOTE, E_NOTE, 38, 95)  # Snare 7 accent
        for s in range(7):
            add_note(dr_ev, b_start + s * E_NOTE, E_NOTE - 20, 42, 85 if s in [0, 2, 4] else 65)

        # Heavy Pick Bass (GM 34)
        b_root = 33 + (r_off - 9) % 12
        add_note(bs_ev, b_start + 0 * E_NOTE, 2 * E_NOTE, b_root, 100)
        add_note(bs_ev, b_start + 2 * E_NOTE, 2 * E_NOTE, b_root + 7, 95)
        add_note(bs_ev, b_start + 4 * E_NOTE, 3 * E_NOTE, b_root, 100)

        # Overdriven Prog Guitar Riff (GM 29)
        add_chord(gt_ev, b_start + 0 * E_NOTE, 2 * E_NOTE, pitches, 95)
        add_chord(gt_ev, b_start + 2 * E_NOTE, 2 * E_NOTE, pitches, 90)
        add_chord(gt_ev, b_start + 4 * E_NOTE, 3 * E_NOTE, pitches, 100)

        # Analog Synth Pad (GM 81)
        add_chord(syn_ev, b_start, bar_ticks - 30, pitches, 75)

    tracks = [
        ("Prog Rock Kit", 9, None, dr_ev),
        ("Heavy Pick Bass", 0, 34, bs_ev),
        ("Overdriven Prog Guitar", 1, 29, gt_ev),
        ("Analog Lead/Pad", 2, 81, syn_ev)
    ]
    return "19_prog_rock_78_am_146bpm.mid", bpm, time_sig, tracks, markers

# =========================================================================
# 20. FUSION IN E DORIAN (5/4, 108 BPM)
# =========================================================================
def build_fusion_54_e():
    bpm = 108
    bars = 32
    time_sig = "5/4"
    bar_ticks = 5 * TICKS_PER_BEAT # 2400 ticks
    Q = TICKS_PER_BEAT # 480
    dr_ev, bs_ev, gt_ev, syn_ev = [], [], [], []
    markers = [
        (0, "Intro (Fusion Vamp)"),
        (4 * bar_ticks, "Theme (Em9 - A13)"),
        (12 * bar_ticks, "Chorus (Groove Shift)"),
        (20 * bar_ticks, "Solo Flight"),
        (28 * bar_ticks, "Outro Vamp")
    ]
    # Em9 (4) -> A13 (9) -> Bm7 (11) -> Em9 (4)
    chords_loop = [
        (4, [52, 59, 62, 66, 71]), # Em9: E3, B3, D4, F#4, B4
        (9, [45, 55, 61, 64, 69]), # A13: A2, G3, C#4, E4, A4
        (11, [47, 54, 59, 62, 66]),# Bm7: B2, F#3, B3, D4, F#4
        (4, [52, 59, 62, 66, 71])  # Em9
    ]
    for b in range(bars):
        b_start = b * bar_ticks
        r_off, pitches = chords_loop[b % 4]
        # 5/4 Drums: 2 + 3 pattern
        if b in [0, 4, 12, 20]:
            add_note(dr_ev, b_start, Q, 49, 105)
        add_note(dr_ev, b_start + 0, Q, 36, 105)      # Kick 1
        add_note(dr_ev, b_start + Q, Q, 38, 100)      # Snare 2
        add_note(dr_ev, b_start + 2 * Q, Q, 36, 105)  # Kick 3
        add_note(dr_ev, b_start + 3 * Q, Q, 38, 95)   # Snare 4
        add_note(dr_ev, b_start + 4 * Q, Q, 38, 90)   # Snare 5 ghost
        for beat in range(5):
            add_note(dr_ev, b_start + beat * Q, Q // 2, 42, 85 if beat in [0, 2] else 70)

        # Fretless Bass (GM 35) sliding pocket
        b_root = 40 + (r_off - 4) % 12
        add_note(bs_ev, b_start + 0, int(1.8 * Q), b_root, 95)
        add_note(bs_ev, b_start + 2 * Q, Q, b_root + 7, 90)
        add_note(bs_ev, b_start + 3 * Q, int(1.8 * Q), b_root + 10, 85)

        # Clean Guitar Stabs (GM 26)
        add_chord(gt_ev, b_start + Q // 2, Q, pitches, 90)
        add_chord(gt_ev, b_start + 2 * Q + Q // 2, Q, pitches, 85)
        add_chord(gt_ev, b_start + 4 * Q, Q, pitches, 90)

        # Electric Rhodes (GM 4)
        add_chord(syn_ev, b_start, bar_ticks - 40, pitches, 75)

    tracks = [
        ("Fusion Drum Kit", 9, None, dr_ev),
        ("Fretless Bass", 0, 35, bs_ev),
        ("Jazz Electric Guitar", 1, 26, gt_ev),
        ("Suitcase Rhodes", 2, 4, syn_ev)
    ]
    return "20_fusion_54_e_108bpm.mid", bpm, time_sig, tracks, markers

# =========================================================================
# 21. BALKAN STYLE IN A PHRYGIAN (7/8, 155 BPM)
# =========================================================================
def build_balkan_78_a_phrygian():
    bpm = 155
    bars = 32
    time_sig = "7/8"
    E_NOTE = TICKS_PER_BEAT // 2 # 240 ticks
    bar_ticks = 7 * E_NOTE # 1680 ticks
    dr_ev, bs_ev, gt_ev, syn_ev = [], [], [], []
    markers = [
        (0, "Intro (Balkan 3+2+2)"),
        (4 * bar_ticks, "Theme (Am - Bb)"),
        (12 * bar_ticks, "Chorus (Phrygian Fire)"),
        (20 * bar_ticks, "Solo Improvisation"),
        (28 * bar_ticks, "Outro Climax")
    ]
    # Am (9) -> Bb (10) -> Am (9) -> G (7)
    chords_loop = [
        (9, [45, 52, 57, 60]), # Am
        (10, [46, 53, 58, 62]), # Bb
        (9, [45, 52, 57, 60]), # Am
        (7, [43, 50, 55, 59])  # G
    ]
    for b in range(bars):
        b_start = b * bar_ticks
        r_off, pitches = chords_loop[b % 4]
        # Balkan 7/8: 3 + 2 + 2 subdivision (long-short-short)
        # Hits on eighths 0, 3, 5
        if b in [0, 4, 12, 20]:
            add_note(dr_ev, b_start, 3 * E_NOTE, 49, 105)
        add_note(dr_ev, b_start + 0 * E_NOTE, 2 * E_NOTE, 36, 110) # Heavy Kick on 1 (long)
        add_note(dr_ev, b_start + 3 * E_NOTE, E_NOTE, 38, 105)     # Snare on 4 (short)
        add_note(dr_ev, b_start + 5 * E_NOTE, E_NOTE, 38, 100)     # Snare on 6 (short)
        for s in range(7):
            add_note(dr_ev, b_start + s * E_NOTE, E_NOTE - 20, 42, 90 if s in [0, 3, 5] else 65)

        # Acoustic Upright Bass (GM 32)
        b_root = 33 + (r_off - 9) % 12
        add_note(bs_ev, b_start + 0 * E_NOTE, 3 * E_NOTE, b_root, 100)
        add_note(bs_ev, b_start + 3 * E_NOTE, 2 * E_NOTE, b_root + 7, 95)
        add_note(bs_ev, b_start + 5 * E_NOTE, 2 * E_NOTE, b_root, 95)

        # Nylon Acoustic Guitar Chops (GM 24)
        add_chord(gt_ev, b_start + 0 * E_NOTE, 2 * E_NOTE, pitches, 95)
        add_chord(gt_ev, b_start + 3 * E_NOTE, E_NOTE, pitches, 90)
        add_chord(gt_ev, b_start + 5 * E_NOTE, E_NOTE, pitches, 90)

        # Accordion / String Pad (GM 48)
        add_chord(syn_ev, b_start, bar_ticks - 30, pitches, 75)

    tracks = [
        ("Balkan Percussion Kit", 9, None, dr_ev),
        ("Acoustic Upright Bass", 0, 32, bs_ev),
        ("Nylon Acoustic Guitar", 1, 24, gt_ev),
        ("Balkan Accordion/Pad", 2, 48, syn_ev)
    ]
    return "21_balkan_78_a_155bpm.mid", bpm, time_sig, tracks, markers

# =========================================================================
# 22. BALLAD ROCK IN D MINOR (3/4, 132 BPM)
# =========================================================================
def build_ballad_rock_34_dm():
    bpm = 132
    bars = 32
    time_sig = "3/4"
    bar_ticks = 3 * TICKS_PER_BEAT # 1440 ticks
    Q = TICKS_PER_BEAT # 480
    dr_ev, bs_ev, gt_ev, syn_ev = [], [], [], []
    markers = [
        (0, "Intro (Dm Ballad)"),
        (4 * bar_ticks, "Verse (Dm - Bb - F - C)"),
        (12 * bar_ticks, "Chorus (Power Arpeggio)"),
        (20 * bar_ticks, "Solo Section"),
        (28 * bar_ticks, "Outro Fade")
    ]
    # Dm (2) -> Bb (10) -> F (5) -> C (0)
    chords_loop = [
        (2, [50, 57, 62, 65]), # Dm
        (10, [46, 53, 58, 62]),# Bb
        (5, [41, 48, 53, 57]), # F
        (0, [48, 55, 60, 64])  # C
    ]
    for b in range(bars):
        b_start = b * bar_ticks
        r_off, pitches = chords_loop[b % 4]
        # 3/4 Rock Ballad Drums: Kick on 1, snare on 2 & 3
        if b in [0, 4, 12, 20]:
            add_note(dr_ev, b_start, Q, 49, 105)
        add_note(dr_ev, b_start + 0, Q, 36, 105)
        add_note(dr_ev, b_start + Q, Q, 38, 95)
        add_note(dr_ev, b_start + 2 * Q, Q, 38, 90)
        for beat in range(3):
            add_note(dr_ev, b_start + beat * Q, Q // 2, 42, 85 if beat == 0 else 70)
            add_note(dr_ev, b_start + beat * Q + Q // 2, Q // 2, 42, 65)

        # Electric Bass (GM 33)
        b_root = 38 + (r_off - 2) % 12
        add_note(bs_ev, b_start + 0, Q, b_root, 95)
        add_note(bs_ev, b_start + Q, Q, b_root + 7, 88)
        add_note(bs_ev, b_start + 2 * Q, Q, b_root, 92)

        # Clean Strat Chorus Arpeggio (GM 27)
        for i, p in enumerate(pitches):
            add_note(gt_ev, b_start + i * (Q // 2), Q, p, 85)

        # Warm Strings (GM 48)
        add_chord(syn_ev, b_start, bar_ticks - 30, pitches, 75)

    tracks = [
        ("Ballad Drum Kit", 9, None, dr_ev),
        ("Electric Bass", 0, 33, bs_ev),
        ("Clean Strat Chorus", 1, 27, gt_ev),
        ("String Ensemble", 2, 48, syn_ev)
    ]
    return "22_ballad_rock_34_dm_132bpm.mid", bpm, time_sig, tracks, markers

# =========================================================================
# 23. METALCORE IN D MINOR (3/4, 120 BPM)
# =========================================================================
def build_metalcore_34_dm():
    bpm = 120
    bars = 32
    time_sig = "3/4"
    bar_ticks = 3 * TICKS_PER_BEAT # 1440 ticks
    Q = TICKS_PER_BEAT # 480
    SUB16 = Q // 4 # 120
    dr_ev, bs_ev, gt_ev, syn_ev = [], [], [], []
    markers = [
        (0, "Intro (Double Kick Chug)"),
        (4 * bar_ticks, "Verse (3/4 Breakdown)"),
        (12 * bar_ticks, "Chorus (Melodic Metal)"),
        (20 * bar_ticks, "Guitar Solo Shred"),
        (28 * bar_ticks, "Outro Slam")
    ]
    # D5 (2) -> Bb5 (10) -> C5 (0) -> D5 (2)
    chords_loop = [
        (2, [38, 45, 50]), # D5
        (10, [46, 53, 58]),# Bb5
        (0, [48, 55, 60]), # C5
        (2, [38, 45, 50])  # D5
    ]
    for b in range(bars):
        b_start = b * bar_ticks
        r_off, pitches = chords_loop[b % 4]
        # Fast double kick & snare
        if b in [0, 4, 12, 20]:
            add_note(dr_ev, b_start, Q, 49, 110)
        # 16th double kick on beat 1
        for s in range(4):
            add_note(dr_ev, b_start + s * SUB16, SUB16, 36, 105)
        add_note(dr_ev, b_start + Q, Q, 38, 110)      # Heavy Snare 2
        add_note(dr_ev, b_start + 2 * Q, Q, 38, 105)  # Heavy Snare 3
        for beat in range(3):
            add_note(dr_ev, b_start + beat * Q, Q // 2, 42, 90)

        # Heavy Distorted Bass (GM 34)
        b_root = 38 + (r_off - 2) % 12
        for s in range(0, 12, 2):
            add_note(bs_ev, b_start + s * SUB16, SUB16, b_root, 100)

        # Distorted Gallop Chugs (GM 30)
        for s in range(0, 12, 2):
            add_chord(gt_ev, b_start + s * SUB16, SUB16, pitches, 100)

    tracks = [
        ("Metalcore Drum Kit", 9, None, dr_ev),
        ("Distorted Pick Bass", 0, 34, bs_ev),
        ("High-Gain Rhythm Guitar", 1, 30, gt_ev)
    ]
    return "23_metalcore_34_dm_120bpm.mid", bpm, time_sig, tracks, markers

# =========================================================================
# 24. MODAL FUNK FUSION IN A DORIAN (7/8, 120 BPM)
# =========================================================================
def build_funk_fusion_78_a():
    bpm = 120
    bars = 32
    time_sig = "7/8"
    E_NOTE = TICKS_PER_BEAT // 2 # 240 ticks
    bar_ticks = 7 * E_NOTE # 1680 ticks
    dr_ev, bs_ev, gt_ev, syn_ev = [], [], [], []
    markers = [
        (0, "Intro (Funk Clave 7/8)"),
        (4 * bar_ticks, "Theme (Am7 - D9)"),
        (12 * bar_ticks, "Chorus (Slap Pocket)"),
        (20 * bar_ticks, "Solo Improvisation"),
        (28 * bar_ticks, "Outro Groove")
    ]
    # Am7 (9) -> D9 (2) -> Am7 (9) -> D9 (2)
    chords_loop = [
        (9, [45, 55, 60, 64]), # Am7: A2, G3, C4, E4
        (2, [50, 57, 60, 64, 66]), # D9: D3, A3, C4, E4, F#4
        (9, [45, 55, 60, 64]), # Am7
        (2, [50, 57, 60, 64, 66])  # D9
    ]
    for b in range(bars):
        b_start = b * bar_ticks
        r_off, pitches = chords_loop[b % 4]
        # 7/8 Funk: 2 + 2 + 3
        if b in [0, 4, 12, 20]:
            add_note(dr_ev, b_start, 2 * E_NOTE, 49, 105)
        add_note(dr_ev, b_start + 0 * E_NOTE, E_NOTE, 36, 110)
        add_note(dr_ev, b_start + 2 * E_NOTE, E_NOTE, 38, 105)
        add_note(dr_ev, b_start + 4 * E_NOTE, E_NOTE, 36, 105)
        add_note(dr_ev, b_start + 5 * E_NOTE, E_NOTE, 38, 90)
        for s in range(7):
            add_note(dr_ev, b_start + s * E_NOTE, E_NOTE - 20, 42, 85 if s in [0, 2, 4] else 65)

        # Slap Bass (GM 36)
        b_root = 33 + (r_off - 9) % 12
        add_note(bs_ev, b_start + 0 * E_NOTE, E_NOTE, b_root, 100) # Thumb
        add_note(bs_ev, b_start + 1 * E_NOTE, E_NOTE, b_root + 12, 95) # Pop
        add_note(bs_ev, b_start + 2 * E_NOTE, E_NOTE, b_root + 7, 95)
        add_note(bs_ev, b_start + 4 * E_NOTE, E_NOTE, b_root, 100)
        add_note(bs_ev, b_start + 5 * E_NOTE, 2 * E_NOTE, b_root + 10, 90)

        # Funk Guitar Stabs (GM 27)
        add_chord(gt_ev, b_start + 1 * E_NOTE, E_NOTE, pitches, 90)
        add_chord(gt_ev, b_start + 3 * E_NOTE, E_NOTE, pitches, 85)
        add_chord(gt_ev, b_start + 5 * E_NOTE, 2 * E_NOTE, pitches, 95)

        # Percussive Organ (GM 16)
        add_chord(syn_ev, b_start, bar_ticks - 30, pitches, 75)

    tracks = [
        ("Funk Drum Kit", 9, None, dr_ev),
        ("Slap Bass", 0, 36, bs_ev),
        ("Clean Funk Guitar", 1, 27, gt_ev),
        ("Percussive Organ", 2, 16, syn_ev)
    ]
    return "24_funk_fusion_78_a_120bpm.mid", bpm, time_sig, tracks, markers

# =========================================================================
# 25. TASTY POP IN D MAJOR (3/4, 132 BPM)
# =========================================================================
def build_tasty_pop_34_d():
    bpm = 132
    bars = 32
    time_sig = "3/4"
    bar_ticks = 3 * TICKS_PER_BEAT # 1440 ticks
    Q = TICKS_PER_BEAT # 480
    dr_ev, bs_ev, gt_ev, syn_ev = [], [], [], []
    markers = [
        (0, "Intro (Acoustic Strum)"),
        (4 * bar_ticks, "Verse (D - G - A - D)"),
        (12 * bar_ticks, "Chorus (Melodic Lift)"),
        (20 * bar_ticks, "Guitar Jam"),
        (28 * bar_ticks, "Outro Goodbye")
    ]
    # D (2) -> G (7) -> A (9) -> D (2)
    chords_loop = [
        (2, [50, 57, 62, 66]), # D: D3, A3, D4, F#4
        (7, [43, 50, 55, 59]), # G: G2, D3, G3, B3
        (9, [45, 52, 57, 61]), # A: A2, E3, A3, C#4
        (2, [50, 57, 62, 66])  # D
    ]
    for b in range(bars):
        b_start = b * bar_ticks
        r_off, pitches = chords_loop[b % 4]
        # Pop 3/4 Drums: Kick on 1, cross stick / snare on 2 & 3
        if b in [0, 4, 12, 20]:
            add_note(dr_ev, b_start, Q, 49, 100)
        add_note(dr_ev, b_start + 0, Q, 36, 100)
        add_note(dr_ev, b_start + Q, Q, 38, 90)
        add_note(dr_ev, b_start + 2 * Q, Q, 38, 85)
        for beat in range(3):
            add_note(dr_ev, b_start + beat * Q, Q // 2, 42, 80 if beat == 0 else 65)
            add_note(dr_ev, b_start + beat * Q + Q // 2, Q // 2, 42, 60)

        # Warm Electric Bass (GM 33)
        b_root = 38 + (r_off - 2) % 12
        add_note(bs_ev, b_start + 0, Q, b_root, 95)
        add_note(bs_ev, b_start + Q, Q, b_root + 7, 88)
        add_note(bs_ev, b_start + 2 * Q, Q, b_root, 90)

        # Acoustic Guitar 3/4 Strumming (GM 25)
        add_chord(gt_ev, b_start + 0, Q, pitches, 90)
        add_chord(gt_ev, b_start + Q, Q // 2, pitches, 80)
        add_chord(gt_ev, b_start + Q + Q // 2, Q // 2, pitches, 85)
        add_chord(gt_ev, b_start + 2 * Q, Q, pitches, 88)

        # Grand Piano / Pad (GM 0)
        add_chord(syn_ev, b_start, bar_ticks - 30, pitches, 75)

    tracks = [
        ("Acoustic Pop Kit", 9, None, dr_ev),
        ("Warm Electric Bass", 0, 33, bs_ev),
        ("Steel Acoustic Guitar", 1, 25, gt_ev),
        ("Acoustic Grand Piano", 2, 0, syn_ev)
    ]
    return "25_tasty_pop_34_d_132bpm.mid", bpm, time_sig, tracks, markers

def generate_all():
    print("=" * 80)
    print("GENERATING ALL 25 AUTHENTIC MULTI-TRACK GENERAL MIDI BACKING TRACKS")
    print("=" * 80)
    build_blues_12bar_a7()
    build_dorian_smooth_a()
    build_locrian_jam_a()
    build_mixolydian_open_life_a()
    build_bossa_nova_2516_c()
    build_dorian_funk_d()
    build_dark_sad_blues_rock_am()
    build_phrygian_metal_e()
    build_emotional_rock_ballad_bm()
    build_locrian_dark_fs()
    build_jazz_251_c()
    build_minor_blues_12bar_am()
    build_rock_pop_g_70bpm()
    build_vai_lydian_e()
    # 11 New Time-Signature Backing Tracks
    new_builders = [
        build_acid_jazz_34_dm,
        build_soft_rock_54_em,
        build_rock_ballad_68_a,
        build_soul_jam_68_c,
        build_prog_rock_78_am,
        build_fusion_54_e,
        build_balkan_78_a_phrygian,
        build_ballad_rock_34_dm,
        build_metalcore_34_dm,
        build_funk_fusion_78_a,
        build_tasty_pop_34_d
    ]
    for b in new_builders:
        fname, bpm, time_sig, tracks, markers = b()
        save_multitrack_midi(fname, bpm, time_sig, tracks, markers)
    print("=" * 80)
    print(f"All 25 MIDI tracks generated successfully in '{OUT_DIR}'!")

if __name__ == "__main__":
    generate_all()
