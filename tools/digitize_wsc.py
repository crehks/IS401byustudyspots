"""Build themed, editable SVG maps from supplied WSC, HBLL and JKB CAD PDFs.

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

# HBLL crop boxes were checked against every supplied sheet. Titles, locator
# silhouettes and north-arrow blocks are excluded, not building geometry.
# North is left on these source sheets; no redraw or inferred rotation is used.
HBLL_PLANS = {
    'B': {'file':'hbll-bns','label':'Basement North','crop':[130,10,1000,780],
          'service':['78','77','32','52','54','56'],
          'review':'Perimeter 71/73/75/79/80/81, central 20/22, lower east rooms 10/30/32/50/61/62/63/64 and stair cores.'},
    'L1N': {'file':'hbll-1ns','label':'Floor 1 North','crop':[120,50,950,775],
            'service':['1001','1010','1020','1052','1054','1056','1178'],
            'review':'North open 1200, west 1180/1190, middle 1120/1130/1150 office clusters, east service core, south auditorium 1060.'},
    'L1': {'file':'hbll-1s','label':'Floor 1 South','crop':[50,0,915,760],
           'service':['1259','1300','1302','1400','1410','1411','1502','1600','1700','1800'],
           'review':'West 1430/1311/1330, 1302 stair and 1312-1328 offices, central 1530, east 1750/1701 and 1600 stair core.'},
    'L2N': {'file':'hbll-2ns','label':'Floor 2 North','crop':[80,15,1020,725],
            'clip':[[80,15],[1020,15],[1020,655],[940,655],[940,725],[80,725]],
            'service':['2001','2010','2020','2052','2054','2056','2178','2210'],
            'review':'North 2250 stacks and seating, 2240 offices, 2204/2218 media clusters, west 2100, east 2001 stair and southeast 2060/2070 rooms.'},
    'L2': {'file':'hbll-2s','label':'Floor 2 South','crop':[70,20,915,775],
           'service':['2300','2310','2400','2410','2411','2500','2600','2602','2603','2604','2605','2606','2700','2800'],
           'review':'West 2430/2340/2330, 2310 stair, central 2530, northeast 2807/2840, southeast 2710/2720/2730/2740 room clusters.'},
    'L3N': {'file':'hbll-3ns','label':'Floor 3 North','crop':[190,55,915,710],
            'service':['3001','3034','3038','3052','3054','3056'],
            'review':'Sparse source: exterior columns/skylights, central 3001 stair, 3010/3060 circulation, 3020/3070 entrances and 3032-3059 east cores.'},
    'L3': {'file':'hbll-3s','label':'Floor 3 South / Entry','crop':[115,30,915,750],
           'service':['3300','3404','3400','3600','3602','3603','3604','3605','3606','3700S','3800S','3500'],
           'review':'West 3410/3421/3435, 3300 stair and curved 3320, central 3505, 3600 core, east 3710/3712/3714/3718 lecture rooms, 3760/3770 clusters.'},
    'L4': {'file':'hbll-4s','label':'Floor 4','crop':[85,5,975,740],
           'service':['4300','4306','4400','4410','4411','4501','4600','4602','4603','4604','4605','4606','4700','4800'],
           'review':'West 4530/4350, north 4400 stair and 4420-4456 offices, east 4810-4849, south 4719/4722/4725/4732.'},
    'L5': {'file':'hbll-5s','label':'Floor 5','crop':[140,40,985,755],
           'service':['5300','5304','5400','5410','5411','5500','5600','5603','5604','5605','5606','5700','5800','5803'],
           'review':'West 5470/5301/5320, north 5430 subdivisions and 5444-5452, middle 5530/5600, east 5740 and south 5712-5730.'},
    'L6': {'file':'hbll-6s','label':'Floor 6','crop':[220,30,1040,730],
           'service':['6065','6500','6502','6600','6602','6604','6606','6748','6826'],
           'review':'Large west 6055 with 6075/6085/6095, central 6523/6525/6527, north 6820-6832 and east/south 6720-6750 offices.'}
}
for _key,_spec in HBLL_PLANS.items():
    _spec.update(building='Harold B. Lee Library',north=-90,
                 room_pattern=r'\d{2}[A-Za-z]?' if _key=='B' else r'[1-6]\d{3}[A-Za-z]{0,2}')

# All four JKB sheets were inspected visually before selecting their crops.
# G remains the legacy database/catalogue key for the Floor 1 drawing.
# The publishing block and north arrow are outside each crop, not building ink.
JKB_PLANS = {
    'G': {'file':'jkb-1s','label':'Floor 1','crop':[300,20,980,780],
          'service':['1133','1114','1112','1100B','1100C','1100G','1021','1019A','1019B','1019C','1003'],
          'review':'L-shaped floor: west classroom rows 1115-1129, room 1133 stair, north 1113 offices and 1100G stair, east lecture rooms 1104/1102, central 1021 stair and 1019 restrooms, south classrooms 1002-1020 and 1003 stair.'},
    'L2': {'file':'jkb-2s','label':'Floor 2','crop':[225,0,980,780],
           'service':['2146','2153A','2131','2118','2108','2100B','2100C','2019','2017A','2017B','2017C','2015D','2000B'],
           'review':'West office cluster 2120-2168 with stairs 2146/2118 and 2153A core, north 2108 stair, large 2107 lecture room, curved 2104/2105 seating rooms, central 2019 stair and 2017 restrooms, south 2001/2004 offices and 2000 stair.'},
    'L3': {'file':'jkb-3s','label':'Floor 3','crop':[240,0,1010,791],
           'service':['3128','3120','3110','3030A','3030B','3027','3017A','3017B','3017C','3000'],
           'review':'West seminar/classrooms 3112-3135, stair 3128 and north 3110, east lecture hall 3108 and seated rooms 3104/3106, central 3027 stair and 3017 restrooms, dense south office subdivisions 3003/3005/3006/3009 and 3000 stair.'},
    'L4': {'file':'jkb-4s','label':'Floor 4','crop':[585,45,930,770],
           'service':['4093','4091B','4091C','4091D','4000'],
           'review':'Narrow office floor: north 4096A/B/C and 4102A/B/C/D rooms, 4093 stair, 4091 restroom suite, central 4026A-M subdivisions and east 4042-4092 offices, south 4057 classroom, 4051 open room and 4000 stair.'}
}
for _key,_spec in JKB_PLANS.items():
    _spec.update(building='Jesse Knight Building',north=-25,room_pattern=r'[1-4]\d{3}[A-Za-z]{0,2}')


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
                matches=list(re.finditer(spec.get('room_pattern',r"[1-6]\d{3}[A-Za-z]{0,2}|M1000"),text))
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


def get_notes(page,spec):
    # Preserve stair direction and door/subdivision tags separately from rooms.
    # A tag such as 4300-1 is not a distinct study room in the search index.
    if 'building' not in spec:
        return []
    notes=[]
    x0,y0,x1,y1=spec['crop']
    for block in page.get_text('dict')['blocks']:
        if block['type']!=0: continue
        for line in block['lines']:
            for span in line['spans']:
                text=span['text'].strip()
                if not (text in ('UP','DN') or re.fullmatch(r'(?:[1-6]\d{3}[A-Za-z]{0,2}|\d{2}[A-Za-z]?)-\d+',text) or re.fullmatch(r'(?:Cap:|Capacity:)\s*\d+',text)):
                    continue
                rect=fitz.Rect(span['bbox'])*page.rotation_matrix
                x,y=(rect.x0+rect.x1)/2,(rect.y0+rect.y1)/2
                if x0<x<x1 and y0<y<y1:
                    notes.append({'text':text,'x':round(x-x0,2),'y':round(y-y0,2),
                                  'size':round(span['size'],2),'vertical':rect.height>rect.width*1.6})
    return notes


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
        notes=get_notes(page,spec)
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
    building=spec.get('building','Wilkinson Student Center')
    parts=[f'<svg xmlns="http://www.w3.org/2000/svg" class="digital-floor-svg" viewBox="0 0 {width} {height}" role="group" aria-label="Digitized {escape(building)} {escape(spec["label"])}">',
           f'<title>{escape(building)} - {escape(spec["label"])}</title>',
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
        size=max(4.1 if 'building' in spec else 5.5,min(7.4,label["size"]*.98))
        angle=-90 if label["vertical"] else 0
        hit_width=max(18,len(n)*4.5)
        hit_height=15
        if angle:
            hit_width,hit_height=hit_height,hit_width
        parts.append(f'<g class="map-room" data-room="{n}" data-x="{label["x"]}" data-y="{label["y"]}" role="button" tabindex="0" aria-label="Room {n}" transform="translate({label["x"]} {label["y"]})"><rect class="room-hit" x="{-hit_width/2}" y="{-hit_height/2}" width="{hit_width}" height="{hit_height}" rx="3"/><text class="room-number" font-size="{fmt(size)}" text-anchor="middle" dominant-baseline="central" transform="rotate({angle})">{label["display"]}</text></g>')
    parts.append('</g><g class="map-source-notes" pointer-events="none">')
    for note in notes:
        angle=-90 if note['vertical'] else 0
        size=max(2.5,min(9,note['size']))
        parts.append(f'<text class="map-note" fill="var(--map-text,#23495f)" font-family="Arial,Helvetica,sans-serif" font-size="{fmt(size)}" text-anchor="middle" dominant-baseline="central" transform="translate({note["x"]} {note["y"]}) rotate({angle})">{escape(note["text"])}</text>')
    parts.append('</g></svg>')
    svg="".join(parts)
    (DEST/(spec["file"]+".svg")).write_text(svg,encoding="utf-8")
    return {"file":spec["file"],"label":spec["label"],"width":width,"height":height,"crop":spec["crop"],
            "north":spec["north"],"rooms":rooms,"svg":svg,"review":spec["review"],"labelCount":len(labels)}


def main():
    global SOURCE,DEST
    hbll='--hbll' in sys.argv
    jkb='--jkb' in sys.argv
    if hbll and jkb:
        raise ValueError('Choose one building at a time: --hbll or --jkb.')
    building='jkb' if jkb else 'hbll' if hbll else 'wsc'
    specs=JKB_PLANS if jkb else HBLL_PLANS if hbll else PLANS
    output=building+'-plans.js'
    global_name=building.upper()+'_PLANS'
    SOURCE=ROOT/'assets'/building
    DEST=SOURCE/'digital'
    DEST.mkdir(parents=True,exist_ok=True)
    plans={}
    requested=[value for value in sys.argv[1:] if value not in ('--hbll','--jkb')]
    if requested:
        existing=ROOT/output
        if existing.exists():
            plans=json.loads(existing.read_text(encoding="utf-8").split("=",1)[1].rstrip(";\n"))
    for key,spec in specs.items():
        if requested and key not in requested:
            continue
        print(f"Digitizing {spec['label']}...",flush=True)
        plans[key]=build_plan(key,spec)
        p=plans[key]
        print(f"  {len(p['rooms'])} room IDs, {p['labelCount']} labels, {len(p['svg']):,} SVG characters",flush=True)
    (ROOT/output).write_text('window.'+global_name+'='+json.dumps(plans,separators=(",",":"))+";\n",encoding="utf-8")
    manifest={key:{k:v for k,v in plan.items() if k not in ("svg",)} for key,plan in plans.items()}
    (DEST/"digitization-audit.json").write_text(json.dumps(manifest,indent=2),encoding="utf-8")


if __name__=="__main__":
    main()
