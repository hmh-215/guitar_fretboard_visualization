import os
import mido
from mido import MidiFile, MidiTrack, Message, MetaMessage

# Output directories
out_dirs = [
    r"D:\huong\antigravity\guitar_fretboard_visualization\backing_track_loops\midi_tracks",
    r"D:\huong\antigravity\guitar_neck_visualization\midi_tracks"
]

for d in out_dirs:
    os.makedirs(d, exist_ok=True)

TICKS_PER_BEAT = 480
SIXTEENTH = TICKS_PER_BEAT // 4 # 120 ticks per 16th note

def create_midi(filename, bpm, time_sig, tracks_data):
    """
    tracks_data: list of dicts:
      {
        'name': str,
        'channel': int, (0-15; 9 is drums)
        'program': int, (0-127 instrument)
        'events': list of (step_16th, note_midi, duration_16th, velocity)
      }
    """
    mid = MidiFile(ticks_per_beat=TICKS_PER_BEAT)
    
    # Track 0: Tempo and Time Signature
    meta_track = MidiTrack()
    mid.tracks.append(meta_track)
    meta_track.append(MetaMessage('track_name', name=filename, time=0))
    meta_track.append(MetaMessage('time_signature', numerator=time_sig[0], denominator=time_sig[1], time=0))
    meta_track.append(MetaMessage('set_tempo', tempo=mido.bpm2tempo(bpm), time=0))
    meta_track.append(MetaMessage('end_of_track', time=TICKS_PER_BEAT * 4 * 4)) # 4 bars
    
    for t_data in tracks_data:
        trk = MidiTrack()
        mid.tracks.append(trk)
        trk.append(MetaMessage('track_name', name=t_data['name'], time=0))
        ch = t_data['channel']
        if ch != 9 and 'program' in t_data:
            trk.append(Message('program_change', program=t_data['program'], channel=ch, time=0))
            
        # Convert step-based events into absolute ticks then delta ticks
        raw_events = []
        for step, note, dur, vel in t_data['events']:
            start_tick = step * SIXTEENTH
            end_tick = (step + dur) * SIXTEENTH
            raw_events.append((start_tick, Message('note_on', note=note, velocity=vel, channel=ch)))
            raw_events.append((end_tick, Message('note_off', note=note, velocity=0, channel=ch)))
            
        # Sort by tick time (note_off before note_on at same tick)
        raw_events.sort(key=lambda x: (x[0], 0 if x[1].type == 'note_off' else 1))
        
        last_tick = 0
        for tick, msg in raw_events:
            delta = tick - last_tick
            msg.time = delta
            trk.append(msg)
            last_tick = tick
            
        trk.append(MetaMessage('end_of_track', time=0))
        
    for out_dir in out_dirs:
        path = os.path.join(out_dir, filename)
        mid.save(path)
        print(f"Generated: {path}")

# =========================================================================
# 1. PURGE METAL GUITAR LOOP (130 BPM, D# Minor / Drop Metal Riff)
# Modeled on: looperman-l-3453452-0424736-purge-metal-guitar-loop.wav
# Heavy palm-muted chugs, galloping 16ths, double-kick thumps, pinch accents
# =========================================================================
metal_events_guitar = []
metal_events_bass = []
metal_events_drums = []

# 4 bars of aggressive metal riff
for bar in range(4):
    b_step = bar * 16
    # D# power chord = D#2 (39), A#2 (46), D#3 (51)
    # Palm-muted chug on 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11
    for s in [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]:
        vel = 115 if s in [0, 4, 8] else 90 # Accented downbeats
        dur = 1
        metal_events_guitar.append((b_step + s, 39, dur, vel)) # D#2
        metal_events_guitar.append((b_step + s, 46, dur, vel)) # A#2
        metal_events_guitar.append((b_step + s, 51, dur, vel)) # D#3
        
        # Bass tracks guitar root
        metal_events_bass.append((b_step + s, 27, dur, vel)) # Low D#1
        
    # Bar accent variations on steps 12, 13, 14, 15:
    if bar % 2 == 0:
        # B power chord stab (steps 12, 14)
        for s, chord_notes in [(12, [35, 42, 47]), (14, [33, 40, 45])]: # B5 then A5
            for n in chord_notes:
                metal_events_guitar.append((b_step + s, n, 2, 120))
            metal_events_bass.append((b_step + s, chord_notes[0] - 12, 2, 120))
    else:
        # E5 to D5 turnaround
        for s, chord_notes in [(12, [40, 47, 52]), (14, [39, 46, 51])]: # E5 to D#5
            for n in chord_notes:
                metal_events_guitar.append((b_step + s, n, 2, 120))
            metal_events_bass.append((b_step + s, chord_notes[0] - 12, 2, 120))
            
    # Metal Drums: Double kick gallop, snare on 4, 12, crash on bar 0
    # 36: Kick, 38: Snare, 42: Closed Hat, 49: Crash
    if bar == 0:
        metal_events_drums.append((b_step, 49, 4, 110)) # Crash
    for s in range(16):
        metal_events_drums.append((b_step + s, 42, 1, 80 if s % 2 == 0 else 60)) # Riding hats
    for k in [0, 1, 2, 4, 6, 7, 8, 9, 10, 12, 14, 15]:
        metal_events_drums.append((b_step + k, 36, 1, 110)) # Fast double kicks
    metal_events_drums.append((b_step + 4, 38, 2, 118)) # Snare on 2
    metal_events_drums.append((b_step + 12, 38, 2, 120)) # Snare on 4

create_midi("01_purge_metal_guitar_130bpm.mid", 130, (4, 4), [
    {'name': 'Distorted Metal Guitar', 'channel': 0, 'program': 30, 'events': metal_events_guitar}, # 30: Overdriven Guitar
    {'name': 'Distorted Metal Bass', 'channel': 1, 'program': 33, 'events': metal_events_bass},     # 33: Fingered Bass
    {'name': 'Metal Drum Kit', 'channel': 9, 'events': metal_events_drums}
])

# =========================================================================
# 2. BOSSA NOVA ACOUSTIC GUITAR CHORDS (134 BPM, D Major)
# Modeled on: looperman-l-4541557-0361778-bossa-nova-acoustic-guitar-chords-134-bpm-dmaj.wav
# Joao Gilberto syncopated nylon guitar strumming, surdo bass, Brazilian clave
# =========================================================================
bossa_guitar = []
bossa_bass = []
bossa_drums = []

# Chords:
# Bar 1: Dmaj7: D3(50), A3(57), C#4(61), F#4(66)
# Bar 2: Em7:   E3(52), B3(59), D4(62),  G4(67)
# Bar 3: A7:    A2(45), G3(55), C#4(61), E4(64)
# Bar 4: Dmaj7: D3(50), A3(57), C#4(61), F#4(66)
bossa_chords = [
    ([50, 57, 61, 66], 38), # Dmaj7, bass D2
    ([52, 59, 62, 67], 40), # Em7,   bass E2
    ([45, 55, 61, 64], 45), # A7,    bass A1
    ([50, 57, 61, 66], 38)  # Dmaj7, bass D2
]

# Classic Bossa Nova guitar rhythm:
# Bass notes on beats 1 and 3 (step 0 and 8)
# Chord fingers pluck on steps: 0, 3, 6, 8, 10, 13, 14
bossa_syncopation = [0, 3, 6, 8, 10, 13, 14]

for bar in range(4):
    b_step = bar * 16
    chord_notes, root_bass = bossa_chords[bar]
    
    # Bass line: Root on step 0, Fifth on step 8
    fifth_bass = root_bass + 7
    bossa_bass.append((b_step + 0, root_bass, 4, 95))
    bossa_bass.append((b_step + 4, root_bass, 2, 70)) # Ghost pulse
    bossa_bass.append((b_step + 8, fifth_bass, 4, 90))
    bossa_bass.append((b_step + 12, fifth_bass, 2, 70))
    
    # Nylon Guitar chord plucks
    for s in bossa_syncopation:
        vel = 95 if s in [0, 6, 10] else 80
        for n in chord_notes:
            bossa_guitar.append((b_step + s, n, 2, vel))
            
    # Drums: Shaker/hi-hat on all 16ths, Brazilian cross-stick rim (37) on clave: 0, 3, 6, 10, 12, 14
    for s in range(16):
        bossa_drums.append((b_step + s, 42, 1, 75 if s % 2 == 0 else 55))
    for s in [0, 3, 6, 10, 12]:
        bossa_drums.append((b_step + s, 37, 1, 90)) # Cross-stick / Rimshot
    # Soft kick/surdo on 0 and 8
    bossa_drums.append((b_step + 0, 36, 2, 85))
    bossa_drums.append((b_step + 8, 36, 2, 90))

create_midi("02_bossa_nova_acoustic_134bpm.mid", 134, (4, 4), [
    {'name': 'Nylon Acoustic Guitar', 'channel': 0, 'program': 24, 'events': bossa_guitar}, # 24: Acoustic Guitar (nylon)
    {'name': 'Acoustic Upright Bass', 'channel': 1, 'program': 32, 'events': bossa_bass},   # 32: Acoustic Bass
    {'name': 'Bossa Nova Percussion', 'channel': 9, 'events': bossa_drums}
])

# =========================================================================
# 3. REVOKE R&B / NEO-SOUL GUITAR (89 BPM, C Major / A Minor)
# Modeled on: looperman-l-2503828-0396817-revoke-4evrshx.wav
# Lush extended voicings (Am9, Dm9, Fmaj7, G9), picked arpeggios, swung hip-hop pocket
# =========================================================================
rnb_guitar = []
rnb_bass = []
rnb_drums = []

# Progressions:
# Bar 1: Am9:   A2(45) thumb bass -> G3(55), C4(60), E4(64), B4(71)
# Bar 2: Dm9:   D3(50) thumb bass -> F3(53), A3(57), C4(60), E4(64)
# Bar 3: Fmaj7: F2(41) thumb bass -> C3(48), A3(57), E4(64), G4(67)
# Bar 4: G9:    G2(43) thumb bass -> B2(47), F3(53), A3(57), D4(62)
rnb_prog = [
    (45, [55, 60, 64, 71]), # Am9
    (50, [53, 57, 60, 64]), # Dm9
    (41, [48, 57, 64, 67]), # Fmaj7
    (43, [47, 53, 57, 62])  # G9
]

for bar in range(4):
    b_step = bar * 16
    bass_note, chord_voicing = rnb_prog[bar]
    
    # Thumb bass note on beat 1 and beat 3
    rnb_guitar.append((b_step + 0, bass_note, 4, 100))
    rnb_guitar.append((b_step + 6, bass_note, 2, 75))
    rnb_guitar.append((b_step + 10, bass_note + 7, 3, 85))
    
    # Bass track
    rnb_bass.append((b_step + 0, bass_note - 12, 6, 100))
    rnb_bass.append((b_step + 6, bass_note - 12, 3, 80))
    rnb_bass.append((b_step + 10, bass_note - 5, 4, 90))
    
    # Fingerpicked chord embellishments (steps 1, 2, 3, 4, 7, 8, 12, 14)
    rnb_guitar.append((b_step + 1, chord_voicing[0], 3, 80))
    rnb_guitar.append((b_step + 2, chord_voicing[1], 3, 85))
    rnb_guitar.append((b_step + 3, chord_voicing[2], 3, 90))
    rnb_guitar.append((b_step + 4, chord_voicing[3], 4, 95))
    # Full chord strum on step 7
    for n in chord_voicing:
        rnb_guitar.append((b_step + 7, n, 3, 85))
    rnb_guitar.append((b_step + 11, chord_voicing[2], 2, 80))
    rnb_guitar.append((b_step + 12, chord_voicing[1], 2, 80))
    rnb_guitar.append((b_step + 14, chord_voicing[3], 2, 85))
    
    # Swung hip-hop / boom-bap drums
    # Kick on 0, 10
    rnb_drums.append((b_step + 0, 36, 2, 105))
    rnb_drums.append((b_step + 10, 36, 2, 95))
    # Snare on 4, 12
    rnb_drums.append((b_step + 4, 38, 2, 105))
    rnb_drums.append((b_step + 12, 38, 2, 108))
    # Closed hats with swing velocity
    for s in range(16):
        v = 85 if s in [0, 4, 8, 12] else (60 if s % 2 == 0 else 45)
        rnb_drums.append((b_step + s, 42, 1, v))

create_midi("03_revoke_rnb_guitar_89bpm.mid", 89, (4, 4), [
    {'name': 'Clean Strat Guitar', 'channel': 0, 'program': 27, 'events': rnb_guitar}, # 27: Electric Guitar (clean)
    {'name': 'Smooth Electric Bass', 'channel': 1, 'program': 33, 'events': rnb_bass},
    {'name': 'Lo-Fi Hip-Hop Drums', 'channel': 9, 'events': rnb_drums}
])

# =========================================================================
# 4. GOLDEN BOY SOUL RHODES PIANO (112 BPM, D# Minor / B Major)
# Modeled on: looperman-l-6644355-0398829-golden-boy.wav
# Warm electric piano chord pushes, offbeat syncopation, neo-soul pocket
# =========================================================================
rhodes_events = []
rhodes_bass = []
rhodes_drums = []

rhodes_chords = [
    ([51, 58, 63, 66, 70], 39), # D#m9 (D#3, A#3, D#4, F#4, A#4), Bass D#2
    ([49, 56, 61, 65, 68], 37), # C#7  (C#3, G#3, C#4, F4,  G#4), Bass C#2
    ([47, 54, 59, 63, 66], 35), # Bmaj7(B2,  F#3, B3,  D#4, F#4), Bass B1
    ([44, 51, 56, 59, 63], 32)  # G#m9 (G#2, D#3, G#3, B3,  D#4), Bass G#1
]

for bar in range(4):
    b_step = bar * 16
    voicing, root = rhodes_chords[bar]
    
    # Rhodes chord pushes: hits on 0, 4, 7, 10, 13
    for s, d in [(0, 3), (4, 2), (7, 2), (10, 2), (13, 2)]:
        vel = 95 if s == 0 else 80
        for n in voicing:
            rhodes_events.append((b_step + s, n, d, vel))
            
    # Walking soul bass
    rhodes_bass.append((b_step + 0, root, 4, 95))
    rhodes_bass.append((b_step + 4, root + 7, 3, 80))
    rhodes_bass.append((b_step + 8, root, 3, 85))
    rhodes_bass.append((b_step + 12, root + 12, 3, 80))
    
    # Drums: Punchy soul pocket
    rhodes_drums.append((b_step + 0, 36, 2, 100))
    rhodes_drums.append((b_step + 6, 36, 2, 85))
    rhodes_drums.append((b_step + 10, 36, 2, 95))
    rhodes_drums.append((b_step + 4, 38, 2, 100))
    rhodes_drums.append((b_step + 12, 38, 2, 105))
    for s in range(16):
        rhodes_drums.append((b_step + s, 42, 1, 80 if s % 4 == 0 else 55))

create_midi("04_golden_boy_soul_rhodes_112bpm.mid", 112, (4, 4), [
    {'name': 'Rhodes Electric Piano', 'channel': 0, 'program': 4, 'events': rhodes_events}, # 4: Electric Piano 1 (Rhodes)
    {'name': 'Soul Bass', 'channel': 1, 'program': 33, 'events': rhodes_bass},
    {'name': 'Soul Pocket Drums', 'channel': 9, 'events': rhodes_drums}
])

# =========================================================================
# 5. SUN BEAM POST MALONE X FRANK OCEAN INDIE GUITAR (134 BPM, F#m / A Major)
# Modeled on: looperman-l-3137495-0203299-sun-beam-a-post-malone-x-frank-ocean-guitar.wav
# Dynamic fingerpicked acoustic guitar, rolling indie groove
# =========================================================================
sun_guitar = []
sun_bass = []
sun_drums = []

# F#m7 -> Dmaj7 -> A -> E
sun_prog = [
    ([54, 57, 61, 64], 42), # F#m7
    ([50, 57, 62, 66], 38), # Dmaj7
    ([45, 52, 57, 61], 45), # A
    ([40, 47, 52, 56], 40)  # E
]

for bar in range(4):
    b_step = bar * 16
    chord_notes, root = sun_prog[bar]
    
    # Dynamic 16th fingerpick strum: 0, 2, 4, 6, 8, 10, 12, 14 with staggered voicings
    for s_idx, s in enumerate([0, 2, 4, 6, 8, 10, 12, 14]):
        vel = 95 if s in [0, 8] else 78
        # Strum across notes
        for n_i, n in enumerate(chord_notes):
            sun_guitar.append((b_step + s, n, 2, vel - n_i * 3))
            
    sun_bass.append((b_step + 0, root, 6, 95))
    sun_bass.append((b_step + 6, root, 2, 80))
    sun_bass.append((b_step + 8, root + 7, 4, 85))
    sun_bass.append((b_step + 12, root, 3, 80))
    
    # Pop drums
    sun_drums.append((b_step + 0, 36, 2, 100))
    sun_drums.append((b_step + 8, 36, 2, 90))
    sun_drums.append((b_step + 10, 36, 2, 95))
    sun_drums.append((b_step + 4, 38, 2, 105))
    sun_drums.append((b_step + 12, 38, 2, 105))
    for s in range(0, 16, 2):
        sun_drums.append((b_step + s, 42, 1, 75))

create_midi("05_sun_beam_indie_acoustic_134bpm.mid", 134, (4, 4), [
    {'name': 'Acoustic Guitar (Steel)', 'channel': 0, 'program': 25, 'events': sun_guitar}, # 25: Steel Acoustic
    {'name': 'Indie Bass', 'channel': 1, 'program': 33, 'events': sun_bass},
    {'name': 'Modern Indie Drums', 'channel': 9, 'events': sun_drums}
])

# =========================================================================
# 6. MOOD SWINGS POP / SOUL PIANO (130 BPM, D Minor)
# Modeled on: looperman-l-5091060-0434909-mood-swings-piano-loop-part-1-of-5.wav
# Expressive emotional piano voicings (Dm9, C/E, Fmaj7, Gm7)
# =========================================================================
piano_events = []
piano_bass = []
piano_drums = []

piano_prog = [
    ([50, 57, 60, 64, 65], 38), # Dm9
    ([52, 55, 60, 64, 67], 40), # C/E
    ([53, 57, 60, 64, 69], 41), # Fmaj7
    ([55, 58, 62, 65, 67], 43)  # Gm7
]

for bar in range(4):
    b_step = bar * 16
    v, root = piano_prog[bar]
    
    # Piano: Left-hand root octaves, right hand rhythmic chord arpeggio
    piano_bass.append((b_step + 0, root, 8, 95))
    piano_bass.append((b_step + 8, root + 7, 6, 85))
    
    for s, d, vel in [(0, 4, 90), (4, 3, 75), (7, 3, 85), (10, 2, 80), (12, 3, 85), (14, 2, 80)]:
        for n in v:
            piano_events.append((b_step + s, n, d, vel))
            
    # Drums
    piano_drums.append((b_step + 0, 36, 2, 100))
    piano_drums.append((b_step + 6, 36, 2, 85))
    piano_drums.append((b_step + 10, 36, 2, 90))
    piano_drums.append((b_step + 4, 38, 2, 100))
    piano_drums.append((b_step + 12, 38, 2, 105))
    for s in range(16):
        piano_drums.append((b_step + s, 42, 1, 70 if s % 2 == 0 else 45))

create_midi("06_mood_swings_pop_piano_130bpm.mid", 130, (4, 4), [
    {'name': 'Acoustic Grand Piano', 'channel': 0, 'program': 0, 'events': piano_events}, # 0: Acoustic Grand
    {'name': 'Upright / Electric Bass', 'channel': 1, 'program': 33, 'events': piano_bass},
    {'name': 'Pop Ballad Drums', 'channel': 9, 'events': piano_drums}
])

# =========================================================================
# 7. SAD GUITAR EMO / ALT ROCK (130 BPM, F Minor)
# Modeled on: looperman-l-2130706-0133164-sad-guitar-melody.wav
# Melodic arpeggiated electric guitar hooks, driving bass, rock backbeat
# =========================================================================
sad_guitar = []
sad_bass = []
sad_drums = []

# Fm -> Ab -> Eb -> Db
sad_prog = [
    ([53, 60, 65, 68], 41), # Fm
    ([56, 60, 63, 68], 44), # Ab
    ([51, 58, 63, 67], 39), # Eb
    ([49, 56, 61, 65], 37)  # Db
]

for bar in range(4):
    b_step = bar * 16
    v, root = sad_prog[bar]
    
    # 16th-note arpeggiated melody across the chord
    # pattern: 0, 1, 2, 3, 0, 1, 2, 3...
    for s in range(16):
        note = v[s % len(v)]
        sad_guitar.append((b_step + s, note, 2, 88 if s % 4 == 0 else 72))
        
    for s in [0, 4, 8, 12]:
        sad_bass.append((b_step + s, root, 3, 95))
        
    # Rock drums
    sad_drums.append((b_step + 0, 36, 2, 105))
    sad_drums.append((b_step + 8, 36, 2, 95))
    sad_drums.append((b_step + 10, 36, 2, 90))
    sad_drums.append((b_step + 4, 38, 2, 110))
    sad_drums.append((b_step + 12, 38, 2, 112))
    for s in range(0, 16, 2):
        sad_drums.append((b_step + s, 42, 1, 80))

create_midi("07_sad_guitar_emo_rock_130bpm.mid", 130, (4, 4), [
    {'name': 'Clean Electric Guitar (Arpeggio)', 'channel': 0, 'program': 27, 'events': sad_guitar},
    {'name': 'Rock Bass', 'channel': 1, 'program': 33, 'events': sad_bass},
    {'name': 'Rock Drums', 'channel': 9, 'events': sad_drums}
])

# =========================================================================
# 8. DEEP HOUSE CHORDS (120 BPM, D Minor)
# Modeled on: looperman-l-2270494-0167711-deep-house-chords.wav
# Syncopated 90s house chord stabs (Dm9, Bm7b5), 4-on-the-floor kick, sub bass
# =========================================================================
house_chords = []
house_bass = []
house_drums = []

# Dm9 -> G9 -> Dm9 -> Bbmaj7
dh_chords = [
    ([50, 57, 60, 64, 65], 38), # Dm9
    ([53, 57, 61, 65, 67], 43), # G9 / Bm7b5
    ([50, 57, 60, 64, 65], 38), # Dm9
    ([46, 53, 57, 62, 65], 34)  # Bbmaj7
]

for bar in range(4):
    b_step = bar * 16
    v, root = dh_chords[bar]
    
    # Classic House rhythm: Stabs on 0, 3, 6, 8, 11, 14
    for s in [0, 3, 6, 8, 11, 14]:
        for n in v:
            house_chords.append((b_step + s, n, 2, 95))
            
    # Offbeat pumping bass: on 2, 6, 10, 14
    for s in [2, 6, 10, 14]:
        house_bass.append((b_step + s, root, 2, 100))
        
    # 4-on-the-floor kick
    for k in [0, 4, 8, 12]:
        house_drums.append((b_step + k, 36, 2, 110))
    # Claps/snares on 4, 12
    house_drums.append((b_step + 4, 38, 2, 105))
    house_drums.append((b_step + 12, 38, 2, 105))
    # Open hats on offbeats (2, 6, 10, 14)
    for oh in [2, 6, 10, 14]:
        house_drums.append((b_step + oh, 46, 2, 90)) # 46: Open Hi-Hat

create_midi("08_deep_house_chords_120bpm.mid", 120, (4, 4), [
    {'name': 'House Synth Chords', 'channel': 0, 'program': 81, 'events': house_chords}, # 81: Sawtooth Lead / Chords
    {'name': 'Deep Sub Bass', 'channel': 1, 'program': 38, 'events': house_bass},        # 38: Synth Bass 1
    {'name': 'House Drum Kit', 'channel': 9, 'events': house_drums}
])

# =========================================================================
# 9. TROPICAL HOUSE PLUCK (120 BPM, D Major / B Minor)
# Modeled on: looperman-l-2109380-0131177-tropical-house-pluck.wav
# Bright tropical marimba / pluck melody with uplifting bounce
# =========================================================================
trop_pluck = []
trop_bass = []
trop_drums = []

trop_prog = [
    ([50, 57, 62, 66], 38), # D
    ([45, 52, 57, 61], 45), # A
    ([47, 54, 59, 62], 35), # Bm
    ([43, 50, 55, 59], 43)  # G
]

for bar in range(4):
    b_step = bar * 16
    v, root = trop_prog[bar]
    
    # Tropical syncopated pluck pattern: 0, 3, 6, 8, 10, 12, 14
    for s in [0, 3, 6, 8, 10, 12, 14]:
        for n in v:
            trop_pluck.append((b_step + s, n + 12, 2, 90)) # Octave up for pluck
            
    trop_bass.append((b_step + 0, root, 4, 95))
    trop_bass.append((b_step + 6, root, 2, 80))
    trop_bass.append((b_step + 8, root + 7, 4, 90))
    trop_bass.append((b_step + 12, root, 3, 85))
    
    # 4 on the floor with snap
    for k in [0, 4, 8, 12]:
        trop_drums.append((b_step + k, 36, 2, 105))
    trop_drums.append((b_step + 4, 38, 2, 100))
    trop_drums.append((b_step + 12, 38, 2, 105))
    for s in range(16):
        trop_drums.append((b_step + s, 42, 1, 75 if s % 2 == 0 else 50))

create_midi("09_tropical_house_pluck_120bpm.mid", 120, (4, 4), [
    {'name': 'Tropical Synth Pluck', 'channel': 0, 'program': 12, 'events': trop_pluck}, # 12: Marimba / Pluck
    {'name': 'Tropical Bass', 'channel': 1, 'program': 33, 'events': trop_bass},
    {'name': 'Tropical Beats', 'channel': 9, 'events': trop_drums}
])

# =========================================================================
# 10. HARD BOOM BAP DRUMS & POCKET (96 BPM)
# Modeled on: looperman-l-2899778-0199150-hard-boom-bap-boom-trap-drums-no-808.wav
# Heavy punchy kick, crack snare, swung hats, accompanied by jazz guitar & bass
# =========================================================================
bb_guitar = []
bb_bass = []
bb_drums = []

bb_chords = [
    ([48, 55, 60, 63, 67], 36), # Cm9
    ([46, 53, 58, 62, 65], 34), # Bb9
    ([44, 51, 56, 60, 63], 32), # Abmaj7
    ([43, 50, 55, 58, 62], 31)  # G7b9
]

for bar in range(4):
    b_step = bar * 16
    v, root = bb_chords[bar]
    
    # Boom bap drums pattern from audio loop:
    # Kick: 0, 5, 10, 14
    bb_drums.append((b_step + 0, 36, 2, 115))
    bb_drums.append((b_step + 5, 36, 2, 100))
    bb_drums.append((b_step + 10, 36, 2, 110))
    bb_drums.append((b_step + 14, 36, 2, 95))
    # Snare on 4, 12
    bb_drums.append((b_step + 4, 38, 2, 115))
    bb_drums.append((b_step + 12, 38, 2, 120))
    # Hats on 16ths with swing
    for s in range(16):
        vel = 90 if s in [0, 4, 8, 12] else (65 if s % 2 == 0 else 45)
        bb_drums.append((b_step + s, 42, 1, vel))
        
    # Jazz guitar chord stabs on 2, 6, 11
    for s in [2, 6, 11]:
        for n in v:
            bb_guitar.append((b_step + s, n, 2, 85))
            
    bb_bass.append((b_step + 0, root, 4, 100))
    bb_bass.append((b_step + 5, root, 3, 90))
    bb_bass.append((b_step + 10, root + 7, 4, 95))

create_midi("10_hard_boom_bap_drums_96bpm.mid", 96, (4, 4), [
    {'name': 'Jazz Clean Guitar', 'channel': 0, 'program': 26, 'events': bb_guitar},
    {'name': 'Boom Bap Bass', 'channel': 1, 'program': 33, 'events': bb_bass},
    {'name': 'Hard Boom Bap Drums', 'channel': 9, 'events': bb_drums}
])

# =========================================================================
# 11. LO-FI CRISP DRUMS & BEAT (96 BPM)
# Modeled on: looperman-l-2624164-0238371-lofi-crisp.wav
# Laid-back chillhop pocket with dusty Rhodes & warm bass
# =========================================================================
lofi_rhodes = []
lofi_bass = []
lofi_drums = []

lofi_chords = [
    ([53, 57, 60, 64], 41), # Fmaj7
    ([52, 55, 59, 62], 40), # Em7
    ([50, 53, 57, 60], 38), # Dm7
    ([48, 52, 55, 59], 36)  # Cmaj7
]

for bar in range(4):
    b_step = bar * 16
    v, root = lofi_chords[bar]
    
    # Lo-fi drums from loop:
    # Soft kick on 0, 6, 10
    lofi_drums.append((b_step + 0, 36, 2, 95))
    lofi_drums.append((b_step + 6, 36, 2, 85))
    lofi_drums.append((b_step + 10, 36, 2, 90))
    # Rimshot / snare on 4, 12
    lofi_drums.append((b_step + 4, 37, 2, 95)) # 37: Side Stick / Rim
    lofi_drums.append((b_step + 12, 37, 2, 100))
    # Swung hats
    for s in range(16):
        v_h = 75 if s in [0, 4, 8, 12] else (50 if s % 2 == 0 else 35)
        lofi_drums.append((b_step + s, 42, 1, v_h))
        
    for s in [0, 7, 12]:
        for n in v:
            lofi_rhodes.append((b_step + s, n, 4, 75))
            
    lofi_bass.append((b_step + 0, root, 6, 90))
    lofi_bass.append((b_step + 6, root + 7, 4, 80))
    lofi_bass.append((b_step + 10, root, 5, 85))

create_midi("11_lofi_crisp_beat_96bpm.mid", 96, (4, 4), [
    {'name': 'Dusty Lo-Fi Rhodes', 'channel': 0, 'program': 4, 'events': lofi_rhodes},
    {'name': 'Sub / Warm Bass', 'channel': 1, 'program': 33, 'events': lofi_bass},
    {'name': 'Crisp Lo-Fi Drums', 'channel': 9, 'events': lofi_drums}
])

# =========================================================================
# 12. THEME CHOP FUNKY BREAKBEAT (96 BPM)
# Modeled on: looperman-l-8353314-0434902-hiphop-drum-loop-96-bpm-theme-chop-louisbreaks.wav
# Dynamic ghost-note breakbeat drums with 70s Funk Strat chank & slap bass
# =========================================================================
funk_guitar = []
funk_bass = []
funk_drums = []

# E7#9 (Hendrix chord) to A9 funk vamp
funk_chords = [
    ([52, 56, 59, 62, 67], 40), # E7#9
    ([57, 61, 64, 67, 71], 45), # A9
    ([52, 56, 59, 62, 67], 40), # E7#9
    ([57, 61, 64, 67, 71], 45)  # A9
]

for bar in range(4):
    b_step = bar * 16
    v, root = funk_chords[bar]
    
    # Funk breakbeat drums with ghost notes from audio loop:
    # Kick: 0, 7, 10
    funk_drums.append((b_step + 0, 36, 2, 110))
    funk_drums.append((b_step + 7, 36, 2, 95))
    funk_drums.append((b_step + 10, 36, 2, 105))
    # Snare: 4, 12 with ghost notes on 2, 9, 14
    funk_drums.append((b_step + 4, 38, 2, 115))
    funk_drums.append((b_step + 12, 38, 2, 118))
    funk_drums.append((b_step + 2, 38, 1, 55)) # Ghost
    funk_drums.append((b_step + 9, 38, 1, 60)) # Ghost
    funk_drums.append((b_step + 14, 38, 1, 55)) # Ghost
    # Hats: open hat on 3, 11, closed elsewhere
    for s in range(16):
        if s in [3, 11]:
            funk_drums.append((b_step + s, 46, 1, 95)) # Open hat
        else:
            funk_drums.append((b_step + s, 42, 1, 80 if s % 2 == 0 else 55))
            
    # Funk Strat Chank: 16th-note chucks with accent chanks on 2, 6, 8, 14
    for s in [2, 6, 8, 14]:
        for n in v:
            funk_guitar.append((b_step + s, n, 1, 95))
            
    # Slap bass: pop on octave on 3, slap root on 0, 6, 10
    funk_bass.append((b_step + 0, root, 2, 110)) # Slap root
    funk_bass.append((b_step + 3, root + 12, 1, 105)) # Pop octave
    funk_bass.append((b_step + 6, root, 2, 95))
    funk_bass.append((b_step + 10, root + 10, 2, 100)) # Slap b7

create_midi("12_theme_chop_funk_break_96bpm.mid", 96, (4, 4), [
    {'name': 'Funk Strat Guitar', 'channel': 0, 'program': 28, 'events': funk_guitar}, # 28: Electric Guitar (muted)
    {'name': 'Slap Bass', 'channel': 1, 'program': 36, 'events': funk_bass},          # 36: Slap Bass 1
    {'name': 'Funky Breakbeat Drums', 'channel': 9, 'events': funk_drums}
])

print("\nSuccessfully generated all 12 MIDI tracks based on sample loops!")
