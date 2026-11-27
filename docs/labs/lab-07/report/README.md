# Lab 7 report source (#88)

Markdown → HTML → PDF, same pipeline as the Deliverable 1 report. The PDF embeds the Lab 7 documents and evidence
directly from the repository (`docs/labs/lab-07/`, `docs/evidence/lab-07/`, `docs/evidence/release-v0.2.0/`) and the
diffs/test code straight from git, so it always matches the recorded commits.

| File | Content |
|---|---|
| `part-a.md` … `part-d.md` | Report text per Lab 7 part, with directives `{{include}}`, `{{text}}`, `{{code}}`, `{{diff}}`, `{{fig}}` |
| `build.py` | Builds `build/report.html` and `build/lab7-report.pdf` (two passes for the page numbers in the contents) |
| `render.cjs` | Chromium print to PDF (Playwright) |
| `pages.py` | Finds part/section pages in the first-pass PDF |
| `style.css` | Print style (from the D1 report, plus diff/figure styles) |

```bash
pip install markdown          # once
python3 docs/labs/lab-07/report/build.py
```

Needs Node with `playwright` (Chromium) and poppler (`pdfinfo`, `pdftotext`). Output in `build/` (not committed).
The submitted PDF is uploaded to LEB2 and kept in the team's shared project folder.
