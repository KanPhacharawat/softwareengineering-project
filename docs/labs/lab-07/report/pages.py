"""Find the page of each part and section in the first-pass PDF (used by build.py for the contents table)."""
import json, re, subprocess, sys
OUT, secs = sys.argv[1], json.loads(sys.argv[2])
pdf = OUT + '/lab7-report.pdf'
n = int(re.search(r'Pages:\s+(\d+)', subprocess.check_output(['pdfinfo', pdf], text=True)).group(1))
txt = [subprocess.check_output(['pdftotext', '-f', str(i), '-l', str(i), '-layout', pdf, '-'], text=True) for i in range(1, n + 1)]
start = next(i for i, t in enumerate(txt) if 'END OF CONTENTS' in t) + 1
def find(pred, a):
    for i in range(a, n):
        if pred(txt[i]): return i
    raise SystemExit('not found')
P = {}
for l, ns in secs.items():
    s = find(lambda t: re.search(rf'^\s*Part {l}\. ', t, re.M), start)
    e = find(lambda t: f'END OF PART {l}' in t, s)
    P[l + '_start'], P[l + '_end'] = s + 1, e + 1
    for k in ns:
        P[k] = find(lambda t: re.search(rf'^\s*{re.escape(k)} \S', t, re.M), s) + 1
P['total'] = n
json.dump(P, open(OUT + '/pages.json', 'w'))
print(P)
