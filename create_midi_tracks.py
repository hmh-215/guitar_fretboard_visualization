import os
import mido
from mido import MidiFile, MidiTrack, Message, MetaMessage

out_dirs = [
    r"midi_tracks",
    r"backing_track_loops\midi_tracks"
]

for d in out_dirs:
    os.makedirs(d, exist_ok=True)
    for f in os.listdir(d):
        if f.endswith('.mid'):
            os.remove(os.path.join(d, f))

TICKS_PER_BEAT = 480
SUB = TICKS_PER_BEAT // 4 # 120 ticks per 16th note

def save_midi(filename, bpm, time_sig, tracks_data):
    mid = MidiFile(ticks_per_beat=TICKS_PER_BEAT)
    us_per_beat = int(round(60_000_000 / bpm))

    for trk_name, ch, prog, events in tracks_data:
        trk = MidiTrack()
        trk.append(MetaMessage('track_name', name=trk_name, time=0))
        trk.append(MetaMessage('set_tempo', tempo=us_per_beat, time=0))
        num, den = map(int, time_sig.split('/'))
        trk.append(MetaMessage('time_signature', numerator=num, denominator=den, clocks_per_click=24, notated_32nd_notes_per_beat=8, time=0))
        
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

    for d in out_dirs:
        dest = os.path.join(d, filename)
        mid.save(dest)
        print(f"Generated: {dest} ({os.path.getsize(dest)} bytes)")

# Helper to add note
def add_note(ev_list, start_tick, dur_ticks, pitch, vel=100):
    ev_list.append((start_tick, 'note_on', pitch, vel))
    ev_list.append((start_tick + dur_ticks, 'note_off', pitch, 0))

def add_chord(ev_list, start_tick, dur_ticks, pitches, vel=100):
    for p in pitches:
        add_note(ev_list, start_tick, dur_ticks, p, vel)

# =========================================================================
# 01. PURGE METAL GUITAR (130 BPM, D#m)
# =========================================================================
def build_purge_metal():
    gt_ev, bs_ev, dr_ev = [], [], []
    bpm = 130
    bars = 8
    # D#2 = 39, D#3 = 51, A#3 = 58, B2 = 47, F#3 = 54, B3 = 59, C#3 = 49, G#3 = 56, C#4 = 61
    for bar in range(bars):
        bar_start = bar * 16 * SUB
        # Drums: Crash on bar 0 & 4
        if bar % 4 == 0:
            add_note(dr_ev, bar_start, SUB, 49, 115) # Crash
        # Hi-hats: 8th notes
        for s in range(0, 16, 2):
            add_note(dr_ev, bar_start + s*SUB, SUB, 42, 85)
        # Snares on beats 2 & 4 (steps 4, 12)
        add_note(dr_ev, bar_start + 4*SUB, SUB*2, 38, 110)
        add_note(dr_ev, bar_start + 12*SUB, SUB*2, 38, 110)
        # Double-bass kicks (16th chugs)
        for s in [0, 1, 2, 4, 6, 7, 8, 9, 10, 12, 14, 15]:
            add_note(dr_ev, bar_start + s*SUB, SUB, 36, 100)

        # Chug steps 0..11 on D#2+D#3
        for s in range(12):
            vel = 110 if s in [0, 4, 8] else 85
            add_note(gt_ev, bar_start + s*SUB, int(SUB * 0.75), 39, vel) # D#2
            add_note(gt_ev, bar_start + s*SUB, int(SUB * 0.75), 51, vel) # D#3
            add_note(bs_ev, bar_start + s*SUB, int(SUB * 0.85), 27, vel) # D#1

        # Accented power chords on steps 12 and 14
        if bar % 2 == 0:
            # B5 (47, 54, 59) then D#5 (51, 58, 63)
            add_chord(gt_ev, bar_start + 12*SUB, SUB*2 - 10, [47, 54, 59], 115)
            add_chord(gt_ev, bar_start + 14*SUB, SUB*2 - 10, [51, 58, 63], 115)
            add_note(bs_ev, bar_start + 12*SUB, SUB*2 - 10, 35, 115) # B1
            add_note(bs_ev, bar_start + 14*SUB, SUB*2 - 10, 27, 115) # D#1
        else:
            # C#5 (49, 56, 61) then D#5 (51, 58, 63)
            add_chord(gt_ev, bar_start + 12*SUB, SUB*2 - 10, [49, 56, 61], 115)
            add_chord(gt_ev, bar_start + 14*SUB, SUB*2 - 10, [51, 58, 63], 115)
            add_note(bs_ev, bar_start + 12*SUB, SUB*2 - 10, 37, 115) # C#2
            add_note(bs_ev, bar_start + 14*SUB, SUB*2 - 10, 27, 115) # D#1

    save_midi('01_purge_metal_guitar_130bpm.mid', bpm, '4/4', [
        ('Distortion Guitar (Riff)', 0, 30, gt_ev), # GM 30: Distortion Guitar
        ('Overdrive Bass', 1, 34, bs_ev),           # GM 34: Picked Bass
        ('Metal Drums', 9, None, dr_ev)
    ])

# =========================================================================
# 02. BOSSA NOVA ACOUSTIC GUITAR CHORDS (134 BPM, D Major)
# =========================================================================
def build_bossa_nova():
    gt_ev, bs_ev, dr_ev = [], [], []
    bpm = 134
    bars = 8
    # Progression: Dmaj9 -> B7(b13) -> Em9 -> A13
    chords_bars = [
        ([50, 57, 61, 64], 50), # Dmaj9: D3, A3, C#4, E4 / Root D3
        ([47, 55, 57, 61], 47), # B7(b13): B2, G3, A3, C#4 / Root B2
        ([52, 59, 62, 66], 52), # Em9: E3, B3, D4, F#4 / Root E3
        ([45, 55, 61, 66], 45)  # A13: A2, G3, C#4, F#4 / Root A2
    ]
    for bar in range(bars):
        bar_start = bar * 16 * SUB
        chord_notes, root = chords_bars[bar % 4]
        
        # Acoustic Guitar (nylon) fingerpicking
        # Thumb bass on 0, 8
        add_note(gt_ev, bar_start + 0*SUB, SUB*2, root, 95)
        add_note(gt_ev, bar_start + 8*SUB, SUB*2, root, 90)
        # Syncopated strums on 0, 5, 8, 11, 14
        for s in [0, 5, 8, 11, 14]:
            add_chord(gt_ev, bar_start + s*SUB, int(SUB * 1.6), chord_notes, 85)

        # Acoustic Bass (Surdo feel)
        add_note(bs_ev, bar_start + 0*SUB, SUB*3, root - 12, 90)
        add_note(bs_ev, bar_start + 8*SUB, SUB*3, root - 12 + 7 if bar%2==0 else root - 12, 85)

        # Bossa Percussion: Clave cross-stick (37)
        for s in [0, 6, 10, 12]:
            add_note(dr_ev, bar_start + s*SUB, SUB, 37, 95)
        # Soft kick on 0, 8
        add_note(dr_ev, bar_start + 0*SUB, SUB, 36, 75)
        add_note(dr_ev, bar_start + 8*SUB, SUB, 36, 70)
        # Soft closed hi-hat on all 8ths
        for s in range(0, 16, 2):
            add_note(dr_ev, bar_start + s*SUB, SUB, 42, 60)

    save_midi('02_bossa_nova_acoustic_134bpm.mid', bpm, '4/4', [
        ('Acoustic Nylon Guitar', 0, 24, gt_ev), # GM 24: Acoustic Nylon Guitar
        ('Acoustic Upright Bass', 1, 32, bs_ev), # GM 32: Acoustic Bass
        ('Bossa Clave Percussion', 9, None, dr_ev)
    ])

# =========================================================================
# 03. REVOKE NEO-SOUL / R&B GUITAR (89 BPM, Am)
# =========================================================================
def build_revoke_rnb():
    gt_ev, bs_ev, dr_ev = [], [], []
    bpm = 89
    bars = 8
    # Progression: Am9 -> D9 -> Fmaj9 -> E7(#9)
    prog = [
        ([57, 60, 64, 71], 45), # Am9: A3, C4, E4, B4 / A2
        ([54, 60, 64, 69], 50), # D9: F#3, C4, E4, A4 / D3
        ([57, 60, 64, 69], 41), # Fmaj9: A3, C4, E4, A4 / F2
        ([56, 62, 67, 71], 40)  # E7(#9): G#3, D4, G4, B4 / E2
    ]
    for bar in range(bars):
        bar_start = bar * 16 * SUB
        chord_notes, root = prog[bar % 4]
        # Neo-Soul guitar: thumb note + laid-back brushed chord + ornament
        add_note(gt_ev, bar_start + 0*SUB, SUB*2, root, 95)
        add_chord(gt_ev, bar_start + 2*SUB, SUB*3, chord_notes, 85)
        # Hammer-on / melodic fill on 10, 13
        add_note(gt_ev, bar_start + 10*SUB, SUB*2, chord_notes[-1], 80)
        add_chord(gt_ev, bar_start + 13*SUB, SUB*2, chord_notes[:3], 85)

        # Finger Bass
        add_note(bs_ev, bar_start + 0*SUB, SUB*4, root - 12, 90)
        add_note(bs_ev, bar_start + 8*SUB, SUB*3, root - 12, 85)

        # Swung Hip-hop drums
        add_note(dr_ev, bar_start + 0*SUB, SUB, 36, 95) # Kick
        add_note(dr_ev, bar_start + 7*SUB, SUB, 36, 85) # Swung kick
        add_note(dr_ev, bar_start + 10*SUB, SUB, 36, 90)
        add_note(dr_ev, bar_start + 4*SUB, SUB*2, 37, 95) # Rimshot
        add_note(dr_ev, bar_start + 12*SUB, SUB*2, 37, 100)
        for s in range(0, 16, 2):
            add_note(dr_ev, bar_start + s*SUB, SUB, 42, 70)

    save_midi('03_revoke_rnb_guitar_89bpm.mid', bpm, '4/4', [
        ('Clean Electric Guitar (Strat)', 0, 27, gt_ev), # GM 27: Clean Electric Guitar
        ('Finger Bass', 1, 33, bs_ev),                  # GM 33: Electric Bass (finger)
        ('Lo-Fi Soul Drums', 9, None, dr_ev)
    ])

# =========================================================================
# 04. GOLDEN BOY SOUL RHODES (112 BPM, D#m / B)
# =========================================================================
def build_golden_boy():
    rh_ev, bs_ev, dr_ev = [], [], []
    bpm = 112
    bars = 8
    # Progression: Ebm9 -> Bmaj9 -> G#m9 -> Bb7(alt)
    prog = [
        ([51, 58, 61, 65, 68], 39), # Ebm9: D#3, A#3, C#4, F4, G#4 / D#2
        ([47, 54, 58, 63, 66], 35), # Bmaj9: B2, F#3, A#3, D#4, F#4 / B1
        ([44, 51, 54, 58, 63], 32), # G#m9: G#2, D#3, F#3, A#3, D#4 / G#1
        ([46, 52, 56, 61, 65], 34)  # Bb7(alt): Bb2, E3, G#3, C#4, F4 / Bb1
    ]
    for bar in range(bars):
        bar_start = bar * 16 * SUB
        chord_notes, root = prog[bar % 4]
        # Soul Rhodes pushed stabs: steps 0, 3, 6, 11
        add_chord(rh_ev, bar_start + 0*SUB, SUB*2, chord_notes, 95)
        add_chord(rh_ev, bar_start + 3*SUB, SUB*2, chord_notes, 85)
        add_chord(rh_ev, bar_start + 6*SUB, SUB*4, chord_notes, 90)
        add_chord(rh_ev, bar_start + 11*SUB, SUB*4, chord_notes, 95)

        # Soul Bass
        add_note(bs_ev, bar_start + 0*SUB, SUB*3, root, 95)
        add_note(bs_ev, bar_start + 6*SUB, SUB*3, root, 90)
        add_note(bs_ev, bar_start + 11*SUB, SUB*4, root + 7, 85)

        # Soul Drums
        add_note(dr_ev, bar_start + 0*SUB, SUB, 36, 100) # Kick
        add_note(dr_ev, bar_start + 6*SUB, SUB, 36, 85)
        add_note(dr_ev, bar_start + 10*SUB, SUB, 36, 90)
        add_note(dr_ev, bar_start + 4*SUB, SUB*2, 38, 100) # Snare
        add_note(dr_ev, bar_start + 12*SUB, SUB*2, 38, 100)
        for s in range(0, 16, 2):
            add_note(dr_ev, bar_start + s*SUB, SUB, 42, 75)

    save_midi('04_golden_boy_soul_rhodes_112bpm.mid', bpm, '4/4', [
        ('Electric Piano (Rhodes)', 0, 4, rh_ev), # GM 4: Electric Piano 1 (Rhodes)
        ('Finger Bass', 1, 33, bs_ev),
        ('Soul Pocket Drums', 9, None, dr_ev)
    ])

# =========================================================================
# 05. SUN BEAM INDIE ACOUSTIC (134 BPM, F#m / A)
# =========================================================================
def build_sun_beam():
    gt_ev, bs_ev, dr_ev = [], [], []
    bpm = 134
    bars = 8
    # Progression: F#m7 -> Dmaj7 -> Aadd9 -> E6
    prog = [
        ([57, 61, 64, 69], 42), # F#m7: A3, C#4, E4, A4 / F#2
        ([54, 57, 61, 66], 50), # Dmaj7: F#3, A3, C#4, F#4 / D3
        ([52, 57, 59, 64], 45), # Aadd9: E3, A3, B3, E4 / A2
        ([52, 56, 59, 64], 40)  # E6: E3, G#3, B3, E4 / E2
    ]
    for bar in range(bars):
        bar_start = bar * 16 * SUB
        chord_notes, root = prog[bar % 4]
        # Fingerpicked acoustic pattern on 8th notes
        # Thumb root on 0, 8
        add_note(gt_ev, bar_start + 0*SUB, SUB*2, root, 95)
        add_note(gt_ev, bar_start + 8*SUB, SUB*2, root + 7 if root<45 else root-5, 90)
        # Finger plucks
        for idx, s in enumerate([2, 4, 6, 10, 12, 14]):
            pitch = chord_notes[idx % len(chord_notes)]
            add_note(gt_ev, bar_start + s*SUB, int(SUB * 1.5), pitch, 80)

        # Acoustic Bass
        add_note(bs_ev, bar_start + 0*SUB, SUB*4, root - 12, 90)
        add_note(bs_ev, bar_start + 8*SUB, SUB*4, root - 12, 85)

        # Gentle indie drums
        add_note(dr_ev, bar_start + 0*SUB, SUB, 36, 85)
        add_note(dr_ev, bar_start + 8*SUB, SUB, 36, 80)
        add_note(dr_ev, bar_start + 4*SUB, SUB*2, 37, 85) # Rim
        add_note(dr_ev, bar_start + 12*SUB, SUB*2, 37, 85)
        for s in range(0, 16, 2):
            add_note(dr_ev, bar_start + s*SUB, SUB, 42, 60)

    save_midi('05_sun_beam_indie_acoustic_134bpm.mid', bpm, '4/4', [
        ('Acoustic Guitar (Steel)', 0, 25, gt_ev), # GM 25: Steel Acoustic Guitar
        ('Acoustic Bass', 1, 32, bs_ev),
        ('Indie Folk Percussion', 9, None, dr_ev)
    ])

# =========================================================================
# 06. MOOD SWINGS POP PIANO (130 BPM, Dm)
# =========================================================================
def build_mood_swings():
    pi_ev, bs_ev, dr_ev = [], [], []
    bpm = 130
    bars = 8
    # Progression: Dm -> Bbmaj7 -> Fmaj -> C
    prog = [
        ([62, 65, 69, 74], 38), # Dm: D4, F4, A4, D5 / D2
        ([62, 65, 69, 72], 34), # Bbmaj7: D4, F4, A4, C5 / Bb1
        ([60, 65, 69, 72], 29), # Fmaj: C4, F4, A4, C5 / F1
        ([60, 64, 67, 72], 36)  # Cmaj: C4, E4, G4, C5 / C2
    ]
    for bar in range(bars):
        bar_start = bar * 16 * SUB
        chord_notes, root = prog[bar % 4]
        # Left-hand low octave
        add_note(pi_ev, bar_start + 0*SUB, SUB*8, root, 95)
        add_note(pi_ev, bar_start + 0*SUB, SUB*8, root+12, 90)
        add_note(pi_ev, bar_start + 8*SUB, SUB*8, root, 90)
        # Right-hand rolling chords and melody
        for s in [0, 3, 6, 8, 11, 14]:
            add_chord(pi_ev, bar_start + s*SUB, int(SUB * 2.2), chord_notes, 85)

        # Bass
        add_note(bs_ev, bar_start + 0*SUB, SUB*6, root, 95)
        add_note(bs_ev, bar_start + 8*SUB, SUB*6, root, 90)

        # Pop / Trap Drums
        add_note(dr_ev, bar_start + 0*SUB, SUB, 36, 105) # Kick
        add_note(dr_ev, bar_start + 8*SUB, SUB, 36, 95)
        add_note(dr_ev, bar_start + 11*SUB, SUB, 36, 85)
        add_note(dr_ev, bar_start + 4*SUB, SUB*2, 38, 100) # Snare
        add_note(dr_ev, bar_start + 12*SUB, SUB*2, 38, 105)
        for s in range(16): # 16th hats
            add_note(dr_ev, bar_start + s*SUB, SUB, 42, 65 if s%2!=0 else 80)

    save_midi('06_mood_swings_pop_piano_130bpm.mid', bpm, '4/4', [
        ('Acoustic Grand Piano', 0, 0, pi_ev), # GM 0: Acoustic Grand Piano
        ('Finger Bass', 1, 33, bs_ev),
        ('Modern Pop Drums', 9, None, dr_ev)
    ])

# =========================================================================
# 07. SAD GUITAR EMO ROCK (130 BPM, Fm)
# =========================================================================
def build_sad_guitar():
    gt_ev, bs_ev, dr_ev = [], [], []
    bpm = 130
    bars = 8
    # Progression: Fm -> Db -> Ab -> Eb
    arp_bars = [
        ([53, 60, 68, 60, 65, 68], 29), # Fm: F3, C4, Ab4, C4, F4, Ab4 / F1
        ([49, 56, 65, 56, 61, 65], 25), # Db: Db3, Ab3, F4, Ab3, Db4, F4 / Db1
        ([44, 51, 60, 51, 56, 60], 32), # Ab: Ab2, Eb3, C4, Eb3, Ab3, C4 / Ab1
        ([51, 58, 67, 58, 63, 67], 27)  # Eb: Eb3, Bb3, G4, Bb3, Eb4, G4 / Eb1
    ]
    for bar in range(bars):
        bar_start = bar * 16 * SUB
        arps, root = arp_bars[bar % 4]
        # Arpeggio on 8th notes (0, 2, 4, 6, 8, 10, 12, 14)
        for idx, s in enumerate([0, 2, 4, 6, 8, 10, 12, 14]):
            pitch = arps[idx % len(arps)]
            add_note(gt_ev, bar_start + s*SUB, int(SUB * 1.8), pitch, 90)

        # Driving 8th-note pick bass
        for s in range(0, 16, 2):
            add_note(bs_ev, bar_start + s*SUB, int(SUB * 1.6), root + 12, 90)

        # Driving rock drums
        if bar % 4 == 0:
            add_note(dr_ev, bar_start, SUB*2, 49, 110) # Crash
        add_note(dr_ev, bar_start + 0*SUB, SUB, 36, 100) # Kick
        add_note(dr_ev, bar_start + 6*SUB, SUB, 36, 85)
        add_note(dr_ev, bar_start + 10*SUB, SUB, 36, 95)
        add_note(dr_ev, bar_start + 4*SUB, SUB*2, 38, 105) # Snare
        add_note(dr_ev, bar_start + 12*SUB, SUB*2, 38, 105)
        for s in range(0, 16, 2):
            add_note(dr_ev, bar_start + s*SUB, SUB, 42, 80)

    save_midi('07_sad_guitar_emo_rock_130bpm.mid', bpm, '4/4', [
        ('Electric Guitar (Clean Chorus)', 0, 27, gt_ev), # GM 27: Clean Electric Guitar
        ('Picked Rock Bass', 1, 34, bs_ev),               # GM 34: Picked Bass
        ('Rock Drums', 9, None, dr_ev)
    ])

# =========================================================================
# 08. DEEP HOUSE CHORDS (120 BPM, Dm)
# =========================================================================
def build_deep_house():
    sy_ev, bs_ev, dr_ev = [], [], []
    bpm = 120
    bars = 8
    # Progression: Dm9 -> Am7 -> Bbmaj7 -> C9
    prog = [
        ([50, 53, 57, 60, 64], 38), # Dm9: D3, F3, A3, C4, E4 / D2
        ([45, 48, 52, 55, 60], 33), # Am7: A2, C3, E3, G3, C4 / A1
        ([46, 50, 53, 57, 62], 34), # Bbmaj7: Bb2, D3, F3, A3, D4 / Bb1
        ([48, 52, 55, 58, 62], 36)  # C9: C3, E3, G3, Bb3, D4 / C2
    ]
    for bar in range(bars):
        bar_start = bar * 16 * SUB
        chord_notes, root = prog[bar % 4]
        # Syncopated stabs on 0, 4, 8, 11, 14
        for s in [0, 4, 8, 11, 14]:
            add_chord(sy_ev, bar_start + s*SUB, int(SUB * 1.4), chord_notes, 100)

        # Rolling 16th synth bass
        for s in [0, 2, 4, 6, 8, 10, 11, 14]:
            add_note(bs_ev, bar_start + s*SUB, int(SUB * 0.9), root, 95)

        # 4-on-the-floor kick
        for s in [0, 4, 8, 12]:
            add_note(dr_ev, bar_start + s*SUB, SUB, 36, 110)
        # Claps on 4, 12
        add_note(dr_ev, bar_start + 4*SUB, SUB, 39, 100)
        add_note(dr_ev, bar_start + 12*SUB, SUB, 39, 100)
        # Offbeat open hi-hat on steps 2, 6, 10, 14
        for s in [2, 6, 10, 14]:
            add_note(dr_ev, bar_start + s*SUB, SUB*2, 46, 95)

    save_midi('08_deep_house_chords_120bpm.mid', bpm, '4/4', [
        ('Percussive House Organ', 0, 17, sy_ev), # GM 17: Percussive Organ
        ('Synth Bass', 1, 38, bs_ev),             # GM 38: Synth Bass 1
        ('90s Deep House Drums', 9, None, dr_ev)
    ])

# =========================================================================
# 09. TROPICAL HOUSE PLUCK (120 BPM, D)
# =========================================================================
def build_tropical_house():
    pl_ev, bs_ev, dr_ev = [], [], []
    bpm = 120
    bars = 8
    # Progression: Dmaj -> Amaj -> Bm7 -> Gmaj
    prog = [
        ([62, 66, 69], 38), # Dmaj / D2
        ([61, 64, 69], 33), # Amaj / A1
        ([59, 62, 66], 35), # Bm7 / B1
        ([55, 59, 62], 31)  # Gmaj / G1
    ]
    for bar in range(bars):
        bar_start = bar * 16 * SUB
        chord_notes, root = prog[bar % 4]
        # Syncopated tropical pluck hits on 0, 3, 6, 10, 13
        for s in [0, 3, 6, 10, 13]:
            add_chord(pl_ev, bar_start + s*SUB, int(SUB * 1.2), chord_notes, 95)

        # Bouncy sidechained bass
        for s in [2, 6, 10, 14]:
            add_note(bs_ev, bar_start + s*SUB, SUB*2, root, 95)

        # 4-on-the-floor kick
        for s in [0, 4, 8, 12]:
            add_note(dr_ev, bar_start + s*SUB, SUB, 36, 105)
        # Snare / Clap on 4, 12
        add_note(dr_ev, bar_start + 4*SUB, SUB, 38, 95)
        add_note(dr_ev, bar_start + 12*SUB, SUB, 38, 95)
        # Shakers on all 16ths
        for s in range(16):
            add_note(dr_ev, bar_start + s*SUB, SUB, 42, 60 if s%2!=0 else 75)

    save_midi('09_tropical_house_pluck_120bpm.mid', bpm, '4/4', [
        ('Marimba / Pluck Synth', 0, 12, pl_ev), # GM 12: Marimba
        ('Slap Bass', 1, 36, bs_ev),             # GM 36: Slap Bass 1
        ('Tropical House Drums', 9, None, dr_ev)
    ])

# =========================================================================
# 10. HARD BOOM BAP DRUMS (96 BPM) - Live Drum Sample Match
# =========================================================================
def build_hard_boom_bap():
    dr_ev, bs_ev, gt_ev = [], [], []
    bpm = 96
    bars = 8
    for bar in range(bars):
        bar_start = bar * 16 * SUB
        # Exact kick pattern from FFT: [0, 6, 10, 13] (bar 2 adds 14)
        kicks = [0, 6, 10, 13] if bar % 2 == 0 else [0, 6, 10, 12, 13]
        for s in kicks:
            add_note(dr_ev, bar_start + s*SUB, SUB, 36, 115) # Punchy acoustic kick
        # Snare on 4, 12
        add_note(dr_ev, bar_start + 4*SUB, SUB*2, 38, 110)
        add_note(dr_ev, bar_start + 12*SUB, SUB*2, 38, 115)
        # Ghost taps
        add_note(dr_ev, bar_start + 14*SUB, SUB, 38, 45)
        # Hi-hat 8ths with open hat on 14
        for s in [0, 2, 4, 6, 8, 10, 12]:
            add_note(dr_ev, bar_start + s*SUB, SUB, 42, 85)
        add_note(dr_ev, bar_start + 14*SUB, SUB*2, 46, 90) # Open hat

        # Accompaniment: Boom-bap bass (Cm)
        add_note(bs_ev, bar_start + 0*SUB, SUB*3, 36, 100) # C2
        add_note(bs_ev, bar_start + 6*SUB, SUB*2, 39, 90)  # Eb2
        add_note(bs_ev, bar_start + 10*SUB, SUB*3, 43, 95) # G2

        # Jazz guitar stab on beat 2 & 4
        add_chord(gt_ev, bar_start + 4*SUB, SUB, [48, 55, 58, 63], 80) # Cm7
        add_chord(gt_ev, bar_start + 12*SUB, SUB, [48, 55, 58, 63], 80)

    save_midi('10_hard_boom_bap_drums_96bpm.mid', bpm, '4/4', [
        ('Hard Boom Bap Drum Break', 9, None, dr_ev),
        ('Acoustic Bass', 1, 32, bs_ev),
        ('Jazz Guitar Stabs', 0, 26, gt_ev)
    ])

# =========================================================================
# 11. LO-FI CRISP BEAT (96 BPM) - Live Drum Sample Match
# =========================================================================
def build_lofi_crisp():
    dr_ev, bs_ev, rh_ev = [], [], []
    bpm = 96
    bars = 8
    for bar in range(bars):
        bar_start = bar * 16 * SUB
        # Exact lo-fi kicks: [0, 10] (bar 2 adds 15)
        kicks = [0, 10] if bar % 2 == 0 else [0, 10, 15]
        for s in kicks:
            add_note(dr_ev, bar_start + s*SUB, SUB, 36, 95)
        # Rimshot on 4, 12
        add_note(dr_ev, bar_start + 4*SUB, SUB, 37, 95)
        add_note(dr_ev, bar_start + 12*SUB, SUB, 37, 95)
        # Dusty swung hats
        for s in [0, 2, 4, 6, 8, 10, 12, 14]:
            add_note(dr_ev, bar_start + s*SUB, SUB, 42, 70 if s%4!=0 else 85)

        # Mellow walking acoustic bass
        add_note(bs_ev, bar_start + 0*SUB, SUB*4, 36, 85) # C2
        add_note(bs_ev, bar_start + 8*SUB, SUB*4, 33, 80) # A1

        # Lo-Fi Rhodes 7th chords
        add_chord(rh_ev, bar_start + 0*SUB, SUB*6, [48, 55, 59, 64], 80) # Cmaj7
        add_chord(rh_ev, bar_start + 8*SUB, SUB*6, [45, 52, 57, 60], 75) # Am7

    save_midi('11_lofi_crisp_beat_96bpm.mid', bpm, '4/4', [
        ('Lo-Fi Crisp Drum Kit', 9, None, dr_ev),
        ('Acoustic Upright Bass', 1, 32, bs_ev),
        ('Lo-Fi Rhodes Piano', 0, 4, rh_ev)
    ])

# =========================================================================
# 12. FUNKY BREAKBEAT THEME CHOP (96 BPM) - Live Drum Sample Match
# =========================================================================
def build_funk_breakbeat():
    dr_ev, bs_ev, gt_ev = [], [], []
    bpm = 96
    bars = 8
    for bar in range(bars):
        bar_start = bar * 16 * SUB
        # Exact Clyde Stubblefield funk break:
        # Kicks: 0, 2, 7, 10
        for s in [0, 2, 7, 10]:
            add_note(dr_ev, bar_start + s*SUB, SUB, 36, 110)
        # Main Snare on 4, 12
        add_note(dr_ev, bar_start + 4*SUB, SUB*2, 38, 115)
        add_note(dr_ev, bar_start + 12*SUB, SUB*2, 38, 115)
        # Ghost Snares on 1, 3, 6, 11, 14 (subtle funk ghost taps!)
        for s in [1, 3, 6, 11, 14]:
            add_note(dr_ev, bar_start + s*SUB, SUB, 38, 45)
        # 16th-note hi-hat groove
        for s in range(16):
            add_note(dr_ev, bar_start + s*SUB, SUB, 42, 60 if s%2!=0 else 85)

        # Funk slap bass (C Dorian)
        add_note(bs_ev, bar_start + 0*SUB, SUB, 36, 110) # Slap C2
        add_note(bs_ev, bar_start + 2*SUB, SUB, 48, 100) # Pop C3
        add_note(bs_ev, bar_start + 7*SUB, SUB, 39, 105) # Slap Eb2
        add_note(bs_ev, bar_start + 10*SUB, SUB, 41, 110) # Slap F2

        # 16th funk strat chank
        add_chord(gt_ev, bar_start + 4*SUB, SUB//2, [60, 63, 67, 70], 90) # Cm7
        add_chord(gt_ev, bar_start + 12*SUB, SUB//2, [60, 63, 67, 70], 90)

    save_midi('12_theme_chop_funk_break_96bpm.mid', bpm, '4/4', [
        ('Funky Breakbeat Drum Loop', 9, None, dr_ev),
        ('Slap Bass', 1, 36, bs_ev),
        ('Funk Guitar Chanks', 0, 27, gt_ev)
    ])

print("Building all 12 sample-matched MIDIs...")
build_purge_metal()
build_bossa_nova()
build_revoke_rnb()
build_golden_boy()
build_sun_beam()
build_mood_swings()
build_sad_guitar()
build_deep_house()
build_tropical_house()
build_hard_boom_bap()
build_lofi_crisp()
build_funk_breakbeat()
print("All 12 MIDIs generated successfully!")
