/* Study BYU frontend. Loaded after the map bundles and database.js.
 * Sections: catalogue, local data, campus map, reports, views, floor tools,
 * dialogs, event handlers, and startup.
 */

// 1. Building catalogue. Floor IDs select drawings; level is the physical floor.
// JKB's G key displays Floor 1 but must keep matching existing spot references.
const BUILDINGS = {
  HBLL: { name: 'Harold B. Lee Library', short: 'Library', groundFloor: 'L3', description: '', floors: [
    {id:'L1',label:'Floor 1',file:'hbll-1ns + hbll-1s',level:1,defaultX:70,defaultY:82},
    {id:'L2',label:'Floor 2',file:'hbll-2ns + hbll-2s',level:2,defaultX:70,defaultY:82},
    {id:'L3',label:'Floor 3',file:'hbll-3ns + hbll-3s',level:3,defaultX:70,defaultY:82},
    {id:'L4',label:'Floor 4',file:'hbll-4s',level:4,defaultX:26,defaultY:68},
    {id:'L5',label:'Floor 5',file:'hbll-5s',level:5,defaultX:67,defaultY:50},
  ], map:'https://map.byu.edu/', floorsUrl:'https://lib.byu.edu/floormaps/' },
  WSC: { name: 'Wilkinson Student Center', short: 'The Wilk', groundFloor: '2', description: '', floors: [
    {id:'1',label:'Floor 1',file:'wsc-1s + wsc-1ws',level:1,defaultX:50,defaultY:50},
    {id:'2',label:'Floor 2',file:'wsc-2s + wsc-2ws',level:2,defaultX:50,defaultY:50},
    {id:'3',label:'Floor 3',file:'wsc-3s + wsc-3ws',level:3,defaultX:50,defaultY:50},
    {id:'4E',label:'Floor 4',file:'wsc-4s',level:4,side:'East',defaultX:69,defaultY:32},
    {id:'5E',label:'Floor 5',file:'wsc-5s',level:5,side:'East',defaultX:33,defaultY:43},
    {id:'6E',label:'Floor 6',file:'wsc-6s',level:6,side:'East',defaultX:34,defaultY:53}
  ], map:'https://map.byu.edu/', floorsUrl:'https://wscmaps.byu.edu/map' },
  JKB: { name: 'Jesse Knight Building', short: 'JKB', groundFloor: 'L2', description: '', floors: [
    {id:'G',label:'Floor 1',file:'jkb-1s',level:1,defaultX:43,defaultY:22},
    {id:'L2',label:'Floor 2',file:'jkb-2s',level:2,defaultX:50,defaultY:24},
    {id:'L3',label:'Floor 3',file:'jkb-3s',level:3,defaultX:48,defaultY:20},
    {id:'L4',label:'Floor 4',file:'jkb-4s',level:4,defaultX:66,defaultY:43}
  ] }
};

// Study spots, resources and database pins are keyed by the original drawing sheet (L3N, 1E, ...).
// Combined floors (HBLL 1-3, Wilk 1-3) show two sheets; sheetBox/pinPercent below map each sheet onto the combined drawing.
function floorIds(building,floor){if(building==='HBLL'&&/^L[1-3]$/.test(floor))return [`${floor}N`,floor];if(building==='WSC'&&/^[1-3]$/.test(floor))return [`${floor}E`,`${floor}W`];return [floor]}
function floorExists(building,floor){return !!BUILDINGS[building]?.floors.some(f=>floorIds(building,f.id).includes(floor))}
// Spot IDs also appear in database.js and the SQL samples. Keep them aligned.
// These are prototype spots and illustrative placements, not verified room inventory or live availability.
const DEMO_SPOTS = [
  {id:'hbll-commons',building:'HBLL',floor:'L3',name:'Entry level open tables',type:'solo',capacity:1,private:false,outlets:true,noise:'medium',busy:'medium',reserved:false,x:28,y:27},
  {id:'hbll-west',building:'HBLL',floor:'L3',name:'West study corner',type:'solo',capacity:1,private:false,outlets:true,noise:'low',busy:'low',reserved:false,x:73,y:25},
  {id:'hbll-group',building:'HBLL',floor:'L3',name:'Group study room',type:'group',capacity:6,private:true,outlets:true,noise:'medium',busy:null,reserved:true,x:73,y:72},
  {id:'hbll-think',building:'HBLL',floor:'L2',name:'Think Tank area',type:'group',capacity:6,private:false,outlets:true,noise:'medium',busy:'low',reserved:false,x:28,y:27},
  {id:'hbll-reading',building:'HBLL',floor:'L2',name:'Reading Room area',type:'solo',capacity:1,private:false,outlets:false,noise:'low',busy:'medium',reserved:false,x:73,y:25},
  {id:'hbll-single',building:'HBLL',floor:'L2',name:'Single-user study room',type:'solo',capacity:1,private:true,outlets:true,noise:'low',busy:null,reserved:true,x:73,y:72},
  {id:'hbll-upper',building:'HBLL',floor:'L4',name:'Upper level tables',type:'solo',capacity:1,private:false,outlets:true,noise:'low',busy:'low',reserved:false,x:28,y:27},
  {id:'wsc-tables',building:'WSC',floor:'1E',name:'East hall tables',type:'group',capacity:4,private:false,outlets:true,noise:'medium',busy:'medium',reserved:false,x:23,y:42},
  {id:'wsc-lounge',building:'WSC',floor:'1E',name:'East open seating',type:'solo',capacity:1,private:false,outlets:false,noise:'medium',busy:'low',reserved:false,x:62,y:29},
  {id:'wsc-1w-atrium',building:'WSC',floor:'1W',name:'West atrium seating',type:'group',capacity:6,private:false,outlets:false,noise:'medium',busy:'low',reserved:false,x:26,y:52},
  {id:'wsc-1w-nook',building:'WSC',floor:'1W',name:'West side nook',type:'solo',capacity:1,private:false,outlets:true,noise:'low',busy:'medium',reserved:false,x:50,y:44},
  {id:'wsc-upper',building:'WSC',floor:'2E',name:'Second-floor tables',type:'group',capacity:6,private:false,outlets:true,noise:'medium',busy:'low',reserved:false,x:20,y:43},
  {id:'wsc-2e-seating',building:'WSC',floor:'2E',name:'East seating area',type:'solo',capacity:1,private:false,outlets:false,noise:'medium',busy:'medium',reserved:false,x:20,y:67},
  {id:'wsc-2w-open',building:'WSC',floor:'2W',name:'West open area',type:'group',capacity:6,private:false,outlets:true,noise:'medium',busy:'low',reserved:false,x:39,y:34},
  {id:'wsc-2w-corner',building:'WSC',floor:'2W',name:'Southwest corner',type:'solo',capacity:1,private:false,outlets:false,noise:'low',busy:'medium',reserved:false,x:28,y:76},
  {id:'wsc-3e-hall',building:'WSC',floor:'3E',name:'Third-floor hall',type:'group',capacity:4,private:false,outlets:true,noise:'medium',busy:'medium',reserved:false,x:23,y:31},
  {id:'wsc-3e-corner',building:'WSC',floor:'3E',name:'East quiet corner',type:'solo',capacity:1,private:false,outlets:false,noise:'low',busy:'low',reserved:false,x:51,y:65},
  {id:'wsc-3w-open',building:'WSC',floor:'3W',name:'West open area',type:'group',capacity:8,private:false,outlets:true,noise:'medium',busy:'low',reserved:false,x:35,y:43},
  {id:'wsc-3w-south',building:'WSC',floor:'3W',name:'West corridor nook',type:'solo',capacity:1,private:false,outlets:false,noise:'low',busy:'low',reserved:false,x:48,y:73},
  {id:'wsc-4f',building:'WSC',floor:'4E',name:'Fourth-floor alcove',type:'solo',capacity:1,private:false,outlets:false,noise:'low',busy:'low',reserved:false,x:68,y:33},
  {id:'wsc-5f',building:'WSC',floor:'5E',name:'Fifth-floor seating',type:'solo',capacity:1,private:false,outlets:true,noise:'low',busy:'medium',reserved:false,x:34,y:43},
  {id:'wsc-6f',building:'WSC',floor:'6E',name:'Sixth-floor open area',type:'group',capacity:4,private:false,outlets:false,noise:'medium',busy:'low',reserved:false,x:34,y:54},
  {id:'jkb-tables',building:'JKB',floor:'G',name:'Ground level tables',type:'solo',capacity:1,private:false,outlets:true,noise:'low',busy:'low',reserved:false,x:28,y:27},
  {id:'jkb-nook',building:'JKB',floor:'G',name:'Quiet study nook',type:'solo',capacity:1,private:true,outlets:false,noise:'low',busy:'medium',reserved:false,x:73,y:73},
  {id:'jkb-group',building:'JKB',floor:'L2',name:'Group table area',type:'group',capacity:8,private:false,outlets:true,noise:'medium',busy:'low',reserved:false,x:28,y:28}
];

// Footprints follow the supplied 1238 x 807 campus-map screenshot, not guessed blocks.
// Only IDs in BUILDINGS open floor maps; other footprints show a status message.
// Extrusion is an illustrative 2.5D treatment, not measured building height.
const CAMPUS_BUILDINGS = [
  {id:'TNRB',name:'Tanner Building',x:346,y:40,points:'284,23 321,21 328,22 329,27 339,27 340,22 406,20 407,48 406,61 339,63 338,57 330,57 329,62 286,62'},
  {id:'JKB',name:'Jesse Knight Building',x:555,y:72,points:'507,51 568,50 570,46 578,46 580,50 593,50 594,59 604,59 604,76 594,77 594,83 596,84 594,95 597,153 594,155 573,155 573,149 569,148 570,139 573,138 573,103 566,95 560,95 562,81 553,80 552,77 546,77 545,80 503,78 502,68 506,67'},
  {id:'MOA',name:'Museum of Art',x:754,y:13,points:'605,0 812,0 811,9 808,20 777,21 767,32 757,21 737,23 726,21 723,8 726,6 726,0 689,0 688,17 681,23 664,23 657,18 657,2 652,2 648,7 637,3 637,14 634,21 613,24 607,20'},
  {id:'HRCN',x:988,y:32,points:'967,19 981,19 984,9 1002,9 1003,13 1009,13 1009,58 985,59 984,55 965,56 964,35 967,34'},
  {id:'CONE',x:1099,y:46,points:'1074,26 1118,26 1118,48 1121,56 1118,57 1118,72 1105,74 1105,85 1115,85 1114,92 1106,92 1106,86 1099,85 1097,80 1089,80 1089,75 1097,74 1097,68 1089,68 1089,49 1073,50'},
  {id:'ARTS',name:'Arts Building',x:770,y:95,points:'704,58 710,57 710,52 723,52 724,57 760,56 768,49 775,57 810,56 812,50 824,49 824,44 828,41 825,34 828,31 830,32 832,45 824,46 824,54 831,56 833,69 847,68 847,75 833,80 831,98 832,135 764,136 763,145 735,146 733,137 706,137'},
  {id:'RB',name:'Richards Building',x:254,y:214,points:'222,114 243,117 255,115 281,117 282,119 294,121 304,119 323,123 318,159 325,165 323,179 314,181 301,286 299,288 280,286 276,320 273,327 258,324 247,326 241,322 224,320 222,316 197,312 203,255 191,253 190,246 198,186 212,187 214,184'},
  {id:'TMCB',name:'Talmage Building',x:493,y:160,points:'476,112 536,111 537,138 529,139 530,173 538,173 537,194 530,195 530,208 503,209 501,194 482,194 480,190 473,190 470,195 439,195 439,189 435,188 437,162 478,161 482,159 482,146 476,143'},
  {id:'JRCB',name:'J. Reuben Clark Building',x:1018,y:138,points:'999,91 1031,91 1032,94 1053,95 1054,153 1046,153 1045,149 1036,149 1034,151 1034,164 1037,165 1039,171 1036,174 1036,179 1039,182 1037,189 1031,190 1031,206 1036,208 1035,215 1031,216 1031,225 990,226 990,203 1002,202 1002,185 1005,181 1005,175 1002,166 1001,147 986,145 985,96 998,96'},
  {id:'WVB',x:375,y:224,points:'391,169 391,204 393,205 391,252 387,253 382,285 361,283 357,281 367,228 367,174 390,174'},
  {id:'HBLL',name:'Harold B. Lee Library',x:650,y:249,points:'634,174 663,173 663,183 670,184 670,192 664,193 665,218 697,218 701,220 702,228 699,230 697,246 697,269 665,270 667,282 682,281 684,287 690,287 693,310 691,314 692,331 621,333 611,331 609,315 610,288 637,288 638,273 636,266 601,266 602,219 633,216 634,194 628,193 628,184 633,183'},
  {id:'WSC',name:'Wilkinson Student Center',x:830,y:267,points:'784,202 836,202 842,199 841,208 843,211 856,211 859,208 868,208 872,211 912,210 921,207 920,223 923,224 923,238 921,239 921,278 926,279 927,295 922,297 922,310 894,310 893,317 881,317 880,320 878,317 874,317 873,320 867,315 854,315 853,336 798,335 797,337 790,337 789,335 781,336 780,330 757,330 754,337 729,337 730,323 735,322 734,299 742,298 741,292 734,292 733,271 734,262 738,261 738,251 752,252 754,262 767,262 768,257 785,256 785,247 781,246 780,241 766,240 766,235 778,235 784,232 784,224 787,223 787,218 783,216'},
  {id:'MB',name:'Music Building',x:1130,y:226,points:'1084,191 1114,190 1117,194 1145,194 1146,188 1192,189 1192,206 1195,207 1194,231 1192,232 1192,263 1148,265 1146,260 1117,260 1116,264 1092,264 1092,240 1090,238 1076,238 1076,223 1074,221 1064,222 1064,210 1083,207'},
  {id:'JFSB',name:'Joseph F. Smith Building',x:468,y:282,points:'418,235 520,234 521,250 528,275 527,306 525,316 521,319 522,335 519,337 419,338 418,320 415,319 416,278 409,276 408,261 415,261 414,254 417,253',courtyard:'445,256 493,255 505,265 505,313 449,313 445,298'},
  {id:'SAB',name:'Student Athlete Building',x:89,y:312,points:'37,296 48,293 49,290 67,288 118,289 121,279 143,282 142,294 150,297 152,323 150,329 142,329 140,333 133,333 132,329 120,329 118,343 89,341 87,344 84,342 33,343 29,341 29,324 38,321'},
  {id:'SFH',name:'Smith Fieldhouse',x:184,y:408,points:'41,389 82,385 83,389 101,389 102,386 113,384 114,381 149,380 163,377 164,380 207,379 208,376 241,376 246,374 246,367 295,365 304,365 309,361 307,355 292,356 292,351 311,354 314,351 319,351 323,354 314,353 313,359 322,365 329,365 330,361 334,363 333,371 338,372 327,391 317,392 314,403 306,404 301,410 297,427 279,427 277,429 278,446 275,448 168,449 165,448 164,444 154,444 153,448 119,449 118,444 108,444 107,442 76,442 75,445 69,445 67,442 41,442 41,433 38,432 40,413 37,412 37,400 41,398'},
  {id:'CTB',x:903,y:376,points:'874,358 941,357 941,388 893,389 893,410 864,409 864,390 874,389'},
  {id:'PPCH',x:919,y:436,points:'867,415 895,413 915,417 944,417 943,476 937,477 936,482 924,482 925,454 911,452 909,438 902,438 900,435 885,432 867,434'},
  {id:'HRCB',name:'Herald R. Clark Building',x:650,y:373,points:'626,361 640,358 641,361 661,361 662,358 668,358 669,361 676,361 676,378 658,379 652,377 648,380 648,420 635,423 633,420 627,420 627,395 624,394'},
  {id:'ESC',name:'Eyring Science Center',x:558,y:441,points:'518,365 541,363 544,359 548,362 575,359 576,363 603,362 603,385 557,386 554,388 555,394 565,394 565,398 591,397 591,430 596,440 595,451 597,455 591,457 591,485 568,486 520,486 520,458 536,457 536,428 520,427'},
  {id:'KMB',name:'Spencer W. Kimball Tower',x:472,y:413,points:'465,377 476,377 489,391 489,406 504,416 501,416 485,433 481,434 477,447 465,447 461,435 441,418 453,406 454,394 452,390'},
  {id:'MCKB',name:'David O. McKay Building',x:406,y:438,points:'399,378 419,377 418,402 423,403 423,411 419,413 420,474 424,475 424,483 420,484 420,492 401,492 394,487 379,490 380,473 392,473 394,467 400,466 399,447 395,442 401,440 401,433 399,432'},
  {id:'ROTC',x:1142,y:340,points:'1133,323 1147,323 1147,336 1153,338 1153,346 1148,348 1148,360 1134,360'},
  {id:'CMB',x:1091,y:369,points:'1087,352 1106,351 1107,362 1100,363 1101,388 1090,389 1089,376 1072,376 1072,364 1089,363'},
  {id:'SNLB',x:1019,y:421,points:'1001,385 1036,385 1036,410 1028,412 1029,429 1044,429 1045,418 1052,418 1054,432 1042,433 1041,440 1052,441 1050,451 1053,452 1002,452 1002,440 999,437'},
  {id:'B66',x:1085,y:430,points:'1073,411 1102,411 1102,448 1097,449 1096,453 1070,453 1071,430 1069,429 1069,415'},
  {id:'TCB',name:'Tennis Courts Building',x:200,y:501,points:'180,458 219,459 220,475 237,477 237,481 220,482 220,528 226,529 226,531 220,534 220,541 222,542 218,544 179,544 177,503 179,497 177,495 176,462'},
  {id:'CB',name:'Clyde Building',x:760,y:464,points:'733,423 739,425 741,419 746,417 747,420 752,420 753,424 801,424 802,429 799,430 799,436 801,437 800,450 788,452 790,464 787,470 787,483 790,484 790,496 787,499 787,513 776,513 774,522 768,522 767,510 749,511 735,511 735,499 724,499 723,452 734,451'},
  {id:'MARB',name:'Martin Building',x:653,y:480,points:'631,458 656,455 657,458 675,457 675,500 657,500 656,508 642,506 641,501 631,501'},
  {id:'NICB',name:'Nicholes Building',x:562,y:515,points:'538,498 580,497 580,539 557,540 557,557 531,558 531,525 530,519 538,518'},
  {id:'ERL',x:839,y:500,points:'806,492 825,491 826,489 834,491 880,490 876,502 870,503 869,497 863,498 863,509 839,509 835,512 805,510'},
  {id:'EB',name:'Engineering Building',x:780,y:551,points:'726,532 738,531 743,525 770,529 789,526 790,531 798,531 799,529 834,530 834,562 828,563 828,568 831,569 832,573 796,575 788,573 755,573 754,575 735,575 726,573'},
  {id:'BRMB',name:'Brimhall Building',x:360,y:552,points:'355,528 376,528 377,542 379,543 378,576 347,577 346,575 339,575 340,543 352,540'},
  {id:'BRWB',x:1049,y:522,points:'1002,483 1069,481 1071,472 1090,472 1093,480 1106,479 1106,491 1089,489 1084,491 1085,538 1096,538 1096,564 1013,565 1003,563 1003,536 1001,535 1003,496 1000,495'},
  {id:'PPMW',x:1136,y:552,points:'1115,545 1130,547 1155,545 1155,552 1121,552 1120,555 1116,555'},
  {id:'YCH',x:132,y:611,points:'121,604 142,604 142,625 135,625 135,642 122,642'},
  {id:'JSB',name:'Joseph Smith Building',x:425,y:603,points:'399,553 421,552 423,580 450,578 451,590 467,590 467,597 460,599 461,624 456,624 452,628 449,624 434,624 433,632 420,633 420,646 397,646 396,595 399,594'},
  {id:'BNSN',name:'Benson Building',x:536,y:590,points:'531,551 557,551 557,578 559,603 566,602 566,590 603,589 603,599 609,600 609,609 604,610 604,619 566,620 566,608 560,607 558,609 558,624 555,629 534,629 531,610 523,611 523,627 508,627 507,631 498,631 497,628 482,628 481,582 488,580 488,570 498,562 511,565 517,574 516,581 522,582 523,599 531,600'},
  {id:'HGB',name:'Heber J. Grant Building',x:349,y:647,points:'322,641 341,639 342,633 350,632 352,628 356,629 357,635 374,635 376,656 356,658 349,661 324,662'},
  {id:'MSRB',name:'Maeser Building',x:253,y:657,points:'251,638 255,644 260,644 263,655 269,661 268,668 270,672 259,679 249,671 238,646'},
  {id:'MCDB',name:'McDonald Building',x:732,y:624,points:'693,611 706,611 707,615 727,615 728,612 739,610 742,615 777,623 773,634 741,625 709,625 707,631 697,631 696,624 693,622'},
  {id:'LSB',name:'Life Sciences Building',x:644,y:705,points:'597,666 618,666 621,654 624,646 644,650 649,640 654,639 656,645 673,645 676,634 680,638 683,664 693,664 694,676 694,751 659,752 658,770 644,771 643,762 642,752 596,752 592,723 592,693 593,679 597,676'}
];

// 2. Saved device data. StudyDatabase holds remote reports separately.
const STORAGE_KEY = 'study-byu-prototype-v1';
const defaultData = () => ({reports:{}, customSpots:[], lists:[{id:'favorites',name:'Favorites',spots:[]}], savedFilters:null});
function loadData(){
  const clean=defaultData();
  try{
    const stored=JSON.parse(localStorage.getItem(STORAGE_KEY));
    if(!stored||typeof stored!=='object')return clean;
    // Recover valid entries independently so one damaged field cannot stop the app.
    const seen=new Set(DEMO_SPOTS.map(s=>s.id));
    for(const spot of Array.isArray(stored.customSpots)?stored.customSpots:[]){
      if(!spot||typeof spot.id!=='string'||!/^custom-[\w-]+$/.test(spot.id)||seen.has(spot.id)||!Object.hasOwn(BUILDINGS,spot.building)||typeof spot.name!=='string'||!spot.name.trim())continue;
      const floor=spot.building==='WSC'?({G:'1E',L2:'2E'}[spot.floor]||spot.floor):spot.floor;
      if(!floorExists(spot.building,floor))continue;
      const type=spot.type==='group'?'group':'solo';
      clean.customSpots.push({...spot,floor,name:spot.name.trim().slice(0,60),type,capacity:type==='group'?Math.min(8,Math.max(2,Math.round(Number(spot.capacity)||4))):1,private:!!spot.private,outlets:!!spot.outlets,noise:['low','medium','high'].includes(spot.noise)?spot.noise:'low',busy:null,reserved:false,x:Number.isFinite(spot.x)?Math.min(100,Math.max(0,spot.x)):50,y:Number.isFinite(spot.y)?Math.min(100,Math.max(0,spot.y)):50,detail:typeof spot.detail==='string'?spot.detail.slice(0,160):''});
      seen.add(spot.id);
    }
    // Restore lists after spots so stale spot references can be removed safely.
    const listIds=new Set(['favorites']);
    for(const list of Array.isArray(stored.lists)?stored.lists:[]){
      if(!list||typeof list.id!=='string'||!Array.isArray(list.spots))continue;
      const spots=[...new Set(list.spots.filter(id=>seen.has(id)))];
      if(list.id==='favorites'){clean.lists[0].spots=spots;continue;}
      if(!/^[\w-]+$/.test(list.id)||listIds.has(list.id)||typeof list.name!=='string'||!list.name.trim())continue;
      clean.lists.push({id:list.id,name:list.name.trim().slice(0,28),spots});listIds.add(list.id);
    }
    // Restore valid local reports; these never count as Supabase receipts.
    for(const id of seen){
      const reports=stored.reports?.[id];
      if(!Array.isArray(reports))continue;
      clean.reports[id]=reports.filter(r=>r&&['low','medium','high'].includes(r.noise)&&['low','medium','high'].includes(r.busy)&&Number.isFinite(r.time)).slice(0,10).map(r=>({...r,note:typeof r.note==='string'?r.note.slice(0,240):'',source:'local'}));
    }
    // Older or damaged settings fall back to supported filter values.
    const filters=stored.savedFilters;
    if(filters&&Array.isArray(filters.buildings))clean.savedFilters={study:['any','solo','group'].includes(filters.study)?filters.study:'any',noise:['any','low','medium'].includes(filters.noise)?filters.noise:'any',layout:['any','secluded','open'].includes(filters.layout)?filters.layout:filters.private?'secluded':'any',outlets:!!filters.outlets,groupSize:Math.min(6,Math.max(2,Math.round(Number(filters.groupSize)||4))),buildings:filters.buildings.filter(id=>Object.hasOwn(BUILDINGS,id))};
  }catch{}
  return clean;
}
let data=loadData();
const database=new window.StudyDatabase();
const auth=new window.StudyAuth(database);
// BUILDING HOURS: computed in Utah time from the building_hours table.
let buildingHours=[];
function utahNow(){
  const parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'America/Denver',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23',weekday:'short'}).formatToParts(new Date()).map(p=>[p.type,p.value]));
  return {date:`${parts.year}-${parts.month}-${parts.day}`,day:['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(parts.weekday),minutes:Number(parts.hour)*60+Number(parts.minute)};
}
function addDays(date,n){const d=new Date(`${date}T12:00:00Z`);d.setUTCDate(d.getUTCDate()+n);return {date:d.toISOString().slice(0,10),day:d.getUTCDay()};}
function hoursFor(code,date,day){const rows=buildingHours.filter(r=>r.building_code===code);return rows.find(r=>r.special_date===date)||rows.find(r=>r.special_date===null&&r.day_of_week===day)||null;}
const toMinutes=t=>{const [h,m]=t.split(':').map(Number);return h*60+m;};
function formatTime(t){const [h,m]=t.split(':').map(Number);if(h===0&&m===0)return 'midnight';return `${h%12||12}${m?':'+String(m).padStart(2,'0'):''} ${h<12?'AM':'PM'}`;}
function hoursStatus(code){
  if(!buildingHours.some(r=>r.building_code===code))return null;
  const now=utahNow();
  const prev=addDays(now.date,-1),late=hoursFor(code,prev.date,prev.day);
  if(late&&!late.is_closed&&toMinutes(late.close_time)<=toMinutes(late.open_time)&&now.minutes<toMinutes(late.close_time))return {open:true,text:`Open now · Closes at ${formatTime(late.close_time)}`};
  const today=hoursFor(code,now.date,now.day);
  if(today&&!today.is_closed){const open=toMinutes(today.open_time),close=toMinutes(today.close_time),end=close<=open?close+1440:close;
    if(now.minutes>=open&&now.minutes<end)return {open:true,text:`Open now · Closes at ${formatTime(today.close_time)}`};
    if(now.minutes<open)return {open:false,text:`Closed · Opens today at ${formatTime(today.open_time)}`};}
  for(let i=1;i<=7;i++){const next=addDays(now.date,i),row=hoursFor(code,next.date,next.day);
    if(row&&!row.is_closed)return {open:false,text:`Closed · Opens ${i===1?'tomorrow':['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][next.day]} at ${formatTime(row.open_time)}`};}
  return {open:false,text:'Closed'};
}
function renderHours(){
  const el=document.getElementById('buildingHours');if(!el)return;
  const status=hoursStatus(state.building);
  el.hidden=!status;if(!status)return;
  el.textContent=status.text;el.classList.toggle('is-open',status.open);
}
async function loadBuildingHours(){
  try{buildingHours=await database.loadHours();renderHours();}
  catch(error){console.warn('Building hours unavailable:',error.message);}
}
setInterval(renderHours,60000);

// RESERVATION LINKS: each building's booking page, loaded from the Buildings table.
let reservationLinks={};
async function loadReservationLinks(){
  try{reservationLinks=await database.loadReservationLinks();}
  catch(error){console.warn('Reservation links unavailable:',error.message);}
}

let reportSubmissionPending=false;
const choiceTimer=new ChoiceTimer();
// Temporary screen choices. Save filters copies a preset into device data.
const state={view:'explore',building:'HBLL',floor:'L3',zoom:1,selectedSpot:null,locatedSpot:null,arrivalReadySpot:null,nooksVisible:true,resourcesVisible:false,selectedResource:null,selectedList:'favorites',listEditMode:false,study:'any',noise:'any',layout:'any',outlets:false,groupSize:4,buildings:new Set(['HBLL','WSC','JKB'])};
// Pin positions use the original PDF page; rendering subtracts the crop offset.
const WILK_STUDY_POINTS={
  'wsc-tables':[255,253],'wsc-lounge':[698,350],
  'wsc-1w-atrium':[289,421],'wsc-1w-nook':[411,529],
  'wsc-upper':[260,300],'wsc-2e-seating':[573,395],
  'wsc-2w-open':[650,220],'wsc-2w-corner':[393,677],
  'wsc-3e-hall':[409,306],'wsc-3e-corner':[468,391],
  'wsc-3w-open':[451,403],'wsc-3w-south':[409,609],
  'wsc-4f':[790,253],'wsc-5f':[382,283],'wsc-6f':[350,338]
};
const HBLL_STUDY_POINTS={
  'hbll-commons':[530,415],'hbll-west':[315,215],'hbll-group':[712,647],
  'hbll-think':[604,422],'hbll-reading':[312,645],'hbll-single':[685,562],
  'hbll-upper':[349,536]
};
// HBLL resources listed by the library's Places and Help Desks pages.
// Coordinates follow the matching floor drawing and mark the service area, not an exact counter.
const HBLL_RESOURCES={
  L1N:[
    ['Social Sciences & Education',380,407],['Special Collections',341,405],['Government Document Reference',397,407],['Auditorium',711,653],['Auditorium Gallery',676,653]
  ],
  L1:[
    ['Accounting Lab',406,285],['Atrium Gallery',566,285],['Business & Economics',395,320],['Juvenile Literature Collection',245,387],['Special Collections',485,404]
  ],
  L2N:[
    ['American Heritage Lab',499,260],['Honors Theses',585,409],['Human Resources',767,630],['Library Administrative Offices',767,630],['Library Instruction & Information Literacy',742,297],['Library Information Technology',781,528],['North Gallery',300,389],['Religion & Family History',549,185]
  ],
  L2:[
    ['Geospatial Services & Training',672,656],['Popular Reading',218,248],['Science & Engineering',587,324],['South Gallery',408,403],['Periodicals',214,708]
  ],
  L3N:[
    ['Library Security',607,268],['Library Information Technology',514,235],['Library Delivery Services',602,332]
  ],
  L3:[
    ['Center for Teaching and Learning',758,138],['Circulation / Course Reserve',251,386],['Copyright Licensing / Intellectual Property Services',540,506],['General Help Desk (Patron Services)',251,386],['Learning Commons',548,287],['Library Cafe',215,74],['Research & Writing Center',273,593],['Teaching and Learning Lab',637,624]
  ],
  L4:[
    ['Asian Collection',211,52],['Audio Cassette Players',550,440],['Audio Transfer Equipment',573,440],['Digital Audio Recorders',550,435],['Equipment Checkout Desk',797,159],['Equipment Room',797,159],['Experiential Studio',574,159],['HD Viewing Room',753,88],['International Harp Archives',570,435],['Locked Case',570,435],['Makerspace / The Workshop',797,238],['Music & Dance',414,446],['Music & Dance Media Lab',550,440],['Music Recordings Archive',550,435],['Music Special Collections',570,435],['Primrose International Viola Archive',570,435],['Software Training Classes',748,267],['Software Training Lab',748,267],['Video Production Studio',797,198]
  ],
  L5:[
    ['Accessibility Department',691,87],['Ancient Studies Collection',285,61],['Gallery on Five',525,440],['Humanities Help Desk',165,679],['Icelandic Collection',235,345],['Middle East Collection',132,340],['Welsh Collection',284,539]
  ]
};
const resourceLetters=index=>{let label='';for(index++;index;index=Math.floor((index-1)/26))label=String.fromCharCode(65+(index-1)%26)+label;return label};
const HBLL_RESOURCE_ROOMS={
  'Auditorium':'1060 / 1080','Circulation / Course Reserve':'3446','General Help Desk (Patron Services)':'3446',
  'Research & Writing Center':'3322','Library Security':'3032','Library Instruction & Information Literacy':'2227',
  'HD Viewing Room':'4824','Software Training Lab':'4826','Makerspace / The Workshop':'4840',
  'Accessibility Department':'5800','Library Cafe':'3400','Learning Commons':'3600','Teaching and Learning Lab':'3700S',
  'Center for Teaching and Learning':'3800','Copyright Licensing / Intellectual Property Services':'3760','Gallery on Five':'5500','Humanities Help Desk':'5300'
};
const HBLL_SERVICE_ROOM_RESOURCES={
  L3N:{'3032':'Library Security'},
  L3:{'3400':'Library Cafe','3600':'Learning Commons','3700S':'Teaching and Learning Lab','3800':'Center for Teaching and Learning','3760':'Copyright Licensing / Intellectual Property Services'},
  L5:{'5300':'Humanities Help Desk','5400':'Ancient Studies Collection','5500':'Gallery on Five','5800':'Accessibility Department'}
};
const HBLL_RESOURCE_DESCRIPTIONS={
  'Social Sciences & Education':'Subject help and collections for social science and education research.',
  'Special Collections':'Rare books, manuscripts, archives, and other primary sources for research.',
  'Government Document Reference':'Help finding and using government publications and data.',
  'Accounting Lab':'Accounting course support. The library currently offers this help virtually rather than in person.',
  'Atrium Gallery':'Rotating art exhibits just outside the Reynolds Auditorium.',
  'Auditorium':'A lecture and event venue for academic functions.','Auditorium Gallery':'Exhibits at the entrance to the Reynolds Auditorium.',
  'Business & Economics':'Subject help and collections for business and economics research.',
  'Juvenile Literature Collection':'Children’s and young adult literature for readers, teachers, and researchers.',
  'American Heritage Lab':'A space for American Heritage course study and review.',
  'Honors Theses':'Access and assistance for BYU honors theses and undergraduate research.',
  'Human Resources':'Library employee services and administrative support.',
  'Library Administrative Offices':'Library administration and departmental offices.',
  'Library Instruction & Information Literacy':'Instruction rooms used for library research and information-literacy classes.',
  'Library Information Technology':'Library technology services and support.',
  'North Gallery':'Gallery space for library exhibits on the north side of Level 2.',
  'Religion & Family History':'Subject help, collections, and family-history research tools.',
  'Science & Engineering':'Subject help and collections for science and engineering research.',
  'Periodicals':'Newspapers, magazines, journals, and the periodicals reading area.',
  'Geospatial Services & Training':'GIS help with mapping, spatial data, cartography, and GPS.',
  'Popular Reading':'A browsing collection of popular and leisure reading.',
  'South Gallery':'Gallery space for library exhibits on the south side of Level 2.',
  'Library Security':'Library safety and security assistance.',
  'Library Delivery Services':'Pickup and delivery help for library materials requested by patrons.',
  'Center for Teaching and Learning':'Teaching and learning support, technology, and collaborative learning services.',
  'Circulation / Course Reserve':'Check out library materials and access course reserve items.',
  'Copyright Licensing / Intellectual Property Services':'Guidance on copyright, licensing, and intellectual property questions.',
  'General Help Desk (Patron Services)':'Ask library questions, get research help, and check out books, media, and equipment.',
  'Learning Commons':'Collaborative study, computers, printing, research help, and equipment checkout; includes The Hub and Snack Zone.',
  'Library Cafe':'Food and drink service in the library.',
  'Research & Writing Center':'One-to-one help with writing, research, and citations.',
  'Teaching and Learning Lab':'A hands-on space for teaching practice and technology-enhanced learning.',
  'Asian Collection':'Books and research materials supporting Asian studies.',
  'Audio Cassette Players':'Equipment for listening to audio cassette materials.',
  'Audio Transfer Equipment':'Equipment for converting audio recordings to digital formats.',
  'Digital Audio Recorders':'Portable recorders for capturing digital audio.',
  'Equipment Checkout Desk':'Check out cameras, audio/video gear, and other library equipment.',
  'Equipment Room':'Library equipment and media resources available through the Level 4 service area.',
  'Experiential Studio':'Collaborative teaching space with breakout rooms and presentation technology.',
  'HD Viewing Room':'A reservable theater-style room with a large screen and surround sound.',
  'International Harp Archives':'Harp scores, manuscripts, recordings, and archival materials.',
  'Locked Case':'A secured collection area; ask the Music & Dance desk for access.',
  'Makerspace / The Workshop':'Prototyping and digital-imaging tools, including 3D printers, scanners, and fabrication equipment.',
  'Music & Dance':'Music and dance collections, media, research help, and listening resources.',
  'Music & Dance Media Lab':'Media workstations and technology for music and dance materials.',
  'Music Recordings Archive':'Recorded music and archival audio materials.',
  'Music Special Collections':'Specialized music collections and archival materials.',
  'Primrose International Viola Archive':'A major collection of viola-related scores, manuscripts, and research materials.',
  'Software Training Classes':'Free classes on creative, web, and digital-media software.',
  'Software Training Lab':'Computers and software support for multimedia and digital projects.',
  'Video Production Studio':'A production space with lighting, cameras, and backgrounds for video projects.',
  'Accessibility Department':'Library assistance and services supporting patrons with disabilities.',
  'Ancient Studies Collection':'Texts and research materials about the ancient Near East, Greece, and Rome.',
  'Gallery on Five':'Rotating art exhibits across from the Humanities Help Desk.',
  'Humanities Help Desk':'Subject research help for humanities topics.',
  'Icelandic Collection':'Books and research materials related to Iceland and Icelandic studies.',
  'Middle East Collection':'Books and research materials related to Middle Eastern studies.',
  'Welsh Collection':'Books and research materials related to Wales and Welsh studies.'
};
function resourceDescription(name){return HBLL_RESOURCE_DESCRIPTIONS[name]||`Library services and information for ${name}.`}
function resourceTooltip(name){const room=HBLL_RESOURCE_ROOMS[name];return `${name}${room?` · Room ${room}`:''}. ${resourceDescription(name)}`}
const JKB_STUDY_POINTS={'jkb-tables':[520,177],'jkb-nook':[828,520],'jkb-group':[610,188]};
let hbllPlanSource=null,hbllDisplayPlans=null,wscPlanSource=null,wscDisplayPlans=null;
const WSC_CONNECTIONS={1:{east:'1177',west:'1901'},2:{east:'2200',west:'2902'},3:{east:'3208',west:'3901'}};
function combinedWscPlan(east,west,level){
  // Align each pair on its mapped service core so the two drawings share a single connection point.
  const header=0,connection=WSC_CONNECTIONS[level];
  const eastAnchor=east.rooms.find(room=>room.number===connection.east),westAnchor=west.rooms.find(room=>room.number===connection.west);
  const dx=(eastAnchor?.x??east.width/2)-(westAnchor?.x??west.width/2),dy=(eastAnchor?.y??east.height/2)-(westAnchor?.y??west.height/2);
  const minX=Math.min(0,dx),minY=Math.min(0,dy),eastX=-minX,westX=dx-minX,eastY=-minY,westY=dy-minY;
  const width=Math.max(eastX+east.width,westX+west.width),height=header+Math.max(eastY+east.height,westY+west.height);
  const inner=plan=>plan.svg.slice(plan.svg.indexOf('>')+1,plan.svg.lastIndexOf('</svg>')).replace(/<title>.*?<\/title>/,'').replace(/<desc>.*?<\/desc>/,'');
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" class="digital-floor-svg" viewBox="0 0 ${width} ${height}" role="group" aria-label="Wilkinson Student Center Floor ${level} combined floor plan"><title>Wilkinson Student Center Floor ${level}</title><desc>The two floor sections are aligned at a shared service core.</desc><g transform="translate(${eastX} ${header+eastY})">${inner(east)}</g><g transform="translate(${westX} ${header+westY})">${inner(west)}</g></svg>`;
  return {file:`${east.file} + ${west.file}`,label:`Floor ${level}`,width,height,crop:[0,0,width,height],north:east.north,rooms:[...east.rooms,...west.rooms],svg,combined:true,eastTransform:{x:eastX,y:header+eastY,width:east.width,height:east.height},westTransform:{x:westX,y:header+westY,width:west.width,height:west.height},pointPositions:{}};
}
function wscPlans(plans){
  if(!plans)return null;
  if(plans!==wscPlanSource){
    wscPlanSource=plans;wscDisplayPlans={...plans};
    for(const level of [1,2,3]){
      const east=plans[`${level}E`],west=plans[`${level}W`];if(!east||!west)continue;
      const combined=combinedWscPlan(east,west,level);wscDisplayPlans[String(level)]=combined;
      for(const [spotId,point] of Object.entries(WILK_STUDY_POINTS)){
        const spot=DEMO_SPOTS.find(item=>item.id===spotId);if(!spot||spot.floor[0]!==String(level))continue;
        const source=spot.floor.endsWith('W')?west:east,box=spot.floor.endsWith('W')?combined.westTransform:combined.eastTransform;
        combined.pointPositions[spotId]=[box.x+(point[0]-source.crop[0])/source.width*box.width,box.y+(point[1]-source.crop[1])/source.height*box.height];
      }
      delete wscDisplayPlans[`${level}E`];delete wscDisplayPlans[`${level}W`];
    }
  }
  return wscDisplayPlans;
}
const HBLL_STAIR_ROOMS={L1N:{label:'Floor 1 North stair entrance',rooms:['1178']},L1:{label:'Floor 1 South stair entrance',rooms:['1302','1600']},L2N:{label:'Floor 2 North stair entrance',rooms:['2001']},L2:{label:'Floor 2 South stair entrance',rooms:['2310']},L3N:{label:'Floor 3 North stair entrance',rooms:['3001']},L3:{label:'Floor 3 South stair entrance',rooms:['3300']},L4:{label:'Floor 4 stair entrance',rooms:['4400']},L5:{label:'Floor 5 stair entrance',rooms:['5500']}};
const HBLL_STAIR_ANCHORS={1:{north:['L1N','1178'],south:['L1','1600']},2:{north:['L2N','2001'],south:['L2','2310']},3:{north:['L3N','3001'],south:['L3','3300']}};
function stairTarget(plan,number,label){
  const shape=[...plan.svg.matchAll(/<path\b([^>]*)>/g)].find(([,attrs])=>attrs.includes(`data-room="${number}"`));
  const d=shape?.[1].match(/\bd="([^"]+)"/)?.[1];
  if(!d)return '';
  return `<g class="stair-target" tabindex="0" aria-label="${esc(label)}"><title>${esc(label)}</title><path class="stair-hit-area" d="${d}"/></g>`;
}
function markStairEntrances(plan,{label,rooms=[]}){
  let svg=plan.svg;const targets=[];
  for(const number of rooms)targets.push(stairTarget(plan,number,label));
  // Use a landing note only when no known stair room is available; otherwise it duplicates the room outline target.
  if(!rooms.length){
  svg=svg.replace(/<text class="map-note"([^>]*)transform="translate\(([\d.]+) ([\d.]+)\) rotate\(([-\d.]+)\)">(UP|DN)<\/text>/g,(_match,attrs,x,y,angle,direction)=>`<g class="stair-note-target" tabindex="0" aria-label="${label}" transform="translate(${x} ${y})"><title>${label}</title><rect class="stair-hit-area" x="-23" y="-21" width="46" height="42" rx="6"/><path class="stair-glyph" d="M -13 11 H -7 V 5 H -1 V -1 H 5 V -7 H 11"/><text class="map-note"${attrs}transform="translate(0 0) rotate(${angle})">${direction}</text></g>`);
  }
  svg=svg.replace('</svg>',`${targets.join('')}</svg>`);
  return {...plan,svg,hasStairTargets:true};
}
function combinedHbllPlan(north,south,northAnchor,southAnchor){
  const n=north.rooms.find(room=>room.number===northAnchor),s=south.rooms.find(room=>room.number===southAnchor);
  const dx=(n?.x||north.width/2)-(s?.x||south.width/2),dy=(n?.y||north.height/2)-(s?.y||south.height/2);
  const minX=Math.min(0,dx),minY=Math.min(0,dy),northX=-minX,northY=-minY,southX=dx-minX,southY=dy-minY;
  const width=Math.max(northX+north.width,southX+south.width),height=Math.max(northY+north.height,southY+south.height);
  const inner=plan=>plan.svg.slice(plan.svg.indexOf('>')+1,plan.svg.lastIndexOf('</svg>')).replace(/<title>.*?<\/title>/,'').replace(/<desc>.*?<\/desc>/,'');
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" class="digital-floor-svg" viewBox="0 0 ${width} ${height}" role="group" aria-label="Harold B. Lee Library combined north and south floor map"><title>Harold B. Lee Library combined floor map</title><desc>North and south sides are aligned at their connecting staircases. Hover a highlighted stair for its entrance label.</desc><g transform="translate(${northX} ${northY})">${inner(north)}</g><g transform="translate(${southX} ${southY})">${inner(south)}</g></svg>`;
  return {file:`${north.file} + ${south.file}`,label:north.label.replace(' North',''),width,height,crop:[0,0,width,height],north:-90,rooms:[...north.rooms,...south.rooms],svg,combined:true,hasStairTargets:true,northTransform:{x:northX,y:northY,width:north.width,height:north.height},southTransform:{x:southX,y:southY,width:south.width,height:south.height},pointPositions:{}};
}
function hbllPlans(plans){
  if(!plans)return null;
  if(plans!==hbllPlanSource){
    hbllPlanSource=plans;hbllDisplayPlans={...plans};
    for(const [key,plan] of Object.entries(plans))if(HBLL_STAIR_ROOMS[key])hbllDisplayPlans[key]=markStairEntrances(plan,HBLL_STAIR_ROOMS[key]);
    for(const level of [1,2,3]){const anchors=HBLL_STAIR_ANCHORS[level],north=hbllDisplayPlans[anchors.north[0]],south=hbllDisplayPlans[anchors.south[0]];if(north&&south)hbllDisplayPlans[`L${level}`]=combinedHbllPlan(north,south,anchors.north[1],anchors.south[1])}
    for(const key of ['B','L1N','L2N','L3N','L6'])delete hbllDisplayPlans[key];
    const spotLevels={'hbll-commons':3,'hbll-west':3,'hbll-group':3,'hbll-think':2,'hbll-reading':2,'hbll-single':2};
    for(const [spotId,point] of Object.entries(HBLL_STUDY_POINTS)){
      const level=spotLevels[spotId]||4,combined=hbllDisplayPlans[`L${level}`];
      if(!combined?.combined)continue;
      const source=plans[`L${level}`],box=combined.southTransform;
      combined.pointPositions[spotId]=[box.x+(point[0]-source.crop[0])/source.width*box.width,box.y+(point[1]-source.crop[1])/source.height*box.height];
    }
  }
  return hbllDisplayPlans;
}
function buildingPlans(building=state.building){const plans={WSC:window.WSC_PLANS,HBLL:window.HBLL_PLANS,JKB:window.JKB_PLANS}[building]||null;return building==='HBLL'?hbllPlans(plans):building==='WSC'?wscPlans(plans):plans}
function sheetBox(digital,sheet){if(digital.eastTransform)return /W$/.test(sheet)?digital.westTransform:digital.eastTransform;if(digital.combined&&digital.northTransform)return /N$/.test(sheet)?digital.northTransform:digital.southTransform;return null}
function sourcePlan(building,sheet){return ({WSC:window.WSC_PLANS,HBLL:window.HBLL_PLANS})[building]?.[sheet]||null}
// Returns [x%,y%] of the displayed plan for a spot or pinned resource.
function pinPercent(digital,item,studyPoints){
  const box=sheetBox(digital,item.floor),src=(box&&sourcePlan(item.building,item.floor))||digital;
  if(digital.combined&&String(item.id).startsWith('custom-'))return [item.x,item.y];
  let fx,fy;
  if(item.pin){fx=item.pin[0]/100;fy=item.pin[1]/100}
  else{const point=studyPoints?.[item.id]||[item.x/100*1224,item.y/100*792];fx=(point[0]-src.crop[0])/src.width;fy=(point[1]-src.crop[1])/src.height}
  return box?[(box.x+fx*box.width)/digital.width*100,(box.y+fy*box.height)/digital.height*100]:[fx*100,fy*100];
}
function hbllFloorResources(digital){
  return floorIds('HBLL',state.floor).flatMap(sheet=>{
    const box=sheetBox(digital,sheet),src=sourcePlan('HBLL',sheet);
    return (HBLL_RESOURCES[sheet]||[]).map(([name,px,py])=>box&&src?[name,box.x+(px-src.crop[0])/src.width*box.width,box.y+(py-src.crop[1])/src.height*box.height]:[name,px,py]);
  });
}
// Floor-plan bundles are several MB each, so each loads only when its building is first opened.
const PLAN_FILES={WSC:'wsc-plans.js?v=20261007',HBLL:'hbll-plans.js?v=20261009',JKB:'jkb-plans.js?v=20261009'},planLoads={};
function loadPlans(building){
  if(buildingPlans(building))return Promise.resolve();
  return planLoads[building]??=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=PLAN_FILES[building];script.onload=resolve;script.onerror=()=>{delete planLoads[building];script.remove();reject(new Error('Floor map could not load.'))};document.head.appendChild(script)});
}
// This history drives in-app Back buttons; it does not change the browser URL.
const viewHistory=[];
let searchBuildingQueue=[],searchBuildingIndex=-1;
if(data.savedFilters){const f=data.savedFilters;state.study=f.study||'any';state.noise=f.noise||'any';state.layout=f.layout||'any';state.outlets=!!f.outlets;state.groupSize=Math.min(8,Math.max(2,Number(f.groupSize)||4));state.buildings=new Set((f.buildings||[]).filter(id=>BUILDINGS[id]));}
const $=selector=>document.querySelector(selector);
const $$=selector=>[...document.querySelectorAll(selector)];
// Escape user text before inserting it into an HTML template.
function esc(text){return String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
// 3. Campus map. Its zoom and drag state are separate from the floor map.
let campusZoom=1,campusZoomInitialized=false,campusSuppressClick=false;
// Ray casting checks whether a label anchor sits inside a building footprint.
function campusPointInside(points,x,y){
  let inside=false;
  for(let i=0,j=points.length-1;i<points.length;j=i++){
    const [ax,ay]=points[i],[bx,by]=points[j];
    if((ay>y)!==(by>y)&&x<(bx-ax)*(y-ay)/(by-ay)+ax)inside=!inside;
  }
  return inside;
}
// Place every label at its building's visual center: the spot inside the roof
// farthest from any wall. A coarse pass finds the area, then a fine pass refines it.
function campusLabelLayout(building){
  // ARTS and MB look best at the center point stored with each building.
  if(['ARTS','MB','MCDB','PPMW'].includes(building.id))return {x:building.x,y:building.y};
  const points=building.points.split(' ').map(point=>point.split(',').map(Number));
  const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
  const left=Math.min(...xs),right=Math.max(...xs),top=Math.min(...ys),bottom=Math.max(...ys);
  let best=null;
  const scan=(x0,x1,y0,y1,step)=>{
    for(let x=x0;x<=x1;x+=step)for(let y=y0;y<=y1;y+=step){
      if(!campusPointInside(points,x,y))continue;
      const distance=campusEdgeDistance(points,x,y);
      if(!best||distance>best.distance)best={x,y,distance};
    }
  };
  scan(left,right,top,bottom,4);
  if(best)scan(best.x-4,best.x+4,best.y-4,best.y+4,1);
  return best?{x:best.x,y:best.y}:{x:building.x,y:building.y};
}
// Shortest distance from a point to the building's outline.
function campusEdgeDistance(points,x,y){
  let nearest=Infinity;
  for(let i=0;i<points.length;i++){
    const [ax,ay]=points[i],[bx,by]=points[(i+1)%points.length],dx=bx-ax,dy=by-ay,length=dx*dx+dy*dy;
    const t=length?Math.max(0,Math.min(1,((x-ax)*dx+(y-ay)*dy)/length)):0;
    nearest=Math.min(nearest,Math.hypot(x-ax-t*dx,y-ay-t*dy));
  }
  return nearest;
}
// Build the native campus SVG once, then attach dragging and initial zoom.
function renderCampusMap(){
  const blocks=CAMPUS_BUILDINGS.map(b=>{
    const available=!!BUILDINGS[b.id],depth=available?12:b.id==='KMB'?20:6;
    const vertices=b.points.split(' ').map(point=>point.split(',').map(Number));
    const walls=vertices.map(([x,y],i)=>{const [nx,ny]=vertices[(i+1)%vertices.length];return `<polygon points="${x},${y} ${nx},${ny} ${nx+3},${ny+depth} ${x+3},${y+depth}"/>`;}).join('');
    const courtyard=b.courtyard?`<polygon class="campus-courtyard" points="${b.courtyard}"/>`:'';
    const label=campusLabelLayout(b);
    return `<g class="campus-building ${available?'is-available':'is-coming-soon'}" data-campus-building="${b.id}" ${available?`data-open-building="${b.id}"`:''} role="button" tabindex="0" aria-label="${esc(available?`${b.id} floor plans`:`${b.id}${b.name?' '+b.name:''}, coming soon`)}" ${available?'':'aria-controls="campusComingSoon"'}><title>${esc(b.name||b.id)}: ${available?'floor plans available':'not yet supported, coming soon'}</title><polygon class="campus-building-shadow" points="${b.points}" transform="translate(6 ${depth+5})"/><g class="campus-building-walls" aria-hidden="true">${walls}</g><polygon class="campus-building-roof" points="${b.points}"/>${courtyard}<text class="campus-building-label" x="${label.x}" y="${label.y}" text-anchor="middle" dominant-baseline="central">${b.id}</text></g>`;
  }).join('');
  const parking=[[173,58,139,287],[436,21,45,80],[848,24,86,137],[948,357,44,167],[845,479,115,55],[1105,304,101,245],[958,626,250,84]].map(([x,y,w,h])=>`<g class="campus-parking"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8"/>${Array.from({length:Math.floor(w/18)},(_,i)=>`<path d="M${x+10+i*18} ${y+8}v11 M${x+10+i*18} ${y+h-8}v-11"/>`).join('')}</g>`).join('');
  const walkways=['M408 0L383 328L205 676','M567 157L575 207L585 244L585 347L605 456L602 560','M343 346L926 344','M603 85L705 84','M612 88L665 138L626 172 M669 87L623 139L663 173','M690 200L721 200L732 226','M454 341L606 344','M439 489L433 542','M584 496L621 496','M611 458L626 458','M715 346L715 520','M687 345L687 561','M854 336L858 411','M748 580L855 581','M462 475L461 642','M476 464L489 489L499 519','M323 657L439 649','M354 580L402 580','M794 165L925 165','M975 281L1065 281','M440 18L506 19','M949 310L986 329','M690 641L697 695'];
  $('#campusMapDrawing').innerHTML=`<svg class="campus-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 -18 1238 845" role="group" aria-label="BYU central campus, digitized from the supplied map"><g aria-hidden="true"><rect class="campus-ground" x="0" y="-18" width="1238" height="845"/><path class="campus-lawn" d="M16 29H158V278H19Z M14 455H166V773H55Z M212 349L397 326L373 524L222 719L87 772L100 708L198 567Z M415 7L698 1L925 88L947 331L899 574L693 633L594 645L369 690L420 349Z M949 92L982 88L982 254L949 254Z M922 729L1214 729L1214 776L928 776Z"/><path class="campus-stream-bank" d="M310 86Q323 251 293 353Q276 456 220 535Q182 593 126 676Q78 725 103 762Q170 782 286 737L528 664Q536 702 482 747Q399 787 277 798L52 798Q26 748 60 691Q97 607 166 527Q232 418 247 341L278 153Z"/><path class="campus-stream" d="M304 91Q313 262 281 372Q247 477 195 555Q136 639 94 717Q71 757 113 763Q173 771 299 726L500 675"/>
  ${parking}<g class="campus-walkways">${walkways.map(d=>`<path d="${d}"/>`).join('')}</g>
  <g class="campus-roads"><path d="M431 -30Q411 160 382 285Q365 438 293 583Q238 676 209 677Q184 679 206 646"/><path d="M107 -5L168 -5Q210 -5 226 -28 M160 55L175 281Q187 347 141 357L15 357"/><path d="M13 793L866 793Q905 793 905 748V659Q898 605 947 604H1256"/><path d="M206 652Q186 679 218 692Q287 663 414 650Q546 638 647 611Q697 579 754 589L899 612"/><path d="M927 72Q1053 69 1111 106Q1145 125 1248 121"/><path d="M1218 -20V804 M968 280V535Q963 571 925 581L899 612 M947 280L1220 280 M925 346L929 381 M15 19V800"/></g>
  <g class="campus-road-lines"><path d="M431 -30Q411 160 382 285Q365 438 293 583"/><path d="M13 793L866 793Q905 793 905 748V659Q898 605 947 604H1256"/><path d="M206 652Q186 679 218 692Q287 663 414 650Q546 638 647 611Q697 579 754 589L899 612"/><path d="M1218 -20V804 M968 280V535Q963 571 925 581L899 612 M947 280L1220 280 M15 19V800"/></g>
  <g class="campus-roundabout"><circle cx="969" cy="280" r="26"/><circle class="campus-lawn" cx="969" cy="280" r="14"/></g>
  <g class="campus-fields"><rect x="23" y="45" width="129" height="77"/><rect x="23" y="144" width="129" height="128"/><rect x="31" y="464" width="130" height="78"/><path d="M23 84H152 M23 169H152 M23 195H152 M23 221H152 M23 247H152 M86 45V122 M31 503H161 M95 464V542"/><rect x="31" y="53" width="113" height="61"/><rect x="31" y="152" width="113" height="111"/><rect x="39" y="472" width="114" height="62"/></g>
  <g class="campus-tennis">${Array.from({length:6},(_,i)=>{const x=25+(i%3)*34,y=568+Math.floor(i/3)*57;return `<rect x="${x}" y="${y}" width="25" height="43"/><path d="M${x} ${y+21}h25 M${x+5} ${y+5}h15v33h-15Z"/>`;}).join('')}</g>
  <g class="campus-plaza"><path d="M627 94L657 94L656 159L625 159Z M672 171L739 170L739 197L672 197Z M786 173L851 171L852 190L786 191Z M842 540L889 540L889 568L842 568Z"/></g>
  <g class="campus-context-labels"><text x="88" y="138">RB Fields</text><text x="80" y="513">South Field</text><text x="71" y="688">Tennis courts</text><text x="750" y="388">Cougar Crossing</text><text x="501" y="753">Arboretum &amp; Botany Pond</text><text x="122" y="721">South Campus Trail</text></g>
  <g class="campus-road-labels"><text x="366" y="367" transform="rotate(-78 366 367)">Campus Drive</text><text x="820" y="366">1060 N</text><text x="455" y="672" transform="rotate(-12 455 672)">Campus Drive</text><text x="1069" y="610">900 N</text><text x="450" y="799">800 N</text><text x="980" y="467" transform="rotate(90 980 467)">750 E</text></g></g>${blocks}</svg>`;
  installCampusMapInteraction($('#campusMapViewport'));
}
// Preserve the map center on zoom; Reset centers the supported buildings.
function changeCampusZoom(delta,initial=false){
  const viewport=$('#campusMapViewport'),drawing=$('#campusMapDrawing');
  if(!viewport.clientWidth)return;
  const baseWidth=Math.max(viewport.clientWidth,760),oldWidth=parseFloat(drawing.style.width)||baseWidth;
  const oldHeight=oldWidth*845/1238;
  let centerX=(viewport.scrollLeft+viewport.clientWidth/2)/oldWidth;
  let centerY=(viewport.scrollTop+viewport.clientHeight/2)/oldHeight;
  if(initial){
    const mapped=CAMPUS_BUILDINGS.filter(building=>BUILDINGS[building.id]);
    const points=mapped.flatMap(building=>building.points.split(' ').map(point=>point.split(',').map(Number)));
    const xs=points.map(point=>point[0]),ys=points.map(point=>point[1]);
    const left=Math.min(...xs),right=Math.max(...xs),top=Math.min(...ys),bottom=Math.max(...ys);
    centerX=(left+right)/(2*1238);
    centerY=(top+bottom+36)/(2*845);
    const baseHeight=baseWidth*845/1238;
    const fitWidth=viewport.clientWidth/(baseWidth*(right-left)/1238*1.12);
    const fitHeight=viewport.clientHeight/(baseHeight*(bottom-top)/845*1.12);
    campusZoom=Math.max(1,Math.min(1.75,fitWidth,fitHeight));
  }else campusZoom=Math.max(1,Math.min(3,campusZoom+delta));
  const width=baseWidth*campusZoom,height=width*845/1238;
  drawing.style.width=`${width}px`;
  $('#campusZoomOut').disabled=campusZoom===1;$('#campusZoomIn').disabled=campusZoom===3;
  viewport.scrollLeft=centerX*width-viewport.clientWidth/2;viewport.scrollTop=centerY*height-viewport.clientHeight/2;
}
function setCampusMapInteraction(active){
  const viewport=$('#campusMapViewport'),button=$('#campusInteractMap');
  viewport.classList.toggle('is-interactive',active);
  button.setAttribute('aria-pressed',active);
  button.textContent=active?'Done moving map':'Interact with map';
}
function installCampusMapInteraction(viewport){
  const drawing=$('#campusMapDrawing'),pointers=new Map();
  let start=null,pinch=null,dragging=false,gestureMoved=false;
  const beginPan=point=>{start={x:point.x,y:point.y,left:viewport.scrollLeft,top:viewport.scrollTop};dragging=false};
  const beginPinch=()=>{
    const [a,b]=[...pointers.values()],rect=viewport.getBoundingClientRect();
    const width=parseFloat(drawing.style.width)||Math.max(viewport.clientWidth,760)*campusZoom;
    const midpointX=(a.x+b.x)/2,midpointY=(a.y+b.y)/2;
    pinch={distance:Math.max(1,Math.hypot(a.x-b.x,a.y-b.y)),zoom:campusZoom,x:(viewport.scrollLeft+midpointX-rect.left)/width,y:(viewport.scrollTop+midpointY-rect.top)/(width*845/1238)};
    for(const id of pointers.keys())viewport.setPointerCapture?.(id);
    gestureMoved=true;dragging=true;
  };
  viewport.addEventListener('pointerdown',event=>{
    const active=viewport.classList.contains('is-interactive');
    if((event.pointerType==='touch'&&!active)||event.button!==0||event.target.closest('button'))return;
    const point={x:event.clientX,y:event.clientY};pointers.set(event.pointerId,point);
    if(pointers.size===1){beginPan(point);pinch=null;gestureMoved=false}
    else if(pointers.size===2)beginPinch();
  });
  viewport.addEventListener('pointermove',event=>{
    if(!pointers.has(event.pointerId))return;
    pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
    if(pointers.size>=2&&pinch){
      const [a,b]=[...pointers.values()],midpointX=(a.x+b.x)/2,midpointY=(a.y+b.y)/2;
      const zoom=Math.max(1,Math.min(3,pinch.zoom*Math.hypot(a.x-b.x,a.y-b.y)/pinch.distance));
      changeCampusZoom(zoom-campusZoom);
      const rect=viewport.getBoundingClientRect(),width=parseFloat(drawing.style.width),height=width*845/1238;
      viewport.scrollLeft=pinch.x*width-(midpointX-rect.left);viewport.scrollTop=pinch.y*height-(midpointY-rect.top);
      return;
    }
    if(!start)return;
    const dx=event.clientX-start.x,dy=event.clientY-start.y;
    if(!dragging&&Math.hypot(dx,dy)>6){dragging=true;gestureMoved=true;viewport.setPointerCapture?.(event.pointerId);viewport.classList.add('is-panning')}
    if(dragging){viewport.scrollLeft=start.left-dx;viewport.scrollTop=start.top-dy}
  });
  const finish=event=>{
    if(!pointers.delete(event.pointerId))return;
    pinch=null;
    if(pointers.size>=2){beginPinch();return}
    if(pointers.size){beginPan([...pointers.values()][0]);return}
    if(gestureMoved){campusSuppressClick=true;setTimeout(()=>campusSuppressClick=false,0)}
    gestureMoved=false;
    start=null;dragging=false;viewport.classList.remove('is-panning');
  };
  viewport.addEventListener('pointerup',finish);viewport.addEventListener('pointercancel',finish);viewport.addEventListener('lostpointercapture',finish);
}
// Open supported maps or explain why another building is not yet available.
function showCampusBuilding(id){
  const building=CAMPUS_BUILDINGS.find(b=>b.id===id);if(!building||campusSuppressClick)return;
  $('#campusComingSoon').hidden=true;
  $$('.campus-building').forEach(el=>el.classList.toggle('is-selected',el.dataset.campusBuilding===id));
  if(BUILDINGS[id]){openBuilding(id);return;}
  $('#campusComingSoon').innerHTML=`<div><strong>${esc(building.name||id)}${building.name?` (${esc(id)})`:''}</strong><p>This building is not yet supported. Study maps are coming soon.</p></div><button type="button" data-dismiss-campus aria-label="Dismiss building message">×</button>`;
  $('#campusComingSoon').hidden=false;
}
// Explain which buildings have study maps: a hint in the map's top bar and a color legend.
function addCampusMapGuide(){
  const north=$('.campus-north'),heading=$('.campus-map-heading');
  if(heading&&!$('#campusMapHint')){
    const hint='<p id="campusMapHint" class="campus-map-hint">Select a green building to explore its floors.</p>';
    north?north.insertAdjacentHTML('beforebegin',hint):heading.insertAdjacentHTML('beforeend',hint);
  }
  const viewport=$('#campusMapViewport');
  if(viewport&&!$('#campusMapLegend'))viewport.insertAdjacentHTML('afterend','<div id="campusMapLegend" class="campus-map-legend"><span><i class="campus-legend-swatch is-available" aria-hidden="true"></i>Study maps available</span><span><i class="campus-legend-swatch" aria-hidden="true"></i>Coming soon</span></div>');
}
// 4. Shared helpers. A failed local save returns false to prevent a success message.
function save(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(data));return true}catch{showToast('Could not save on this device. Changes will last only until you refresh.');return false}}
// Built-in sample spots (labelled S1, S2...) stay as a backup beside spots pinned from the dev page.
// When the pinned data is complete, set this to false (or delete DEMO_SPOTS) to show only pinned spots.
const SHOW_SAMPLE_SPOTS=true;
function pinnedSpots(){return database.pinnedSpots.filter(s=>floorExists(s.building,s.floor))}
function allSpots(){return [...(SHOW_SAMPLE_SPOTS?DEMO_SPOTS:[]),...pinnedSpots(),...data.customSpots]}
function floorResources(){return database.pinnedResources.filter(r=>r.building===state.building&&floorIds(state.building,state.floor).includes(r.floor))}
function spotById(id){return allSpots().find(s=>s.id===id)}
// Simple furniture silhouettes show spot type; the adjacent badge shows seat capacity.
const SPOT_TYPE_ICON={
  solo:'<svg class="pin-type-icon" viewBox="0 0 20 20" aria-hidden="true"><path d="M6 3h8v8H6zM4 8v7h12V8M4 12h12M6 15v2m8-2v2"/></svg>',
  group:'<svg class="pin-type-icon" viewBox="0 0 20 20" aria-hidden="true"><path d="M3 6h14v3H3zM5 9v8m10-8v8"/></svg>'
};
function spotTypeLabel(spot){return spot.type==='group'?'Group study':'Individual study'}
function spotTypeIcon(spot){return SPOT_TYPE_ICON[spot.type==='group'?'group':'solo']}
// Use the database's seat counts for the built-in spots so pins, filters, and spot details all agree.
function applyDatabaseCapacities(){for(const s of DEMO_SPOTS){const n=database.capacities?.[s.id];if(Number.isInteger(n)&&n>0)s.capacity=n}}
// Two noise levels exist on the site: Quiet (stored low) and Social (stored medium). Old high values read as Social.
const NOISE_LABEL={low:'Quiet',medium:'Social',high:'Social'};
function noiseLabel(value){return NOISE_LABEL[value]||''}
function floorLabel(spot){const floors=BUILDINGS[spot.building].floors;return floors.find(f=>f.id===spot.floor)?.label||floors.find(f=>f.id===spot.floor.replace(/[NWE]$/,''))?.label||spot.floor}
function spotLocationSummary(spot){const room=spot.room||spot.roomNumber;return [floorLabel(spot),room?`Room ${room}`:spot.detail||''].filter(Boolean).join(' · ')}
// Built-in reports use Supabase when configured; custom suggestions stay local.
function usesDatabase(spot){return database.config.configured&&!spot.id.startsWith('custom-')}
// Read the newest report from the chosen store before falling back to sample status.
function currentReport(spot){return usesDatabase(spot)?(database.reports[spot.id]||[])[0]||null:(data.reports[spot.id]||[])[0]||null}
// When live conditions loaded, pins and filters use only recent approved reports; null means "no recent data".
function liveConditions(spot){return usesDatabase(spot)&&database.conditions?(database.conditions[spot.id]||{noise:null,busy:null}):null}
// With no recent live report, fall back to the spot's typical value (labeled "Typically ...") rather than an old report.
function currentBusy(spot){const live=liveConditions(spot);return live?(live.busy||spot.busy):(currentReport(spot)?.busy||spot.busy)}
function currentNoise(spot){const live=liveConditions(spot);return live?(live.noise||spot.noise):(currentReport(spot)?.noise||spot.noise)}
function isTypical(spot){const live=liveConditions(spot);return !!live&&!live.busy}
// Apply the selected scenario and any later edits through the same filter state.
function matches(spot){if(!state.buildings.has(spot.building))return false;if(state.study==='solo'&&spot.type!=='solo')return false;if(state.study==='group'&&(spot.type!=='group'||spot.capacity<state.groupSize))return false;if(state.layout==='secluded'&&!isSecluded(spot))return false;if(state.layout==='open'&&isSecluded(spot))return false;if(state.outlets&&!spot.outlets)return false;if(state.noise==='low'&&currentNoise(spot)!=='low')return false;if(state.noise==='medium'&&currentNoise(spot)!=='medium')return false;return true}
// Lower scores rank first: prefer quieter, less crowded, non-reservable spaces.
function rank(spot){return (spot.reserved?8:0)+(currentBusy(spot)==='low'?0:currentBusy(spot)==='medium'?2:currentBusy(spot)==='high'?5:3)+(currentNoise(spot)==='low'?0:1)}
function forecastValue(spot){return ({low:'Light',medium:'Moderate',high:'Busy'})[currentBusy(spot)]||''}
function labelBusy(spot){if(spot.reserved)return 'Reserve ahead';const value=forecastValue(spot);return value?`Forecast: ${value}`:liveConditions(spot)?'No recent data':'No report yet'}
function badgeClass(spot){return spot.reserved?'reserved':currentBusy(spot)==='low'?'forecast-light':currentBusy(spot)==='medium'?'forecast-moderate':currentBusy(spot)==='high'?'forecast-busy':currentBusy(spot)?'':'unknown'}
function forecastTag(spot){const value=forecastValue(spot);return value?`<span class="availability ${badgeClass(spot)}"><span class="tag-prefix">Forecast:&nbsp;</span><strong>${value}</strong></span>`:`<span class="availability ${badgeClass(spot)}">${esc(labelBusy(spot))}</span>`}
function isSecluded(spot){return !!(spot.private||spot.reserved||/\b(?:nook|corner|alcove|room)\b/i.test(spot.name||''))}
function layoutLabel(spot){return isSecluded(spot)?'Secluded':'Open Area'}
const POWER_ICON='<svg class="power-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M13.2 1.8 4.4 13h6l-.8 9.2L19.6 11h-6.2l-.2-9.2Z"/></svg>';
const GROUND_FLOOR_STAR='<svg class="ground-floor-star" viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2 2.9 6.1 6.8.9-5 4.8 1.2 6.8-5.9-3.2-5.9 3.2 1.2-6.8-5-4.8 6.8-.9L12 2Z"/></svg>';
function powerTag(spot){return spot.outlets?`<span class="power-tag">${POWER_ICON} Power</span>`:''}
function showToast(message){const toast=$('#toast');toast.textContent=message;toast.hidden=false;clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>toast.hidden=true,3500)}
// 5. Reporting. Keep the connection banner short; show details in the dialog.
function renderAuthNav(){const profileButton=$('#navProfile');if(profileButton)profileButton.hidden=true;const b=$('#navAuth');if(!b)return;const admin=auth.signedIn&&auth.isAdmin,name=auth.displayName||'Account';b.innerHTML=auth.signedIn?`<span class="auth-label">${esc(name)}</span><svg class="auth-chevron" viewBox="0 0 16 16" aria-hidden="true"><path d="m3.5 5.75 4.5 4.5 4.5-4.5"/></svg>`:'<span class="auth-label">Log in</span>';b.classList.toggle('is-signed-in',auth.signedIn);b.title=auth.signedIn?`Signed in as ${name}. Select to view account options.`:'';b.setAttribute('aria-label',auth.signedIn?`Account menu for ${name}`:'Log in or sign up');
  // Signed-in users get account options; administrative links appear only for admins.
  let menu=$('#navMenu');
  if(auth.signedIn){
    if(!menu){menu=document.createElement('div');menu.id='navMenu';menu.className='nav-menu';menu.setAttribute('role','menu');menu.hidden=true;document.body.append(menu)}
    menu.innerHTML=`<button role="menuitem" class="nav-menu-item" type="button" id="navMenuProfile">Profile</button>${admin?'<a role="menuitem" class="nav-menu-item" href="admin.html">Dev tools</a><a role="menuitem" class="nav-menu-item" href="okr.html">Impact</a>':''}<button role="menuitem" class="nav-menu-item" type="button" id="navLogout">Log out</button>`;
    b.setAttribute('aria-haspopup','menu');b.setAttribute('aria-expanded','false');
  }else{menu?.remove();b.removeAttribute('aria-haspopup');b.removeAttribute('aria-expanded')}
}
function toggleNavMenu(open){const b=$('#navAuth'),menu=$('#navMenu');if(!b||!menu)return;const show=open??menu.hidden;if(show){const r=b.getBoundingClientRect();menu.style.top=`${r.bottom+6}px`;menu.style.right=`${Math.max(8,window.innerWidth-r.right)}px`}menu.hidden=!show;b.setAttribute('aria-expanded',String(show));if(show)menu.querySelector('[role="menuitem"]')?.focus()}
function logOut(){void auth.signOut().then(()=>{showToast('Logged out.');render()})}
// Saved lists follow the account when the database is connected. Device lists (data.lists) are used
// only when no database is configured, so one person's lists never leak into another account.
const cloud={lists:[],ready:false,error:'',userId:null,promise:null};
const cloudMode=()=>database.config.configured;
function activeLists(){return cloudMode()?(auth.signedIn&&cloud.ready?cloud.lists:[]):data.lists}
function loadCloudLists(){
  const user=auth.userId;cloud.ready=false;cloud.error='';
  const job=(async()=>{
    try{
      const rows=await database.loadFavorites();
      if(auth.userId!==user)return;
      cloud.lists=rows.map(r=>({id:r.name.toLowerCase()==='favorites'?'favorites':`list-${r.dbId}`,dbId:r.dbId,name:r.name,spots:r.spots}));
      cloud.ready=true;
    }catch(problem){if(auth.userId===user)cloud.error=problem.message}
    if(cloud.promise===job)cloud.promise=null;
    renderSaved();
  })();
  cloud.promise=job;renderSaved();return job;
}
auth.onChange(()=>{
  renderAuthNav();
  if(state.view==='profile'){if(auth.signedIn)renderProfile(true);else setView('explore');}
  if(auth.userId===cloud.userId)return;
  Object.assign(cloud,{lists:[],ready:false,error:'',userId:auth.userId,promise:null});state.selectedList='favorites';state.listEditMode=false;
  if(auth.userId)void loadCloudLists();else renderSaved();
});
// Login / sign-up dialog. mode is 'login' or 'signup'; after is an optional callback run on success.
function openAuth(mode='login',after=null){
  openAuth.after=after;const signup=mode==='signup';
  openModal(`${modalHeader(signup?'Create your account':'Log in')}<p class="modal-description">${signup?'Sign up to save favorites and have your reports tied to you.':'Log in to use your saved favorites.'}</p><form id="authForm" data-mode="${mode}" novalidate>${signup?'<div class="form-field"><label for="authFirst">First name</label><input id="authFirst" name="first" required maxlength="60" autocomplete="given-name"></div><div class="form-field"><label for="authLast">Last name</label><input id="authLast" name="last" maxlength="60" autocomplete="family-name"></div>':''}<div class="form-field"><label for="authEmail">Email</label><input id="authEmail" name="email" type="email" required autocomplete="email"></div><div class="form-field"><label for="authPassword">Password</label><div class="password-input-wrap"><input id="authPassword" name="password" type="password" required minlength="8" autocomplete="${signup?'new-password':'current-password'}"><button type="button" class="password-toggle" data-password-toggle="authPassword" aria-controls="authPassword" aria-label="Show password" aria-pressed="false" title="Show password"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.4-6 9.5-6 9.5 6 9.5 6-3.4 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.5"/></svg></button></div>${signup?'<small>At least 8 characters.</small>':''}</div><p class="form-error" id="authError" role="alert" hidden></p><button type="button" class="text-link" id="resendConfirm" hidden>Resend confirmation email</button><div class="modal-actions"><button type="button" class="secondary-button" data-auth-switch="${signup?'login':'signup'}">${signup?'I have an account':'Create account'}</button><button type="submit" class="primary-button">${signup?'Sign up':'Log in'}</button></div></form>`);
}
async function submitAuth(form){
  const f=form.elements,signup=form.dataset.mode==='signup',err=$('#authError'),btn=form.querySelector('[type=submit]');
  const show=m=>{err.textContent=m;err.hidden=false};err.hidden=true;$('#resendConfirm').hidden=true;
  const email=f.email.value.trim(),password=f.password.value,first=signup?f.first.value.trim():'',last=signup?f.last.value.trim():'';
  if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))return show('Enter a valid email address.');
  if(signup&&!first)return show('Enter your first name.');
  if(password.length<8)return show('Password must be at least 8 characters.');
  if(!database.config.configured||database.loading)return show('The database is not connected yet. Wait a moment and try again.');
  btn.disabled=true;
  try{
    if(signup){const r=await auth.signUp({email,password,firstName:first,lastName:last});if(r.needsConfirmation){closeModal(true);showToast('Account created. Check your email to confirm it, then log in.');return}}
    else await auth.signIn({email,password});
    const after=openAuth.after;openAuth.after=null;closeModal(true);showToast(`Welcome, ${auth.displayName||'friend'}!`);render();if(after)after();
  }catch(problem){show(problem.message);if(problem.code==='email_not_confirmed')$('#resendConfirm').hidden=false}finally{btn.disabled=false}
}
function renderDatabaseStatus(){
  $$('[data-arrival-stage]').forEach(button=>{button.disabled=database.loading||!database.configLoaded;});
  $('#databaseWarning').hidden=database.loading||(!database.error&&database.config.configured&&database.ready);
}
// The returned database row is the persistence proof shown after a remote save.
function renderDatabaseReceipt(report){
  const spot=spotById(report.spotId);
  $('#databaseReceipt').innerHTML=`<h2>Your report was submitted</h2><p>${esc(spot?.name||report.spotId)}</p><p>Noise: ${esc(noiseLabel(report.noise))} · Crowding: ${esc(report.busy)}</p>${report.note?`<p>${esc(report.note)}</p>`:''}`;
  $('#databaseReceipt').hidden=false;
  // Hide the confirmation banner after one minute.
  clearTimeout(renderDatabaseReceipt.timer);renderDatabaseReceipt.timer=setTimeout(()=>{$('#databaseReceipt').hidden=true},60000);
}
// Block duplicate submissions and keep failed remote saves visible as errors.
async function submitArrival(form){
  if(reportSubmissionPending)return;
  const id=form.dataset.id;
  const input={noise:form.elements.noise.value,busy:form.elements.busy.value,note:form.elements.note.value.trim(),available:form.elements.available.value?form.elements.available.value==='yes':undefined};
  const button=form.querySelector('[type="submit"]'),error=form.querySelector('#arrivalError');
  if(input.available===undefined){error.textContent='Tell us whether the spot was available when you arrived.';error.hidden=false;return;}
  if(!input.noise||!input.busy)return;
  if(database.loading||!database.configLoaded){error.textContent=database.loading?'Wait for the connection check to finish.':'Connection settings could not be checked. Start with npm start and fix setup before reporting.';error.hidden=false;return;}
  if(database.error&&!database.config.configured){error.textContent=database.error;error.hidden=false;return;}
  const remote=usesDatabase(spotById(id));
  clearTimeout(renderDatabaseReceipt.timer);$('#databaseReceipt').hidden=true;
  reportSubmissionPending=true;button.disabled=true;button.textContent=remote?'Saving to Supabase…':'Saving locally…';error.hidden=true;
  try{
    // Show remote success only after the adapter validates the returned row.
    if(remote&&auth.signedIn){const report=await database.submitAiReport(id,input);closeModal(true);render();renderDatabaseStatus();if(report.status!=='rejected')renderDatabaseReceipt(report);showToast(report.status==='approved'?'Thanks! Your report is live.':report.status==='rejected'?'Your report was not accepted as a valid conditions report.':'Thanks! Your report is saved and will appear once it is checked.');}
    else if(remote){const report=await database.submitReport(id,input);closeModal(true);render();renderDatabaseStatus();renderDatabaseReceipt(report);showToast('Thanks! Your report was submitted.');}
    else{const report={...input,time:Date.now(),source:'local'};(data.reports[id]??=[]).unshift(report);data.reports[id]=data.reports[id].slice(0,10);const saved=save();closeModal(true);render();if(saved)showToast('Local preview: report saved only on this device.');}
  }catch(problem){error.textContent=problem.message;error.hidden=false;database.error=problem.message;renderDatabaseStatus();}
  finally{reportSubmissionPending=false;button.disabled=false;button.textContent='Submit';}
}
// 6. Views. Reuse building checkboxes so updates preserve keyboard focus.
const COMPACT_LAYOUT_QUERY='(max-width:800px), (max-width:1100px) and (max-height:500px)';
function isCompactLayout(){return window.matchMedia?.(COMPACT_LAYOUT_QUERY).matches??false}
function setBuildingPanel(panel){
  $('.building-layout').dataset.panel=panel;
  $$('[data-building-panel]').forEach(button=>button.setAttribute('aria-pressed',button.dataset.buildingPanel===panel));
  if(panel==='map'){resizeDigitalMap();const building=state.building;if(!buildingPlans(building))loadPlans(building).then(()=>{if(state.view==='building'&&state.building===building&&$('.building-layout').dataset.panel==='map')renderBuilding()}).catch(()=>showToast('Floor map could not load. Check your connection and try again.'))}
}
function setMapInteraction(active){
  $('#floorPlan').classList.toggle('is-interactive',active);
  $('#interactMap').setAttribute('aria-pressed',active);
  $('#interactMap').textContent=active?'Done moving map':'Interact with map';
}
function renderFilters(){
  if(!$('#buildingFilters').children.length)$('#buildingFilters').innerHTML=Object.entries(BUILDINGS).map(([id,b])=>`<label class="building-check"><input type="checkbox" value="${id}"><span>${id}</span><small>${esc(b.short)}</small></label>`).join('');
  $$('#buildingFilters input').forEach(input=>input.checked=state.buildings.has(input.value));
  $$('[data-study]').forEach(b=>{const selected=b.dataset.study===state.study;b.classList.toggle('is-selected',selected);b.setAttribute('aria-pressed',selected)});
  $$('[data-noise]').forEach(b=>{const selected=b.dataset.noise===state.noise;b.classList.toggle('is-selected',selected);b.setAttribute('aria-pressed',selected)});
  $$('[data-layout]').forEach(b=>{const selected=b.dataset.layout===state.layout;b.classList.toggle('is-selected',selected);b.setAttribute('aria-pressed',selected)});
  $('#groupSizeWrap').hidden=state.study!=='group';$('#groupSize').value=state.groupSize;$('#groupSizeValue').textContent=`${state.groupSize} people`;
  $('#outletFilter').checked=state.outlets;
}
// Show scenario presets rather than recommendations for specific rooms.
function renderRecommendations(){
  const playlistPower=`<span class="playlist-power">${POWER_ICON} Power</span>`;
  const playlists=[['deep-focus','Deep Focus',`Noise: Quiet · Secluded · ${playlistPower}`],['group-project','Group Project','Noise: Social · Open Area · Group 4+'],['quick-touchdown','Between Classes','Open Area · Noise: Social'],['dead-battery','Dead Battery',`${playlistPower} · Solo study`]];
  $('#recommendationsList').innerHTML=playlists.map(([id,title,filters])=>`<button type="button" class="playlist-card" data-playlist="${id}"><span class="playlist-title">${title}</span><span class="playlist-filters">${filters}</span></button>`).join('');
}
// Select the drawing and controls for the active building, floor, and side.
function renderBuilding(){
  const restoreFocus=retainControlFocus($('#buildingView'));
  const building=BUILDINGS[state.building];if(!building)return;
  $('#buildingTitle').textContent=building.name;$('#buildingSummary').textContent=building.description;renderHours();
  $('#buildingSelect').innerHTML=Object.entries(BUILDINGS).map(([id,b])=>`<option value="${id}" ${id===state.building?'selected':''}>${id}</option>`).join('');
  const floor=building.floors.find(f=>f.id===state.floor)||building.floors[0];state.floor=floor.id;
  const isWsc=state.building==='WSC',isHbll=state.building==='HBLL';
  const digital=buildingPlans()?.[state.floor],isDigital=!!digital;
  // The floor-plan bundle loads on demand; until it arrives show a neutral loading state, never the old schematic stand-in.
  const loadingPlans=!digital&&!buildingPlans();
  // WSC and HBLL have split drawings; JKB has one drawing per floor.
  const sides=isWsc?['East','West']:['North','South'];
  const hasSides=isDigital&&building.floors.filter(f=>f.level===floor.level).length>1;
  const levels=[...new Set(building.floors.map(f=>f.level))].sort((a,b)=>a-b);
    const groundLevel=building.floors.find(f=>f.id===building.groundFloor)?.level;
  $('#floorTabs').innerHTML=loadingPlans?'':isDigital?levels.map(level=>`<button class="floor-tab ${floor.level===level?'is-selected':''} ${level===groundLevel?'is-ground':''}" data-${state.building.toLowerCase()}-level="${level}" type="button" aria-label="${level===0?'Basement':`Floor ${level}`}${level===groundLevel?', ground floor':''}" title="${level===groundLevel?'Ground floor':''}">${level===groundLevel?GROUND_FLOOR_STAR:''}<span>${level===0?'B':level}</span></button>`).join(''):building.floors.map(f=>`<button class="floor-tab ${f.id===state.floor?'is-selected':''} ${f.level===groundLevel?'is-ground':''}" data-floor="${f.id}" type="button" aria-label="${esc(f.label)}${f.level===groundLevel?', ground floor':''}" title="${f.level===groundLevel?'Ground floor':''}">${f.level===groundLevel?GROUND_FLOOR_STAR:''}<span>${esc(f.label)}</span></button>`).join('');
  $('#floorSideTabs').hidden=!hasSides;
  $('#floorSideTabs').innerHTML=hasSides?sides.map(side=>`<button class="floor-tab ${floor.side===side?'is-selected':''}" data-${isHbll?'hbll':'wsc'}-side="${side}" type="button">${side}</button>`).join(''):'';
  $('#floorMapControls').hidden=!isDigital;
  $('#roomTools').hidden=!isDigital;$('#mapInstructions').hidden=!isDigital;
  $('#floorDisclaimer').hidden=isDigital;
  $('#toggleNooks').hidden=!isDigital;
  $('#toggleResources').hidden=!isDigital;
  if(!isHbll)state.selectedResource=null;
  $('#toggleNooks').setAttribute('aria-pressed',String(state.nooksVisible));
  $('#toggleResources').setAttribute('aria-pressed',String(state.resourcesVisible));
  $('#resourceFilters').hidden=!(isDigital&&state.resourcesVisible);
  if(isDigital){$('#zoomOut').disabled=state.zoom<=1;$('#zoomIn').disabled=state.zoom>=8}
  const spots=allSpots().filter(s=>s.building===state.building&&floorIds(state.building,state.floor).includes(s.floor));
  $('#mapModeEmptyNotice').hidden=true;
  const plan=$('#floorPlan');
  if(isDigital){
    plan.className=`floor-plan native-plan ${state.building.toLowerCase()}-plan ${state.zoom<=1&&!state.locatedSpot?'subdued-room-labels':''} ${state.locatedSpot||state.zoom>1?'show-nearby-room-labels':''}`;plan.setAttribute('aria-label',`Interactive ${building.short} ${floor.label} map`);
    // Translate page-based pin positions into percentages of the cropped SVG.
    const studyPoints={WSC:WILK_STUDY_POINTS,HBLL:HBLL_STUDY_POINTS,JKB:JKB_STUDY_POINTS}[state.building]||{};let sampleCount=0;
    const resources=isHbll?hbllFloorResources(digital):[];
    const selectedResource=state.selectedResource;
    const markerOffsets=[[0,0],[36,0],[-36,0],[0,36],[0,-36],[28,28],[-28,28],[28,-28],[-28,-28],[48,0],[0,48],[-48,0],[0,-48]];
    const resourcePoints=[];
    resources.forEach(([,px,py])=>{const point=markerOffsets.map(([dx,dy])=>[px+dx,py+dy]).find(([x,y])=>resourcePoints.every(([prevX,prevY])=>Math.hypot(x-prevX,y-prevY)>=34))||[px,py];resourcePoints.push(point)});
    const addedResources=floorResources(),resourceCount=resources.length+addedResources.length;
    const libraryResourceButtons=resources.map(([name],i)=>{const room=HBLL_RESOURCE_ROOMS[name],key=`${state.floor}:${i}`,selectedResourceIsActive=selectedResource===key;return `<button type="button" class="resource-filter ${selectedResourceIsActive?'is-selected':''}" data-resource="${key}" aria-pressed="${selectedResourceIsActive}" title="${esc(resourceTooltip(name))}"><span class="resource-letter">${resourceLetters(i)}</span><span class="resource-filter-name">${esc(name)}${room?`<small>Room ${esc(room)}</small>`:''}</span></button>`});
    const addedResourceButtons=addedResources.map(r=>`<button type="button" class="resource-filter" data-pinned-resource="${esc(r.id)}" title="${esc(r.info)}"><span class="resource-letter">${esc(r.type.charAt(0).toUpperCase())}</span><span class="resource-filter-name">${esc(r.type)}<small>${esc(r.info)}${r.where?` · ${esc(r.where)}`:''}</small></span></button>`);
    $('#resourceFilters').innerHTML=resourceCount?`<span class="resource-filter-label">${esc(floor.label)} resources</span>${[...libraryResourceButtons,...addedResourceButtons].join('')}`:'<span class="resource-filter-empty">No resources are listed for this floor yet.</span>';
    $('#resourceFilters').hidden=!(isDigital&&state.resourcesVisible&&resourceCount>0);
    $('#mapModeEmptyNotice').hidden=!(isDigital&&(state.nooksVisible?!spots.length:!resourceCount));
    $('#mapModeEmptyNotice').textContent=state.nooksVisible?'No Nooks are listed on this floor yet.':'No resources are listed on this floor yet.';
    const nookPins=state.nooksVisible?spots.map(s=>{let x,y;const label=String(Number.isInteger(s.capacity)&&s.capacity>0?s.capacity:1);[x,y]=pinPercent(digital,s,studyPoints);return `<button type="button" class="plan-pin seat-pin ${s.reserved?'reserved':''} ${matches(s)?'':'is-dimmed'} ${state.selectedSpot===s.id||state.locatedSpot===s.id?'is-selected':''}" style="left:${x}%;top:${y}%" data-spot="${esc(s.id)}" title="${esc(s.name)} · ${spotTypeLabel(s)} · seats ${label}" aria-label="${esc(s.name)}, ${spotTypeLabel(s)}, seats ${label}"><i class="pin-badge" aria-hidden="true">${spotTypeIcon(s)}<span class="pin-capacity">${label}</span></i></button>`}).join(''):'';
    const resourcePins=state.resourcesVisible&&isHbll?resources.map(([name],i)=>{const [px,py]=resourcePoints[i],x=(px-digital.crop[0])/digital.width*100,y=(py-digital.crop[1])/digital.height*100,selected=selectedResource===`${state.floor}:${i}`;return `<button type="button" class="resource-pin ${selected?'is-selected':''} ${selectedResource!==null&&!selected?'is-dimmed':''}" style="left:${x}%;top:${y}%" data-resource="${state.floor}:${i}" title="${resourceLetters(i)} · ${esc(resourceTooltip(name))}" aria-label="Resource ${resourceLetters(i)}: ${esc(resourceTooltip(name))}">${resourceLetters(i)}</button>`}).join(''):'';
    const pinnedResources=state.resourcesVisible?addedResources.map(r=>{const [rx,ry]=pinPercent(digital,r,studyPoints);return `<button type="button" class="plan-pin pinned-resource-pin" style="left:${rx}%;top:${ry}%" data-pinned-resource="${esc(r.id)}" title="${esc(r.type)}: ${esc(r.info)}" aria-label="${esc(r.type)}: ${esc(r.info)}${r.where?`, ${esc(r.where)}`:''}">${esc(r.type.charAt(0).toUpperCase())}</button>`}).join(''):'';
    plan.innerHTML=`<div class="plan-scroll"><div class="plan-canvas"><div id="planStage" class="plan-stage">${digital.svg}${nookPins}${resourcePins}${pinnedResources}</div></div></div>`;
    if(isHbll){
      const serviceResources=Object.assign({},...floorIds('HBLL',state.floor).map(id=>HBLL_SERVICE_ROOM_RESOURCES[id]||{}));
      $$('#floorPlan .map-space-service[data-room]').forEach(area=>{const name=serviceResources[area.dataset.room],title=area.querySelector('title');if(name&&title)title.textContent=resourceTooltip(name)});
    }
    $('#floorLegend').innerHTML=`<span><i class="map-key-swatch room"></i>Rooms</span><span><i class="map-key-swatch open"></i>Open areas</span>`+(state.nooksVisible?`<span><i class="legend-type-icon">${SPOT_TYPE_ICON.solo}</i>Individual</span><span><i class="legend-type-icon">${SPOT_TYPE_ICON.group}</i>Group</span><span>Number shows seats</span>`:`<span><i class="map-key-swatch service"></i>Resources</span>`)+(addedResources.length?'<span><i class="legend-dot resource"></i>Added resources</span>':'')+(digital.hasStairTargets?'<span><i class="stair-entrance-key"></i>Hover stairs for entrance</span>':'');
    $('#mapNorth').innerHTML=`N <span style="display:inline-block;transform:rotate(${digital.north}deg)">↑</span>`;
    // Room-number overlays are labels only; floor-map interactions are reserved for spots and map controls.
    $$('#floorPlan .digital-floor-svg > desc').forEach(description=>{
      description.textContent=description.textContent.replace(/Select a numbered room to locate it\.?/gi,'Room numbers are labels; study-spot pins are interactive.');
    });
    $$('#floorPlan .map-room').forEach(label=>{label.removeAttribute('role');label.removeAttribute('tabindex')});
    mapResizeObserver.disconnect();mapResizeObserver.observe(plan);
    setMapInteraction(!isCompactLayout());resizeDigitalMap();installMapPan();
  }else if(loadingPlans){
    plan.className='floor-plan';plan.setAttribute('aria-label','Loading floor map');
    plan.innerHTML='<p class="plan-loading" role="status">Loading floor map…</p>';
    $('#floorLegend').innerHTML='';$('#floorDisclaimer').textContent='';
  }else{
    const amenities=[{name:'Restroom',symbol:'WC',x:48,y:18},{name:'Vending',symbol:'V',x:20,y:53},{name:'Printer',symbol:'P',x:78,y:53}];
    plan.className='floor-plan';plan.setAttribute('aria-label','Illustrative floor view of study spots');
    plan.innerHTML=`<div class="floor-wing wing-a">Study zone</div><div class="floor-wing wing-b">Study zone</div><div class="floor-wing wing-c">Rooms & seating</div><div class="floor-wing wing-d">Rooms & seating</div><div class="floor-center" aria-label="Central corridor">+</div>${spots.map(s=>`<button type="button" class="floor-spot ${s.reserved?'reserved':''} ${matches(s)?'':'is-dimmed'} ${state.selectedSpot===s.id?'is-selected':''}" style="left:${s.x}%;top:${s.y}%;transform:translate(-50%,-50%)" data-spot="${esc(s.id)}" aria-label="${esc(s.name)}, ${s.reserved?'reservation required':labelBusy(s)}"><i aria-hidden="true"></i><span>${esc(s.name)}</span></button>`).join('')}${amenities.map(a=>`<span class="amenity-marker" style="left:${a.x}%;top:${a.y}%" aria-label="Illustrative ${a.name.toLowerCase()} position"><b>${a.symbol}</b>${a.name}</span>`).join('')}`;
    $('#floorLegend').innerHTML='<span><i class="legend-dot open"></i>Open study area</span><span><i class="legend-dot reserved"></i>Reservation required</span><span><i class="legend-dot amenity"></i>Amenity</span>';
    $('#floorDisclaimer').textContent='This is a schematic guide, not an architectural floor plan.';
  }
  const matched=spots.filter(matches).sort((a,b)=>rank(a)-rank(b));
  const selected=spots.find(s=>s.id===state.selectedSpot);
  const arrivalFocus=spots.find(s=>s.id===state.arrivalReadySpot);
  const arrivalFocused=!!arrivalFocus;
  $('#studyResults').classList.toggle('is-arrival-focused',arrivalFocused);
  $('#backToMatchingSpots').hidden=!arrivalFocused;
  $('#resultsHead').hidden=arrivalFocused;
  $('#activeFilterControls').hidden=arrivalFocused;
  $('#keepSearching').hidden=arrivalFocused;
  $('#mobileSpotCount').hidden=arrivalFocused;
  const displayed=arrivalFocus?[arrivalFocus]:selected&&!matched.some(s=>s.id===selected.id)?[selected,...matched]:matched;
  $('#mobileSpotCount').textContent=arrivalFocus?1:matched.length;
  $('#resultsHeading').textContent=`Study spots (${arrivalFocus?1:matched.length})`;
  const activeFilters=[];
  if(state.study==='group')activeFilters.push(['study',`Group ${state.groupSize}+`]);else if(state.study==='solo')activeFilters.push(['study','Solo']);
  if(state.noise==='low')activeFilters.push(['noise','Quiet']);if(state.noise==='medium')activeFilters.push(['noise','Social']);
  if(state.layout!=='any')activeFilters.push(['layout',state.layout==='open'?'Open Area':'Secluded']);if(state.outlets)activeFilters.push(['outlets','Power']);
  $('#activeFilterBar').innerHTML=activeFilters.map(([filter,label])=>`<span>${esc(label)}<button type="button" class="active-filter-dismiss" data-dismiss-filter="${filter}" aria-label="Remove ${esc(label)} filter" title="Remove ${esc(label)} filter"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4 4 8 8M12 4l-8 8"/></svg></button></span>`).join('')||'<span>All study types</span>';
  const activeCardFilters=[];
  if(state.study==='solo')activeCardFilters.push('Individual');
  if(state.layout==='open')activeCardFilters.push('Open Area');else if(state.layout==='secluded')activeCardFilters.push('Secluded');
  if(state.outlets)activeCardFilters.push('Power');
  $('#spotList').innerHTML=displayed.length?displayed.map(s=>{
    const attributes=[];
    const studyAttribute=s.type==='group'?`Group up to ${s.capacity}`:'Individual';
    if(!activeCardFilters.includes(studyAttribute))attributes.push(esc(studyAttribute));
    const layoutAttribute=layoutLabel(s);if(!activeCardFilters.includes(layoutAttribute))attributes.push(esc(layoutAttribute));
    if(s.outlets&&!activeCardFilters.includes('Power'))attributes.push(powerTag(s));
    const attributeMarkup=attributes.length?`<p>${attributes.join(' · ')}</p>`:'';
    return `<article class="spot-card ${state.selectedSpot===s.id?'is-selected':''}"><button type="button" class="spot-row" data-spot="${esc(s.id)}" aria-expanded="${state.selectedSpot===s.id}" aria-controls="spotDetail-${esc(s.id)}"><div class="spot-row-top"><h3>${esc(s.name)}</h3>${forecastTag(s)}</div>${attributeMarkup}<span class="spot-location">${esc(spotLocationSummary(s))}</span></button><div class="spot-card-actions"><button type="button" class="subtle-button locate-spot-button" data-locate-spot="${esc(s.id)}">Locate on map</button></div>${state.selectedSpot===s.id?`<div class="spot-detail" id="spotDetail-${esc(s.id)}">${spotDetailContent(s)}</div>`:''}</article>`
  }).join(''):`<div class="empty-state"><h3>No matching spots on this floor</h3><p>Try another floor or update your filters.</p><button type="button" class="secondary-button" data-action="edit">Edit filters</button></div>`;
  const located=spots.find(s=>s.id===state.locatedSpot),locatedPanel=$('#locatedSpotPanel');
  locatedPanel.hidden=!(isDigital&&located);
  if(isDigital&&located){const room=located.room||located.roomNumber,focusBack=state.arrivalReadySpot===located.id?`<button type="button" class="arrival-map-back" data-back-to-matches aria-label="Back to all matching spots" title="Back to all matching spots"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg></button>`:'',arrivalAction=state.arrivalReadySpot===located.id?`<button type="button" class="primary-button is-en-route arrival-stage-action" data-arrival-stage="${esc(located.id)}" aria-pressed="true" ${database.loading||!database.configLoaded?'disabled':''}>I've Arrived</button>`:'';locatedPanel.innerHTML=`<div><strong>${esc(located.name)}</strong><span>${esc(floorLabel(located))}${room?` · Room ${esc(room)}`:located.detail?` · ${esc(located.detail)}`:''}</span></div>${focusBack}${arrivalAction}<button type="button" data-clear-located-spot aria-label="Clear located spot">×</button>`}
  const queueIndex=searchBuildingQueue.indexOf(state.building);if(queueIndex>=0)searchBuildingIndex=queueIndex;else if(searchBuildingQueue.length)searchBuildingIndex=searchBuildingQueue.length-1;
  const nextBuilding=searchBuildingQueue[searchBuildingIndex+1];$('#keepSearching').textContent=nextBuilding?`Try the ${nextBuilding} next`:'Back to campus map';
  $$('#floorTabs button,#floorSideTabs button').forEach(button=>button.setAttribute('aria-pressed',button.classList.contains('is-selected')));
  restoreFocus();
}
// Find a rebuilt control by stable ID or data attribute and return focus to it.
function retainControlFocus(root){
  const active=document.activeElement;
  if(!active||!root.contains(active))return ()=>{};
  const id=active.id,attributes=[...active.attributes].filter(a=>a.name.startsWith('data-')).map(a=>[a.name,a.value]);
  return ()=>{
    if(active.isConnected)return;
    const replacement=id?document.getElementById(id):attributes.length?[...root.querySelectorAll('button,[tabindex]')].find(el=>attributes.every(([key,value])=>el.getAttribute(key)===value)):null;
    replacement?.focus({preventScroll:true});
  };
}
// Lists store spot IDs, not copies, so details use the current catalogue and reports.
function renderSaved(){
  renderProfileLists();
  const cloudOn=cloudMode(),lists=activeLists();
  const canCreate=cloudOn?auth.signedIn&&cloud.ready&&lists.length<3:lists.length<3;
  $('#createList').disabled=!canCreate;$('#createList').title=lists.length>=3?'Two custom lists maximum':'';
  $('#savedIntro').textContent=cloudOn?'Your saved study spots, kept with your account on every device.':'Keep your go-to study spots together on this device.';
  if(!lists.some(l=>l.id===state.selectedList)){state.selectedList='favorites';state.listEditMode=false}
  const restoreFocus=retainControlFocus($('#savedView'));
  $('#savedTabs').innerHTML=lists.map(l=>`<button type="button" class="saved-tab ${l.id===state.selectedList?'is-selected':''}" data-list="${esc(l.id)}" aria-pressed="${l.id===state.selectedList}">${esc(l.name)} <span>${l.spots.length}</span></button>`).join('');
  const list=lists.find(l=>l.id===state.selectedList);
  const canEditList=!!list&&(!cloudOn||(auth.signedIn&&cloud.ready));if(!canEditList)state.listEditMode=false;
  const canManageList=canEditList&&list.id!=='favorites'&&state.listEditMode;
  const listActions=$('#savedListActions');listActions.hidden=!canEditList;listActions.innerHTML=canEditList?`${canManageList?`<button type="button" class="secondary-button" data-rename-list="${esc(list.id)}">Rename list</button><button type="button" class="danger-button" data-delete-list="${esc(list.id)}">Delete list</button>`:''}<button type="button" class="secondary-button" data-toggle-list-edit aria-pressed="${state.listEditMode}" aria-label="${state.listEditMode?'Done editing list':'Edit current list'}">${state.listEditMode?'Done':'Edit'}</button>`:'';
  const message=(title,text,button)=>`<div class="empty-state"><h3>${title}</h3><p>${text}</p>${button||''}</div>`;
  if(cloudOn&&!auth.signedIn)$('#savedItems').innerHTML=message('Log in to see your saved spots','Your lists are saved to your account, so they follow you to any device.','<button type="button" class="primary-button" data-action="login">Log in or sign up</button>');
  else if(cloudOn&&cloud.error)$('#savedItems').innerHTML=message('Your lists could not load',esc(cloud.error),'<button type="button" class="secondary-button" data-action="retry-lists">Try again</button>');
  else if(cloudOn&&!cloud.ready)$('#savedItems').innerHTML=message('Loading your lists…','One moment.');
  else{
    const spots=list.spots.map(spotById).filter(Boolean);
    $('#savedItems').innerHTML=spots.length?spots.map(s=>`<div class="saved-card"><div><span class="rec-building">${s.building} / ${esc(floorLabel(s))}</span><h3>${esc(s.name)}</h3><p>${s.type==='group'?`Group up to ${s.capacity}`:'Individual'} · ${forecastTag(s)}</p></div><div class="saved-card-actions"><button type="button" data-open-saved="${esc(s.id)}">View ↗</button>${state.listEditMode?`<button type="button" class="saved-remove-button" data-remove-saved="${esc(s.id)}" aria-label="Remove ${esc(s.name)} from this list">Remove</button>`:''}</div></div>`).join(''):message('Nothing saved here yet','Open a study spot and save it to this list.','<button type="button" class="secondary-button" data-action="explore">Explore spaces</button>');
  }
  restoreFocus();
}
// Refresh shared UI; rebuild the floor drawing only when that view is visible.
function render(){renderFilters();renderRecommendations();if(state.view==='building')renderBuilding();renderSaved();renderProfile();$$('.view').forEach(v=>v.hidden=v.id!==`${state.view}View`);document.documentElement.classList.toggle('explore-snap',state.view==='explore');const exploring=state.view==='explore'||state.view==='building';$('#navExplore').classList.toggle('is-active',exploring);$('#navSaved').classList.toggle('is-active',state.view==='saved');$('#navProfile')?.classList.toggle('is-active',state.view==='profile');$('#navExplore').setAttribute('aria-current',exploring?'page':'false');$('#navSaved').setAttribute('aria-current',state.view==='saved'?'page':'false');$('#navProfile')?.setAttribute('aria-current',state.view==='profile'?'page':'false');$$('#savedTabs button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.list===state.selectedList));if(state.view==='explore'){document.documentElement.style.setProperty('--header-height',`${$('.site-header').offsetHeight}px`);if(!campusZoomInitialized&&$('#campusMapViewport').clientWidth){changeCampusZoom(0,true);campusZoomInitialized=true}else if(campusZoomInitialized)changeCampusZoom(0)}}
// Announce view changes through the heading without extra scrolling.
function focusView(){const heading=$(`#${state.view}View h1`);heading?.setAttribute('tabindex','-1');heading?.focus({preventScroll:true})}
function setView(view){const changed=state.view!==view;if(changed)viewHistory.push(state.view);state.view=view;render();if(changed)focusView();if(!isCompactLayout())window.scrollTo({top:0,behavior:'smooth'})}
function goBack(){state.view=viewHistory.pop()||'explore';render();focusView();if(!isCompactLayout())window.scrollTo({top:0,behavior:'smooth'})}
// Changing drawings clears the previous spot selection.
function openBuilding(id,floor,panel=isCompactLayout()?'spots':'map'){if(!BUILDINGS[id])return;$('#campusComingSoon').hidden=true;state.building=id;let normalizedFloor=floor;if(id==='HBLL'&&floor)normalizedFloor=floor.replace(/N$/,'');if(id==='WSC'&&floor&&/^([1-3])[EW]$/.test(floor))normalizedFloor=floor.slice(0,1);state.floor=normalizedFloor||BUILDINGS[id].groundFloor||BUILDINGS[id].floors[0].id;state.zoom=1;state.selectedSpot=null;state.locatedSpot=null;setBuildingPanel(panel);setView('building')}
function centerLocatedSpot(id){requestAnimationFrame(()=>requestAnimationFrame(()=>{if(isCompactLayout())setMapInteraction(true);const viewport=$('.plan-scroll'),marker=$$('#floorPlan [data-spot]').find(button=>button.dataset.spot===id);if(!viewport||!marker)return;const vr=viewport.getBoundingClientRect(),mr=marker.getBoundingClientRect();viewport.scrollLeft+=mr.left+mr.width/2-(vr.left+vr.width/2);viewport.scrollTop+=mr.top+mr.height/2-(vr.top+vr.height/2)}))}
function locateSpotOnMap(id,zoom=2.4){const spot=spotById(id);if(!spot)return;if(state.view!=='building'||state.building!==spot.building||state.floor!==spot.floor)openBuilding(spot.building,spot.floor,'map');else setBuildingPanel('map');state.selectedSpot=spot.id;state.locatedSpot=spot.id;state.nooksVisible=true;state.resourcesVisible=false;state.zoom=zoom;renderBuilding();if(buildingPlans(spot.building))centerLocatedSpot(spot.id);else loadPlans(spot.building).then(()=>{if(state.view==='building'&&state.building===spot.building&&state.locatedSpot===spot.id){renderBuilding();centerLocatedSpot(spot.id)}}).catch(()=>showToast('Floor map could not load. Check your connection and try again.'))}
// 7. Floor tools. Fit preserves aspect ratio; zoom multiplies the fitted size.
function resizeDigitalMap(){
  const plan=buildingPlans()?.[state.floor];if(!plan||!$('#planStage'))return;
  const viewport=$('.plan-scroll'),stage=$('#planStage'),canvas=$('.plan-canvas');
  if(!viewport.clientWidth||!viewport.clientHeight)return;
  const fit=Math.min(Math.max(1,viewport.clientWidth-48),Math.max(1,viewport.clientHeight-48)*plan.width/plan.height);
  const width=fit*state.zoom,height=width*plan.height/plan.width;
  stage.style.width=`${width}px`;stage.style.height=`${height}px`;
  canvas.style.width=`max(100%, ${width+48}px)`;canvas.style.height=`max(100%, ${height+48}px)`;
}
const mapResizeObserver=new ResizeObserver(()=>resizeDigitalMap());
// Keep the visible center stable while the floor drawing grows or shrinks.
function changeZoom(delta){
  const viewport=$('.plan-scroll');if(!viewport)return;
  const oldZoom=state.zoom,centerX=(viewport.scrollLeft+viewport.clientWidth/2),centerY=(viewport.scrollTop+viewport.clientHeight/2);
  state.zoom=Math.max(1,Math.min(8,Math.round((state.zoom+delta)*100)/100));resizeDigitalMap();
  const planView=$('#floorPlan');planView.classList.toggle('subdued-room-labels',state.zoom<=1&&!state.locatedSpot);planView.classList.toggle('show-nearby-room-labels',!!state.locatedSpot||state.zoom>1);
  viewport.scrollLeft=centerX*state.zoom/oldZoom-viewport.clientWidth/2;viewport.scrollTop=centerY*state.zoom/oldZoom-viewport.clientHeight/2;
  $('#zoomOut').disabled=state.zoom<=1;$('#zoomIn').disabled=state.zoom>=8;
}
// Start dragging after a movement threshold and suppress the click after a drag.
function installMapPan(){
  const viewport=$('.plan-scroll'),pointers=new Map();let start=null,pinch=null,dragging=false,ignoreClick=false;
  const beginPan=point=>{start={x:point.x,y:point.y,left:viewport.scrollLeft,top:viewport.scrollTop}};
  const beginPinch=()=>{
    const [a,b]=[...pointers.values()],stage=$('#planStage').getBoundingClientRect();
    pinch={distance:Math.max(1,Math.hypot(a.x-b.x,a.y-b.y)),zoom:state.zoom,x:((a.x+b.x)/2-stage.left)/stage.width,y:((a.y+b.y)/2-stage.top)/stage.height};
    for(const id of pointers.keys())viewport.setPointerCapture?.(id);
    dragging=true;ignoreClick=true;
  };
  viewport.addEventListener('pointerdown',event=>{
    if(!$('#floorPlan').classList.contains('is-interactive')||event.button!==0)return;
    if(event.pointerType!=='touch'&&event.target.closest('button'))return;
    const point={x:event.clientX,y:event.clientY};pointers.set(event.pointerId,point);
    if(pointers.size===1){beginPan(point);dragging=false;pinch=null}else if(pointers.size===2)beginPinch();
  });
  viewport.addEventListener('pointermove',event=>{
    if(!pointers.has(event.pointerId))return;
    pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
    if(pointers.size>=2&&pinch){
      const [a,b]=[...pointers.values()],rect=viewport.getBoundingClientRect();
      changeZoom(pinch.zoom*Math.hypot(a.x-b.x,a.y-b.y)/pinch.distance-state.zoom);
      const stage=$('#planStage');
      viewport.scrollLeft=stage.offsetLeft+pinch.x*stage.offsetWidth-((a.x+b.x)/2-rect.left);
      viewport.scrollTop=stage.offsetTop+pinch.y*stage.offsetHeight-((a.y+b.y)/2-rect.top);
      return;
    }
    if(!start)return;
    const dx=event.clientX-start.x,dy=event.clientY-start.y;
    if(!dragging&&Math.hypot(dx,dy)>6){dragging=true;viewport.setPointerCapture?.(event.pointerId);viewport.classList.add('is-panning')}
    if(dragging){viewport.scrollLeft=start.left-dx;viewport.scrollTop=start.top-dy}
  });
  const finish=event=>{
    if(!pointers.delete(event.pointerId))return;
    pinch=null;
    if(pointers.size>=2){beginPinch();return}
    if(pointers.size){beginPan([...pointers.values()][0]);return}
    if(dragging){ignoreClick=true;setTimeout(()=>ignoreClick=false,0)}
    start=null;dragging=false;viewport.classList.remove('is-panning');
  };
  viewport.addEventListener('pointerup',finish);viewport.addEventListener('pointercancel',finish);viewport.addEventListener('lostpointercapture',finish);
  viewport.addEventListener('click',event=>{if(ignoreClick){event.preventDefault();event.stopPropagation()}},true);
}
// 8. Dialogs. Keep the original opener across nested dialogs and restore it on close.
function resetArrivalStage(id=$('#arrivalForm')?.dataset.id){if(!id)return;if(state.arrivalReadySpot===id)state.arrivalReadySpot=null;const button=$$('[data-arrival-stage]').find(item=>item.dataset.arrivalStage===id);if(button){button.textContent='Head Here';button.classList.remove('is-en-route');button.setAttribute('aria-pressed','false')}}
function closeModal(force=false){if(!force&&reportSubmissionPending&&$('#arrivalForm'))return;const arrivalId=$('#arrivalForm')?.dataset.id;const backdrop=$('#modalBackdrop');backdrop.hidden=true;$('#modal').innerHTML='';$('.app-shell').removeAttribute('inert');document.body.style.overflow='';if(arrivalId){resetArrivalStage(arrivalId);if(state.view==='building')renderBuilding()}if(closeModal.focus?.isConnected)closeModal.focus.focus({preventScroll:true});else focusView()}
// Make the background inert; the keyboard handler below keeps Tab inside.
function openModal(html){if(reportSubmissionPending)return;if($('#modalBackdrop').hidden)closeModal.focus=document.activeElement;$('#modal').innerHTML=html;$('#modalBackdrop').hidden=false;$('.app-shell').setAttribute('inert','');document.body.style.overflow='hidden';$('#modal').querySelector('button, input, select')?.focus()}
function modalHeader(title){return `<div class="modal-top"><h2 id="modalTitle">${esc(title)}</h2><button class="modal-close" type="button" data-modal-close aria-label="Close">×</button></div>`}
// Combine sample spot details with the latest report from the chosen store.
function latestReportMarkup(spot,report){
  if(spot.reserved)return `<div class="reservation-info"><p>${reservationLinks[spot.building]?'Reservations are required for this room. Use the BYU reservation link below to check availability and book.':'Reservations are required for this room. Check with the building for booking details.'}</p></div>`;
  if(!report&&usesDatabase(spot)&&database.error)return `<p class="form-error latest-report-error">${esc(database.error)}</p>`;
  const noise=report?report.noise:currentNoise(spot),busy=report?report.busy:currentBusy(spot);
  const noiseText=noiseLabel(noise)||'Not available',busyText=({low:'Light',medium:'Moderate',high:'Busy'})[busy]||'Not available';
  const busyClass=({low:'forecast-light',medium:'forecast-moderate',high:'forecast-busy'})[busy]||'unknown';
  const reportedAt=report&&Number.isFinite(Number(report.time))?new Intl.DateTimeFormat(undefined,{month:'short',day:'numeric',year:'numeric'}).format(new Date(Number(report.time))):'';
  const note=report?.note?.trim();
  return `<dl class="latest-report-grid"><div><dt>Noise</dt><dd><span class="latest-report-value">${esc(noiseText)}</span></dd></div><div><dt>Forecast</dt><dd><span class="availability ${busyClass}">${esc(busyText)}</span></dd></div></dl>${note?`<div class="latest-report-note"><h4>Student note</h4><p>${esc(note)}</p></div>`:''}<small class="latest-report-meta">${report?(reportedAt?`Reported ${esc(reportedAt)}`:'Latest student report'):'No student report yet · Showing typical conditions'}</small>`;
}
function spotDetailContent(s){
  const report=currentReport(s),isSaved=activeLists().some(l=>l.spots.includes(s.id));
  const noise=noiseLabel(currentNoise(s));
  const arrivalReady=state.arrivalReadySpot===s.id;
  const arrivalButton=`<button class="primary-button ${arrivalReady?'is-en-route':''}" type="button" data-arrival-stage="${esc(s.id)}" aria-pressed="${arrivalReady}" ${database.loading||!database.configLoaded?'disabled':''}>${arrivalReady?'I\'ve Arrived':'Head Here'}</button>`;
  const capacity=Number.isInteger(s.capacity)&&s.capacity>0?s.capacity:1;
  const seatingLabel=s.type==='group'?`Group seating, ${capacity} seats`:`Individual seating, ${capacity} seat`;
  const seatingTag=`<span class="seating-tag" role="img" aria-label="${esc(seatingLabel)}" title="${esc(seatingLabel)}">${spotTypeIcon(s)}<span class="pin-capacity">${capacity}</span></span>`;
  const reserveButton=s.reserved&&reservationLinks[s.building]?`<a class="secondary-button" href="${esc(reservationLinks[s.building])}" target="_blank" rel="noopener noreferrer">Reserve with BYU ↗</a>`:'';
  return `<p class="modal-description">${s.building} · ${esc(floorLabel(s))}</p>${s.detail?`<div class="report-box"><h3>Location details</h3><p>${esc(s.detail)}</p></div>`:''}<div class="detail-tags">${seatingTag}${noise?`<span class="noise-tag"><span class="tag-prefix">Noise:&nbsp;</span><strong>${esc(noise)}</strong></span>`:''}${powerTag(s)}<span class="layout-tag">${layoutLabel(s)}</span></div><div class="report-box latest-report-box"><h3>${s.reserved?'Reservation required':'Latest report'}</h3>${latestReportMarkup(s,report)}</div><div class="modal-actions"><button class="secondary-button bookmark-button ${isSaved?'is-saved':''}" type="button" data-save-spot="${esc(s.id)}" aria-label="${isSaved?'Manage saved lists':'Save to a list'}" title="${isSaved?'Manage saved lists':'Save to a list'}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3.75h12a1 1 0 0 1 1 1v16l-7-4.5-7 4.5v-16a1 1 0 0 1 1-1Z"/></svg></button>${reserveButton}${arrivalButton}</div>`;
}
function openSpot(id,{keepMap=false}={}){
  const s=spotById(id);if(!s)return;
  const collapsing=state.selectedSpot===s.id;
  if(!collapsing&&state.selectedSpot!==s.id)state.arrivalReadySpot=null;
  state.selectedSpot=collapsing?null:s.id;
  if(isCompactLayout()&&!keepMap&&!collapsing)setBuildingPanel('spots');
  if(state.view==='building')renderBuilding();
}
function arrivalAvailabilityField(){return `<fieldset class="form-field choice-field"><legend>Did you find a seat?</legend><div class="radio-segments" role="group" aria-label="Did you find a seat?"><label class="radio-option" for="arrivalAvailable"><input id="arrivalAvailable" type="checkbox" checked><span>Yes!</span></label><input type="hidden" name="available" value="yes"></div></fieldset>`}
// Collect arrival reports. Reserved spots use BYU's external booking link instead.
function openArrival(id){
  const s=spotById(id);if(!s)return;
  openModal(`${modalHeader('Once you arrive…')}<p class="modal-description">Help keep the map accurate. What does this spot look like right now?</p><form id="arrivalForm" data-id="${esc(s.id)}">${arrivalAvailabilityField()}${radioChoiceField('noise','Noise level',[['low','Quiet'],['medium','Social']])}${radioChoiceField('busy','How busy is it right now?',[['low','Light'],['medium','Moderate'],['high','Busy']])}<div class="form-field"><label for="reportNote">Other details (optional)</label><textarea id="reportNote" name="note" maxlength="240" placeholder="Anything useful for the next student?"></textarea></div><p id="arrivalError" class="form-error" role="alert" hidden></p><div class="modal-actions"><button type="button" class="ghost-button" data-modal-close>Cancel</button><button type="submit" class="primary-button">Submit</button></div></form>`);
}
// Apply all list checkbox choices together when Save changes is selected.
async function openSave(id){
  const s=spotById(id);if(!s)return;
  if(cloudMode()){
    if(!auth.signedIn){openAuth('login',()=>openSave(id));return}
    if(cloud.promise)await cloud.promise;
    if(cloud.error||!cloud.ready){showToast(cloud.error||'Your lists are still loading. Try again in a moment.');if(cloud.error)void loadCloudLists();return}
  }
  openModal(`${modalHeader('Save this spot')}<p class="modal-description">Add ${esc(s.name)} to any of your lists.</p><div class="building-checks">${activeLists().map(l=>`<label class="building-check"><input type="checkbox" data-save-list="${esc(l.id)}" ${l.spots.includes(id)?'checked':''}><span>${esc(l.name)}</span></label>`).join('')}</div><div class="modal-actions"><button class="secondary-button" type="button" data-modal-close>Cancel</button><button class="primary-button" type="button" data-save-confirm="${esc(id)}">Save changes</button></div>`)}
// Radio-style choice group used by the arrival report.
function radioChoiceField(name,title,choices,selected){return `<fieldset class="form-field choice-field"><legend>${esc(title)}</legend><div class="radio-segments" role="radiogroup" aria-label="${esc(title)}">${choices.map(([value,label],index)=>{const id=`new-${name}-${index}`;return `<label class="radio-option" for="${id}"><input id="${id}" name="${esc(name)}" type="radio" value="${esc(value)}" required ${value===selected?'checked':''}><span>${esc(label)}</span></label>`}).join('')}</div></fieldset>`}
// SITE RATING: anyone can rate Nook from the footer. Ratings save to the SiteRating table.
let ratingPending=false;
function openRating(){
  openModal(`${modalHeader('Rate Nook')}<p class="modal-description">Is Nook helping you find a spot? Let us know what's working and what we can improve.</p><form id="ratingForm"><fieldset class="rating-field"><div class="rating-stars" id="ratingStars" role="radiogroup" aria-label="Rating">${[1,2,3,4,5].map(n=>`<label class="rating-star" data-value="${n}"><input type="radio" name="stars" value="${n}" aria-label="${n} ${n===1?'star':'stars'}" ${n===1?'required':''}><span aria-hidden="true">&#9733;</span></label>`).join('')}</div></fieldset><div class="form-field"><label for="ratingComment">Comment</label><textarea id="ratingComment" name="comment" maxlength="500" placeholder="Found a bug? Have an idea? Let us know here."></textarea></div><p id="ratingError" class="form-error" role="alert" hidden></p><div class="modal-actions"><button type="button" class="secondary-button" data-modal-close>Cancel</button><button type="submit" class="primary-button">Send Feedback</button></div></form>`);
  const stars=$('#ratingStars');
  const update=()=>{const value=Number(stars.dataset.hover||stars.dataset.selected||0);stars.querySelectorAll('.rating-star').forEach(star=>star.classList.toggle('is-filled',Number(star.dataset.value)<=value))};
  stars.addEventListener('pointerover',event=>{const star=event.target.closest('.rating-star');if(star){stars.dataset.hover=star.dataset.value;update()}});
  stars.addEventListener('pointerleave',()=>{delete stars.dataset.hover;update()});
  stars.addEventListener('change',event=>{if(event.target.name==='stars'){stars.dataset.selected=event.target.value;update()}});
}
async function submitRating(form){
  if(ratingPending)return;
  const error=$('#ratingError'),button=form.querySelector('[type="submit"]');
  const stars=Number(form.elements.stars.value);
  if(!stars){error.textContent='Choose a rating from 1 to 5 stars.';error.hidden=false;return}
  ratingPending=true;button.disabled=true;button.textContent='Sending…';error.hidden=true;
  try{await database.submitRating({stars,comment:form.elements.comment.value});closeModal(true);showToast('Thanks for rating Nook!');}
  catch(problem){error.textContent=problem.message;error.hidden=false;}
  finally{ratingPending=false;button.disabled=false;button.textContent='Send Feedback';}
}
// Favorites is permanent; the prototype supports two additional lists.
// Apply the checked lists to one spot. Account lists are saved to the database before the page changes.
async function confirmSave(id,button){
  const lists=activeLists(),checked=new Set(lists.filter(l=>$(`[data-save-list="${l.id}"]`)?.checked).map(l=>l.id));
  const apply=()=>lists.forEach(l=>{l.spots=l.spots.filter(x=>x!==id);if(checked.has(l.id))l.spots.push(id)});
  if(!cloudMode()){apply();const saved=save();renderSaved();closeModal();if(saved)showToast('Saved lists updated.');return}
  button.disabled=true;
  try{
    await database.setSpotLists(id,lists.map(l=>({dbId:l.dbId,has:l.spots.includes(id),want:checked.has(l.id)})));
    apply();renderSaved();if($('#modal').contains(button))closeModal();showToast('Saved lists updated.');
  }catch(problem){
    // Reload so the page shows exactly what the server kept, then explain what went wrong.
    if($('#modal').contains(button))closeModal();showToast(problem.message);void loadCloudLists();
  }
}
async function removeSavedSpot(id,button){
  const list=activeLists().find(l=>l.id===state.selectedList);if(!list||!list.spots.includes(id))return;
  if(!cloudMode()){list.spots=list.spots.filter(spotId=>spotId!==id);const saved=save();renderSaved();if(saved)showToast('Spot removed from list.');return}
  button.disabled=true;
  try{await database.setSpotLists(id,[{dbId:list.dbId,has:true,want:false}]);list.spots=list.spots.filter(spotId=>spotId!==id);renderSaved();showToast('Spot removed from list.')}
  catch(problem){showToast(problem.message);void loadCloudLists()}
  finally{button.disabled=false}
}
function openRenameList(id){
  const list=activeLists().find(item=>item.id===id);if(!list||list.id==='favorites')return;
  openModal(`${modalHeader('Rename list')}<p class="modal-description">Choose a new name for “${esc(list.name)}”.</p><form id="renameListForm" data-list-id="${esc(list.id)}"><div class="form-field"><label for="renameListName">List name</label><input id="renameListName" name="name" required maxlength="28" value="${esc(list.name)}"></div><p id="renameListError" class="form-error" role="alert" hidden></p><div class="modal-actions"><button type="button" class="secondary-button" data-modal-close>Cancel</button><button type="submit" class="primary-button">Save name</button></div></form>`);
}
async function submitRenameList(form){
  const id=form.dataset.listId,list=activeLists().find(item=>item.id===id),name=form.elements.name.value.trim(),error=$('#renameListError'),button=form.querySelector('[type="submit"]');
  const fail=message=>{error.textContent=message;error.hidden=false};error.hidden=true;
  if(!list||id==='favorites')return fail('Favorites cannot be renamed.');
  if(!name||name.length>28)return fail('Enter a list name from 1 to 28 characters, not just spaces.');
  if(activeLists().some(item=>item.id!==id&&item.name.toLowerCase()===name.toLowerCase()))return fail('You already have a list with that name.');
  if(!cloudMode()){list.name=name;const saved=save();closeModal();renderSaved();if(saved)showToast('List renamed.');return}
  button.disabled=true;
  try{const updated=await database.renameList(list.dbId,name);list.name=updated.name;closeModal();renderSaved();showToast('List renamed.')}
  catch(problem){fail(problem.message)}
  finally{button.disabled=false}
}
function openDeleteList(id){
  const list=activeLists().find(item=>item.id===id);if(!list||list.id==='favorites')return;
  openModal(`${modalHeader('Delete this list?')}<p class="modal-description">Delete “${esc(list.name)}” and remove its saved spots from this list? Those spots remain available in Nook and in your other lists.</p><p id="deleteListError" class="form-error" role="alert" hidden></p><div class="modal-actions"><button type="button" class="secondary-button" data-modal-close>Cancel</button><button type="button" class="danger-button" data-delete-list-confirm="${esc(list.id)}">Delete list</button></div>`);
}
async function deleteSavedList(id,button){
  const list=activeLists().find(item=>item.id===id);if(!list||list.id==='favorites')return;
  if(!cloudMode()){data.lists=data.lists.filter(item=>item.id!==id);state.selectedList='favorites';state.listEditMode=false;const saved=save();closeModal();renderSaved();if(saved)showToast('List deleted.');return}
  button.disabled=true;
  try{await database.deleteList(list.dbId);cloud.lists=cloud.lists.filter(item=>item.id!==id);state.selectedList='favorites';state.listEditMode=false;closeModal();renderSaved();showToast('List deleted.')}
  catch(problem){const error=$('#deleteListError');if(error){error.textContent=problem.message;error.hidden=false}}
  finally{button.disabled=false}
}
async function submitNewList(form){
  const error=$('#newListError'),button=form.querySelector('[type=submit]'),name=form.elements.name.value.trim();
  const fail=message=>{error.textContent=message;error.hidden=false};
  if(!name||name.length>28)return fail('Enter a list name from 1 to 28 characters, not just spaces.');
  if(activeLists().some(l=>l.name.toLowerCase()===name.toLowerCase()))return fail('You already have a list with that name.');
  if(!cloudMode()){const id=`list-${Date.now()}`;data.lists.push({id,name,spots:[]});state.selectedList=id;state.listEditMode=false;const saved=save();closeModal();setView('saved');if(saved)showToast('List created.');return}
  button.disabled=true;error.hidden=true;
  try{
    const row=await database.createList(name),list={id:`list-${row.dbId}`,dbId:row.dbId,name:row.name,spots:[]};
    cloud.lists.push(list);state.selectedList=list.id;state.listEditMode=false;closeModal();setView('saved');showToast('List created.');
  }catch(problem){fail(problem.message)}finally{button.disabled=false}
}
function openCreateList(){if(activeLists().length>=3){showToast('You can have Favorites and two custom lists.');return}openModal(`${modalHeader('New saved list')}<p class="modal-description">Create a list for a class, group, or favorite study routine.</p><form id="newListForm"><div class="form-field"><label for="newListName">List name</label><input id="newListName" name="name" required maxlength="28" placeholder="Example: Group project"></div><p class="form-error" id="newListError" role="alert" hidden></p><div class="modal-actions"><button type="button" class="secondary-button" data-modal-close>Cancel</button><button type="submit" class="primary-button">Create list</button></div></form>`)}
// PROFILE: view and change the signed-in user's name, email, and password, see saved lists, or delete the account.
const profileState={accountFor:null,busy:false};
function renderProfile(force=false){
  const box=$('#profileContent');if(!box)return;
  if(!auth.signedIn){box.dataset.user='';box.innerHTML='<div class="empty-state"><h3>Log in to see your profile</h3><p>Your profile shows your account details and saved spots.</p><button type="button" class="primary-button" data-action="login">Log in or sign up</button></div>';return}
  if(state.view!=='profile')return;
  if(profileState.accountFor!==auth.userId){profileState.accountFor=auth.userId;auth.loadAccount().then(()=>renderProfile(true)).catch(problem=>showToast(problem.message));}
  if(force||box.dataset.user!==String(auth.userId)){
    box.dataset.user=String(auth.userId);
    const p=auth.profile,pending=auth.pendingEmail?`<p class="profile-note">Waiting for you to confirm <strong>${esc(auth.pendingEmail)}</strong>. Check that inbox for the link.</p>`:'';
    box.innerHTML=`<section class="profile-card"><h2>Your name</h2><form id="profileNameForm" novalidate><div class="form-field"><label for="profileFirst">First name</label><input id="profileFirst" name="first" required maxlength="60" autocomplete="given-name" value="${esc(p.first_name||'')}"></div><div class="form-field"><label for="profileLast">Last name</label><input id="profileLast" name="last" maxlength="60" autocomplete="family-name" value="${esc(p.last_name||'')}"></div><p class="form-error" role="alert" hidden></p><div class="modal-actions"><button type="submit" class="primary-button">Save name</button></div></form></section>
<section class="profile-card"><h2>Email</h2><p class="profile-note">Current email: <strong>${esc(auth.email||'Loading…')}</strong></p>${pending}<form id="profileEmailForm" novalidate><div class="form-field"><label for="profileEmail">New email</label><input id="profileEmail" name="email" type="email" required autocomplete="email"></div><div class="form-field"><label for="profileEmailPassword">Current password</label><div class="password-input-wrap"><input id="profileEmailPassword" name="current" type="password" required autocomplete="current-password"><button type="button" class="password-toggle" data-password-toggle="profileEmailPassword" aria-controls="profileEmailPassword" aria-label="Show password" aria-pressed="false" title="Show password"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.4-6 9.5-6 9.5 6 9.5 6-3.4 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.5"/></svg></button></div></div><p class="form-error" role="alert" hidden></p><div class="modal-actions"><button type="submit" class="primary-button">Change email</button></div></form></section>
<section class="profile-card"><h2>Password</h2><form id="profilePasswordForm" novalidate><div class="form-field"><label for="profileCurrentPassword">Current password</label><div class="password-input-wrap"><input id="profileCurrentPassword" name="current" type="password" required autocomplete="current-password"><button type="button" class="password-toggle" data-password-toggle="profileCurrentPassword" aria-controls="profileCurrentPassword" aria-label="Show password" aria-pressed="false" title="Show password"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.4-6 9.5-6 9.5 6 9.5 6-3.4 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.5"/></svg></button></div></div><div class="form-field"><label for="profileNewPassword">New password</label><div class="password-input-wrap"><input id="profileNewPassword" name="password" type="password" required minlength="8" autocomplete="new-password"><button type="button" class="password-toggle" data-password-toggle="profileNewPassword" aria-controls="profileNewPassword" aria-label="Show password" aria-pressed="false" title="Show password"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.4-6 9.5-6 9.5 6 9.5 6-3.4 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.5"/></svg></button></div><small>At least 8 characters.</small></div><div class="form-field"><label for="profileConfirmPassword">Confirm new password</label><div class="password-input-wrap"><input id="profileConfirmPassword" name="confirm" type="password" required minlength="8" autocomplete="new-password"><button type="button" class="password-toggle" data-password-toggle="profileConfirmPassword" aria-controls="profileConfirmPassword" aria-label="Show password" aria-pressed="false" title="Show password"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.4-6 9.5-6 9.5 6 9.5 6-3.4 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.5"/></svg></button></div></div><p class="form-error" role="alert" hidden></p><div class="modal-actions"><button type="submit" class="primary-button">Change password</button></div></form></section>
<section class="profile-card"><h2>Saved lists</h2><div id="profileLists"></div></section>
<section class="profile-card profile-danger"><h2>Delete account</h2><p class="profile-note">This permanently deletes your account and saved lists. Reports you submitted stay on the map without your name.</p><button type="button" class="danger-button" id="deleteAccount">Delete my account</button></section>`;
  }
  renderProfileLists();
}
function renderProfileLists(){
  const box=$('#profileLists');if(!box)return;
  if(cloud.error){box.innerHTML=`<p class="form-error">${esc(cloud.error)}</p>`;return}
  if(!cloud.ready){box.innerHTML='<p class="profile-note">Loading your lists…</p>';return}
  box.innerHTML=cloud.lists.map(l=>{const spots=l.spots.map(spotById).filter(Boolean);return `<div class="profile-list"><div><h3>${esc(l.name)} <span>${spots.length}</span></h3><p>${spots.length?spots.slice(0,3).map(s=>esc(s.name)).join(' · ')+(spots.length>3?` · +${spots.length-3} more`:''):'No spots saved yet.'}</p></div><button type="button" class="secondary-button" data-profile-list="${esc(l.id)}">Open</button></div>`}).join('')||'<p class="profile-note">No lists yet.</p>';
}
async function submitProfile(form){
  if(profileState.busy)return;
  const error=form.querySelector('.form-error'),button=form.querySelector('[type=submit]'),f=form.elements;
  const fail=message=>{error.textContent=message;error.hidden=false};error.hidden=true;
  let action;
  if(form.id==='profileNameForm'){
    const first=f.first.value.trim(),last=f.last.value.trim();
    if(!first)return fail('Enter your first name.');
    action=async()=>{await auth.updateName({firstName:first,lastName:last});showToast('Name updated.')};
  }else if(form.id==='profileEmailForm'){
    const email=f.email.value.trim();
    if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))return fail('Enter a valid email address.');
    if(email.toLowerCase()===(auth.email||'').toLowerCase())return fail('That is already your email.');
    if(!f.current.value)return fail('Enter your current password.');
    action=async()=>{const changed=await auth.changeEmail({currentPassword:f.current.value,newEmail:email});showToast(changed?'Email updated.':'Check your inbox to confirm your new email.');renderProfile(true)};
  }else{
    if(!f.current.value)return fail('Enter your current password.');
    if(f.password.value.length<8)return fail('New password must be at least 8 characters.');
    if(f.password.value!==f.confirm.value)return fail('The new passwords do not match.');
    action=async()=>{await auth.changePassword({currentPassword:f.current.value,newPassword:f.password.value});form.reset();showToast('Password changed.')};
  }
  profileState.busy=true;button.disabled=true;
  try{await action()}catch(problem){fail(problem.message)}finally{profileState.busy=false;button.disabled=false}
}
function openDeleteAccount(){openModal(`${modalHeader('Delete your account?')}<p class="modal-description">This permanently deletes your account, your name, and your saved lists. It cannot be undone. Type DELETE to confirm.</p><form id="deleteAccountForm" novalidate><div class="form-field"><label for="deleteConfirm">Type DELETE</label><input id="deleteConfirm" name="confirm" autocomplete="off"></div><p class="form-error" role="alert" hidden></p><div class="modal-actions"><button type="button" class="secondary-button" data-modal-close>Cancel</button><button type="submit" class="danger-button">Delete account</button></div></form>`)}
async function submitDeleteAccount(form){
  const error=form.querySelector('.form-error'),button=form.querySelector('[type=submit]');
  if(form.elements.confirm.value.trim()!=='DELETE'){error.textContent='Type DELETE to confirm.';error.hidden=false;return}
  button.disabled=true;error.hidden=true;
  try{await auth.deleteAccount();closeModal(true);setView('explore');showToast('Your account was deleted.')}
  catch(problem){error.textContent=problem.message;error.hidden=false;button.disabled=false}
}
// Clear also removes the saved filter preset for the next page load.
function resetFilters(){state.buildings=new Set(['HBLL','WSC','JKB']);state.study='any';state.groupSize=4;state.noise='any';state.layout='any';state.outlets=false;if(state.view==='building'&&BUILDINGS[state.building]){searchBuildingQueue=[state.building,...[...state.buildings].filter(id=>id!==state.building)];searchBuildingIndex=0}data.savedFilters=null;save();render()}
function applyPlaylist(id){
  const presets={
    'deep-focus':{study:'any',groupSize:4,noise:'low',layout:'secluded',outlets:true},
    'group-project':{study:'group',groupSize:4,noise:'medium',layout:'open',outlets:false},
    'quick-touchdown':{study:'any',groupSize:4,noise:'medium',layout:'open',outlets:false},
    'dead-battery':{study:'solo',groupSize:4,noise:'any',layout:'any',outlets:true}
  };
  const preset=presets[id];if(!preset)return;
  Object.assign(state,preset);
  updateFilter();
  const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  $('#exploreMapSection').scrollIntoView({behavior:reducedMotion?'auto':'smooth'});
}
function updateFilter(){renderFilters();renderRecommendations();if(state.view==='building')renderBuilding()}
// Open the best matching floor while retaining the current filters.
function showMatches(){if(!state.buildings.size){showToast('Choose at least one building.');return}const match=allSpots().filter(matches).sort((a,b)=>rank(a)-rank(b)),selectedBuildings=[...state.buildings],firstBuilding=match[0]?.building||selectedBuildings[0];searchBuildingQueue=[firstBuilding,...selectedBuildings.filter(id=>id!==firstBuilding)];searchBuildingIndex=0;if(!match.length){openBuilding(firstBuilding);showToast('No spaces match. Try changing a filter.');return}openBuilding(firstBuilding,match[0].floor,isCompactLayout()?'spots':'map')}
function returnToCampusMap(){searchBuildingQueue=[];searchBuildingIndex=-1;viewHistory.length=0;state.view='explore';render();const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;$('#exploreMapSection').scrollIntoView({behavior:reducedMotion?'auto':'smooth'})}

// 9. Event routing. data-* attributes connect rebuilt controls to shared handlers.
document.addEventListener('click',event=>{
  const t=event.target.closest('button,a,[data-campus-building]');
  if(!t||(t.id!=='navAuth'&&!t.closest('#navMenu')))toggleNavMenu(false);
  if(!t)return;
  if(t.id==='exploreMapButton'){const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;$('#exploreMapSection').scrollIntoView({behavior:reducedMotion?'auto':'smooth'});return}
  if(t.id==='scrollToMap'){const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;$('#exploreMapSection').scrollIntoView({behavior:reducedMotion?'auto':'smooth'});return}
  if(t.dataset.passwordToggle){const input=document.getElementById(t.dataset.passwordToggle);if(!input)return;const visible=input.type==='password';input.type=visible?'text':'password';const label=visible?'Hide password':'Show password';t.setAttribute('aria-label',label);t.setAttribute('title',label);t.setAttribute('aria-pressed',String(visible));t.innerHTML=visible?'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.4-6 9.5-6 9.5 6 9.5 6-3.4 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.5"/><path d="m4 4 16 16"/></svg>':'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.4-6 9.5-6 9.5 6 9.5 6-3.4 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.5"/></svg>';input.focus({preventScroll:true});try{input.setSelectionRange(input.value.length,input.value.length)}catch{}return}
  if(t.dataset.buildingPanel){setBuildingPanel(t.dataset.buildingPanel);return}
  if(t.id==='interactMap'){setMapInteraction(t.getAttribute('aria-pressed')!=='true');return}
  if(t.id==='campusInteractMap'){setCampusMapInteraction(t.getAttribute('aria-pressed')!=='true');return}
  if(t.id==='toggleNooks'||t.id==='toggleResources'||t.dataset.resource){
    const viewport=$('.plan-scroll'),scrollLeft=viewport?.scrollLeft||0,scrollTop=viewport?.scrollTop||0;
    if(t.id==='toggleNooks'){state.nooksVisible=true;state.resourcesVisible=false;state.selectedResource=null;state.locatedSpot=null}
    else if(t.id==='toggleResources'){state.nooksVisible=false;state.resourcesVisible=true;state.selectedResource=null;state.selectedSpot=null;state.locatedSpot=null}
    else state.selectedResource=state.selectedResource===t.dataset.resource?null:t.dataset.resource;
    renderBuilding();const nextViewport=$('.plan-scroll');if(nextViewport){nextViewport.scrollLeft=scrollLeft;nextViewport.scrollTop=scrollTop}return
  }
  if(t.dataset.campusBuilding){showCampusBuilding(t.dataset.campusBuilding);return}
  if(t.hasAttribute('data-dismiss-campus')){$('#campusComingSoon').hidden=true;$$('.campus-building').forEach(el=>el.classList.remove('is-selected'));return}
  if(t.id==='campusZoomIn'||t.id==='campusZoomOut'||t.id==='campusZoomFit'){if(t.id==='campusZoomFit')changeCampusZoom(0,true);else changeCampusZoom(t.id==='campusZoomIn'?.25:-.25);return}
  // Room selection, map labels, and zoom controls.
  if(t.id==='zoomFit'){state.zoom=1;resizeDigitalMap();$('.plan-scroll').scrollLeft=0;$('.plan-scroll').scrollTop=0;$('#zoomOut').disabled=true;$('#zoomIn').disabled=false;renderBuilding();return}
  if(t.dataset.locateSpot){locateSpotOnMap(t.dataset.locateSpot);return}
  if(t.hasAttribute('data-clear-located-spot')){state.locatedSpot=null;renderBuilding();return}
  if(t.hasAttribute('data-back-to-matches')){state.arrivalReadySpot=null;state.selectedSpot=null;state.locatedSpot=null;state.zoom=1;if(isCompactLayout())setBuildingPanel('spots');renderBuilding();($('#spotList .spot-row')||$('#spotList [data-action="edit"]'))?.focus({preventScroll:true});return}
  if(t.matches('[data-modal-close]')){closeModal();return}
  // Main navigation, filter actions, and building selection.
  if(t.id==='homeButton'||t.id==='navExplore'){setView('explore');return}
  if(t.id==='backToExplore'||t.id==='savedBack'||t.id==='profileBack'){event.preventDefault();goBack();return}
  if(t.id==='navSaved'){setView('saved');return}
  if(t.id==='navProfile'){setView('profile');return}
  if(t.id==='deleteAccount'){openDeleteAccount();return}
  if(t.dataset.profileList){state.selectedList=t.dataset.profileList;setView('saved');return}
  // Reporting a spot has its own page (report.html) with the floor-plan pin. From a building page, open it already set to that building and floor.
  if(t.id==='navReport'){const from=state.view==='building'?`?building=${encodeURIComponent(state.building)}&floor=${encodeURIComponent(state.floor)}`:'';window.location.href=`report.html${from}`;return}
    if(t.id==='rateUs'){event.preventDefault();openRating();return}
  if(t.id==='navAuth'){if(!auth.signedIn)openAuth('login');else toggleNavMenu();return}
  if(t.id==='navMenuProfile'){toggleNavMenu(false);setView('profile');return}
  if(t.id==='navLogout'){toggleNavMenu(false);logOut();return}
  if(t.id==='resendConfirm'){const email=$('#authEmail')?.value.trim();if(!email){showToast('Enter your email first.');return}t.disabled=true;void auth.resendConfirmation(email).then(()=>showToast('Confirmation email sent. Check your inbox and spam.'),e=>showToast(e.message)).finally(()=>{t.disabled=false});return}
  if(t.dataset.authSwitch){const after=openAuth.after;openAuth(t.dataset.authSwitch,after);return}
  if(t.dataset.openReported){const s=spotById(t.dataset.openReported);if(s){openBuilding(s.building,s.floor);openSpot(s.id)}return}
  if(t.dataset.dismissFilter){
    if(t.dataset.dismissFilter==='study')state.study='any';
    else if(t.dataset.dismissFilter==='noise')state.noise='any';
    else if(t.dataset.dismissFilter==='layout')state.layout='any';
    else if(t.dataset.dismissFilter==='outlets')state.outlets=false;
    updateFilter();($('#activeFilterBar button')||$('#editFilters'))?.focus({preventScroll:true});return
  }
  if(t.id==='clearFilters'||t.dataset.action==='clear'){resetFilters();return}
  if(t.dataset.buildingAction){state.buildings=t.dataset.buildingAction==='all'?new Set(Object.keys(BUILDINGS)):new Set();updateFilter();return}
  if(t.id==='saveFilters'){data.savedFilters={study:state.study,noise:state.noise,layout:state.layout,outlets:state.outlets,groupSize:state.groupSize,buildings:[...state.buildings]};if(save())showToast('Filters saved on this device.');return}
  if(t.id==='showMatches'){showMatches();return}
  if(t.id==='keepSearching'){const nextBuilding=searchBuildingQueue[searchBuildingIndex+1];if(nextBuilding){searchBuildingIndex++;openBuilding(nextBuilding,undefined,isCompactLayout()?'spots':'map')}else returnToCampusMap();return}
  if(t.dataset.openBuilding){openBuilding(t.dataset.openBuilding);return}
  if(t.dataset.study){state.study=t.dataset.study;updateFilter();return}
  if(t.dataset.noise){state.noise=t.dataset.noise;updateFilter();return}
  if(t.dataset.layout){state.layout=t.dataset.layout;updateFilter();return}
  if(t.dataset.playlist){applyPlaylist(t.dataset.playlist);return}
  // Each building has its own floor keys; retain the side when changing levels.
  if(t.dataset.floor){state.floor=t.dataset.floor;state.zoom=1;state.selectedSpot=null;state.locatedSpot=null;renderBuilding();return}
  if(t.dataset.wscLevel){const level=Number(t.dataset.wscLevel);state.floor=level<=3?String(level):`${level}E`;state.zoom=1;state.selectedSpot=null;state.locatedSpot=null;renderBuilding();return}
  if(t.dataset.wscSide){state.floor=`${state.floor[0]}${t.dataset.wscSide==='West'?'W':'E'}`;state.zoom=1;state.selectedSpot=null;state.locatedSpot=null;renderBuilding();return}
  if(t.hasAttribute('data-hbll-level')){const level=Number(t.dataset.hbllLevel);state.floor=`L${level}`;state.zoom=1;state.selectedSpot=null;state.locatedSpot=null;renderBuilding();return}
  if(t.dataset.hbllSide){const floor=BUILDINGS.HBLL.floors.find(f=>f.id===state.floor);state.floor=`L${floor.level}${t.dataset.hbllSide==='North'?'N':''}`;state.zoom=1;state.selectedSpot=null;state.locatedSpot=null;renderBuilding();return}
  if(t.dataset.jkbLevel){const floor=BUILDINGS.JKB.floors.find(f=>f.level===Number(t.dataset.jkbLevel));if(!floor)return;state.floor=floor.id;state.zoom=1;state.selectedSpot=null;state.locatedSpot=null;renderBuilding();return}
  if(t.id==='zoomOut'||t.id==='zoomIn'){changeZoom(t.id==='zoomIn'?.25:-.25);return}
  // Spot details, reports, and saved-list changes.
  if(t.dataset.pinnedResource){const r=database.pinnedResources.find(x=>x.id===t.dataset.pinnedResource);if(r)showToast(`${r.type}: ${r.info}${r.where?` (${r.where})`:''}`);return}
  if(t.dataset.spot){const s=spotById(t.dataset.spot);if(!s)return;const isMapPin=t.classList.contains('plan-pin');if(isMapPin){state.locatedSpot=s.id;state.nooksVisible=true;state.resourcesVisible=false}if(state.view==='explore'){openBuilding(s.building,s.floor,isCompactLayout()?'spots':'map')}openSpot(s.id,{keepMap:isMapPin});if(isMapPin&&isCompactLayout())setMapInteraction(true);return}
  if(t.dataset.openSaved){const s=spotById(t.dataset.openSaved);openBuilding(s.building,s.floor,isCompactLayout()?'spots':'map');openSpot(s.id);return}
  if(t.dataset.arrivalStage){
    const id=t.dataset.arrivalStage;
    if(state.arrivalReadySpot!==id){state.arrivalReadySpot=id;locateSpotOnMap(id,3.5);return}
    // OKR: time from starting the search to choosing a spot; the timer restarts for the next choice.
    const seconds=choiceTimer.lap();
    if(seconds)void database.logChoice(seconds);
    openArrival(id);return}
  if(t.dataset.saveSpot){openSave(t.dataset.saveSpot);return}
  if(t.dataset.saveConfirm){void confirmSave(t.dataset.saveConfirm,t);return}
  if(t.id==='editFilters'||t.dataset.action==='edit'){setView('explore');$('#filterHeading').scrollIntoView({behavior:'smooth'});$('#clearFilters').focus({preventScroll:true});return}
  if(t.dataset.action==='explore'){setView('explore');return}
  if(t.dataset.action==='login'){openAuth('login');return}
  if(t.dataset.action==='retry-lists'){void loadCloudLists();return}
  if(t.id==='createList'){openCreateList();return}
  if(t.hasAttribute('data-toggle-list-edit')){state.listEditMode=!state.listEditMode;renderSaved();return}
  if(t.dataset.removeSaved){void removeSavedSpot(t.dataset.removeSaved,t);return}
  if(t.dataset.renameList){openRenameList(t.dataset.renameList);return}
  if(t.dataset.deleteList){openDeleteList(t.dataset.deleteList);return}
  if(t.dataset.deleteListConfirm){void deleteSavedList(t.dataset.deleteListConfirm,t);return}
  if(t.dataset.list){if(state.selectedList!==t.dataset.list)state.listEditMode=false;state.selectedList=t.dataset.list;renderSaved();return}
});
// Native input changes update filters or dependent form fields.
document.addEventListener('change',event=>{
  const t=event.target;
  if(t.id==='arrivalAvailable'){const available=$('#arrivalForm [name="available"]');available.value=t.checked?'yes':'no';t.closest('.radio-option').querySelector('span').textContent=t.checked?'Yes!':'No'}
  if(t.closest('#buildingFilters')){state.buildings=new Set($$('#buildingFilters input:checked').map(x=>x.value));updateFilter()}
  if(t.id==='outletFilter'){state.outlets=t.checked;updateFilter()}
  if(t.id==='buildingSelect'){openBuilding(t.value)}
});
// Update the group-size slider immediately.
$('#groupSize').addEventListener('input',e=>{state.groupSize=Number(e.target.value);updateFilter()});
// SVG room and building controls need explicit Enter and Space handling.
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&$('#navMenu')&&!$('#navMenu').hidden){toggleNavMenu(false);$('#navAuth')?.focus()}});
document.addEventListener('keydown',event=>{const campus=event.target.closest('[data-campus-building]');if(campus&&(event.key==='Enter'||event.key===' ')){event.preventDefault();showCampusBuilding(campus.dataset.campusBuilding)}});
$('#modalBackdrop').addEventListener('click',e=>{if(e.target.id==='modalBackdrop')closeModal()});
// Wrap Tab within the open dialog; Escape uses the guarded close action.
document.addEventListener('keydown',e=>{
  if($('#modalBackdrop').hidden)return;
  if(e.key==='Escape'){e.preventDefault();closeModal();return;}
  if(e.key!=='Tab')return;
  const controls=[...$('#modal').querySelectorAll('button,a[href],input,select,textarea,[tabindex]')].filter(el=>!el.disabled&&el.tabIndex>=0&&el.getClientRects().length);
  const first=controls[0],last=controls.at(-1);
  if(e.shiftKey&&(document.activeElement===first||!$('#modal').contains(document.activeElement))){e.preventDefault();last?.focus();}
  else if(!e.shiftKey&&(document.activeElement===last||!$('#modal').contains(document.activeElement))){e.preventDefault();first?.focus();}
});
// Validate trimmed form values before saving local data or sending a report.
document.addEventListener('submit',e=>{
  if(e.target.id==='authForm'){e.preventDefault();void submitAuth(e.target);return}
  if(e.target.id==='arrivalForm'){e.preventDefault();void submitArrival(e.target);return}
  if(e.target.id==='ratingForm'){e.preventDefault();void submitRating(e.target);return}
  if(['profileNameForm','profileEmailForm','profilePasswordForm'].includes(e.target.id)){e.preventDefault();void submitProfile(e.target);return}
  if(e.target.id==='deleteAccountForm'){e.preventDefault();void submitDeleteAccount(e.target);return}
  if(e.target.id==='newListForm'){e.preventDefault();void submitNewList(e.target);return}
  if(e.target.id==='renameListForm'){e.preventDefault();void submitRenameList(e.target);return}
});
// 10. Startup. Render local UI first, then refresh after the connection check.
const headerResizeObserver=new ResizeObserver(([entry])=>{document.documentElement.style.setProperty('--header-height',`${entry.target.offsetHeight}px`);if(campusZoomInitialized&&state.view==='explore')changeCampusZoom(0)});
headerResizeObserver.observe($('.site-header'));
renderCampusMap();addCampusMapGuide();
window.addEventListener('resize',()=>changeCampusZoom(0));
window.matchMedia?.(COMPACT_LAYOUT_QUERY).addEventListener('change',()=>{
  setMapInteraction(!isCompactLayout());
  if(!isCompactLayout())setCampusMapInteraction(false);
  if(isCompactLayout()){
    if($('#floorMain').contains(document.activeElement)&&$('.building-layout').dataset.panel==='spots')$('[data-building-panel="spots"]').focus();
    if($('#studyResults').contains(document.activeElement)&&$('.building-layout').dataset.panel==='map')$('[data-building-panel="map"]').focus();
  }
  resizeDigitalMap();
});
render();
renderDatabaseStatus();
renderAuthNav();
// Links from the Report a Spot page can open My Nooks or Profile directly.
{const wanted=new URLSearchParams(window.location.search).get('view');if(wanted==='saved'||wanted==='profile')setView(wanted)}
setInterval(()=>{if(database.ready)database.loadConditions().then(render).catch(()=>{})},120000);
void database.initialize().then(()=>auth.restore()).then(()=>{if(auth.notice)showToast(auth.notice);applyDatabaseCapacities();renderDatabaseStatus();render();loadBuildingHours();loadReservationLinks()}).catch(()=>{database.error='The database connection could not initialize. Check .env and refresh to retry.';renderDatabaseStatus()});
