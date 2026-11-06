import os, urllib.request

DEST_DIR = os.path.join(os.path.dirname(__file__), '..', 'soundfonts')
os.makedirs(DEST_DIR, exist_ok=True)

SOUNDFONTS = [
    'electric_guitar_clean',
    'acoustic_guitar_nylon',
    'electric_guitar_jazz',
]

BASE_URL = 'https://raw.githubusercontent.com/gleitz/midi-js-soundfonts/gh-pages/FluidR3_GM/'

for sf in SOUNDFONTS:
    filename = f'{sf}-mp3.js'
    filepath = os.path.join(DEST_DIR, filename)
    if os.path.exists(filepath) and os.path.getsize(filepath) > 1000000:
        print(f"Already exists: {filename} ({os.path.getsize(filepath)} bytes)")
        continue
    url = BASE_URL + filename
    print(f"Downloading {url}...")
    try:
        urllib.request.urlretrieve(url, filepath)
        print(f"Saved {filepath} ({os.path.getsize(filepath)} bytes)")
    except Exception as e:
        print(f"Error downloading {sf}: {e}")
