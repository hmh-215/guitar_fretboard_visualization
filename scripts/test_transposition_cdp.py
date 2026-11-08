import asyncio
import json
import subprocess
import sys
import urllib.request
import websockets

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

EDGE_PATH = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
PORT = 9445
USER_DATA = r"C:\Users\proto\AppData\Local\Temp\edge_cdp_transposition_test"

async def test_transposition():
    cmd = [
        EDGE_PATH,
        "--headless=new",
        f"--remote-debugging-port={PORT}",
        "--remote-allow-origins=*",
        f"--user-data-dir={USER_DATA}",
        "about:blank"
    ]
    proc = subprocess.Popen(cmd)
    try:
        await asyncio.sleep(2.0)

        with urllib.request.urlopen(f"http://127.0.0.1:{PORT}/json") as resp:
            tabs = json.loads(resp.read().decode('utf-8'))

        target_tab = next((t for t in tabs if t.get('type') == 'page'), None)
        assert target_tab, "No page tab found in Edge CDP!"

        ws_url = target_tab['webSocketDebuggerUrl']
        print(f"Connected to Edge CDP: {ws_url}")

        async with websockets.connect(ws_url) as ws:
            msg_id = 0

            async def send_cmd(method, params=None):
                nonlocal msg_id
                msg_id += 1
                payload = {'id': msg_id, 'method': method, 'params': params or {}}
                await ws.send(json.dumps(payload))
                while True:
                    raw = await ws.recv()
                    data = json.loads(raw)
                    if data.get('id') == msg_id:
                        return data.get('result', {})

            async def eval_js(expr):
                res = await send_cmd('Runtime.evaluate', {
                    'expression': expr,
                    'returnByValue': True,
                    'awaitPromise': True
                })
                if 'exceptionDetails' in res:
                    print("JS Exception:", res['exceptionDetails'])
                return res.get('result', {}).get('value')

            print("Navigating to http://localhost:8080/index.html ...")
            await send_cmd('Network.enable')
            await send_cmd('Network.setCacheDisabled', {'cacheDisabled': True})
            await send_cmd('Page.enable')
            await send_cmd('Page.navigate', {'url': 'http://localhost:8080/index.html'})

            for _ in range(30):
                ready = await eval_js('Boolean(window.GuitarApp && window.GuitarApp.instance && window.GuitarApp.instance.viewModel && document.getElementById("backing-style-select") && document.getElementById("backing-style-select").children.length > 0)')
                if ready:
                    break
                await asyncio.sleep(0.3)

            print("\n--- TEST 1: Select Rock Ballad (6/8) Preset ---")
            setup_res = await eval_js('''(() => {
                const vm = window.GuitarApp.instance.viewModel;
                vm.setBackingMeterFilter('6/8');
                vm.setBackingStylePreset('rock_ballad_68_a');
                const preset = window.GuitarApp.Models.MidiBackingTrackModel.getPresetById('rock_ballad_68_a');
                return {
                    activePreset: vm.state.backingTrack.stylePreset,
                    defaultRootIdx: preset.defaultRootIdx,
                    activeRootIdx: vm.state.clickedRoot ? vm.state.clickedRoot.noteIdx : null,
                    mode: vm.state.selectedMusicalMode
                };
            })()''')
            print("Setup Rock Ballad:", setup_res)
            assert setup_res['activePreset'] == 'rock_ballad_68_a'
            assert setup_res['defaultRootIdx'] == 9 # A
            assert setup_res['activeRootIdx'] == 9 # Initialized to A

            print("\n--- TEST 2: Transposition Math & Notes Simulation with Root = C (0) ---")
            c_res = await eval_js('''(() => {
                const vm = window.GuitarApp.instance.viewModel;
                const model = window.GuitarApp.instance.midiBackingModel;
                const audio = window.GuitarApp.instance.audioModel;
                const preset = window.GuitarApp.Models.MidiBackingTrackModel.getPresetById('rock_ballad_68_a');

                // Switch root to C (noteIdx = 0)
                vm.quickPickModeRoot(0);

                // Intercept audioModel.playAccompanimentNote calls
                const scheduledNotes = [];
                const origPlay = audio.playAccompanimentNote.bind(audio);
                audio.playAccompanimentNote = function(role, inst, pitch, startTime, dur, vel, bus) {
                    scheduledNotes.push({ role, inst, pitch });
                    return origPlay(role, inst, pitch, startTime, dur, vel, bus);
                };

                const drumHits = [];
                const origDrum = audio.scheduleDrumHit.bind(audio);
                audio.scheduleDrumHit = function(type, time, vel) {
                    drumHits.push(type);
                    return origDrum(type, time, vel);
                };

                // Load parsed midi
                return model.loadAndParseMidi('rock_ballad_68_a').then(parsed => {
                    model.songStartTime = audio._ensureContext().currentTime;
                    model.scheduledNoteIndex = 0;

                    const getContextFn = () => ({
                        isEnabled: true,
                        rootNoteIdx: vm.state.clickedRoot.noteIdx, // 0 = C
                        stylePresetId: 'rock_ballad_68_a',
                        bpm: 80
                    });

                    // Trigger scheduler for the first batch of notes
                    model._scheduleMidiStream(audio, getContextFn, () => {});

                    // Restore
                    audio.playAccompanimentNote = origPlay;
                    audio.scheduleDrumHit = origDrum;

                    // Reset reported chord tracking so bar 0 fires
                    model.lastReportedChord = null;
                    model.lastReportedSection = null;
                    model.lastReportedChord = null;
                    model.lastReportedSection = null;
                    let chords = [];
                    model._reportChordAndSection(preset, 0, getContextFn(), (c) => chords.push(c));
                    model._reportChordAndSection(preset, 1, getContextFn(), (c) => chords.push(c));
                    model._reportChordAndSection(preset, 2, getContextFn(), (c) => chords.push(c));
                    model._reportChordAndSection(preset, 3, getContextFn(), (c) => chords.push(c));

                    return {
                        rootIdx: vm.state.clickedRoot.noteIdx,
                        chords: chords,
                        notesCount: scheduledNotes.length,
                        sampleNotes: scheduledNotes.slice(0, 10),
                        drumHitsCount: drumHits.length
                    };
                });
            })()''')
            print("Root C (0) evaluation:", c_res)
            # In C, I V vi IV should be C, G, Am, F
            assert any('C' in c for c in c_res['chords']), f"Expected C chord, got {c_res['chords']}"
            assert any('G' in c for c in c_res['chords']), f"Expected G chord, got {c_res['chords']}"
            assert any('Am' in c for c in c_res['chords']), f"Expected Am chord, got {c_res['chords']}"
            assert any('F' in c for c in c_res['chords']), f"Expected F chord, got {c_res['chords']}"

            # Check bass note in C: Original was A1 (33). Shift is +3 -> C2 (36)
            bass_notes_c = [n['pitch'] for n in c_res['sampleNotes'] if n['role'] == 'bass']
            print("Bass notes in C:", bass_notes_c)
            assert 36 in bass_notes_c, f"Expected transposed bass C2 (36), got {bass_notes_c}"

            print("\n--- TEST 3: Transposition Math & Notes Simulation with Root = D (2) ---")
            d_res = await eval_js('''(() => {
                const vm = window.GuitarApp.instance.viewModel;
                const model = window.GuitarApp.instance.midiBackingModel;
                const audio = window.GuitarApp.instance.audioModel;
                const preset = window.GuitarApp.Models.MidiBackingTrackModel.getPresetById('rock_ballad_68_a');

                // Switch root to D (noteIdx = 2)
                vm.quickPickModeRoot(2);

                const scheduledNotes = [];
                const origPlay = audio.playAccompanimentNote.bind(audio);
                audio.playAccompanimentNote = function(role, inst, pitch, startTime, dur, vel, bus) {
                    scheduledNotes.push({ role, inst, pitch });
                    return origPlay(role, inst, pitch, startTime, dur, vel, bus);
                };

                return model.loadAndParseMidi('rock_ballad_68_a').then(parsed => {
                    model.songStartTime = audio._ensureContext().currentTime;
                    model.scheduledNoteIndex = 0;

                    const getContextFn = () => ({
                        isEnabled: true,
                        rootNoteIdx: vm.state.clickedRoot.noteIdx, // 2 = D
                        stylePresetId: 'rock_ballad_68_a',
                        bpm: 80
                    });

                    model._scheduleMidiStream(audio, getContextFn, () => {});
                    audio.playAccompanimentNote = origPlay;

                    model.lastReportedChord = null;
                    model.lastReportedSection = null;
                    let chords = [];
                    model._reportChordAndSection(preset, 0, getContextFn(), (c) => chords.push(c));
                    model._reportChordAndSection(preset, 1, getContextFn(), (c) => chords.push(c));
                    model._reportChordAndSection(preset, 2, getContextFn(), (c) => chords.push(c));
                    model._reportChordAndSection(preset, 3, getContextFn(), (c) => chords.push(c));

                    return {
                        rootIdx: vm.state.clickedRoot.noteIdx,
                        chords: chords,
                        notesCount: scheduledNotes.length,
                        sampleNotes: scheduledNotes.slice(0, 10)
                    };
                });
            })()''')
            print("Root D (2) evaluation:", d_res)
            # In D, I V vi IV should be D, A, Bm, G
            assert any('D' in c for c in d_res['chords']), f"Expected D chord, got {d_res['chords']}"
            assert any('A' in c for c in d_res['chords']), f"Expected A chord, got {d_res['chords']}"
            assert any('Bm' in c for c in d_res['chords']), f"Expected Bm chord, got {d_res['chords']}"
            assert any('G' in c for c in d_res['chords']), f"Expected G chord, got {d_res['chords']}"

            # Check bass note in D: Original was A1 (33). Shift is +5 -> D2 (38)
            bass_notes_d = [n['pitch'] for n in d_res['sampleNotes'] if n['role'] == 'bass']
            print("Bass notes in D:", bass_notes_d)
            assert 38 in bass_notes_d, f"Expected transposed bass D2 (38), got {bass_notes_d}"

            print("\n--- TEST 4: Live Dynamic Transposition While Playing ---")
            live_res = await eval_js('''(() => {
                const vm = window.GuitarApp.instance.viewModel;
                const model = window.GuitarApp.instance.midiBackingModel;
                const audio = window.GuitarApp.instance.audioModel;

                // Start playing in C and simulate active song loop (past count-in)
                vm.quickPickModeRoot(0);
                vm.startBackingTrack();
                model.isCountingIn = false;
                vm.state.backingTrack.isCountingIn = false;
                vm.state.backingTrack.currentChordLabel = 'C (I)';
                vm.notifyViews();

                const chordBadge = document.getElementById('backing-chord-badge');
                const chordInitial = chordBadge ? chordBadge.textContent.trim() : '';

                // Change root to D mid-flight
                vm.quickPickModeRoot(2);
                const chordTransposed = chordBadge ? chordBadge.textContent.trim() : '';
                vm.stopBackingTrack();

                return {
                    chordInitial,
                    chordTransposed,
                    currentRoot: vm.state.clickedRoot.noteIdx
                };
            })()''')
            print("Live mid-flight transposition:", live_res)
            assert 'D' in live_res['chordTransposed'], f"Expected chord transposed to D, got '{live_res['chordTransposed']}'"

            print("\n=======================================================")
            print("ALL TRANSPOSITION TESTS PASSED WITH 100% SUCCESS!")
            print("=======================================================")

    finally:
        proc.terminate()
        try:
            proc.wait(timeout=2)
        except Exception:
            proc.kill()

if __name__ == '__main__':
    asyncio.run(test_transposition())
