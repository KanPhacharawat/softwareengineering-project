"""Build the Lab 7 report (Markdown -> HTML -> PDF), same pipeline as the Deliverable 1 report.

Run from anywhere inside the repo:  python3 docs/labs/lab-07/report/build.py
Needs: python `markdown`, Node with `playwright` (Chromium), poppler (`pdfinfo`, `pdftotext`).
Two passes: the first PDF is used to find page numbers for the contents table, the second PDF uses them.
"""
import html, json, os, re, subprocess, sys
import markdown

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = subprocess.check_output(['git', 'rev-parse', '--show-toplevel'], cwd=HERE, text=True).strip()
OUT = os.path.join(HERE, 'build')
os.makedirs(OUT, exist_ok=True)

PARTS = [
    ('A', 'Change impact and updated contract', 'part-a.md', 'L7-A01..L7-A05'),
    ('B', 'Implementation and regression-safe delivery', 'part-b.md', 'L7-B01..L7-B09, L7-DEP-01..07'),
    ('C', 'Objective engineering metrics', 'part-c.md', 'M-01..M-05'),
    ('D', 'Release readiness, retrospective, contributions, AI use, limitations', 'part-d.md', 'L7-D01, L7-D02, D-1..D-6'),
]
EVIDENCE = [
    ('L7-A01', 'Approved change request CR-01 (old/new BR-06, boundaries, baselines, approval)', 'A.1'),
    ('L7-A02', 'Impact table, callers, persistence, unchanged behavior and protecting tests', 'A.2'),
    ('L7-A03', 'Revised SRS / F-03 / F-04 / System SDS / STS (old and new text)', 'A.3'),
    ('L7-A04', 'Teammate review of the request and contract (PR #90, #91)', 'A.4'),
    ('L7-A05', 'Recorded sequence: contract before code', 'A.5'),
    ('L7-B01', 'New tests: setup and assertions', 'B.1'),
    ('L7-B02', 'TDD red output on the pre-change implementation', 'B.2'),
    ('L7-B03', 'Implementation diff incl. migration', 'B.3'),
    ('L7-B04', 'TDD green output', 'B.4'),
    ('L7-B05 / B06', 'Regression runs; revised old tests', 'B.5'),
    ('L7-D02', 'Release-candidate test output with tool versions', 'B.5'),
    ('L7-B07', 'Issue/PR review, CI, staging integration', 'B.6'),
    ('L7-B08', 'Main release, CI, deploy, migration, revision', 'B.7'),
    ('L7-DEP-01..07', 'Post-deploy checks of changed and preserved behavior', 'B.8'),
    ('L7-B09', 'Version table', 'B.9'),
    ('M-01..M-05', 'Five metrics with embedded sources and interpretation', 'C.1'),
    ('L7-D01, D-1..D-6', 'Readiness checklist, defects, debt, READY decision, retrospective', 'D.1'),
]

final = '--final' in sys.argv
pages = json.load(open(os.path.join(OUT, 'pages.json'))) if final else {}
pg = lambda k: pages.get(k, '?')

def git(*args):
    return subprocess.check_output(['git', *args], cwd=ROOT, text=True)

def strip_links(h):
    # relative links -> plain text (the TA reads the PDF, not the repo tree)
    return re.sub(r'<a href="(?!https?:)[^"]*">(.*?)</a>', r'\1', h, flags=re.S)

def md_html(text, shift=0):
    out = markdown.markdown(text, extensions=['tables', 'fenced_code', 'sane_lists'])
    if shift:
        for n in range(6 - shift, 0, -1):
            out = re.sub(rf'<(/?)h{n}([ >])', rf'<\1h{n + shift}\2', out)
    return strip_links(out)

def rng(spec, n):
    keep = set()
    for part in spec.split(','):
        a, _, b = part.partition('-')
        keep.update(range(int(a), int(b or a) + 1))
    return [i for i in range(1, n + 1) if i in keep]

def read_lines(text, spec):
    lines = text.splitlines()
    if not spec:
        return text.rstrip('\n'), None
    idx = rng(spec, len(lines))
    out, prev = [], None
    for i in idx:
        if prev is not None and i != prev + 1:
            out.append('[...]')
        out.append(lines[i - 1]); prev = i
    return '\n'.join(out), spec

def pre(text, label):
    return f'<div class="src">{html.escape(label)}</div><pre><code>{html.escape(text)}</code></pre>'

def d_include(arg):
    path, _, opt = arg.partition('|')
    text = open(os.path.join(ROOT, path)).read()
    if opt.startswith('section='):
        n = opt.split('=')[1]
        m = re.search(rf'^## {n}\..*?(?=^## |\Z)', text, flags=re.M | re.S)
        text = m.group(0)
    body = md_html(text, shift=2)
    return f'<section class="doc"><div class="src">Embedded: {html.escape(path)} (at {HEAD})</div>{body}</section>'

def d_text(arg):
    path, _, spec = arg.partition('|')
    text, s = read_lines(open(os.path.join(ROOT, path)).read(), spec)
    return pre(text, f'{path}' + (f' (lines {s})' if s else ''))

def d_code(arg):
    ref, _, spec = arg.partition('|')
    text, s = read_lines(git('show', ref), spec)
    return pre(text, f'{ref}' + (f' (lines {s})' if s else ''))

def d_diff(arg):
    a, b, _, *paths = arg.split()
    raw = git('diff', '--no-color', a, b, '--', *paths)
    rows = []
    for line in raw.splitlines():
        if line.startswith(('index ', 'new file mode')):
            continue
        cls = 'dh' if line.startswith(('diff --git', '+++', '---')) else 'ds' if line.startswith('@@') else \
              'da' if line.startswith('+') else 'dd' if line.startswith('-') else ''
        rows.append(f'<span class="{cls}">{html.escape(line) or " "}</span>')
    label = f'git diff {a} {b} -- {" ".join(paths)}'
    return f'<div class="src">{html.escape(label)}</div><pre class="diff">' + ''.join(rows) + '</pre>'

def d_fig(arg):
    path, _, cap = arg.partition('|')
    return f'<figure class="fig"><img src="file://{ROOT}/{path}"><figcaption>{html.escape(cap)}</figcaption></figure>'

DIRECTIVES = {'include': d_include, 'text': d_text, 'code': d_code, 'diff': d_diff, 'fig': d_fig}

def render_part(text):
    blocks = []
    def stash(m):
        blocks.append(DIRECTIVES[m.group(1)](m.group(2).strip()))
        return f'\n\nRAWBLOCK{len(blocks) - 1}\n\n'
    text = re.sub(r'\{\{(\w+) (.*?)\}\}', stash, text)
    out = md_html(text)
    for i, b in enumerate(blocks):
        out = out.replace(f'<p>RAWBLOCK{i}</p>', b)
    return out

HEAD = git('rev-parse', '--short', 'HEAD').strip()
sections = {l: re.findall(r'^## ([A-D]\.\d+) (.+)$', open(os.path.join(HERE, f)).read(), flags=re.M) for l, _, f, _ in PARTS}

def prange(l):
    a, b = pg(l + '_start'), pg(l + '_end')
    return f'{a}–{b}' if a != b else f'{a}'

nav = ''.join(f'<tr><td><b>Part {l}</b></td><td>{t}</td><td class="num">{prange(l)}</td><td>{ids}</td></tr>' for l, t, _, ids in PARTS)
toc = ''.join(f'<tr><td>{n} {html.escape(t)}</td><td class="num">{pg(n)}</td></tr>' for l, *_ in PARTS for n, t in sections[l])
ev = ''.join(f'<tr><td>{i}</td><td>{html.escape(w)}</td><td>{s}</td><td class="num">{pg(s)}</td></tr>' for i, w, s in EVIDENCE)

cover = f'''
<div class="cover">
<div class="kicker">CPE334 Software Engineering · Lab 7 · Semester 1/2026</div>
<h1 class="title">Lab 7: Software maintenance metrics and release readiness<br><span>CR-01 · BR-06 v2: 24-hour late submission grace window</span></h1>
<table class="meta">
<tr><th>Product / theme</th><td>Course Project Management System (CPMS), Theme 6. Supervisors set milestones for the teams they supervise, teams submit work, supervisors give feedback.</td></tr>
<tr><th>Student A</th><td>Phacharawat Eakgawatphokhin · ID 67070503426 · GitHub KanPhacharawat</td></tr>
<tr><th>Student B</th><td>Chaiyaphoom Chenchirotphiphat · ID 67070503410 · GitHub maneejames</td></tr>
<tr><th>Repository</th><td>https://github.com/KanPhacharawat/softwareengineering-project</td></tr>
<tr><th>Accepted Sprint 1 baseline</th><td>tag <code>v0.1.0</code> → <code>3da07d0</code> (accepted in Lab 6 UAT as <code>main</code> <code>a11fdc0</code>, revision <code>cpms-00006-xfg</code>)</td></tr>
<tr><th>Pre-change commit</th><td><code>staging</code> <code>492957a</code> (contract merged; last commit before the TDD red commit <code>081f8a6</code>)</td></tr>
<tr><th>Submitted main release</th><td>tag <code>v0.2.0</code> → <code>main</code> <code>4b4b7e058a70ca0c8b25d8b8c4b9ea0a519232e1</code> (PR #96)</td></tr>
<tr><th>Deployed URL / version</th><td>https://cpms-wpsgfzameq-as.a.run.app · Cloud Run revision <code>cpms-00007-7sf</code> · image <code>cpms:4b4b7e0…</code></td></tr>
<tr><th>Change</th><td>Version 1 of a submission may be saved until due + 24 h (exclusive) and is recorded as late (<code>lateAt</code>); a milestone with no submission is <code>MISSED</code> only after that. Issues #82–#88.</td></tr>
<tr><th>Report</th><td>2026-11-27 · built from commit <code>{HEAD}</code> · all data synthetic</td></tr>
</table>
<h2 class="navh">Contents</h2>
<table class="nav"><thead><tr><th>Part</th><th>Content</th><th>Pages</th><th>Evidence IDs</th></tr></thead><tbody>{nav}</tbody></table>
</div>
<div class="toc">
<h2 class="navh">Sections</h2>
<table class="nav">{toc}</table>
<h2 class="navh">Evidence index</h2>
<table class="nav"><thead><tr><th>Evidence ID</th><th>What it shows</th><th>Section</th><th>Page</th></tr></thead><tbody>{ev}</tbody></table>
<p class="note">Times are Bangkok time (UTC+7) unless marked UTC. Raw logs keep their original UTC timestamps. Screenshot captions give action, expected and actual result, time and deployed revision.</p>
<div class="endmark">END OF CONTENTS</div>
</div>
'''

body = cover
for l, t, f, _ in PARTS:
    body += f'<div class="part"><h1 class="parth">Part {l}. {t}</h1>{render_part(open(os.path.join(HERE, f)).read())}'
    body += f'<div class="endmark">END OF PART {l}</div></div>'

css = open(os.path.join(HERE, 'style.css')).read()
page = f'<!doctype html><html><head><meta charset="utf-8"><title>CPMS Lab 7 report</title><style>{css}</style></head><body>{body}</body></html>'
open(os.path.join(OUT, 'report.html'), 'w').write(page)
subprocess.check_call(['node', os.path.join(HERE, 'render.cjs'), OUT], cwd=HERE)
if not final:
    subprocess.check_call([sys.executable, os.path.join(HERE, 'pages.py'), OUT, json.dumps({l: [n for n, _ in s] for l, s in sections.items()})])
    subprocess.check_call([sys.executable, __file__, '--final'])
else:
    print('PDF:', os.path.join(OUT, 'lab7-report.pdf'))
