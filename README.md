# Guitar Fretboard Visualization (MVVM Architecture)
[![Live Demo](https://img.shields.io/badge/Live%20Demo-GitHub%20Pages-brightgreen?style=for-the-badge&logo=github)](https://hmh-215.github.io/guitar_fretboard_visualization/)

An interactive 22-fret guitar fretboard visualization and memorization web application structured using the **MVVM (Model – View – ViewModel)** pattern.

## ✨ Key Features

1. **Note Visualization (`Note visualization`)**:
   - Quick-pick any of the 12 chromatic notes (`C` through `B`) or click directly on any fret (`0`–`22`) to highlight every position of that note across the entire 22-fret maple neck.
   - Displays total matching positions and plays the corresponding guitar pitch via the Web Audio API synthesizer.

2. **Modes & Box Shape Visualization (`Modes visualization`)**:
   - **7 Diatonic Modes**: Ionian (Major), Dorian, Phrygian, Lydian, Mixolydian, Aeolian (Natural Minor), and Locrian.
   - **Interactive Box Shape Window**:
     - **Standard 4-Fret Box** (`Root -1 to +2`, or `Frets 0 to 3` when anchored at the open nut)
     - **Wide 5-Fret Box** (`Root -1 to +3`)
     - **Left-Shifted Box** (`Root -2 to +1`)
     - **Forward Box** (`Root 0 to +3`)
     - **Full Fretboard** (`Frets 0 to 22`)
   - **Color-Coded Music Theory Roles**:
     - 🟢 **Green (`bg-green-600`)**: Root Note (`1st` degree), with a highlighted ring around the exact clicked root position.
     - 🔴 **Red (`bg-red-600`)**: Pentatonic Core notes of the mode.
     - 🔵 **Sky Blue (`bg-sky-500`)**: Diatonic Tritone Pair (characteristic color notes of the mode).
   - **Display & Audio Options**:
     - Toggle between **Note Names** and **Note + Scale Degree** labels.
     - Show or hide outside-box ghost notes (`25%` opacity).
     - **▶ Play Box**: Audition all notes inside the active box window ascending from the 6th string to the 1st string.

3. **Settings & Custom Guitar Tunings (`Settings`)**:
   - **Quick Tuning Presets**: Standard (`E A D G B E`), Drop D (`D A D G B E`), Eb Standard, Open G (`D G D G B D`), and `DADGAD`.
   - **Individual String Tuning**: Tune each string (`6th` to `1st`) inline or via the dedicated **Guitar String Tuning Modal**.
   - **♯ Sharps / ♭ Flats** accidental display toggle.
   - **Web Audio Sound ON/OFF** toggle and **Board Reset**.

---

## 🏗️ MVVM Project Structure

```text
guitar_neck_visualization/
├── index.html                          # Main View HTML template & script loader
├── guitar_fretboard_visualizer.html    # Original single-file reference version
├── previous_version_backup.zip         # Archived v1 demo files
├── css/
│   └── styles.css                      # Maple fretboard, strings, nut & UI styling
└── src/
    ├── main.js                         # Application bootstrapper (wires M-V-VM)
    ├── models/
    │   ├── MusicTheoryModel.js         # Notes, tunings, 7 modes & pure theory math
    │   ├── AudioEngineModel.js         # Web Audio API guitar tone synthesizer
    │   └── FretboardStateModel.js      # Reactive observable state container
    ├── viewmodels/
    │   └── FretboardViewModel.js       # Presentation logic, computed state & commands
    └── views/
        ├── HeaderView.js               # Top bar & hamburger navigation dropdown view
        ├── FretboardView.js            # 22-fret maple neck, strings & note dots view
        ├── ConfigPanelsView.js         # Bottom configuration panels view
        └── TuningModalView.js          # Pop-up string tuning modal view
```

## 🚀 Running the Application

Because the MVVM modules are attached to the `window.GuitarApp` namespace in dependency order, the app requires **zero build step** and works both:
- By opening `index.html` directly in any modern browser (`file://`), or
- By serving the folder over HTTP (e.g. `python -m http.server 8080` or GitHub Pages).
