import os
import sys
import mido
from mido import MidiFile, MidiTrack, Message, MetaMessage

TICKS_PER_BEAT = 480
SUB = TICKS_PER_BEAT // 4  # 120 ticks per 16th note

def add_note(ev_list, start_tick, dur_ticks, pitch, vel=90):
    ev_list.append((start_tick, 'note_on', pitch, vel))
    ev_list.append((start_tick + dur_ticks, 'note_off', pitch, 0))

def add_chord(ev_list, start_tick, dur_ticks, pitches, vel=85):
    for p in pitches:
        add_note(ev_list, start_tick, dur_ticks, p, vel)

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

ALL_BUILDERS = [
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

if __name__ == "__main__":
    OUT_DIR = "midi_tracks"
    os.makedirs(OUT_DIR, exist_ok=True)
    print("=" * 80)
    print("GENERATING 11 NEW TIME-SIGNATURE BACKING TRACKS (.MID)")
    print("=" * 80)
    for builder in ALL_BUILDERS:
        fname, bpm, time_sig, tracks_data, markers = builder()
        save_path = os.path.join(OUT_DIR, fname)
        mid = MidiFile(ticks_per_beat=TICKS_PER_BEAT)
        us_per_beat = int(round(60_000_000 / bpm))

        # Track 0: Conductor
        cond_trk = MidiTrack()
        cond_trk.append(MetaMessage('track_name', name='Conductor', time=0))
        cond_trk.append(MetaMessage('set_tempo', tempo=us_per_beat, time=0))
        num, den = map(int, time_sig.split('/'))
        cond_trk.append(MetaMessage('time_signature', numerator=num, denominator=den, clocks_per_click=24, notated_32nd_notes_per_beat=8, time=0))

        if markers:
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

        mid.save(save_path)
        print(f"Generated: {save_path} ({os.path.getsize(save_path)} bytes, {len(mid.tracks)} tracks, Time Sig: {time_sig})")
    print("=" * 80)
    print("ALL 11 NEW MIDI TRACKS GENERATED SUCCESSFULLY!")
