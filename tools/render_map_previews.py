"""Render each native SVG for source-to-redraw visual review."""
from pathlib import Path
import re
import xml.etree.ElementTree as ET
import pymupdf as fitz

ROOT=Path(__file__).resolve().parents[1]
# Review PNGs go outside the app folder; they are not runtime map assets.
DEST=ROOT.parents[1]/"work"/"digital-review"
DEST.mkdir(parents=True,exist_ok=True)
for source in (ROOT/"assets"/"wsc"/"digital").glob("*.svg"):
    svg=source.read_text(encoding="utf-8")
    tree=ET.fromstring(svg)
    # Replace CSS-variable colors because this standalone renderer has no app stylesheet.
    colors={"map-space":"#e5eef4","map-space-open":"#e0eeea","map-space-service":"#cbdfe7","map-ink":"#829ba9","map-structure":"#345c72","room-hit":"none","room-number":"#23495f"}
    for element in tree.iter():
        for name in element.get("class","").split():
            if name in colors:
                element.set("fill",colors[name])
        if element.tag.endswith("text"):
            element.set("font-family","Arial")
        if element.tag.endswith("style"):
            element.text=""
    svg=ET.tostring(tree,encoding="unicode")
    # Render a temporary PDF in memory, then save a 2x PNG for visual comparison.
    with fitz.open(stream=svg.encode(),filetype="svg") as vector:
        pdf=vector.convert_to_pdf()
    with fitz.open(stream=pdf,filetype="pdf") as document:
        page=document[0]
        matrix=fitz.Matrix(2,2)
        page.get_pixmap(matrix=matrix,alpha=False).save(DEST/(source.stem+".png"))
    print(source.stem)
