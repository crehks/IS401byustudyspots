"""Build themed, editable SVG maps from the supplied Wilk CAD PDFs.

Geometry is read from the PDF drawing operators, in page coordinates. Text is
extracted separately and rebuilt as SVG text. The ink union is polygonized at
six samples per PDF point to merge the very dense CAD hatch lines into clean
wall shapes. There are no raster images in the generated maps.
"""
from pathlib import Path
import sys
import json
import re
from io import BytesIO
from collections import defaultdict
from html import escape

import pymupdf as fitz
import cv2
import numpy as np
from pypdf import PdfWriter
from pypdf.generic import ContentStream

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets" / "wsc"
DEST = SOURCE / "digital"
SCALE = 6

# Crop regions were chosen after reviewing every supplied drawing. They remove
# the publishing blocks and locator silhouettes, while retaining floor geometry.
PLANS = {
    "1E": {"file":"wsc-1s", "label":"Floor 1 East", "crop":[48,22,900,780], "north":0,
           "service":["1400","1404","1406","1177","1183","1187","1200","1311","1313","1314","1315","1599","1602"],
           "review":"Dense north office clusters (1500-1599), east room 1010, central 1030 cluster, room 1179 and bowling lanes, south 1231/1287 clusters."},
    "1W": {"file":"wsc-1ws", "label":"Floor 1 West", "crop":[158,48,1065,754], "north":0,
           "clip":[[158,48],[780,48],[780,547],[1065,547],[1065,754],[158,754]],
           "service":["1901","1945","1945A","1945B","1947A","1947B","1961","1963","1965","1295"],
           "review":"Large west room 1900 and central stair 1901, 1910/1920 north cluster, 1930/1940 middle corridors, 1950 east open area, south 1974 suites."},
    "2E": {"file":"wsc-2s", "label":"Floor 2 East", "crop":[20,15,842,770], "north":0,
           "clip":[[20,15],[842,15],[842,550],[818,550],[818,640],[800,640],[800,770],[20,770]],
           "service":["2604","2610","2612","2624","2626","2002","2060","2080A","2080B","2082","2084","2086","2200","2202","2204","2206","2246","2266","2268","2196","2199","2120"],
           "review":"North rooms 2400/2500, open west 2620/2690 areas, seated auditorium 2034, central 2050, southeast partitioned 2130, diagonal south office core and 2170/2181 cluster."},
    "2W": {"file":"wsc-2ws", "label":"Floor 2 West", "crop":[254,30,839,757], "north":0,
           "service":["2901","2902","2903","2904","2905","2906","2907","2921","2921A","2923","2924","2971","2972","2977"],
           "review":"Large room 2900, north 2910-2940 rooms, central 2920/2930 core, stairs 2901/2902, east 2945-2969 rooms, southwest 2980 and 2981 subrooms."},
    "3E": {"file":"wsc-3s", "label":"Floor 3 East", "crop":[68,18,892,770], "north":0,
           "clip":[[68,18],[892,18],[892,636],[492,636],[492,770],[68,770]],
           "service":["3610","3394","3362","3364","3366","3204","3212","3208","3243A","3243C","3249","3255","3256","3257","3258B","3229","3180"],
           "review":"North 3400 office area, seated room 3380, auditorium void above 3024, central open-to-below space, southwest 3220/3222/3224 suites, southeast 3280, south 3250/3252."},
    "3W": {"file":"wsc-3ws", "label":"Floor 3 West", "crop":[252,27,833,746], "north":0,
           "service":["3901","3903","3904","3905","3906","3907","3908","3984","3985","3984A","3980A","3980B"],
           "review":"Main west 3900 area with stair 3901, north 3951B/C and east curved 3951F/G suite, southeast 3970/3971/3972, south 3980 corridor and 3981-3998 rooms."},
    "4E": {"file":"wsc-4s", "label":"Floor 4", "crop":[110,85,1100,553], "north":-65,
           "service":["4402","4404","4406","4406A","4407","4409","4424","4426","4492","4499"],
           "review":"Long west corridor 4490 and stair 4499, east office block around 4460/4400, north 4454-4427, south 4436-4430, paired vertical-service cores, detached room 4496."},
    "5E": {"file":"wsc-5s", "label":"Floor 5", "crop":[96,127,1058,631], "north":-65,
           "service":["5526","5552","5554","5556","5558","5560"],
           "review":"West 5531/5519 open rooms, north 5539/5541/5543/5545/5547 offices, corridor 5512, east stair 5552 and elevators 5554/5556, south 5522/5520, southwest stair 5526."},
    "6E": {"file":"wsc-6s", "label":"Floor 6", "crop":[112,116,1078,620], "north":-65,
           "service":["6602","6604","6605","6606","6606A","6608","6624","6630","6699"],
           "review":"West open room 6680 with curved 6601 feature, north 6640/6644 and 6650, east 6652/6654, stair and spiral core 6606/6608, elevators 6602/6604, southeast 6614 and restrooms."},
}


def fmt(v):
    return str(round(float(v), 2)).rstrip("0").rstrip(".") if float(v) else "0"


def make_ink(page, spec):
    x0,y0,x1,y1 = spec["crop"]
    w,h = x1-x0,y1-y0
    # Remove only text-showing operators in an in-memory copy. Retain all CAD
    # clipping paths, graphics state, curves, and white cutouts exactly as in
    # the original PDF. Some SVG exporters lose compound CAD clipping rules.
    writer=PdfWriter(clone_from=BytesIO(page.parent.tobytes()))
    seen=set()
    def clean_forms(resources):
        if not resources or "/XObject" not in resources:
            return
        xobjects=resources["/XObject"]
        for name,ref in list(xobjects.items()):
            obj=ref.get_object()
            if obj.get("/Subtype")!="/Form" or id(obj) in seen:
                continue
            seen.add(id(obj))
            clean_forms(obj.get("/Resources"))
            content=ContentStream(obj,writer)
            content.operations=[(args,op) for args,op in content.operations if op not in (b"Tj",b"TJ",b"'",b'"')]
            for k,v in obj.items():
                if k not in ("/Length","/Filter","/DecodeParms"):
                    content[k]=v
            xobjects[name]=writer._add_object(content)
    for drawing_page in writer.pages:
        clean_forms(drawing_page.get("/Resources"))
        content=ContentStream(drawing_page.get_contents(),writer)
        content.operations=[(args,op) for args,op in content.operations if op not in (b"Tj",b"TJ",b"'",b'"')]
        drawing_page.replace_contents(content)
    memory=BytesIO();writer.write(memory)
    with fitz.open(stream=memory.getvalue(),filetype="pdf") as geometry:
        pixmap=geometry[0].get_pixmap(matrix=fitz.Matrix(SCALE,SCALE),clip=fitz.Rect(x0,y0,x1,y1),colorspace=fitz.csGRAY,alpha=False)
        gray=np.frombuffer(pixmap.samples,np.uint8).reshape(pixmap.height,pixmap.width)
        ink=np.uint8(gray<242)*255
    radius=round(.3*SCALE)
    core=cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(2*radius+1,2*radius+1))
    heavy=cv2.morphologyEx(ink,cv2.MORPH_OPEN,core)
    region = np.ones_like(ink) * 255
    if "clip" in spec:
        region[:] = 0
        polygon = np.array([[(x-x0)*SCALE,(y-y0)*SCALE] for x,y in spec["clip"]],np.int32)
        cv2.fillPoly(region,[polygon],255)
    return cv2.bitwise_and(ink,region),cv2.bitwise_and(heavy,region),region


def polygon_path(mask, epsilon=.06, minimum_area=.025):
    contours,hierarchy = cv2.findContours(mask,cv2.RETR_TREE,cv2.CHAIN_APPROX_SIMPLE)
    result=[]
    for c in contours:
        if cv2.contourArea(c)/(SCALE*SCALE)<minimum_area:
            continue
        pts=cv2.approxPolyDP(c,epsilon*SCALE,True).reshape(-1,2)/SCALE
        if len(pts)<3:
            continue
        result.append("M"+"L".join(f"{fmt(x)} {fmt(y)}" for x,y in pts)+"Z")
    return "".join(result)


def get_labels(page,spec):
    x0,y0,x1,y1=spec["crop"]
    labels=[]
    for block in page.get_text("rawdict")["blocks"]:
        if block["type"]!=0:
            continue
        for line in block["lines"]:
            for span in line["spans"]:
                text="".join(c["c"] for c in span["chars"])
                matches=list(re.finditer(r"[1-6]\d{3}[A-Za-z]{0,2}|M1000",text))
                if not matches or "".join(m.group() for m in matches)!=re.sub(r"\s+","",text):
                    continue
                for match in matches:
                    rect=fitz.Rect(span["chars"][match.start()]["bbox"])
                    for char in span["chars"][match.start()+1:match.end()]:
                        rect|=fitz.Rect(char["bbox"])
                    rect*=page.rotation_matrix
                    cx,cy=(rect.x0+rect.x1)/2,(rect.y0+rect.y1)/2
                    if not (x0<cx<x1 and y0<cy<y1):
                        continue
                    if "clip" in spec and cv2.pointPolygonTest(np.array(spec["clip"],np.float32),(cx,cy),False)<0:
                        continue
                    # Character coordinates separate adjacent room numbers that
                    # the CAD PDF stored in a combined text span.
                    labels.append({"number":match.group().upper(),"display":match.group(),"x":round(cx-x0,2),"y":round(cy-y0,2),
                                   "size":round(float(span["size"]),2),
                                   "vertical":rect.height>rect.width*1.6})
    return labels


def make_spaces(ink,labels,spec):
    # Close door-width gaps for floor tinting. Source wall/door geometry above
    # remains untouched. These are presentation regions, not navigation data.
    radius=round(2.5*SCALE)
    kernel=cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(2*radius+1,2*radius+1))
    blocked=cv2.dilate(ink,kernel)
    count,components,stats,_=cv2.connectedComponentsWithStats(255-blocked,8)
    by_region=defaultdict(list)
    for label in labels:
        px,py=round(label["x"]*SCALE),round(label["y"]*SCALE)
        px=max(0,min(components.shape[1]-1,px));py=max(0,min(components.shape[0]-1,py))
        region=int(components[py,px])
        if not region:
            candidates=[]
            for dy in range(-radius*2,radius*2+1,3):
                for dx in range(-radius*2,radius*2+1,3):
                    xx,yy=px+dx,py+dy
                    if 0<=xx<components.shape[1] and 0<=yy<components.shape[0] and components[yy,xx]:
                        candidates.append((dx*dx+dy*dy,int(components[yy,xx])))
            if candidates:
                region=min(candidates)[1]
        label["region"]=region
        if region:
            by_region[region].append(label)
    spaces=[]
    for rid,room_labels in by_region.items():
        area=stats[rid,cv2.CC_STAT_AREA]/(SCALE*SCALE)
        if area<14 or area>components.size/(SCALE*SCALE)*.48:
            continue
        x,y,w,h=stats[rid,:4]
        # An exterior flood region must never become a colored indoor area.
        if x==0 or y==0 or x+w>=components.shape[1] or y+h>=components.shape[0]:
            continue
        pad=radius+2
        lx,ly=max(0,x-pad),max(0,y-pad)
        rx,ry=min(components.shape[1],x+w+pad),min(components.shape[0],y+h+pad)
        selected=np.uint8(components[ly:ry,lx:rx]==rid)*255
        expanded=cv2.dilate(selected,kernel)
        expanded=cv2.morphologyEx(expanded,cv2.MORPH_CLOSE,kernel)
        contours,_=cv2.findContours(expanded,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE)
        chunks=[]
        for c in contours:
            pts=cv2.approxPolyDP(c,.7*SCALE,True).reshape(-1,2)
            pts=(pts+np.array([lx,ly]))/SCALE
            chunks.append("M"+"L".join(f"{fmt(xx)} {fmt(yy)}" for xx,yy in pts)+"Z")
        numbers=sorted(set(l["number"] for l in room_labels))
        category="service" if all(n in spec["service"] for n in numbers) else "open" if area>2400 or len(numbers)>2 else "room"
        spaces.append({"d":"".join(chunks),"rooms":numbers,"kind":category,"area":round(area,1)})
    return spaces


def build_plan(key,spec):
    with fitz.open(SOURCE/(spec["file"]+".pdf")) as document:
        page=document[0]
        labels=get_labels(page,spec)
        ink,heavy,region=make_ink(page,spec)
    labels.sort(key=lambda l:(l["y"],l["x"]))
    spaces=make_spaces(ink,labels,spec)
    walls=polygon_path(ink)
    structure=polygon_path(heavy)
    width=spec["crop"][2]-spec["crop"][0]
    height=spec["crop"][3]-spec["crop"][1]
    number_counts=defaultdict(int)
    rooms=[]
    for label in labels:
        n=label["number"]
        number_counts[n]+=1
        label["key"]=n if number_counts[n]==1 else f"{n}-{number_counts[n]}"
        matching=next((s for s in spaces if n in s["rooms"]),None)
        if number_counts[n]==1:
            rooms.append({"number":n,"x":label["x"],"y":label["y"],"kind":matching["kind"] if matching else "room"})
    parts=[f'<svg xmlns="http://www.w3.org/2000/svg" class="digital-floor-svg" viewBox="0 0 {width} {height}" role="group" aria-label="Digitized Wilkinson Student Center {escape(spec["label"])}">',
           f'<title>Wilkinson Student Center - {escape(spec["label"])}</title>',
           '<desc>Walls, doors, stairs, and room numbers digitized from the supplied BYU floor drawing. Select a numbered room to locate it.</desc>',
           '<style>.map-space{fill:var(--map-room,#e5eef4)}.map-space-open{fill:var(--map-open,#e0eeea)}.map-space-service{fill:var(--map-service,#cbdfe7)}.map-ink{fill:var(--map-ink,#829ba9)}.map-structure{fill:var(--map-structure,#345c72)}.room-hit{fill:transparent}.room-number{fill:var(--map-text,#23495f);font-family:Arial,Helvetica,sans-serif;font-weight:600}</style>',
           '<g class="map-spaces">']
    for space in spaces:
        interactive=f' data-room="{space["rooms"][0]}"' if len(space["rooms"])==1 else ''
        parts.append(f'<path class="map-space map-space-{space["kind"]}" d="{space["d"]}"{interactive}><title>{escape(", ".join(space["rooms"]))}</title></path>')
    parts += ['</g>',f'<path class="map-ink" d="{walls}" fill-rule="evenodd" pointer-events="none"/>',
              f'<path class="map-structure" d="{structure}" fill-rule="evenodd" pointer-events="none"/>','<g class="map-room-labels">']
    for label in labels:
        n=label["number"]
        size=max(5.5,min(7.4,label["size"]*.98))
        angle=-90 if label["vertical"] else 0
        hit_width=max(18,len(n)*4.5)
        hit_height=15
        if angle:
            hit_width,hit_height=hit_height,hit_width
        parts.append(f'<g class="map-room" data-room="{n}" data-x="{label["x"]}" data-y="{label["y"]}" role="button" tabindex="0" aria-label="Room {n}" transform="translate({label["x"]} {label["y"]})"><rect class="room-hit" x="{-hit_width/2}" y="{-hit_height/2}" width="{hit_width}" height="{hit_height}" rx="3"/><text class="room-number" font-size="{fmt(size)}" text-anchor="middle" dominant-baseline="central" transform="rotate({angle})">{label["display"]}</text></g>')
    parts.append('</g></svg>')
    svg="".join(parts)
    (DEST/(spec["file"]+".svg")).write_text(svg,encoding="utf-8")
    return {"file":spec["file"],"label":spec["label"],"width":width,"height":height,"crop":spec["crop"],
            "north":spec["north"],"rooms":rooms,"svg":svg,"review":spec["review"],"labelCount":len(labels)}


def main():
    DEST.mkdir(parents=True,exist_ok=True)
    plans={}
    requested=sys.argv[1:]
    if requested:
        existing=ROOT/"wsc-plans.js"
        if existing.exists():
            plans=json.loads(existing.read_text(encoding="utf-8").split("=",1)[1].rstrip(";\n"))
    for key,spec in PLANS.items():
        if requested and key not in requested:
            continue
        print(f"Digitizing {spec['label']}...",flush=True)
        plans[key]=build_plan(key,spec)
        p=plans[key]
        print(f"  {len(p['rooms'])} room IDs, {p['labelCount']} labels, {len(p['svg']):,} SVG characters",flush=True)
    (ROOT/"wsc-plans.js").write_text("window.WSC_PLANS="+json.dumps(plans,separators=(",",":"))+";\n",encoding="utf-8")
    manifest={key:{k:v for k,v in plan.items() if k not in ("svg",)} for key,plan in plans.items()}
    (DEST/"digitization-audit.json").write_text(json.dumps(manifest,indent=2),encoding="utf-8")


if __name__=="__main__":
    main()
