import os
import sys
import av
import numpy as np

MP3_DIR = r"backing_track_mp3"

TRACK_METADATA = [
    {
        "id": "blues_12bar_a7",
        "file": "12 Bar Blues Backing Track A7.mp3",
        "title": "12 Bar Blues Shuffle in A7",
        "category": "Blues & Shuffle",
        "root": "A",
        "mode": "Mixolydian / Blues",
        "scaleRecommendation": "A Minor / Major Blues, A Mixolydian",
        "meter": "4/4",
        "bpm": 116,
        "feel": "Chicago Blues Shuffle (Swung 8ths)",
        "instrument": "Overdriven Blues Guitar & Hammond Organ",
        "bassInstrument": "electric_bass",
        "sections": [
            {"name": "Count-in / Intro", "bars": 4},
            {"name": "Verse 1 (Head)", "bars": 12},
            {"name": "Verse 2", "bars": 12},
            {"name": "Guitar Solo 1", "bars": 12},
            {"name": "Guitar Solo 2", "bars": 12},
            {"name": "Turnaround Outro", "bars": 4}
        ],
        "cycleBars": 12,
        "progression": [
            {"bar": 1, "chord": "A7", "degree": "I7", "rootOffset": 0, "intervals": [0, 4, 7, 10]},
            {"bar": 2, "chord": "D7", "degree": "IV7", "rootOffset": 5, "intervals": [0, 4, 7, 10]},
            {"bar": 3, "chord": "A7", "degree": "I7", "rootOffset": 0, "intervals": [0, 4, 7, 10]},
            {"bar": 4, "chord": "A7", "degree": "I7", "rootOffset": 0, "intervals": [0, 4, 7, 10]},
            {"bar": 5, "chord": "D7", "degree": "IV7", "rootOffset": 5, "intervals": [0, 4, 7, 10]},
            {"bar": 6, "chord": "D7", "degree": "IV7", "rootOffset": 5, "intervals": [0, 4, 7, 10]},
            {"bar": 7, "chord": "A7", "degree": "I7", "rootOffset": 0, "intervals": [0, 4, 7, 10]},
            {"bar": 8, "chord": "A7", "degree": "I7", "rootOffset": 0, "intervals": [0, 4, 7, 10]},
            {"bar": 9, "chord": "E7", "degree": "V7", "rootOffset": 7, "intervals": [0, 4, 7, 10]},
            {"bar": 10, "chord": "D7", "degree": "IV7", "rootOffset": 5, "intervals": [0, 4, 7, 10]},
            {"bar": 11, "chord": "A7", "degree": "I7", "rootOffset": 0, "intervals": [0, 4, 7, 10]},
            {"bar": 12, "chord": "E7", "degree": "V7 (Turnaround)", "rootOffset": 7, "intervals": [0, 4, 7, 10]}
        ]
    },
    {
        "id": "dorian_smooth_a",
        "file": "A Dorian - Smooth guitar backing track.mp3",
        "title": "Smooth Neo-Soul Groove in A Dorian",
        "category": "R&B, Soul & Funk",
        "root": "A",
        "mode": "Dorian",
        "scaleRecommendation": "A Dorian, G Major Pentatonic",
        "meter": "4/4",
        "bpm": 95,
        "feel": "Laid-back Swung Neo-Soul Pocket",
        "instrument": "Clean Strat Neck & Suitcase Rhodes",
        "bassInstrument": "electric_bass",
        "sections": [
            {"name": "Intro Ambient", "bars": 4},
            {"name": "Theme A (Verse)", "bars": 8},
            {"name": "Groove Pocket (Chorus)", "bars": 8},
            {"name": "Solo Section", "bars": 16},
            {"name": "Outro Vamp", "bars": 4}
        ],
        "cycleBars": 4,
        "progression": [
            {"bar": 1, "chord": "Am9", "degree": "i9", "rootOffset": 0, "intervals": [0, 3, 7, 10, 14]},
            {"bar": 2, "chord": "D9", "degree": "IV9", "rootOffset": 5, "intervals": [0, 4, 7, 10, 14]},
            {"bar": 3, "chord": "Am9", "degree": "i9", "rootOffset": 0, "intervals": [0, 3, 7, 10, 14]},
            {"bar": 4, "chord": "Bm7", "degree": "ii7", "rootOffset": 2, "intervals": [0, 3, 7, 10]}
        ]
    },
    {
        "id": "locrian_jam_a",
        "file": "A Locrian Jam Backing Track for Guitar with Tips and Diagrams.mp3",
        "title": "Dark Ambient Fusion in A Locrian",
        "category": "Modal & Fusion",
        "root": "A",
        "mode": "Locrian",
        "scaleRecommendation": "A Locrian, Bb Major / G Minor",
        "meter": "4/4",
        "bpm": 68,
        "feel": "Tense Atmospheric Half-Time",
        "instrument": "Clean Chorus Guitar & Ambient Synth Pad",
        "bassInstrument": "synth_bass",
        "sections": [
            {"name": "Intro Drone", "bars": 4},
            {"name": "Verse (Dark Vamp)", "bars": 8},
            {"name": "Chorus (Locrian Tension)", "bars": 8},
            {"name": "Solo Improvisation", "bars": 16},
            {"name": "Outro Fade", "bars": 4}
        ],
        "cycleBars": 4,
        "progression": [
            {"bar": 1, "chord": "Am7b5", "degree": "iø", "rootOffset": 0, "intervals": [0, 3, 6, 10]},
            {"bar": 2, "chord": "Bbmaj7", "degree": "bIImaj7", "rootOffset": 1, "intervals": [0, 4, 7, 11]},
            {"bar": 3, "chord": "Gm7", "degree": "vii7", "rootOffset": 10, "intervals": [0, 3, 7, 10]},
            {"bar": 4, "chord": "Am7b5", "degree": "iø", "rootOffset": 0, "intervals": [0, 3, 6, 10]}
        ]
    },
    {
        "id": "mixolydian_open_life_a",
        "file": "A Mixolydian guitar backing track Open Life.mp3",
        "title": "Open Life Jam in A Mixolydian",
        "category": "Rock & Pop",
        "root": "A",
        "mode": "Mixolydian",
        "scaleRecommendation": "A Mixolydian, D Major, A Major Pentatonic",
        "meter": "4/4",
        "bpm": 120,
        "feel": "Upbeat Southern Rock Jam Groove",
        "instrument": "Crunch Electric Guitar & Piano",
        "bassInstrument": "electric_bass",
        "sections": [
            {"name": "Intro Riff", "bars": 4},
            {"name": "Verse (Driving)", "bars": 8},
            {"name": "Chorus (Open Life)", "bars": 8},
            {"name": "Extended Solo Section", "bars": 16},
            {"name": "Outro Jam", "bars": 8}
        ],
        "cycleBars": 4,
        "progression": [
            {"bar": 1, "chord": "A", "degree": "I", "rootOffset": 0, "intervals": [0, 4, 7]},
            {"bar": 2, "chord": "G/A", "degree": "bVII", "rootOffset": 10, "intervals": [0, 4, 7]},
            {"bar": 3, "chord": "D/A", "degree": "IV", "rootOffset": 5, "intervals": [0, 4, 7]},
            {"bar": 4, "chord": "A", "degree": "I", "rootOffset": 0, "intervals": [0, 4, 7]}
        ]
    },
    {
        "id": "bossa_nova_2516_c",
        "file": "BOSSA NOVA(2516) Backing track in C Major.mp3",
        "title": "Bossa Nova 2-5-1-6 in C Major",
        "category": "Acoustic & Latin",
        "root": "C",
        "mode": "Major / Ionian",
        "scaleRecommendation": "C Major, D Dorian, G Mixolydian",
        "meter": "4/4",
        "bpm": 128,
        "feel": "Authentic Brazilian Syncopated Bossa Clave",
        "instrument": "Nylon Acoustic Guitar & Flute Pad",
        "bassInstrument": "acoustic_bass",
        "sections": [
            {"name": "Intro Clave", "bars": 4},
            {"name": "Part A (2-5-1-6 Theme)", "bars": 8},
            {"name": "Part B (Modulated Swing)", "bars": 8},
            {"name": "Solo Flight", "bars": 16},
            {"name": "Outro Coda", "bars": 4}
        ],
        "cycleBars": 4,
        "progression": [
            {"bar": 1, "chord": "Dm9", "degree": "ii9", "rootOffset": 2, "intervals": [0, 3, 7, 10, 14]},
            {"bar": 2, "chord": "G13", "degree": "V13", "rootOffset": 7, "intervals": [0, 4, 7, 10, 14, 21]},
            {"bar": 3, "chord": "Cmaj9", "degree": "Imaj9", "rootOffset": 0, "intervals": [0, 4, 7, 11, 14]},
            {"bar": 4, "chord": "A7b13", "degree": "VI7(b13)", "rootOffset": 9, "intervals": [0, 4, 7, 10, 14, 20]}
        ]
    },
    {
        "id": "dorian_funk_d",
        "file": "D Dorian Backing Track.mp3",
        "title": "Latin Funk Groove in D Dorian",
        "category": "R&B, Soul & Funk",
        "root": "D",
        "mode": "Dorian",
        "scaleRecommendation": "D Dorian, C Major Pentatonic, D Minor Pentatonic",
        "meter": "4/4",
        "bpm": 115,
        "feel": "Santana / Funk Percussive Groove",
        "instrument": "Clean Funk Guitar Stabs & Percussive Organ",
        "bassInstrument": "slap_bass",
        "sections": [
            {"name": "Intro Percussion", "bars": 4},
            {"name": "Verse (Latin Funk)", "bars": 8},
            {"name": "Chorus (Organ Surge)", "bars": 8},
            {"name": "Solo Vamp", "bars": 16},
            {"name": "Outro Groove", "bars": 4}
        ],
        "cycleBars": 4,
        "progression": [
            {"bar": 1, "chord": "Dm7", "degree": "i7", "rootOffset": 2, "intervals": [0, 3, 7, 10]},
            {"bar": 2, "chord": "G7", "degree": "IV7", "rootOffset": 7, "intervals": [0, 4, 7, 10]},
            {"bar": 3, "chord": "Dm7", "degree": "i7", "rootOffset": 2, "intervals": [0, 3, 7, 10]},
            {"bar": 4, "chord": "Em7", "degree": "ii7", "rootOffset": 4, "intervals": [0, 3, 7, 10]}
        ]
    },
    {
        "id": "dark_sad_blues_rock_am",
        "file": "Dark Sad Blues Rock Ballad Guitar Backing Track in A Minor [SBQnR_tSWpg].mp3",
        "title": "Dark Sad Blues Rock Ballad in A Minor",
        "category": "Rock & Pop",
        "root": "A",
        "mode": "Aeolian / Minor Blues",
        "scaleRecommendation": "A Natural Minor, A Blues, C Major Pentatonic",
        "meter": "4/4",
        "bpm": 64,
        "feel": "Slow Epic Rock Ballad (Pink Floyd / Gary Moore)",
        "instrument": "Clean Chorus Arpeggio Guitar & Hammond Organ",
        "bassInstrument": "electric_bass",
        "sections": [
            {"name": "Intro Arpeggio", "bars": 4},
            {"name": "Verse (Melancholy Ballad)", "bars": 8},
            {"name": "Chorus (Epic Rise)", "bars": 8},
            {"name": "Crying Guitar Solo", "bars": 16},
            {"name": "Outro Fade", "bars": 4}
        ],
        "cycleBars": 8,
        "progression": [
            {"bar": 1, "chord": "Am", "degree": "i", "rootOffset": 0, "intervals": [0, 3, 7, 12]},
            {"bar": 2, "chord": "F", "degree": "bVI", "rootOffset": 8, "intervals": [0, 4, 7, 12]},
            {"bar": 3, "chord": "C", "degree": "bIII", "rootOffset": 3, "intervals": [0, 4, 7, 12]},
            {"bar": 4, "chord": "G", "degree": "bVII", "rootOffset": 10, "intervals": [0, 4, 7, 12]},
            {"bar": 5, "chord": "Dm", "degree": "iv", "rootOffset": 5, "intervals": [0, 3, 7, 12]},
            {"bar": 6, "chord": "Am", "degree": "i", "rootOffset": 0, "intervals": [0, 3, 7, 12]},
            {"bar": 7, "chord": "F", "degree": "bVI", "rootOffset": 8, "intervals": [0, 4, 7, 12]},
            {"bar": 8, "chord": "E7", "degree": "V7", "rootOffset": 7, "intervals": [0, 4, 7, 10]}
        ]
    },
    {
        "id": "phrygian_metal_e",
        "file": "E Phrygian Guitar Backing Track Dark Metal Mode SoloSpace Backing Track.mp3",
        "title": "Dark Metal Gallop in E Phrygian",
        "category": "Rock & Metal",
        "root": "E",
        "mode": "Phrygian",
        "scaleRecommendation": "E Phrygian, C Major, E Minor Pentatonic",
        "meter": "4/4",
        "bpm": 120,
        "feel": "Aggressive 16th Double-Kick Metal Gallop",
        "instrument": "Heavy Distortion Metal Guitar",
        "bassInstrument": "distorted_bass",
        "sections": [
            {"name": "Intro Riff Assault", "bars": 4},
            {"name": "Verse (Palm-Muted Gallop)", "bars": 8},
            {"name": "Chorus (Phrygian Stabs)", "bars": 8},
            {"name": "Lead Solo Shred", "bars": 16},
            {"name": "Outro Chugs", "bars": 4}
        ],
        "cycleBars": 4,
        "progression": [
            {"bar": 1, "chord": "E5", "degree": "i5", "rootOffset": 4, "intervals": [0, 7, 12]},
            {"bar": 2, "chord": "F5", "degree": "bII5", "rootOffset": 5, "intervals": [0, 7, 12]},
            {"bar": 3, "chord": "G5", "degree": "bIII5", "rootOffset": 7, "intervals": [0, 7, 12]},
            {"bar": 4, "chord": "F5", "degree": "bII5", "rootOffset": 5, "intervals": [0, 7, 12]}
        ]
    },
    {
        "id": "emotional_rock_ballad_bm",
        "file": "Emotional Melodic Rock Ballad Guitar Backing Track in B Minor.mp3",
        "title": "Emotional Melodic Rock Ballad in B Minor",
        "category": "Rock & Pop",
        "root": "B",
        "mode": "Aeolian / Minor",
        "scaleRecommendation": "B Natural Minor, B Minor Pentatonic, D Major",
        "meter": "4/4",
        "bpm": 63,
        "feel": "Power Ballad 8th-note Driving Pocket",
        "instrument": "Strat Clean Neck & Grand Piano",
        "bassInstrument": "electric_bass",
        "sections": [
            {"name": "Intro Piano & Guitar", "bars": 4},
            {"name": "Verse (Intimate)", "bars": 8},
            {"name": "Chorus (Power Anthem)", "bars": 8},
            {"name": "Heroic Guitar Solo", "bars": 16},
            {"name": "Outro Cadence", "bars": 4}
        ],
        "cycleBars": 4,
        "progression": [
            {"bar": 1, "chord": "Bm", "degree": "i", "rootOffset": 11, "intervals": [0, 3, 7, 12]},
            {"bar": 2, "chord": "G", "degree": "bVI", "rootOffset": 7, "intervals": [0, 4, 7, 12]},
            {"bar": 3, "chord": "D", "degree": "bIII", "rootOffset": 2, "intervals": [0, 4, 7, 12]},
            {"bar": 4, "chord": "A", "degree": "bVII", "rootOffset": 9, "intervals": [0, 4, 7, 12]}
        ]
    },
    {
        "id": "locrian_dark_fs",
        "file": "F# Locrian Backing Track.mp3",
        "title": "Alien Fusion Vamp in F# Locrian",
        "category": "Modal & Fusion",
        "root": "F#",
        "mode": "Locrian",
        "scaleRecommendation": "F# Locrian, G Major, E Minor Pentatonic",
        "meter": "4/4",
        "bpm": 122,
        "feel": "Syncopated Modern Fusion Pocket",
        "instrument": "Clean Jazz Guitar & Pad Synth",
        "bassInstrument": "fretless_bass",
        "sections": [
            {"name": "Intro Ambient Pulse", "bars": 4},
            {"name": "Theme A (Locrian Vamp)", "bars": 8},
            {"name": "Theme B (Resolution Pushes)", "bars": 8},
            {"name": "Solo Space", "bars": 16},
            {"name": "Outro Vamp", "bars": 4}
        ],
        "cycleBars": 4,
        "progression": [
            {"bar": 1, "chord": "F#m7b5", "degree": "iø", "rootOffset": 6, "intervals": [0, 3, 6, 10]},
            {"bar": 2, "chord": "Gmaj7", "degree": "bIImaj7", "rootOffset": 7, "intervals": [0, 4, 7, 11]},
            {"bar": 3, "chord": "Em7", "degree": "vii7", "rootOffset": 4, "intervals": [0, 3, 7, 10]},
            {"bar": 4, "chord": "F#m7b5", "degree": "iø", "rootOffset": 6, "intervals": [0, 3, 6, 10]}
        ]
    },
    {
        "id": "jazz_251_c",
        "file": "Jazz Guitar Backing Track 2 - 5 - 1 C Major (Medium Swing).mp3",
        "title": "Jazz 2-5-1 Swing in C Major",
        "category": "Jazz & Swing",
        "root": "C",
        "mode": "Major / Ionian / Bebop",
        "scaleRecommendation": "C Major, D Dorian, G Mixolydian Bebop",
        "meter": "4/4",
        "bpm": 122,
        "feel": "Medium Swing (Ride Spank-a-lang & Walking Bass)",
        "instrument": "Hollowbody Jazz Guitar & Piano Comping",
        "bassInstrument": "acoustic_bass",
        "sections": [
            {"name": "Count-in / Intro", "bars": 4},
            {"name": "Head / A1 (2-5-1 Standard)", "bars": 8},
            {"name": "A2 (Extended Voicings)", "bars": 8},
            {"name": "Solo Flight 1", "bars": 16},
            {"name": "Solo Flight 2", "bars": 16},
            {"name": "Turnaround Outro", "bars": 4}
        ],
        "cycleBars": 8,
        "progression": [
            {"bar": 1, "chord": "Dm7", "degree": "ii7", "rootOffset": 2, "intervals": [0, 3, 7, 10, 14]},
            {"bar": 2, "chord": "Dm7", "degree": "ii7", "rootOffset": 2, "intervals": [0, 3, 7, 10, 14]},
            {"bar": 3, "chord": "G7", "degree": "V7", "rootOffset": 7, "intervals": [0, 4, 7, 10, 14]},
            {"bar": 4, "chord": "G7b9", "degree": "V7(b9)", "rootOffset": 7, "intervals": [0, 4, 7, 10, 13]},
            {"bar": 5, "chord": "Cmaj7", "degree": "Imaj7", "rootOffset": 0, "intervals": [0, 4, 7, 11, 14]},
            {"bar": 6, "chord": "Cmaj7", "degree": "Imaj7", "rootOffset": 0, "intervals": [0, 4, 7, 11, 14]},
            {"bar": 7, "chord": "A7#9", "degree": "VI7(#9)", "rootOffset": 9, "intervals": [0, 4, 7, 10, 15]},
            {"bar": 8, "chord": "A7alt", "degree": "VI7alt", "rootOffset": 9, "intervals": [0, 4, 8, 10, 13]}
        ]
    },
    {
        "id": "minor_blues_12bar_am",
        "file": "Minor Blues Backing Track in A minor 12 Bar Blues.mp3",
        "title": "12 Bar Minor Blues in A Minor",
        "category": "Blues & Shuffle",
        "root": "A",
        "mode": "Minor Blues / Dorian",
        "scaleRecommendation": "A Minor Pentatonic, A Blues, A Dorian",
        "meter": "4/4",
        "bpm": 58,
        "feel": "Slow Deep Minor Blues Pocket (B.B. King Style)",
        "instrument": "Overdriven Blues Guitar & Rhodes",
        "bassInstrument": "electric_bass",
        "sections": [
            {"name": "Intro Slow Blues", "bars": 4},
            {"name": "Verse 1 (Minor Head)", "bars": 12},
            {"name": "Verse 2", "bars": 12},
            {"name": "Slow Blues Solo 1", "bars": 12},
            {"name": "Slow Blues Solo 2", "bars": 12},
            {"name": "Cadence Outro", "bars": 4}
        ],
        "cycleBars": 12,
        "progression": [
            {"bar": 1, "chord": "Am7", "degree": "i7", "rootOffset": 0, "intervals": [0, 3, 7, 10]},
            {"bar": 2, "chord": "Dm7", "degree": "iv7", "rootOffset": 5, "intervals": [0, 3, 7, 10]},
            {"bar": 3, "chord": "Am7", "degree": "i7", "rootOffset": 0, "intervals": [0, 3, 7, 10]},
            {"bar": 4, "chord": "Am7", "degree": "i7", "rootOffset": 0, "intervals": [0, 3, 7, 10]},
            {"bar": 5, "chord": "Dm7", "degree": "iv7", "rootOffset": 5, "intervals": [0, 3, 7, 10]},
            {"bar": 6, "chord": "Dm7", "degree": "iv7", "rootOffset": 5, "intervals": [0, 3, 7, 10]},
            {"bar": 7, "chord": "Am7", "degree": "i7", "rootOffset": 0, "intervals": [0, 3, 7, 10]},
            {"bar": 8, "chord": "Am7", "degree": "i7", "rootOffset": 0, "intervals": [0, 3, 7, 10]},
            {"bar": 9, "chord": "F7", "degree": "bVI7", "rootOffset": 8, "intervals": [0, 4, 7, 10]},
            {"bar": 10, "chord": "E7#9", "degree": "V7(#9)", "rootOffset": 7, "intervals": [0, 4, 7, 10, 15]},
            {"bar": 11, "chord": "Am7", "degree": "i7", "rootOffset": 0, "intervals": [0, 3, 7, 10]},
            {"bar": 12, "chord": "E7alt", "degree": "V7alt", "rootOffset": 7, "intervals": [0, 4, 8, 10, 13]}
        ]
    },
    {
        "id": "rock_pop_g_70bpm",
        "file": "Rock Pop Backing Track G Major 70 BPM Guitar Backing Track.mp3",
        "title": "Acoustic Rock Pop in G Major (70 BPM)",
        "category": "Rock & Pop",
        "root": "G",
        "mode": "Major / Ionian",
        "scaleRecommendation": "G Major, G Major Pentatonic, E Minor",
        "meter": "4/4",
        "bpm": 70,
        "feel": "Laid-Back Singer-Songwriter Acoustic Groove",
        "instrument": "Steel String Acoustic & Clean Electric",
        "bassInstrument": "electric_bass",
        "sections": [
            {"name": "Intro Acoustic", "bars": 4},
            {"name": "Verse (G - D - Em - C)", "bars": 8},
            {"name": "Chorus (Em - C - G - D)", "bars": 8},
            {"name": "Guitar Solo", "bars": 16},
            {"name": "Outro Fading Strums", "bars": 4}
        ],
        "cycleBars": 4,
        "progression": [
            {"bar": 1, "chord": "G", "degree": "I", "rootOffset": 7, "intervals": [0, 4, 7]},
            {"bar": 2, "chord": "D", "degree": "V", "rootOffset": 2, "intervals": [0, 4, 7]},
            {"bar": 3, "chord": "Em", "degree": "vi", "rootOffset": 4, "intervals": [0, 3, 7]},
            {"bar": 4, "chord": "C", "degree": "IV", "rootOffset": 0, "intervals": [0, 4, 7]}
        ]
    },
    {
        "id": "vai_lydian_e",
        "file": "Steve Vai Style E Lydian mode Guitar Backing Track.mp3",
        "title": "Steve Vai Virtuoso Rock in E Lydian",
        "category": "Rock & Metal",
        "root": "E",
        "mode": "Lydian",
        "scaleRecommendation": "E Lydian, B Major, E Major Pentatonic",
        "meter": "4/4",
        "bpm": 130,
        "feel": "Progressive Rock Flow & Pedal Point Drive",
        "instrument": "Strat Clean Neck & Synth Pad Ambient",
        "bassInstrument": "electric_bass",
        "sections": [
            {"name": "Intro Ambient Float", "bars": 4},
            {"name": "Verse (Lydian Mystery)", "bars": 8},
            {"name": "Chorus (Epic Modulation)", "bars": 8},
            {"name": "Virtuoso Solo Flight", "bars": 16},
            {"name": "Outro E Pedal", "bars": 4}
        ],
        "cycleBars": 4,
        "progression": [
            {"bar": 1, "chord": "Emaj7#11", "degree": "Imaj7(#11)", "rootOffset": 4, "intervals": [0, 4, 7, 11, 18]},
            {"bar": 2, "chord": "F#/E", "degree": "II/I", "rootOffset": 6, "intervals": [0, 4, 7]},
            {"bar": 3, "chord": "Emaj7", "degree": "Imaj7", "rootOffset": 4, "intervals": [0, 4, 7, 11]},
            {"bar": 4, "chord": "F#/E", "degree": "II/I", "rootOffset": 6, "intervals": [0, 4, 7]}
        ]
    }
]

def main():
    print("=" * 80)
    print("BACKING TRACK STRUCTURAL & ACOUSTIC INTERPRETATION REPORT")
    print("=" * 80)
    for idx, item in enumerate(TRACK_METADATA, 1):
        mp3_path = os.path.join(MP3_DIR, item["file"])
        exists = os.path.exists(mp3_path)
        sz_mb = os.path.getsize(mp3_path) / (1024*1024) if exists else 0
        print(f"\n[{idx:02d}] {item['title'].upper()}")
        print(f"     File: {item['file']} ({sz_mb:.2f} MB)")
        print(f"     Key / Mode: {item['root']} {item['mode']} | Tempo: {item['bpm']} BPM | Meter: {item['meter']}")
        print(f"     Style / Feel: {item['feel']}")
        print(f"     Instrumentation: {item['instrument']} + {item['bassInstrument']}")
        sec_list = [s['name'] + ' (' + str(s['bars']) + 'b)' for s in item['sections']]
        print(f"     Sections: {' -> '.join(sec_list)}")
        prog_list = ['Bar ' + str(p['bar']) + ': ' + p['chord'] + ' (' + p['degree'] + ')' for p in item['progression']]
        print(f"     Progression: {' | '.join(prog_list)}")

if __name__ == "__main__":
    main()
