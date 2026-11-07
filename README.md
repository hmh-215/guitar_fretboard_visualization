# Guitar Fretboard Visualization (MVVM Architecture)
[![Live Demo](https://img.shields.io/badge/Live%20Demo-GitHub%20Pages-brightgreen?style=for-the-badge&logo=github)](https://hmh-215.github.io/guitar_fretboard_visualization/)

An interactive 22-fret guitar fretboard visualization, interval study, and modal improvisation web application built with vanilla JavaScript using the **MVVM (Model – View – ViewModel)** architectural pattern and **Web Audio API**.

---

## ✨ Key Features

1. **Note & Interval Relationship Visualization (`Note visualization`)**:
   - **Root Note Selector**: Quick-pick any root note (`C` through `B`) across all 6 strings and 22 frets.
   - **2-Note Harmonic Relations**: Audition and visualize fundamental musical intervals in relation to the root:
     - `Only Root`
     - `I - II` (Major Second), `I - bIII` (Minor Third), `I - III` (Major Third)
     - `I - IV` (Perfect Fourth), `I - bV` (Tritone / Flat Fifth), `I - V` (Perfect Fifth)
     - `I - bVI` (Minor Sixth), `I - VI` (Major Sixth), `I - bVII` (Minor Seventh), `I - VII` (Major Seventh)
     - `I - VIII` (Octaves)
   - Distinct color-coded markers for Root and Relation notes with interactive audio auditioning.

2. **Modes & Box Shape Visualization (`Modes visualization`)**:
   - **7 Diatonic Modes**: Ionian (Major), Dorian, Phrygian, Lydian, Mixolydian, Aeolian (Natural Minor), and Locrian.
   - **Interactive Box Shape Windows**:
     - **Standard 4-Fret Box** (`Root -1 to +2`, or `Frets 0 to 3` when anchored at the open nut)
     - **Wide 5-Fret Box** (`Root -1 to +3`)
     - **Left-Shifted Box** (`Root -2 to +1`)
     - **Forward Box** (`Root 0 to +3`)
     - **Full Fretboard** (`Frets 0 to 22`)
   - **Color-Coded Music Theory Roles**:
     - 🟢 **Green**: Root Note (`1st` degree), with highlighted gold border on the anchor root.
     - 🔴 **Red**: Pentatonic Core notes of the mode.
     - 🔵 **Sky Blue**: Diatonic Tritone Pair (modal color / characteristic notes).
   - **▶ Play Box**: Sequentially auditions every note inside the active box shape window from the 6th string to the 1st string.

3. **Multi-Track MIDI Backing Track Accompaniment**:
   - **14 Genre Accompaniment Tracks**: Blues Shuffle, Dorian Smooth, Locrian Jam, Mixolydian Open Life, Bossa Nova, Dorian Funk, Dark Sad Blues Rock, Phrygian Metal, Melodic Rock Ballad, F# Locrian, Jazz Swing 2-5-1, Minor Blues, Rock Pop, and Steve Vai Lydian.
   - **Real-Time Chord & Section Indicators**: Live display of current measure chords and song structure (Verse / Chorus / Head / Solo).
   - **User-Defined Tempo (BPM)**: Real-time tempo adjustment with `-` / `+` increment controls.
   - **3-Tier Resilient Audio Engine**:
     - **Tier 1**: Hardware WAV samples (if locally present).
     - **Tier 2**: Bundled Base64 SoundFont banks (`clean`, `nylon`, `jazz`, `distortion`).
     - **Tier 3**: Pure Web Audio synthesis (distortion wave-shaping, sub-bass oscillators, procedural drum synthesis).

4. **Settings & Customization**:
   - Display options: Note Names vs Scale Degrees, Outside-Box ghost notes visibility.
   - **Quick Tuning Presets**: Standard (`E A D G B E`), Drop D, Eb Standard, Open G, and DADGAD.
   - **Individual String Tuning**: Modal dialog to tune each string independently.
   - Audio mute toggle and fretboard reset.
   - Sharp, modern rectangular aesthetic with zero border-radius.

---

## 🏗️ MVVM Project Structure

```text
guitar_fretboard_visualization/
├── index.html                          # Primary web entry point
├── guitar_fretboard_visualizer.html    # Standalone HTML entry point
├── css/
│   └── styles.css                      # Fretboard styling, strings, frets, box animations
├── soundfonts/                         # Bundled offline guitar soundfonts (Base64)
│   ├── electric_guitar_clean-mp3.js
│   ├── acoustic_guitar_nylon-mp3.js
│   ├── electric_guitar_jazz-mp3.js
│   └── distortion_guitar-mp3.js
├── midi_tracks/                        # 14 standard multi-track MIDI accompaniment files
│   ├── 01_blues_12bar_a7_74bpm.mid
│   ├── 02_dorian_smooth_a_95bpm.mid
│   └── ...
├── src/
│   ├── main.js                         # Application bootstrapper
│   ├── libraries/
│   │   └── midiplayer.js               # Zero-dependency MIDI file event parser
│   ├── models/
│   │   ├── MusicTheoryModel.js         # Modal scales, interval relations, key derivations
│   │   ├── AudioEngineModel.js         # Soundfonts, multi-bus studio mixer, procedural synthesis
│   │   ├── MidiBackingTrackModel.js    # Multi-track MIDI playback coordinator & chord tracker
│   │   └── FretboardStateModel.js      # Observable application state
│   ├── viewmodels/
│   │   └── FretboardViewModel.js       # Presentation logic & commands
│   └── views/
│       ├── HeaderView.js               # Hamburger menu & title
│       ├── FretboardView.js            # 22-fret interactive neck view
│       ├── ConfigPanelsView.js         # Note / Mode / Settings control panels
│       └── TuningModalView.js          # String tuning modal
└── scripts/                            # Development, transcription & validation utilities
    ├── generate_midi_tracks.py
    └── validate_js.py
```

---

## 🚀 Running the Application

The application has **zero build dependencies** and requires no node/npm installations.

To run locally:
```bash
# Using Python built-in HTTP server:
python -m http.server 8080
```
Then navigate to `http://localhost:8080` in your web browser.
It can also be opened directly via `file://` or deployed to GitHub Pages.
