import asyncio
import json
import os
import subprocess
import time
import urllib.request
import websockets

EDGE_PATH = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
PORT = 9444
USER_DATA = r"C:\Users\proto\AppData\Local\Temp\edge_cdp_test"

async def test_suite():
    # Clean previous temp user data if needed
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

        # 2. Query CDP page list
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

            # Navigate to visualizer
            print("Navigating to http://localhost:8080/index.html ...")
            await send_cmd('Page.enable')
            await send_cmd('Page.navigate', {'url': 'http://localhost:8080/index.html'})

            # Wait for bootstrap
            for _ in range(30):
                ready = await eval_js('Boolean(window.GuitarApp && window.GuitarApp.instance && window.GuitarApp.instance.viewModel)')
                if ready:
                    break
                await asyncio.sleep(0.3)

            print("\n--- TEST 1: Initial State & Preset Count ---")
            init_res = await eval_js('''(() => {
                const select = document.getElementById('backing-style-select');
                const badge = document.getElementById('backing-meter-badge');
                const badgeText = document.getElementById('meter-badge-text');
                const menu = document.getElementById('meter-filter-menu');
                const totalPresets = window.GuitarApp.Models.MidiBackingTrackModel.PRESETS.length;
                const options = Array.from(select ? select.querySelectorAll('option') : []).map(o => o.value);
                return {
                    totalPresets,
                    optionsCount: options.length,
                    badgeText: badgeText ? badgeText.textContent.trim() : (badge ? badge.textContent.trim() : null),
                    menuHidden: menu ? menu.classList.contains('hidden') : null
                };
            })()''')
            print("Init State:", init_res)
            assert init_res['totalPresets'] == 25, f"Expected 25 presets in model, got {init_res['totalPresets']}"
            assert init_res['optionsCount'] == 25, f"Expected 25 select options, got {init_res['optionsCount']}"
            assert 'All' in init_res['badgeText'], f"Expected 'All' in badge, got {init_res['badgeText']}"
            assert init_res['menuHidden'] is True, "Expected menu hidden initially"

            print("\n--- TEST 2: Toggle Meter Filter Menu Open and Close ---")
            toggle_res = await eval_js('''(() => {
                const badge = document.getElementById('backing-meter-badge');
                const menu = document.getElementById('meter-filter-menu');
                badge.click();
                const opened = !menu.classList.contains('hidden');
                document.body.click();
                const closed = menu.classList.contains('hidden');
                return { opened, closed };
            })()''')
            print("Toggle menu:", toggle_res)
            assert toggle_res['opened'] is True, "Menu failed to open on badge click"
            assert toggle_res['closed'] is True, "Menu failed to close on outside click"

            print("\n--- TEST 3: Select 3/4 Time Signature Filter ---")
            res_34 = await eval_js('''(() => {
                const badge = document.getElementById('backing-meter-badge');
                badge.click();
                const btn34 = document.querySelector('.meter-filter-opt[data-meter="3/4"]');
                btn34.click();

                const select = document.getElementById('backing-style-select');
                const badgeText = document.getElementById('meter-badge-text');
                const options = Array.from(select.querySelectorAll('option')).map(o => ({ id: o.value, text: o.textContent }));
                const vm = window.GuitarApp.instance.viewModel;

                return {
                    badgeText: badgeText ? badgeText.textContent.trim() : null,
                    count: options.length,
                    options: options.map(o => o.text),
                    activePreset: select.value,
                    activeMode: vm.state.selectedMusicalMode,
                    activeRootIdx: vm.state.clickedRoot ? vm.state.clickedRoot.noteIdx : null
                };
            })()''')
            print("Filter 3/4:", res_34)
            assert res_34['badgeText'] == '3/4'
            assert res_34['count'] == 4, f"Expected 4 tracks for 3/4, got {res_34['count']}"
            assert res_34['activePreset'] == 'acid_jazz_34_dm'
            assert res_34['activeMode'] == 'dorian'
            assert res_34['activeRootIdx'] == 2 # D

            print("\n--- TEST 4: Select 5/4 Time Signature Filter ---")
            res_54 = await eval_js('''(() => {
                const badge = document.getElementById('backing-meter-badge');
                badge.click();
                const btn54 = document.querySelector('.meter-filter-opt[data-meter="5/4"]');
                btn54.click();

                const select = document.getElementById('backing-style-select');
                const badgeText = document.getElementById('meter-badge-text');
                const options = Array.from(select.querySelectorAll('option')).map(o => ({ id: o.value, text: o.textContent }));
                const vm = window.GuitarApp.instance.viewModel;

                return {
                    badgeText: badgeText ? badgeText.textContent.trim() : null,
                    count: options.length,
                    options: options.map(o => o.text),
                    activePreset: select.value,
                    activeMode: vm.state.selectedMusicalMode,
                    activeRootIdx: vm.state.clickedRoot ? vm.state.clickedRoot.noteIdx : null
                };
            })()''')
            print("Filter 5/4:", res_54)
            assert res_54['badgeText'] == '5/4'
            assert res_54['count'] == 2, f"Expected 2 tracks for 5/4, got {res_54['count']}"
            assert res_54['activePreset'] == 'soft_rock_54_em'
            assert res_54['activeMode'] == 'aeolian'
            assert res_54['activeRootIdx'] == 4 # E

            print("\n--- TEST 5: Select 6/8 Time Signature Filter ---")
            res_68 = await eval_js('''(() => {
                const badge = document.getElementById('backing-meter-badge');
                badge.click();
                const btn68 = document.querySelector('.meter-filter-opt[data-meter="6/8"]');
                btn68.click();

                const select = document.getElementById('backing-style-select');
                const badgeText = document.getElementById('meter-badge-text');
                const options = Array.from(select.querySelectorAll('option')).map(o => ({ id: o.value, text: o.textContent }));
                const vm = window.GuitarApp.instance.viewModel;

                return {
                    badgeText: badgeText ? badgeText.textContent.trim() : null,
                    count: options.length,
                    options: options.map(o => o.text),
                    activePreset: select.value,
                    activeMode: vm.state.selectedMusicalMode,
                    activeRootIdx: vm.state.clickedRoot ? vm.state.clickedRoot.noteIdx : null
                };
            })()''')
            print("Filter 6/8:", res_68)
            assert res_68['badgeText'] == '6/8'
            assert res_68['count'] == 2, f"Expected 2 tracks for 6/8, got {res_68['count']}"
            assert res_68['activePreset'] == 'rock_ballad_68_a'
            assert res_68['activeMode'] == 'ionian'
            assert res_68['activeRootIdx'] == 9 # A

            print("\n--- TEST 6: Select 7/8 Time Signature Filter ---")
            res_78 = await eval_js('''(() => {
                const badge = document.getElementById('backing-meter-badge');
                badge.click();
                const btn78 = document.querySelector('.meter-filter-opt[data-meter="7/8"]');
                btn78.click();

                const select = document.getElementById('backing-style-select');
                const badgeText = document.getElementById('meter-badge-text');
                const options = Array.from(select.querySelectorAll('option')).map(o => ({ id: o.value, text: o.textContent }));
                const vm = window.GuitarApp.instance.viewModel;

                return {
                    badgeText: badgeText ? badgeText.textContent.trim() : null,
                    count: options.length,
                    options: options.map(o => o.text),
                    activePreset: select.value,
                    activeMode: vm.state.selectedMusicalMode,
                    activeRootIdx: vm.state.clickedRoot ? vm.state.clickedRoot.noteIdx : null
                };
            })()''')
            print("Filter 7/8:", res_78)
            assert res_78['badgeText'] == '7/8'
            assert res_78['count'] == 3, f"Expected 3 tracks for 7/8, got {res_78['count']}"
            assert res_78['activePreset'] == 'prog_rock_78_am'

            print("\n--- TEST 7: Select 4/4 Time Signature Filter ---")
            res_44 = await eval_js('''(() => {
                const badge = document.getElementById('backing-meter-badge');
                badge.click();
                const btn44 = document.querySelector('.meter-filter-opt[data-meter="4/4"]');
                btn44.click();

                const select = document.getElementById('backing-style-select');
                const badgeText = document.getElementById('meter-badge-text');
                const options = Array.from(select.querySelectorAll('option')).map(o => ({ id: o.value, text: o.textContent }));

                return {
                    badgeText: badgeText ? badgeText.textContent.trim() : null,
                    count: options.length,
                    activePreset: select.value
                };
            })()''')
            print("Filter 4/4:", res_44)
            assert res_44['badgeText'] == '4/4'
            assert res_44['count'] == 14, f"Expected 14 tracks for 4/4, got {res_44['count']}"

            print("\n--- TEST 8: Reset to All Meters Filter ---")
            res_all = await eval_js('''(() => {
                const badge = document.getElementById('backing-meter-badge');
                badge.click();
                const btnAll = document.querySelector('.meter-filter-opt[data-meter="all"]');
                btnAll.click();

                const select = document.getElementById('backing-style-select');
                const badgeText = document.getElementById('meter-badge-text');
                const options = Array.from(select.querySelectorAll('option')).map(o => ({ id: o.value, text: o.textContent }));

                return {
                    badgeText: badgeText ? badgeText.textContent.trim() : null,
                    count: options.length,
                    activePreset: select.value
                };
            })()''')
            print("Filter All:", res_all)
            assert 'All' in res_all['badgeText']
            assert res_all['count'] == 25, f"Expected 25 tracks for All, got {res_all['count']}"

            print("\n--- TEST 9: Test Play Backing Count-in Display for Odd Meter (3/4) ---")
            count_in_test = await eval_js('''(() => {
                const vm = window.GuitarApp.instance.viewModel;
                vm.setBackingStylePreset('acid_jazz_34_dm');
                vm.startBackingTrack();
                const sectionBadge = document.getElementById('backing-section-badge');
                const sectionText = sectionBadge ? sectionBadge.textContent.trim() : '';
                vm.stopBackingTrack();
                return {
                    sectionText,
                    presetBpm: vm.state.backingTrack.bpm
                };
            })()''')
            print("Count-in test:", count_in_test)
            assert 'Count-in: 1 / 3' in count_in_test['sectionText'], f"Expected 'Count-in: 1 / 3', got {count_in_test['sectionText']}"

            print("\n--- TEST 10: Check Parity between index.html and guitar_fretboard_visualizer.html ---")
            with open('index.html', 'rb') as f1, open('guitar_fretboard_visualizer.html', 'rb') as f2:
                b1 = f1.read()
                b2 = f2.read()
            assert b1 == b2, "index.html and guitar_fretboard_visualizer.html must be identical byte-for-byte!"
            print("Parity Check: 100% IDENTICAL (Both files match perfectly).")

            print("\n=======================================================")
            print("ALL 10 TESTS PASSED WITH 100% VERIFIED SUCCESS!")
            print("=======================================================")

    finally:
        proc.terminate()
        try:
            proc.wait(timeout=2)
        except Exception:
            proc.kill()

if __name__ == '__main__':
    asyncio.run(test_suite())
