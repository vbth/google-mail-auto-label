#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Erzeugt aus den beiden Markdown-Anleitungen je ein PDF.

    python3 tools/build-pdf.py

Ergebnis im Repo-Wurzelverzeichnis:
    bedienungsanleitung.pdf
    claude-scheduled-tasks.pdf

Weg: Markdown -> HTML (mit Druck-CSS) -> Chromium (Playwright) -> PDF.
Der Mermaid-Flowchart wird dabei im Browser zu einer Vektorgrafik gerendert,
landet also als echte Zeichnung im PDF und nicht als Quelltext.

Voraussetzungen:
    pip install markdown playwright
    playwright install chromium      (oder PW_CHROMIUM auf ein vorhandenes
                                      Chromium/Chrome setzen)
Die mermaid-Bibliothek wird beim ersten Lauf einmalig heruntergeladen und
neben dem Skript zwischengespeichert (MERMAID_CACHE).
"""

import html
import io
import os
import re
import sys
import urllib.request

import markdown

TOOLS = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(TOOLS)
MERMAID_URL = "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"
MERMAID_CACHE = os.path.join(TOOLS, ".mermaid.min.js")

# Die beiden Anleitungen. Der zweite Wert steht spaeter in der Fusszeile.
DOCS = [
    ("bedienungsanleitung", "Gmail Auto-Label - Bedienungsanleitung"),
    ("claude-scheduled-tasks", "Gmail-Automation mit Claude"),
]

CSS = """
@page { size: A4; margin: 18mm 18mm 20mm 18mm; }
* { box-sizing: border-box; }
html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body {
  font-family: "Charter", "Bitstream Charter", "Liberation Serif", serif;
  font-size: 10.5pt; line-height: 1.5; color: #16181c; margin: 0;
  hyphens: auto; -webkit-hyphens: auto;
}
h1, h2, h3, h4, .meta, thead th, .toc, code, pre {
  font-family: "Liberation Sans", "DejaVu Sans", Arial, sans-serif;
  hyphens: none; -webkit-hyphens: none;
}
.cover { border-bottom: 2.5pt solid #1f3a5f; padding-bottom: 10pt; margin-bottom: 20pt; }
.cover h1 { font-size: 22pt; line-height: 1.2; margin: 0 0 6pt; color: #1f3a5f; letter-spacing: -0.2pt; }
.cover .meta { font-size: 9pt; color: #5b636e; margin: 0; }
h2 {
  font-size: 13pt; color: #1f3a5f; margin: 20pt 0 6pt; padding-bottom: 3pt;
  border-bottom: 0.6pt solid #c9d3de; break-after: avoid; break-inside: avoid;
}
h3 { font-size: 11pt; color: #24303f; margin: 14pt 0 4pt; break-after: avoid; }
h4 { font-size: 10pt; color: #24303f; margin: 12pt 0 3pt; break-after: avoid; }
p { margin: 0 0 7pt; orphans: 2; widows: 2; }
ul, ol { margin: 0 0 8pt; padding-left: 16pt; }
li { margin-bottom: 3pt; }
li > ul, li > ol { margin-top: 3pt; }
strong { color: #101418; }
a { color: #1f3a5f; text-decoration: none; }
hr { border: 0; border-top: 0.6pt solid #d6dde5; margin: 14pt 0; }
code {
  font-family: "DejaVu Sans Mono", "Liberation Mono", monospace;
  font-size: 8.6pt; background: #eef1f5; padding: 0.5pt 2.5pt;
  border-radius: 2pt; color: #23303f;
}
pre {
  background: #f5f7fa; border: 0.6pt solid #dbe2ea; border-left: 2.5pt solid #1f3a5f;
  border-radius: 2pt; padding: 8pt 10pt; margin: 0 0 10pt;
  font-size: 7.9pt; line-height: 1.42; white-space: pre-wrap; word-break: break-word;
  break-inside: avoid;
}
pre code { background: none; padding: 0; font-size: inherit; }
blockquote {
  margin: 0 0 10pt; padding: 2pt 0 2pt 12pt; border-left: 2.5pt solid #c9d3de; color: #3c4650;
}
table { width: 100%; border-collapse: collapse; margin: 0 0 12pt; font-size: 9pt; line-height: 1.4; }
thead th {
  background: #1f3a5f; color: #fff; text-align: left; font-size: 8.6pt;
  letter-spacing: 0.2pt; padding: 5pt 7pt; border: 0.6pt solid #1f3a5f;
}
td { padding: 5pt 7pt; border: 0.6pt solid #d6dde5; vertical-align: top; }
tbody tr:nth-child(even) td { background: #f6f8fb; }
tr { break-inside: avoid; }
td code { font-size: 8pt; }
.toc { break-after: page; margin-bottom: 4pt; }
.toc h2 { margin-top: 0; }
.toc ol { list-style: none; padding: 0; margin: 0; counter-reset: toc; font-size: 10pt; }
.toc li { counter-increment: toc; margin: 0; padding: 4pt 0; border-bottom: 0.4pt dotted #ccd5df; }
.toc li::before { content: counter(toc) ".  "; color: #7d8894; font-variant-numeric: tabular-nums; }
.mermaid-wrap { break-inside: avoid; margin: 2pt 0 12pt; }
.mermaid { display: block; width: 100%; }
.mermaid svg { width: 100% !important; max-width: none !important; height: auto; }
"""

# Schriftgroesse bewusst gross: das Diagramm ist breiter als die Seite und wird
# beim Einpassen verkleinert - kleinere Werte werden im Druck unleserlich.
MERMAID_INIT = """
mermaid.initialize({
  startOnLoad: false, theme: 'base', securityLevel: 'loose',
  fontFamily: 'Liberation Sans, DejaVu Sans, sans-serif',
  themeVariables: {
    fontSize: '20px', primaryColor: '#eef2f8', primaryTextColor: '#16181c',
    primaryBorderColor: '#1f3a5f', lineColor: '#5b636e', tertiaryColor: '#f5f7fa'
  },
  flowchart: { curve: 'basis', nodeSpacing: 30, rankSpacing: 34, padding: 10, useMaxWidth: true }
});
window.__mermaidDone = false;
mermaid.run({ querySelector: '.mermaid' })
  .then(() => { window.__mermaidDone = true; })
  .catch(e => { console.error(e); window.__mermaidDone = true; });
"""


def mermaid_lib():
    """mermaid.min.js aus dem Cache lesen, beim ersten Lauf herunterladen."""
    if not os.path.exists(MERMAID_CACHE):
        sys.stderr.write("Lade mermaid.min.js ...\n")
        with urllib.request.urlopen(MERMAID_URL) as resp:
            data = resp.read().decode("utf-8")
        io.open(MERMAID_CACHE, "w", encoding="utf-8").write(data)
    return io.open(MERMAID_CACHE, encoding="utf-8").read()


def slug(text):
    s = re.sub(r"[^\w\s-]", "", text.lower(), flags=re.UNICODE)
    return re.sub(r"[\s_]+", "-", s).strip("-")


def build_html(md_path):
    src = io.open(md_path, encoding="utf-8").read()
    lines = src.split("\n")
    title = lines[0].lstrip("# ").strip()

    # Erste nicht leere Zeile unter dem Titel ist die Versionszeile.
    meta = ""
    for line in lines[1:5]:
        if line.strip():
            meta = line.strip()
            break
    body_md = "\n".join(lines[1:])
    if meta:
        body_md = body_md.replace(meta, "", 1)

    # Mermaid-Bloecke herausnehmen, damit der Markdown-Parser sie nicht anfasst.
    blocks = []

    def stash(m):
        blocks.append(m.group(1))
        return "\n\nMERMAIDBLOCK%d\n\n" % (len(blocks) - 1)

    body_md = re.sub(r"```mermaid\n(.*?)```", stash, body_md, flags=re.S)

    md = markdown.Markdown(extensions=["tables", "fenced_code", "sane_lists", "attr_list"])
    body = md.convert(body_md)

    # Anker setzen und daraus das Inhaltsverzeichnis bauen.
    toc = []

    def anchor(m):
        text = re.sub(r"<[^>]+>", "", m.group(1))
        sid = slug(text)
        toc.append((sid, text))
        return '<h2 id="%s">%s</h2>' % (sid, m.group(1))

    body = re.sub(r"<h2>(.*?)</h2>", anchor, body, flags=re.S)

    for i, code in enumerate(blocks):
        body = body.replace(
            "<p>MERMAIDBLOCK%d</p>" % i,
            '<div class="mermaid-wrap"><pre class="mermaid">%s</pre></div>'
            % html.escape(code.strip()),
        )

    toc_html = ""
    if len(toc) >= 4:
        items = "\n".join('<li><a href="#%s">%s</a></li>' % (sid, t) for sid, t in toc)
        toc_html = '<nav class="toc"><h2>Inhalt</h2><ol>%s</ol></nav>' % items

    if blocks:
        scripts = "<script>%s</script><script>%s</script>" % (mermaid_lib(), MERMAID_INIT)
    else:
        scripts = "<script>window.__mermaidDone = true;</script>"

    return """<!doctype html>
<html lang="de"><head><meta charset="utf-8"><title>%s</title><style>%s</style></head>
<body>
<header class="cover"><h1>%s</h1><p class="meta">%s</p></header>
%s
%s
%s
</body></html>""" % (
        html.escape(title),
        CSS,
        html.escape(title),
        html.escape(meta),
        toc_html,
        body,
        scripts,
    )


def render(html_path, pdf_path, footer_title):
    from playwright.sync_api import sync_playwright

    footer = (
        '<div style="width:100%%;font-family:Liberation Sans,sans-serif;font-size:7pt;'
        'color:#7d8894;padding:0 18mm;display:flex;justify-content:space-between;">'
        '<span>%s</span><span>Seite <span class="pageNumber"></span> von '
        '<span class="totalPages"></span></span></div>' % html.escape(footer_title)
    )
    launch = {}
    if os.environ.get("PW_CHROMIUM"):
        launch["executable_path"] = os.environ["PW_CHROMIUM"]
    with sync_playwright() as p:
        browser = p.chromium.launch(args=["--no-sandbox"], **launch)
        page = browser.new_page()
        page.goto("file://" + html_path, wait_until="load")
        page.wait_for_function("window.__mermaidDone === true", timeout=60000)
        page.wait_for_timeout(400)  # letzte Layout-Runde nach dem Zeichnen
        page.pdf(
            path=pdf_path,
            format="A4",
            print_background=True,
            display_header_footer=True,
            header_template='<div style="font-size:1px"></div>',
            footer_template=footer,
            margin={"top": "18mm", "bottom": "20mm", "left": "18mm", "right": "18mm"},
        )
        browser.close()


def main():
    for name, footer_title in DOCS:
        md_path = os.path.join(REPO, name + ".md")
        html_path = os.path.join(TOOLS, ".%s.html" % name)
        pdf_path = os.path.join(REPO, name + ".pdf")
        io.open(html_path, "w", encoding="utf-8").write(build_html(md_path))
        render(html_path, pdf_path, footer_title)
        os.remove(html_path)
        print("%s -> %s" % (os.path.basename(md_path), os.path.basename(pdf_path)))


if __name__ == "__main__":
    main()
