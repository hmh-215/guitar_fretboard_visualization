import sys

files = [
    'src/models/AudioEngineModel.js',
    'src/models/MidiBackingTrackModel.js',
    'src/models/FretboardStateModel.js',
    'src/viewmodels/FretboardViewModel.js',
    'src/views/ConfigPanelsView.js'
]

pairs = {')':'(', '}':'{', ']':'['}

for f in files:
    content = open(f, encoding='utf-8').read()
    stack = []
    in_str = None
    esc = False
    in_comm = False
    in_line_comm = False
    idx = 0
    err = None
    while idx < len(content):
        c = content[idx]
        if in_line_comm:
            if c == '\n': in_line_comm = False
        elif in_comm:
            if c == '*' and idx + 1 < len(content) and content[idx+1] == '/':
                in_comm = False
                idx += 1
        elif in_str:
            if esc: esc = False
            elif c == '\\': esc = True
            elif c == in_str: in_str = None
        else:
            if c == '/' and idx + 1 < len(content) and content[idx+1] == '/':
                in_line_comm = True
                idx += 1
            elif c == '/' and idx + 1 < len(content) and content[idx+1] == '*':
                in_comm = True
                idx += 1
            elif c in ['"', "'", '`']:
                in_str = c
            elif c in '({[':
                stack.append((c, idx))
            elif c in ')}]':
                if not stack or stack[-1][0] != pairs[c]:
                    err = f"Unmatched {c} at index {idx}"
                    break
                stack.pop()
        idx += 1
    if not err and stack:
        err = f"Unclosed {stack[-1]}"
    print(f"{f}: {'OK' if not err else err}")
