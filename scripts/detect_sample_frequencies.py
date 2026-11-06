import os
import wave
import numpy as np

WAV_DIR = os.path.join(os.path.dirname(__file__), '..', 'midi_instruments')

def note_name_to_midi(name):
    # E.g. C3, Bb, C4
    notes = {'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4,
             'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9,
             'A#': 10, 'Bb': 10, 'B': 11}
    # Parse note and octave
    if name[-1].isdigit():
        octave = int(name[-1])
        note = name[:-1]
    else:
        octave = 3 # default if not specified
        note = name
    return 12 * (octave + 1) + notes[note]

def midi_to_freq(m):
    return 440.0 * (2.0 ** ((m - 69.0) / 12.0))

def freq_to_midi(f):
    if f <= 0: return 0
    return 69.0 + 12.0 * np.log2(f / 440.0)

NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

def midi_to_note_name(m):
    m_round = int(round(m))
    octave = (m_round // 12) - 1
    name = NOTE_NAMES[m_round % 12]
    cents = int(round((m - m_round) * 100))
    cents_str = f"{cents:+d}c" if cents != 0 else "0c"
    return f"{name}{octave} ({cents_str})"

def read_wav(filepath):
    with wave.open(filepath, 'rb') as wf:
        n_channels = wf.getnchannels()
        sampwidth = wf.getsampwidth()
        framerate = wf.getframerate()
        n_frames = wf.getnframes()
        raw = wf.readframes(n_frames)
        
        if sampwidth == 2:
            data = np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768.0
        elif sampwidth == 3:
            # 24-bit
            a = np.frombuffer(raw, dtype=np.uint8)
            b = np.zeros(n_frames * n_channels, dtype=np.int32)
            b = (a[0::3].astype(np.int32) << 8) | (a[1::3].astype(np.int32) << 16) | (a[2::3].astype(np.int32) << 24)
            data = (b.astype(np.float32) / (2**31))
        elif sampwidth == 4:
            data = np.frombuffer(raw, dtype=np.int32).astype(np.float32) / 2147483648.0
        else:
            raise ValueError(f"Unsupported sampwidth {sampwidth}")
            
        if n_channels > 1:
            data = data.reshape(-1, n_channels).mean(axis=1) # Mono mix
            
        return data, framerate

def detect_pitch_autocorr(signal, sr, min_f=30, max_f=2000):
    # Skip attack transient (first 50ms) to analyze steady state sustain
    start_sample = int(sr * 0.08)
    # Take a 0.5s analysis window
    window_len = int(sr * 0.5)
    if len(signal) < start_sample + window_len:
        start_sample = 0
        window_len = min(len(signal), int(sr * 0.5))
        
    segment = signal[start_sample : start_sample + window_len]
    if len(segment) == 0:
        return 0, 0
        
    # Subtract DC offset & apply Hann window
    segment = segment - np.mean(segment)
    window = np.hanning(len(segment))
    segment = segment * window
    
    # Normalized autocorrelation via FFT
    n = len(segment)
    n_fft = 2 ** int(np.ceil(np.log2(2 * n - 1)))
    fx = np.fft.rfft(segment, n_fft)
    r = np.fft.irfft(fx * np.conj(fx))[:n]
    if r[0] == 0:
        return 0, 0
    r = r / r[0]
    
    # Search for peak between min_f and max_f
    min_lag = int(sr / max_f)
    max_lag = int(sr / min_f)
    max_lag = min(max_lag, len(r) - 2)
    
    if min_lag >= max_lag:
        return 0, 0
        
    search_r = r[min_lag:max_lag]
    peak_idx = np.argmax(search_r) + min_lag
    
    # Parabolic interpolation for sub-sample accuracy
    if 0 < peak_idx < len(r) - 1:
        alpha = r[peak_idx - 1]
        beta = r[peak_idx]
        gamma = r[peak_idx + 1]
        denom = 2 * (2 * beta - alpha - gamma)
        if denom != 0:
            delta = (alpha - gamma) / denom
            refined_lag = peak_idx + delta
        else:
            refined_lag = peak_idx
    else:
        refined_lag = peak_idx
        
    f0 = sr / refined_lag
    confidence = r[peak_idx]
    return f0, confidence

def main():
    wav_files = sorted([f for f in os.listdir(WAV_DIR) if f.endswith('.wav')])
    print(f"Analyzing {len(wav_files)} WAV files in {WAV_DIR}...\n")
    print(f"{'Filename':<46} | {'SR':<5} | {'Dur(s)':<6} | {'Detected f0':<11} | {'Detected Note':<16} | {'Conf':<5}")
    print("-" * 105)
    
    results = []
    for fname in wav_files:
        fpath = os.path.join(WAV_DIR, fname)
        data, sr = read_wav(fpath)
        dur = len(data) / sr
        f0, conf = detect_pitch_autocorr(data, sr)
        midi_val = freq_to_midi(f0)
        note_str = midi_to_note_name(midi_val)
        
        print(f"{fname:<46} | {sr:<5} | {dur:<6.2f} | {f0:<8.2f} Hz | {note_str:<16} | {conf:<5.2f}")
        results.append({
            'filename': fname,
            'sr': sr,
            'duration': dur,
            'f0': f0,
            'midi': midi_val,
            'midi_int': int(round(midi_val)),
            'note_name': note_str,
            'confidence': conf
        })

if __name__ == '__main__':
    main()
