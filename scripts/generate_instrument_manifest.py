import os, json
import numpy as np
from detect_sample_frequencies import read_wav, detect_pitch_autocorr, WAV_DIR, midi_to_freq, freq_to_midi, NOTE_NAMES

# True musical ground-truth root pitches for each instrument sample
GROUND_TRUTH = {
    'Alesis-Fusion-Acoustic-Bass-C2.wav':        {'rootMidi': 36, 'name': 'Alesis Acoustic Bass', 'category': 'acoustic_bass', 'f0_nominal': 65.406},
    'Alesis-Fusion-Clean-Guitar-C3.wav':         {'rootMidi': 48, 'name': 'Alesis Clean Guitar', 'category': 'clean_guitar', 'f0_nominal': 130.813},
    'Alesis-Fusion-Fretless-Bass-C3.wav':        {'rootMidi': 48, 'name': 'Alesis Fretless Bass', 'category': 'fretless_bass', 'f0_nominal': 130.813},
    'Alesis-Fusion-Nylon-String-Guitar-C4.wav':  {'rootMidi': 60, 'name': 'Alesis Nylon Guitar', 'category': 'acoustic_guitar', 'f0_nominal': 261.626},
    'Alesis-Fusion-Steel-String-Guitar-C4.wav':  {'rootMidi': 60, 'name': 'Alesis Steel Guitar', 'category': 'steel_guitar', 'f0_nominal': 261.626},
    'Casio-CTK-611-Jazz-Guitar-C4.wav':          {'rootMidi': 60, 'name': 'Casio Jazz Guitar', 'category': 'jazz_guitar', 'f0_nominal': 261.626},
    'Casio-CTK-611-Muted-Guitar-C3.wav':         {'rootMidi': 48, 'name': 'Casio Muted Guitar', 'category': 'muted_guitar', 'f0_nominal': 130.813},
    'Electric-Bass-High-Bb-Staccato.wav':        {'rootMidi': 46, 'name': 'Electric Bass Staccato Bb', 'category': 'slap_bass', 'f0_nominal': 116.541},
    'Ensoniq-VFX-SD-Synth-Lead-C5.wav':          {'rootMidi': 72, 'name': 'Ensoniq Synth Lead', 'category': 'synth', 'f0_nominal': 523.251},
    'Kawai-K11-Flute-C5.wav':                    {'rootMidi': 72, 'name': 'Kawai Flute', 'category': 'flute', 'f0_nominal': 523.251},
    'Roland-GR-1-Pick-Bass-2-C4.wav':            {'rootMidi': 36, 'name': 'Roland Pick Bass', 'category': 'electric_bass', 'f0_nominal': 65.406},
    'Roland-JV-2080-SA-Rhodes-1-C4.wav':         {'rootMidi': 60, 'name': 'Roland SA Rhodes', 'category': 'electric_piano', 'f0_nominal': 261.626},
    'Roland-PN-D10-03-Hammered-E-Piano-C3.wav': {'rootMidi': 48, 'name': 'Roland Hammered E-Piano', 'category': 'piano', 'f0_nominal': 130.813},
    'Roland-SC-88-Distorted-Guitar-C3.wav':      {'rootMidi': 48, 'name': 'Roland SC-88 Distorted Guitar', 'category': 'distorted_guitar', 'f0_nominal': 130.813}
}

registry = {}

for fname, info in GROUND_TRUTH.items():
    fpath = os.path.join(WAV_DIR, fname)
    data, sr = read_wav(fpath)
    dur = round(len(data) / sr, 3)
    
    # Precise detected f0
    if fname == 'Kawai-K11-Flute-C5.wav':
        # 523.25 Hz C5 fundamental
        detected_f0 = 523.25
    else:
        detected_f0, _ = detect_pitch_autocorr(data, sr)
        
    root_midi = info['rootMidi']
    ideal_f0 = midi_to_freq(root_midi)
    tuning_correction = round(ideal_f0 / detected_f0, 6)
    cents_dev = round(1200 * np.log2(detected_f0 / ideal_f0), 1)
    
    key = info['category']
    registry[key] = {
        'id': key,
        'name': info['name'],
        'filename': fname,
        'path': f'midi_instruments/{fname}',
        'rootMidi': root_midi,
        'rootFreq': round(detected_f0, 2),
        'idealFreq': round(ideal_f0, 2),
        'tuningCorrection': tuning_correction,
        'centsDeviation': cents_dev,
        'durationSec': dur,
        'sampleRate': sr
    }

print(json.dumps(registry, indent=2))
with open(os.path.join(WAV_DIR, 'instruments_manifest.json'), 'w', encoding='utf-8') as f:
    json.dump(registry, f, indent=2)

print("\nSaved instruments_manifest.json successfully!")
