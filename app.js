const BUILDINGS = {
  HBLL: { name: 'Harold B. Lee Library', short: 'Lee Library', description: 'Explore the library’s digitized North and South drawings, or find a room by number.', floors: [
    {id:'L3',label:'Floor 3 South / Entry',file:'hbll-3s',level:3,side:'South',defaultX:43,defaultY:52},
    {id:'L3N',label:'Floor 3 North',file:'hbll-3ns',level:3,side:'North',defaultX:64,defaultY:49},
    {id:'L2',label:'Floor 2 South',file:'hbll-2s',level:2,side:'South',defaultX:25,defaultY:73},
    {id:'L2N',label:'Floor 2 North',file:'hbll-2ns',level:2,side:'North',defaultX:34,defaultY:66},
    {id:'L1',label:'Floor 1 South',file:'hbll-1s',level:1,side:'South',defaultX:25,defaultY:74},
    {id:'L1N',label:'Floor 1 North',file:'hbll-1ns',level:1,side:'North',defaultX:31,defaultY:74},
    {id:'L4',label:'Floor 4',file:'hbll-4s',level:4,defaultX:26,defaultY:68},
    {id:'L5',label:'Floor 5',file:'hbll-5s',level:5,defaultX:67,defaultY:50},
    {id:'L6',label:'Floor 6',file:'hbll-6s',level:6,defaultX:74,defaultY:52},
    {id:'B',label:'Basement North',file:'hbll-bns',level:0,side:'North',defaultX:39,defaultY:66}
  ], map:'https://map.byu.edu/', floorsUrl:'https://lib.byu.edu/floormaps/' },
  WSC: { name: 'Wilkinson Student Center', short: 'The Wilk', description: 'Explore the Wilk, room by room. Find a room or browse study ideas on each floor.', floors: [
    {id:'1E',label:'Floor 1 East',file:'wsc-1s',level:1,side:'East',defaultX:25,defaultY:43},
    {id:'1W',label:'Floor 1 West',file:'wsc-1ws',level:1,side:'West',defaultX:31,defaultY:48},
    {id:'2E',label:'Floor 2 East',file:'wsc-2s',level:2,side:'East',defaultX:21,defaultY:43},
    {id:'2W',label:'Floor 2 West',file:'wsc-2ws',level:2,side:'West',defaultX:39,defaultY:40},
    {id:'3E',label:'Floor 3 East',file:'wsc-3s',level:3,side:'East',defaultX:26,defaultY:30},
    {id:'3W',label:'Floor 3 West',file:'wsc-3ws',level:3,side:'West',defaultX:35,defaultY:45},
    {id:'4E',label:'Floor 4',file:'wsc-4s',level:4,side:'East',defaultX:69,defaultY:32},
    {id:'5E',label:'Floor 5',file:'wsc-5s',level:5,side:'East',defaultX:33,defaultY:43},
    {id:'6E',label:'Floor 6',file:'wsc-6s',level:6,side:'East',defaultX:34,defaultY:53}
  ], map:'https://map.byu.edu/', floorsUrl:'https://wscmaps.byu.edu/map' },
  JKB: { name: 'Jesse Knight Building', short: 'JKB', description: 'Explore JKB’s four digitized floor drawings, or locate a room by number.', floors: [
    {id:'G',label:'Floor 1',file:'jkb-1s',level:1,defaultX:43,defaultY:22},
    {id:'L2',label:'Floor 2',file:'jkb-2s',level:2,defaultX:50,defaultY:24},
    {id:'L3',label:'Floor 3',file:'jkb-3s',level:3,defaultX:48,defaultY:20},
    {id:'L4',label:'Floor 4',file:'jkb-4s',level:4,defaultX:66,defaultY:43}
  ], map:'https://map.byu.edu/', floorsUrl:'https://pf.byu.edu/space/floor-plans/master' }
};

// These are prototype spots and illustrative placements, not verified room inventory or live availability.
const DEMO_SPOTS = [
  {id:'hbll-commons',building:'HBLL',floor:'L3',name:'Entry level open tables',type:'solo',capacity:1,private:false,outlets:true,noise:'medium',busy:'medium',reserved:false,x:28,y:27,typical:[1,2,2,1,2]},
  {id:'hbll-west',building:'HBLL',floor:'L3',name:'West study corner',type:'solo',capacity:1,private:false,outlets:true,noise:'low',busy:'low',reserved:false,x:73,y:25,typical:[1,1,2,2,1]},
  {id:'hbll-group',building:'HBLL',floor:'L3',name:'Group study room',type:'group',capacity:6,private:true,outlets:true,noise:'medium',busy:null,reserved:true,x:73,y:72,typical:[]},
  {id:'hbll-think',building:'HBLL',floor:'L2',name:'Think Tank area',type:'group',capacity:6,private:false,outlets:true,noise:'medium',busy:'low',reserved:false,x:28,y:27,typical:[2,2,1,1,2]},
  {id:'hbll-reading',building:'HBLL',floor:'L2',name:'Reading Room area',type:'solo',capacity:1,private:false,outlets:false,noise:'low',busy:'medium',reserved:false,x:73,y:25,typical:[1,2,2,2,1]},
  {id:'hbll-single',building:'HBLL',floor:'L2',name:'Single-user study room',type:'solo',capacity:1,private:true,outlets:true,noise:'low',busy:null,reserved:true,x:73,y:72,typical:[]},
  {id:'hbll-upper',building:'HBLL',floor:'L4',name:'Upper level tables',type:'solo',capacity:1,private:false,outlets:true,noise:'low',busy:'low',reserved:false,x:28,y:27,typical:[1,2,1,1,2]},
  {id:'wsc-tables',building:'WSC',floor:'1E',name:'East hall tables (sample)',type:'group',capacity:4,private:false,outlets:true,noise:'medium',busy:'medium',reserved:false,x:23,y:42,typical:[2,2,3,2,2]},
  {id:'wsc-lounge',building:'WSC',floor:'1E',name:'East open seating (sample)',type:'solo',capacity:1,private:false,outlets:false,noise:'medium',busy:'low',reserved:false,x:62,y:29,typical:[1,2,3,2,1]},
  {id:'wsc-1w-atrium',building:'WSC',floor:'1W',name:'West atrium seating (sample)',type:'group',capacity:6,private:false,outlets:false,noise:'medium',busy:'low',reserved:false,x:26,y:52,typical:[1,2,2,1,2]},
  {id:'wsc-1w-nook',building:'WSC',floor:'1W',name:'West side nook (sample)',type:'solo',capacity:1,private:false,outlets:true,noise:'low',busy:'medium',reserved:false,x:50,y:44,typical:[1,1,2,2,1]},
  {id:'wsc-upper',building:'WSC',floor:'2E',name:'Second-floor tables (sample)',type:'group',capacity:6,private:false,outlets:true,noise:'medium',busy:'low',reserved:false,x:20,y:43,typical:[1,2,2,1,1]},
  {id:'wsc-2e-seating',building:'WSC',floor:'2E',name:'East seating area (sample)',type:'solo',capacity:1,private:false,outlets:false,noise:'medium',busy:'medium',reserved:false,x:20,y:67,typical:[2,2,3,2,1]},
  {id:'wsc-2w-open',building:'WSC',floor:'2W',name:'West open area (sample)',type:'group',capacity:6,private:false,outlets:true,noise:'medium',busy:'low',reserved:false,x:39,y:34,typical:[1,2,2,1,2]},
  {id:'wsc-2w-corner',building:'WSC',floor:'2W',name:'Southwest corner (sample)',type:'solo',capacity:1,private:false,outlets:false,noise:'low',busy:'medium',reserved:false,x:28,y:76,typical:[1,2,2,1,1]},
  {id:'wsc-3e-hall',building:'WSC',floor:'3E',name:'Third-floor hall (sample)',type:'group',capacity:4,private:false,outlets:true,noise:'medium',busy:'medium',reserved:false,x:23,y:31,typical:[1,2,3,2,1]},
  {id:'wsc-3e-corner',building:'WSC',floor:'3E',name:'East quiet corner (sample)',type:'solo',capacity:1,private:false,outlets:false,noise:'low',busy:'low',reserved:false,x:51,y:65,typical:[1,1,2,1,1]},
  {id:'wsc-3w-open',building:'WSC',floor:'3W',name:'West open area (sample)',type:'group',capacity:8,private:false,outlets:true,noise:'medium',busy:'low',reserved:false,x:35,y:43,typical:[1,2,2,1,1]},
  {id:'wsc-3w-south',building:'WSC',floor:'3W',name:'West corridor nook (sample)',type:'solo',capacity:1,private:false,outlets:false,noise:'low',busy:'low',reserved:false,x:48,y:73,typical:[1,1,2,1,1]},
  {id:'wsc-4f',building:'WSC',floor:'4E',name:'Fourth-floor alcove (sample)',type:'solo',capacity:1,private:false,outlets:false,noise:'low',busy:'low',reserved:false,x:68,y:33,typical:[1,2,1,1,1]},
  {id:'wsc-5f',building:'WSC',floor:'5E',name:'Fifth-floor seating (sample)',type:'solo',capacity:1,private:false,outlets:true,noise:'low',busy:'medium',reserved:false,x:34,y:43,typical:[1,2,2,1,1]},
  {id:'wsc-6f',building:'WSC',floor:'6E',name:'Sixth-floor open area (sample)',type:'group',capacity:4,private:false,outlets:false,noise:'medium',busy:'low',reserved:false,x:34,y:54,typical:[1,2,2,1,2]},
  {id:'jkb-tables',building:'JKB',floor:'G',name:'Ground level tables',type:'solo',capacity:1,private:false,outlets:true,noise:'low',busy:'low',reserved:false,x:28,y:27,typical:[1,1,2,1,2]},
  {id:'jkb-nook',building:'JKB',floor:'G',name:'Quiet study nook',type:'solo',capacity:1,private:true,outlets:false,noise:'low',busy:'medium',reserved:false,x:73,y:73,typical:[1,2,2,1,1]},
  {id:'jkb-group',building:'JKB',floor:'L2',name:'Group table area',type:'group',capacity:8,private:false,outlets:true,noise:'medium',busy:'low',reserved:false,x:28,y:28,typical:[2,2,1,2,1]}
];

// Footprints follow the supplied 1238 x 807 campus-map screenshot, not guessed blocks.
// This is a preserve-mode component update: variance 3, motion 2, density 6.
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
  {id:'B73',x:1052,y:424,points:'1045,416 1055,416 1055,431 1044,431'},
  {id:'B66',x:1085,y:430,points:'1073,411 1102,411 1102,448 1097,449 1096,453 1070,453 1071,430 1069,429 1069,415'},
  {id:'TCB',name:'Tennis Courts Building',x:200,y:501,points:'180,458 219,459 220,475 237,477 237,481 220,482 220,528 226,529 226,531 220,534 220,541 222,542 218,544 179,544 177,503 179,497 177,495 176,462'},
  {id:'GH',x:331,y:471,points:'324,459 332,459 337,463 337,478 333,478 332,481 324,478'},
  {id:'FPH',x:315,y:506,points:'308,495 320,495 320,516 310,516 308,514'},
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

const STORAGE_KEY = 'study-byu-prototype-v1';
const defaultData = () => ({reports:{}, customSpots:[], lists:[{id:'favorites',name:'Favorites',spots:[]}], savedFilters:null});
function loadData(){try{const data=JSON.parse(localStorage.getItem(STORAGE_KEY));return data&&Array.isArray(data.lists)?{...defaultData(),...data}:defaultData()}catch{return defaultData()}}
let data=loadData();
const database=new window.StudyDatabase();
let reportSubmissionPending=false;
const state={view:'explore',building:'HBLL',floor:'L3',zoom:1,selectedSpot:null,selectedRoom:null,roomLabels:true,selectedList:'favorites',study:'any',noise:'any',private:false,outlets:false,groupSize:4,buildings:new Set(['HBLL','WSC','JKB'])};
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
const JKB_STUDY_POINTS={'jkb-tables':[520,177],'jkb-nook':[828,520],'jkb-group':[610,188]};
function buildingPlans(building=state.building){return {WSC:window.WSC_PLANS,HBLL:window.HBLL_PLANS,JKB:window.JKB_PLANS}[building]||null}
const viewHistory=[];
if(data.savedFilters){const f=data.savedFilters;state.study=f.study||'any';state.noise=f.noise||'any';state.private=!!f.private;state.outlets=!!f.outlets;state.groupSize=Math.min(8,Math.max(2,Number(f.groupSize)||4));state.buildings=new Set((f.buildings||[]).filter(id=>BUILDINGS[id]));}
const $=selector=>document.querySelector(selector);
const $$=selector=>[...document.querySelectorAll(selector)];
function esc(text){return String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
let campusZoom=1,campusSuppressClick=false;
function campusPointInside(points,x,y){
  let inside=false;
  for(let i=0,j=points.length-1;i<points.length;j=i++){
    const [ax,ay]=points[i],[bx,by]=points[j];
    if((ay>y)!==(by>y)&&x<(bx-ax)*(y-ay)/(by-ay)+ax)inside=!inside;
  }
  return inside;
}
function campusLabelLayout(building,available){
  const points=building.points.split(' ').map(point=>point.split(',').map(Number));
  const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
  const left=Math.min(...xs),right=Math.max(...xs),top=Math.min(...ys),bottom=Math.max(...ys);
  // Conservative Arial-bold metrics, including room for the text outline.
  const widths={I:.3,J:.6,M:.9,W:1,T:.7,F:.65,L:.65};
  const textWidth=[...building.id].reduce((width,char)=>width+(widths[char]||.8),0);
  const anchors=building.id==='JKB'?[[547,64],[building.x,building.y]]:[[building.x,building.y]];
  for(let row=1;row<8;row++)for(let col=1;col<8;col++)anchors.push([left+(right-left)*col/8,top+(bottom-top)*row/8]);
  for(const angle of available?[0]:[0,-90]){
    for(let size=available?20:14;size>=2;size-=.5){
      const padding=size<8?1.2:3;
      const width=(angle?size*1.55:textWidth*size)+padding,height=(angle?textWidth*size:size*1.55)+padding;
      for(const [x,y] of anchors){
        if(campusLabelBoxFits(points,x-width/2,y-height/2,x+width/2,y+height/2))return {x,y,size,angle};
      }
    }
  }
  return {x:building.x,y:building.y,size:3,angle:0};
}
function campusLabelBoxFits(points,left,top,right,bottom){
  if(![[left,top],[right,top],[left,bottom],[right,bottom]].every(([x,y])=>campusPointInside(points,x,y)))return false;
  // Reject roof edges crossing the label box, including narrow concave notches.
  for(let i=0;i<points.length;i++){
    const [x,y]=points[i],[nx,ny]=points[(i+1)%points.length],dx=nx-x,dy=ny-y;
    let start=0,end=1,intersects=true;
    for(const [p,q] of [[-dx,x-left],[dx,right-x],[-dy,y-top],[dy,bottom-y]]){
      if(p===0){if(q<0){intersects=false;break;}}
      else if(p<0)start=Math.max(start,q/p);
      else end=Math.min(end,q/p);
      if(start>end){intersects=false;break;}
    }
    if(intersects)return false;
  }
  return true;
}
function renderCampusMap(){
  const blocks=CAMPUS_BUILDINGS.map(b=>{
    const available=!!BUILDINGS[b.id],depth=available?12:b.id==='KMB'?20:6;
    const vertices=b.points.split(' ').map(point=>point.split(',').map(Number));
    const walls=vertices.map(([x,y],i)=>{const [nx,ny]=vertices[(i+1)%vertices.length];return `<polygon points="${x},${y} ${nx},${ny} ${nx+3},${ny+depth} ${x+3},${y+depth}"/>`;}).join('');
    const courtyard=b.courtyard?`<polygon class="campus-courtyard" points="${b.courtyard}"/>`:'';
    const label=campusLabelLayout(b,available);
    return `<g class="campus-building ${available?'is-available':'is-coming-soon'}" data-campus-building="${b.id}" ${available?`data-open-building="${b.id}"`:''} role="button" tabindex="0" aria-label="${esc(available?`${b.id} floor plans`:`${b.id}${b.name?' '+b.name:''}, coming soon`)}" ${available?'':'aria-controls="campusComingSoon"'}><title>${esc(b.name||b.id)}: ${available?'floor plans available':'not yet supported, coming soon'}</title><polygon class="campus-building-shadow" points="${b.points}" transform="translate(6 ${depth+5})"/><g class="campus-building-walls" aria-hidden="true">${walls}</g><polygon class="campus-building-roof" points="${b.points}"/>${courtyard}<text class="campus-building-label" x="${label.x}" y="${label.y}" style="font-size:${label.size}px;stroke-width:${label.size<8?.6:2}px" transform="rotate(${label.angle} ${label.x} ${label.y})" text-anchor="middle" dominant-baseline="central">${b.id}</text></g>`;
  }).join('');
  const trees=[[185,81],[399,25],[569,213],[563,281],[558,299],[586,286],[563,193],[550,214],[577,345],[873,556],[417,689],[966,161],[932,381],[695,499],[685,190],[280,619],[372,691],[510,715],[734,198],[767,380],[623,560],[587,531],[487,364],[222,573]].map(([x,y],i)=>`<g transform="translate(${x} ${y})"><ellipse class="campus-tree-shadow" cx="3" cy="5" rx="7" ry="5"/><circle class="campus-tree" r="${i%3+6}"/><circle class="campus-tree-light" cx="-2" cy="-2" r="3"/></g>`).join('');
  const parking=[[173,58,139,287],[436,21,45,80],[848,24,86,137],[998,259,214,49],[948,357,44,167],[845,479,115,55],[1105,304,101,245],[958,626,250,84]].map(([x,y,w,h])=>`<g class="campus-parking"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8"/>${Array.from({length:Math.floor(w/18)},(_,i)=>`<path d="M${x+10+i*18} ${y+8}v11 M${x+10+i*18} ${y+h-8}v-11"/>`).join('')}</g>`).join('');
  const walkways=['M408 0L383 328L205 676','M567 157L575 207L585 244L585 347L605 456L602 560','M343 346L926 344','M603 85L705 84','M612 88L665 138L626 172 M669 87L623 139L663 173','M690 200L721 200L732 226','M454 341L606 344','M439 489L433 542','M584 496L621 496','M611 458L626 458','M715 346L715 520','M687 345L687 561','M854 336L858 411','M748 580L855 581','M462 475L461 642','M476 464L489 489L499 519','M323 657L439 649','M354 580L402 580','M794 165L925 165','M975 281L1065 281','M440 18L506 19','M949 310L986 329','M690 641L697 695'];
  $('#campusMapDrawing').innerHTML=`<svg class="campus-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 -18 1238 845" role="group" aria-label="BYU central campus, digitized from the supplied map"><g aria-hidden="true"><rect class="campus-ground" x="0" y="-18" width="1238" height="845"/><path class="campus-lawn" d="M16 29H158V278H19Z M14 455H166V773H55Z M212 349L397 326L373 524L222 719L87 772L100 708L198 567Z M415 7L698 1L925 88L947 331L899 574L693 633L594 645L369 690L420 349Z M949 92L982 88L982 254L949 254Z M922 729L1214 729L1214 776L928 776Z"/><path class="campus-stream-bank" d="M310 86Q323 251 293 353Q276 456 220 535Q182 593 126 676Q78 725 103 762Q170 782 286 737L528 664Q536 702 482 747Q399 787 277 798L52 798Q26 748 60 691Q97 607 166 527Q232 418 247 341L278 153Z"/><path class="campus-stream" d="M304 91Q313 262 281 372Q247 477 195 555Q136 639 94 717Q71 757 113 763Q173 771 299 726L500 675"/>
  ${parking}<g class="campus-walkways">${walkways.map(d=>`<path d="${d}"/>`).join('')}</g>
  <g class="campus-roads"><path d="M431 -30Q411 160 382 285Q365 438 293 583Q238 676 209 677Q184 679 206 646"/><path d="M107 -5L168 -5Q210 -5 226 -28 M160 55L175 281Q187 347 141 357L15 357"/><path d="M13 793L866 793Q905 793 905 748V659Q898 605 947 604H1256"/><path d="M206 652Q186 679 218 692Q287 663 414 650Q546 638 647 611Q697 579 754 589L899 612"/><path d="M927 72Q1053 69 1111 106Q1145 125 1248 121"/><path d="M1218 -20V804 M968 327V535Q963 571 925 581 M947 280L1220 280 M925 346L929 381 M15 19V800"/></g>
  <g class="campus-road-lines"><path d="M431 -30Q411 160 382 285Q365 438 293 583"/><path d="M13 793L866 793Q905 793 905 748V659Q898 605 947 604H1256"/><path d="M206 652Q186 679 218 692Q287 663 414 650Q546 638 647 611Q697 579 754 589L899 612"/><path d="M1218 -20V804 M15 19V800"/></g>
  <g class="campus-roundabout"><circle cx="969" cy="280" r="26"/><circle class="campus-lawn" cx="969" cy="280" r="14"/></g>
  <g class="campus-fields"><rect x="23" y="45" width="129" height="77"/><rect x="23" y="144" width="129" height="128"/><rect x="31" y="464" width="130" height="78"/><path d="M23 84H152 M23 169H152 M23 195H152 M23 221H152 M23 247H152 M86 45V122 M31 503H161 M95 464V542"/><rect x="31" y="53" width="113" height="61"/><rect x="31" y="152" width="113" height="111"/><rect x="39" y="472" width="114" height="62"/></g>
  <g class="campus-tennis">${Array.from({length:8},(_,i)=>{const x=25+(i%4)*34,y=568+Math.floor(i/4)*57;return `<rect x="${x}" y="${y}" width="25" height="43"/><path d="M${x} ${y+21}h25 M${x+5} ${y+5}h15v33h-15Z"/>`;}).join('')}</g>
  <g class="campus-plaza"><path d="M627 94L657 94L656 159L625 159Z M672 171L739 170L739 197L672 197Z M786 173L851 171L852 190L786 191Z M842 540L889 540L889 568L842 568Z"/></g>
  <g class="campus-context-labels"><text x="88" y="138">RB Fields</text><text x="80" y="513">South Field</text><text x="86" y="636">Tennis courts</text><text x="721" y="187">Brigham Square</text><text x="899" y="183">Lee Lane</text><text x="970" y="241">Cougar Quad</text><text x="750" y="388">Cougar Crossing</text><text x="637" y="554">South Campus Quad</text><text x="344" y="603">Maeser Quad</text><text x="449" y="494">Kimball Quad</text><text x="188" y="355">Richards Quad</text><text x="501" y="753">Arboretum &amp; Botany Pond</text><text x="122" y="721">South Campus Trail</text></g>
  <g class="campus-road-labels"><text x="366" y="367" transform="rotate(-78 366 367)">Campus Drive</text><text x="809" y="355">1060 N</text><text x="455" y="672" transform="rotate(-12 455 672)">Campus Drive</text><text x="1069" y="610">900 N</text><text x="450" y="799">800 N</text><text x="1089" y="738">820 North Street</text><text x="980" y="467" transform="rotate(90 980 467)">750 East</text></g>${trees}</g>${blocks}</svg>`;
  const viewport=$('#campusMapViewport');let drag=null;
  viewport.onpointerdown=event=>{if(event.pointerType==='touch'||event.button!==0||event.target.closest('button'))return;drag={x:event.clientX,y:event.clientY,left:viewport.scrollLeft,top:viewport.scrollTop,moved:false};};
  viewport.onpointermove=event=>{if(!drag)return;const dx=event.clientX-drag.x,dy=event.clientY-drag.y;if(Math.hypot(dx,dy)>6){drag.moved=true;viewport.classList.add('is-panning');viewport.setPointerCapture?.(event.pointerId);viewport.scrollLeft=drag.left-dx;viewport.scrollTop=drag.top-dy;}};
  const endDrag=()=>{if(drag?.moved){campusSuppressClick=true;setTimeout(()=>campusSuppressClick=false,0);}drag=null;viewport.classList.remove('is-panning');};
  viewport.onpointerup=endDrag;viewport.onpointercancel=endDrag;
  changeCampusZoom(0,true);
}
function changeCampusZoom(delta,reset=false){
  const viewport=$('#campusMapViewport'),drawing=$('#campusMapDrawing');
  campusZoom=reset?1:Math.max(1,Math.min(3,campusZoom+delta));
  drawing.style.width=`${Math.max(viewport.clientWidth||800,760)*campusZoom}px`;
  $('#campusZoomValue').textContent=`${Math.round(campusZoom*100)}%`;
  $('#campusZoomOut').disabled=campusZoom===1;$('#campusZoomIn').disabled=campusZoom===3;
  if(reset){viewport.scrollLeft=Math.max(0,(parseFloat(drawing.style.width)*700/1238)-(viewport.clientWidth||800)/2);viewport.scrollTop=0;}
}
function showCampusBuilding(id){
  const building=CAMPUS_BUILDINGS.find(b=>b.id===id);if(!building||campusSuppressClick)return;
  $('#campusComingSoon').hidden=true;
  $$('.campus-building').forEach(el=>el.classList.toggle('is-selected',el.dataset.campusBuilding===id));
  if(BUILDINGS[id]){openBuilding(id);return;}
  $('#campusComingSoon').innerHTML=`<div><strong>${esc(building.name||id)}${building.name?` (${esc(id)})`:''}</strong><p>This building is not yet supported. Study maps are coming soon.</p></div><button type="button" data-dismiss-campus aria-label="Dismiss building message">×</button>`;
  $('#campusComingSoon').hidden=false;
}
function save(){localStorage.setItem(STORAGE_KEY,JSON.stringify(data))}
// Keep spots added in the earlier schematic Wilk view on the corresponding East plan.
let migrated=false;
for(const spot of data.customSpots){if(spot.building==='WSC'&&spot.floor==='G'){spot.floor='1E';migrated=true}else if(spot.building==='WSC'&&spot.floor==='L2'){spot.floor='2E';migrated=true}}
if(migrated)save();
function allSpots(){return [...DEMO_SPOTS,...data.customSpots]}
function spotById(id){return allSpots().find(s=>s.id===id)}
function floorLabel(spot){return BUILDINGS[spot.building].floors.find(f=>f.id===spot.floor)?.label||spot.floor}
function usesDatabase(spot){return database.config.configured&&!spot.id.startsWith('custom-')}
function currentReport(spot){return usesDatabase(spot)?(database.reports[spot.id]||[])[0]||null:(data.reports[spot.id]||[])[0]||null}
function currentBusy(spot){return currentReport(spot)?.busy||spot.busy}
function currentNoise(spot){return currentReport(spot)?.noise||spot.noise}
function matches(spot){if(!state.buildings.has(spot.building))return false;if(state.study==='solo'&&spot.type!=='solo')return false;if(state.study==='group'&&(spot.type!=='group'||spot.capacity<state.groupSize))return false;if(state.private&&!spot.private)return false;if(state.outlets&&!spot.outlets)return false;if(state.noise==='low'&&currentNoise(spot)!=='low')return false;if(state.noise==='medium'&&currentNoise(spot)==='high')return false;return true}
function rank(spot){return (spot.reserved?8:0)+(currentBusy(spot)==='low'?0:currentBusy(spot)==='medium'?2:currentBusy(spot)==='high'?5:3)+(currentNoise(spot)==='low'?0:1)}
function labelBusy(spot){if(spot.reserved)return 'Reserve ahead';const busy=currentBusy(spot);return busy==='low'?'Less busy':busy==='medium'?'Moderate':busy==='high'?'Busy':'No report yet'}
function badgeClass(spot){return spot.reserved?'reserved':currentBusy(spot)==='medium'?'medium':''}
function showToast(message){const toast=$('#toast');toast.textContent=message;toast.hidden=false;clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>toast.hidden=true,3500)}
function renderDatabaseStatus(){
  $$('[data-confirm-spot]').forEach(button=>{button.disabled=database.loading;});
  $('#databaseWarning').hidden=database.loading||(!database.error&&database.config.configured&&database.ready);
  $('#recommendHeading').nextElementSibling.textContent=database.config.configured?'Suggestions use database reports where available; other statuses remain sample data.':'Suggestions use sample crowding data until campus reports are connected.';
}
function renderDatabaseReceipt(report){
  const spot=spotById(report.spotId);
  $('#databaseReceipt').innerHTML=`<h2>Saved in Supabase</h2><p>${esc(spot?.name||report.spotId)} · Noise: ${esc(report.noise)} · Crowding: ${esc(report.busy)}</p>${report.note?`<p>${esc(report.note)}</p>`:''}<p>Database row: <code>${esc(report.id)}</code> · ${esc(new Date(report.time).toLocaleString())}</p><p>This is the row returned by the database, not a local-only save.</p><button type="button" class="subtle-button" data-open-reported="${esc(report.spotId)}">View this spot ↗</button>`;
  $('#databaseReceipt').hidden=false;
}
async function submitArrival(form){
  if(reportSubmissionPending)return;
  const id=form.dataset.id;
  const input={noise:form.elements.noise.value,busy:form.elements.busy.value,note:form.elements.note.value.trim()};
  if(!input.noise||!input.busy)return;
  const button=form.querySelector('[type="submit"]'),error=form.querySelector('#arrivalError');
  if(database.loading||!database.configLoaded){error.textContent=database.loading?'Wait for the connection check to finish.':'Connection settings could not be checked. Start with npm start and fix setup before reporting.';error.hidden=false;return;}
  if(database.error&&!database.config.configured){error.textContent=database.error;error.hidden=false;return;}
  const remote=usesDatabase(spotById(id));
  $('#databaseReceipt').hidden=true;
  reportSubmissionPending=true;button.disabled=true;button.textContent=remote?'Saving to Supabase…':'Saving locally…';error.hidden=true;
  try{
    if(remote){const report=await database.submitReport(id,input);closeModal(true);render();renderDatabaseStatus();renderDatabaseReceipt(report);showToast('Saved in Supabase. Click this spot to see its latest report.');}
    else{const report={...input,time:Date.now(),source:'local'};(data.reports[id]??=[]).unshift(report);data.reports[id]=data.reports[id].slice(0,10);save();closeModal(true);render();showToast('Local preview: report saved only on this device.');}
  }catch(problem){error.textContent=problem.message;error.hidden=false;database.error=problem.message;renderDatabaseStatus();}
  finally{reportSubmissionPending=false;button.disabled=false;button.textContent='Confirm report';}
}
function renderFilters(){
  $('#buildingFilters').innerHTML=Object.entries(BUILDINGS).map(([id,b])=>`<label class="building-check"><input type="checkbox" value="${id}" ${state.buildings.has(id)?'checked':''}><span>${id}</span><small>${esc(b.short)}</small></label>`).join('');
  $$('[data-study]').forEach(b=>b.classList.toggle('is-selected',b.dataset.study===state.study));
  $$('[data-noise]').forEach(b=>b.classList.toggle('is-selected',b.dataset.noise===state.noise));
  $('#groupSizeWrap').hidden=state.study!=='group';$('#groupSize').value=state.groupSize;$('#groupSizeValue').textContent=`${state.groupSize} people`;
  $('#privateFilter').checked=state.private;$('#outletFilter').checked=state.outlets;
  $('#matchCount').textContent=allSpots().filter(matches).length;
}
function renderRecommendations(){
  const spots=allSpots().filter(matches).sort((a,b)=>rank(a)-rank(b)).slice(0,3);
  $('#recommendationsList').innerHTML=spots.length?spots.map(s=>`<button type="button" class="recommendation-card" data-spot="${esc(s.id)}"><div class="rec-top"><span class="rec-building">${s.building} / ${esc(floorLabel(s))}</span><span class="availability ${badgeClass(s)}">${labelBusy(s)}</span></div><h3>${esc(s.name)}</h3><span class="rec-meta">${s.type==='group'?`Group up to ${s.capacity}`:'Individual'} · ${s.outlets?'Outlets':'No outlet listed'} ${s.reserved?'· Reservation required':''}</span></button>`).join(''):`<div class="empty-state"><h3>No spaces match these filters</h3><p>Try another building, a different noise level, or fewer requirements.</p><button class="secondary-button" type="button" data-action="clear">Clear filters</button></div>`;
}
function renderBuilding(){
  const building=BUILDINGS[state.building];if(!building)return;
  $('#buildingTitle').textContent=building.name;$('#buildingSummary').textContent=building.description;
  $('#buildingSelect').innerHTML=Object.entries(BUILDINGS).map(([id,b])=>`<option value="${id}" ${id===state.building?'selected':''}>${id}</option>`).join('');
  $('#officialFloorLink').href=building.floorsUrl;$('#buildingMapLink').href=building.map;
  const floor=building.floors.find(f=>f.id===state.floor)||building.floors[0];state.floor=floor.id;
  const isWsc=state.building==='WSC',isHbll=state.building==='HBLL';
  const digital=buildingPlans()?.[state.floor],isDigital=!!digital;
  const sides=isWsc?['East','West']:['North','South'];
  const hasSides=isDigital&&building.floors.filter(f=>f.level===floor.level).length>1;
  const levels=[...new Set(building.floors.map(f=>f.level))].sort((a,b)=>a-b);
  $('#floorTitle').textContent=floor.label;
  $('#floorSubtitle').textContent=isDigital?'Choose a room on the map, or search for its number.':`${building.short} · schematic study area guide`;
  $('#floorTabs').innerHTML=isDigital?levels.map(level=>`<button class="floor-tab ${floor.level===level?'is-selected':''}" data-${state.building.toLowerCase()}-level="${level}" type="button" aria-label="${level===0?'Basement':`Floor ${level}`}">${level===0?'B':level}</button>`).join(''):building.floors.map(f=>`<button class="floor-tab ${f.id===state.floor?'is-selected':''}" data-floor="${f.id}" type="button">${esc(f.label)}</button>`).join('');
  $('#floorSideTabs').hidden=!hasSides;
  $('#floorSideTabs').innerHTML=hasSides?sides.map(side=>`<button class="floor-tab ${floor.side===side?'is-selected':''}" data-${isHbll?'hbll':'wsc'}-side="${side}" type="button">${side}</button>`).join(''):'';
  $('#planAssetBar').hidden=!isDigital;
  $('#roomTools').hidden=!isDigital;$('#mapInstructions').hidden=!isDigital;
  $('#roomSearch').previousElementSibling.textContent=`Find a room in ${isHbll?'the HBLL':isWsc?'the Wilk':'JKB'}`;
  $('#roomSearch').placeholder=`Room number, e.g. ${isHbll?'4732':isWsc?'2050':'4057'}`;
  if(!isDigital)$('#selectedRoomPanel').hidden=true;
  if(isDigital){$('#sourcePdfLink').href=`assets/${state.building.toLowerCase()}/${floor.file}.pdf`;$('#zoomValue').textContent=`${Math.round(state.zoom*100)}%`;$('#zoomOut').disabled=state.zoom<=1;$('#zoomIn').disabled=state.zoom>=8;$('#toggleRoomLabels').setAttribute('aria-pressed',state.roomLabels)}
  const spots=allSpots().filter(s=>s.building===state.building&&s.floor===state.floor);
  const plan=$('#floorPlan');
  if(isDigital){
    plan.className=`floor-plan native-plan ${state.building.toLowerCase()}-plan ${state.roomLabels?'':'hide-room-labels'}`;plan.setAttribute('aria-label',`Interactive ${building.short} ${floor.label} map`);
    const studyPoints={WSC:WILK_STUDY_POINTS,HBLL:HBLL_STUDY_POINTS,JKB:JKB_STUDY_POINTS}[state.building]||{};
    plan.innerHTML=`<div class="plan-scroll"><div class="plan-canvas"><div id="planStage" class="plan-stage">${digital.svg}${spots.map((s,i)=>{const point=studyPoints[s.id]||[s.x/100*1224,s.y/100*792];const x=(point[0]-digital.crop[0])/digital.width*100;const y=(point[1]-digital.crop[1])/digital.height*100;return `<button type="button" class="plan-pin ${s.reserved?'reserved':''} ${matches(s)?'':'is-dimmed'} ${state.selectedSpot===s.id?'is-selected':''}" style="left:${x}%;top:${y}%" data-spot="${esc(s.id)}" title="${esc(s.name)}" aria-label="Sample spot ${i+1}: ${esc(s.name)}">S${i+1}</button>`}).join('')}</div></div></div>`;
    $('#floorLegend').innerHTML='<span><i class="map-key-swatch room"></i>Rooms</span><span><i class="map-key-swatch open"></i>Open areas</span><span><i class="map-key-swatch service"></i>Service cores</span><span><i class="legend-dot open"></i>Sample study spots</span>';
    $('#floorDisclaimer').textContent='Walls and room numbers follow the supplied BYU drawings. Study spots are provisional ideas.';
    $('#mapNorth').innerHTML=`N <span style="display:inline-block;transform:rotate(${digital.north}deg)">↑</span>`;
    mapResizeObserver.disconnect();mapResizeObserver.observe(plan);
    resizeDigitalMap();installMapPan();updateRoomHighlight();
  }else{
    const amenities=[{name:'Restroom',symbol:'WC',x:48,y:18},{name:'Vending',symbol:'V',x:20,y:53},{name:'Printer',symbol:'P',x:78,y:53}];
    plan.className='floor-plan';plan.setAttribute('aria-label','Illustrative floor view of study spots');
    plan.innerHTML=`<div class="floor-wing wing-a">Study zone</div><div class="floor-wing wing-b">Study zone</div><div class="floor-wing wing-c">Rooms & seating</div><div class="floor-wing wing-d">Rooms & seating</div><div class="floor-center" aria-label="Central corridor">+</div>${spots.map(s=>`<button type="button" class="floor-spot ${s.reserved?'reserved':''} ${matches(s)?'':'is-dimmed'} ${state.selectedSpot===s.id?'is-selected':''}" style="left:${s.x}%;top:${s.y}%;transform:translate(-50%,-50%)" data-spot="${esc(s.id)}" aria-label="${esc(s.name)}, ${s.reserved?'reservation required':labelBusy(s)}"><i aria-hidden="true"></i><span>${esc(s.name)}</span></button>`).join('')}${amenities.map(a=>`<span class="amenity-marker" style="left:${a.x}%;top:${a.y}%" aria-label="Illustrative ${a.name.toLowerCase()} position"><b>${a.symbol}</b>${a.name}</span>`).join('')}`;
    $('#floorLegend').innerHTML='<span><i class="legend-dot open"></i>Open study area</span><span><i class="legend-dot reserved"></i>Reservation required</span><span><i class="legend-dot amenity"></i>Amenity</span>';
    $('#floorDisclaimer').innerHTML='This is a schematic guide, not an architectural floor plan. Check the <a href="https://pf.byu.edu/space/floor-plans/master" target="_blank" rel="noopener noreferrer">BYU master floor plans</a> for exact room locations (BYU sign-in may be required).';
  }
  const matched=spots.filter(matches).sort((a,b)=>rank(a)-rank(b));
  $('#resultsSummary').textContent=`${matched.length} matching ${matched.length===1?'spot':'spots'} on this floor`;
  const chips=[];if(state.study==='group')chips.push(`Group ${state.groupSize}+`);else if(state.study==='solo')chips.push('Solo');if(state.noise==='low')chips.push('Quiet');else if(state.noise==='medium')chips.push('Conversational');if(state.private)chips.push('Private');if(state.outlets)chips.push('Outlets');
  $('#activeFilterBar').innerHTML=chips.map(c=>`<span>${esc(c)}</span>`).join('')||'<span>All study types</span>';
  $('#spotList').innerHTML=matched.length?matched.map(s=>`<button type="button" class="spot-row ${state.selectedSpot===s.id?'is-selected':''}" data-spot="${esc(s.id)}"><div class="spot-row-top"><h3>${isDigital?`${spots.indexOf(s)+1}. `:''}${esc(s.name)}</h3><span class="availability ${badgeClass(s)}">${labelBusy(s)}</span></div><p>${s.type==='group'?`Group up to ${s.capacity}`:'Individual'} · ${s.private?'Private':'Open'} · ${s.outlets?'Outlets':'Outlets not listed'}</p></button>`).join(''):`<div class="empty-state"><h3>No matching spots on this floor</h3><p>${isDigital?'Room search and the floor drawing remain available. ':''}Try another floor or update your filters.</p><button type="button" class="secondary-button" data-action="edit">Edit filters</button></div>`;
}
function renderSaved(){
  $('#savedCount').textContent=new Set(data.lists.flatMap(l=>l.spots)).size;
  $('#createList').disabled=data.lists.length>=3;$('#createList').title=data.lists.length>=3?'Two custom lists maximum':'';
  if(!data.lists.some(l=>l.id===state.selectedList))state.selectedList='favorites';
  $('#savedTabs').innerHTML=data.lists.map(l=>`<button type="button" class="saved-tab ${l.id===state.selectedList?'is-selected':''}" data-list="${esc(l.id)}">${esc(l.name)} <span>${l.spots.length}</span></button>`).join('');
  const list=data.lists.find(l=>l.id===state.selectedList);const spots=list.spots.map(spotById).filter(Boolean);
  $('#savedItems').innerHTML=spots.length?spots.map(s=>`<div class="saved-card"><div><span class="rec-building">${s.building} / ${esc(floorLabel(s))}</span><h3>${esc(s.name)}</h3><p>${s.type==='group'?`Group up to ${s.capacity}`:'Individual'} · ${s.reserved?'Reservation required':labelBusy(s)}</p></div><button type="button" data-open-saved="${esc(s.id)}">View ↗</button></div>`).join(''):`<div class="empty-state"><h3>Nothing saved here yet</h3><p>Open a study spot and save it to this list.</p><button type="button" class="secondary-button" data-action="explore">Explore spaces</button></div>`;
}
function render(){renderFilters();renderRecommendations();renderBuilding();renderSaved();$$('.view').forEach(v=>v.hidden=v.id!==`${state.view}View`);$('#navExplore').classList.toggle('is-active',state.view!=='saved');$('#navSaved').classList.toggle('is-active',state.view==='saved');$('#backToExplore').textContent=viewHistory.at(-1)==='saved'?'← Back to saved':'← Back to campus'}
function setView(view){if(state.view!==view)viewHistory.push(state.view);state.view=view;render();window.scrollTo({top:0,behavior:'smooth'})}
function goBack(){state.view=viewHistory.pop()||'explore';render();window.scrollTo({top:0,behavior:'smooth'})}
function openBuilding(id,floor){if(!BUILDINGS[id])return;$('#campusComingSoon').hidden=true;state.building=id;state.floor=floor||BUILDINGS[id].floors[0].id;state.zoom=1;state.selectedSpot=null;state.selectedRoom=null;$('#roomSearch').value='';$('#roomSearchResults').hidden=true;setView('building')}
function resizeDigitalMap(){
  const plan=buildingPlans()?.[state.floor];if(!plan||!$('#planStage'))return;
  const viewport=$('.plan-scroll'),stage=$('#planStage'),canvas=$('.plan-canvas');
  const fit=Math.min(Math.max(240,viewport.clientWidth-48),Math.max(200,viewport.clientHeight-48)*plan.width/plan.height);
  const width=fit*state.zoom,height=width*plan.height/plan.width;
  stage.style.width=`${width}px`;stage.style.height=`${height}px`;
  canvas.style.width=`max(100%, ${width+48}px)`;canvas.style.height=`max(100%, ${height+48}px)`;
}
const mapResizeObserver=new ResizeObserver(()=>resizeDigitalMap());
function changeZoom(delta){
  const viewport=$('.plan-scroll');if(!viewport)return;
  const oldZoom=state.zoom,centerX=(viewport.scrollLeft+viewport.clientWidth/2),centerY=(viewport.scrollTop+viewport.clientHeight/2);
  state.zoom=Math.max(1,Math.min(8,Math.round((state.zoom+delta)*100)/100));resizeDigitalMap();
  viewport.scrollLeft=centerX*state.zoom/oldZoom-viewport.clientWidth/2;viewport.scrollTop=centerY*state.zoom/oldZoom-viewport.clientHeight/2;
  $('#zoomValue').textContent=`${Math.round(state.zoom*100)}%`;$('#zoomOut').disabled=state.zoom<=1;$('#zoomIn').disabled=state.zoom>=8;
}
function installMapPan(){
  const viewport=$('.plan-scroll');let start=null,dragging=false,ignoreClick=false;
  viewport.addEventListener('pointerdown',event=>{if(event.button!==0||event.target.closest('button'))return;start={x:event.clientX,y:event.clientY,left:viewport.scrollLeft,top:viewport.scrollTop};dragging=false});
  viewport.addEventListener('pointermove',event=>{if(!start)return;const dx=event.clientX-start.x,dy=event.clientY-start.y;if(!dragging&&Math.hypot(dx,dy)>6){dragging=true;viewport.setPointerCapture(event.pointerId);viewport.classList.add('is-panning')}if(dragging){viewport.scrollLeft=start.left-dx;viewport.scrollTop=start.top-dy}});
  const finish=()=>{if(dragging){ignoreClick=true;setTimeout(()=>ignoreClick=false,0)}start=null;dragging=false;viewport.classList.remove('is-panning')};
  viewport.addEventListener('pointerup',finish);viewport.addEventListener('pointercancel',finish);
  viewport.addEventListener('click',event=>{if(ignoreClick){event.preventDefault();event.stopPropagation()}},true);
}
function renderRoomSearch(){
  const query=$('#roomSearch').value.trim().toUpperCase(),results=$('#roomSearchResults');
  if(!query){results.hidden=true;results.innerHTML='';return}
  const matches=Object.entries(buildingPlans()||{}).flatMap(([floor,plan])=>plan.rooms.filter(r=>r.number.includes(query)).map(room=>({floor,plan,room}))).sort((a,b)=>(a.room.number===query?-1:0)-(b.room.number===query?-1:0)||a.room.number.localeCompare(b.room.number)).slice(0,8);
  results.innerHTML=matches.length?matches.map(({floor,plan,room})=>`<button type="button" data-find-room="${room.number}" data-room-floor="${floor}"><strong>Room ${room.number}</strong><span>${esc(plan.label)}</span></button>`).join(''):'<p>No matching room number in the supplied plans.</p>';
  results.hidden=false;
}
function selectRoom(number,floor=state.floor,locate=false){
  const plan=buildingPlans()?.[floor],room=plan?.rooms.find(r=>r.number===number);if(!room)return;
  if(state.floor!==floor){state.floor=floor;state.zoom=1;state.selectedSpot=null;renderBuilding()}
  state.selectedRoom={number,floor};state.roomLabels=true;$('#floorPlan').classList.remove('hide-room-labels');$('#toggleRoomLabels').setAttribute('aria-pressed','true');
  $('#roomSearchResults').hidden=true;$('#roomSearch').value='';updateRoomHighlight();
  if(locate){const viewport=$('.plan-scroll'),stage=$('#planStage');const fitWidth=stage.offsetWidth/state.zoom;const locateZoom=Math.min(8,Math.max(2.5,Math.ceil(plan.width*2/fitWidth*4)/4));if(state.zoom<locateZoom)changeZoom(locateZoom-state.zoom);viewport.scrollLeft=stage.offsetLeft+room.x/plan.width*stage.offsetWidth-viewport.clientWidth/2;viewport.scrollTop=stage.offsetTop+room.y/plan.height*stage.offsetHeight-viewport.clientHeight/2}
}
function updateRoomHighlight(){
  const current=state.selectedRoom?.floor===state.floor?state.selectedRoom:null;
  const plan=buildingPlans()?.[state.floor];
  if(plan)$('#planAssetBar > span').textContent=current?`Room ${current.number} selected`:`${plan.rooms.length} room numbers on this floor`;
  $$('#floorPlan [data-room]').forEach(el=>el.classList.toggle('is-selected',el.dataset.room===current?.number));
  const panel=$('#selectedRoomPanel');panel.hidden=!current;
  if(current&&plan){panel.innerHTML=`<div><span class="room-selection-label">On the map</span><h3>Room ${esc(current.number)}</h3><p>${esc(plan.label)} · ${esc(BUILDINGS[state.building].short)}</p></div><button type="button" data-clear-room aria-label="Clear selected room">×</button>`}
}
function closeModal(force=false){if(!force&&reportSubmissionPending&&$('#arrivalForm'))return;const backdrop=$('#modalBackdrop');backdrop.hidden=true;$('#modal').innerHTML='';document.body.style.overflow='';if(closeModal.focus)closeModal.focus.focus()}
function openModal(html){if(reportSubmissionPending)return;closeModal.focus=document.activeElement;$('#modal').innerHTML=html;$('#modalBackdrop').hidden=false;document.body.style.overflow='hidden';$('#modal').querySelector('button, input, select')?.focus()}
function modalHeader(title){return `<div class="modal-top"><h2 id="modalTitle">${esc(title)}</h2><button class="modal-close" type="button" data-modal-close aria-label="Close">×</button></div>`}
function openSpot(id){
  const s=spotById(id);if(!s)return;state.selectedSpot=s.id;
  if(state.view==='building'){if(buildingPlans()?.[state.floor])$$('.plan-pin,.spot-row').forEach(el=>el.classList.toggle('is-selected',el.dataset.spot===s.id));else renderBuilding()}
  const report=currentReport(s),isSaved=data.lists.some(l=>l.spots.includes(s.id));
  const trend=s.typical?.length?`<div class="trend" aria-label="Illustrative typical crowding across five periods">${s.typical.map(n=>`<span class="${n===2?'medium':n===3?'high':''}"></span>`).join('')}</div><div class="trend-labels"><span>Earlier</span><span>Later</span></div>`:'<p>Typical crowding is not available for this spot.</p>';
  const reportDetails=s.reserved?'<p>Availability is managed by BYU. This prototype does not show room availability.</p>':report?`<p>Noise: ${esc(report.noise)} · Crowding: ${esc(report.busy)}</p><small>${report.source==='supabase'?'Read from Supabase':'Saved locally on this device'} · ${esc(new Date(report.time).toLocaleString())}</small>${report.source==='supabase'?`<p>Database row: <code>${esc(report.id)}</code></p>`:''}${report.note?`<p>${esc(report.note)}</p>`:''}`:usesDatabase(s)&&database.error?`<p class="form-error">Database reports could not be loaded: ${esc(database.error)}</p>`:`<p>Sample status: ${esc(s.noise||'unknown')} noise · ${esc(s.busy||'unknown')} crowding. ${usesDatabase(s)?'No database report loaded for this spot.':'No local report yet.'}</p>`;
  openModal(`${modalHeader(s.name)}<p class="modal-description">${s.building} · ${esc(floorLabel(s))} · ${s.type==='group'?`Group up to ${s.capacity}`:'Individual study'}</p><div class="detail-tags"><span>${s.private?'Private':'Open space'}</span><span>${s.outlets?'Outlets nearby':'Outlets not listed'}</span><span>${s.reserved?'Reservation required':`Noise: ${esc(currentNoise(s)||'unknown')}`}</span></div><div id="latestReport" class="report-box"><h3>${s.reserved?'Reservation required':'Latest report'}</h3>${reportDetails}</div><div class="report-box"><h3>Typical crowding</h3><small>Illustrative historical pattern for the prototype</small>${trend}</div><div class="modal-actions"><button class="secondary-button" type="button" data-modal-close>Keep searching</button><button class="secondary-button" type="button" data-save-spot="${esc(s.id)}">${isSaved?'Saved / lists':'Save to a list'}</button>${s.reserved?`<a class="primary-button" href="https://lib.byu.edu/services/group-study-rooms/" target="_blank" rel="noopener noreferrer">Reserve with BYU ↗</a>`:`<button class="primary-button" type="button" data-confirm-spot="${esc(s.id)}" ${database.loading||!database.configLoaded?'disabled':''}>Choose this spot</button>`}</div>`);
}
function openArrival(id){
  const s=spotById(id);if(!s)return;
  openModal(`${modalHeader('Once you arrive…')}<p class="modal-description">How is ${esc(s.name)} right now? ${usesDatabase(s)?'Confirm report saves to Supabase as the fictional Demo Student. Do not include names or private information.':database.config.configured?'This is a local new-spot suggestion, not a seeded database spot. Its reports remain on this device and are not the database vertical slice.':'Local preview only: this report will stay on this device. Configure .env to test database persistence.'}</p><form id="arrivalForm" data-id="${esc(s.id)}"><p class="choice-label">Noise level</p><div class="choice-row">${['low','medium','high'].map((v,i)=>`<label><input type="radio" name="noise" value="${v}" ${i===0?'required':''}>${v[0].toUpperCase()+v.slice(1)}</label>`).join('')}</div><p class="choice-label">How busy is it?</p><div class="choice-row">${['low','medium','high'].map((v,i)=>`<label><input type="radio" name="busy" value="${v}" ${i===0?'required':''}>${v[0].toUpperCase()+v.slice(1)}</label>`).join('')}</div><div class="form-field"><label for="reportNote">Other details (optional)</label><textarea id="reportNote" name="note" maxlength="240" placeholder="Anything useful for the next student?"></textarea></div><p id="arrivalError" class="form-error" role="alert" hidden></p><div class="modal-actions"><button type="button" class="secondary-button" data-modal-close>Not there yet</button><button type="submit" class="primary-button">Confirm report</button></div></form>`);
}
function openSave(id){const s=spotById(id);if(!s)return;openModal(`${modalHeader('Save this spot')}<p class="modal-description">Add ${esc(s.name)} to any of your lists.</p><div class="building-checks">${data.lists.map(l=>`<label class="building-check"><input type="checkbox" data-save-list="${esc(l.id)}" ${l.spots.includes(id)?'checked':''}><span>${esc(l.name)}</span></label>`).join('')}</div><div class="modal-actions"><button class="secondary-button" type="button" data-modal-close>Cancel</button><button class="primary-button" type="button" data-save-confirm="${esc(id)}">Save changes</button></div>`)}
function openNewSpot(){openModal(`${modalHeader('Report a new spot')}<p class="modal-description">Suggest a study area missing from this prototype. It will appear on this device for now.</p><form id="newSpotForm"><div class="form-field"><label for="newName">Spot name</label><input id="newName" name="name" required maxlength="60" placeholder="Example: east wing tables"></div><div class="form-field"><label for="newBuilding">Building</label><select id="newBuilding" name="building">${Object.entries(BUILDINGS).map(([id,b])=>`<option value="${id}">${esc(b.name)}</option>`).join('')}</select></div><div class="form-field"><label for="newFloor">Floor</label><select id="newFloor" name="floor"></select></div><div class="form-field"><label for="newType">Space type</label><select id="newType" name="type"><option value="solo">Individual</option><option value="group">Group</option></select></div><div class="form-field" id="newCapacityWrap" hidden><label for="newCapacity">Maximum group size (2-8)</label><input id="newCapacity" name="capacity" type="number" min="2" max="8" value="4"></div><div class="form-field"><label for="newNoise">Usual noise</label><select id="newNoise" name="noise"><option value="low">Quiet</option><option value="medium">Conversational</option><option value="high">Lively</option></select></div><div class="building-checks"><label class="building-check"><input type="checkbox" name="private"><span>Private or separated</span></label><label class="building-check"><input type="checkbox" name="outlets"><span>Outlets nearby</span></label></div><div class="form-field"><label for="newDetail">Location details (optional)</label><textarea id="newDetail" name="detail" maxlength="160" placeholder="Nearby landmark or entrance"></textarea></div><p class="form-error" id="newSpotError" hidden></p><div class="modal-actions"><button type="button" class="secondary-button" data-modal-close>Cancel</button><button type="submit" class="primary-button">Add spot</button></div></form>`);updateNewSpotFloors()}
function updateNewSpotFloors(){const form=$('#newSpotForm');if(!form)return;const b=form.elements.building.value;form.elements.floor.innerHTML=BUILDINGS[b].floors.map(f=>`<option value="${f.id}">${esc(f.label)}</option>`).join('');$('#newCapacityWrap').hidden=form.elements.type.value!=='group'}
function openCreateList(){if(data.lists.length>=3){showToast('You can have Favorites and two custom lists.');return}openModal(`${modalHeader('New saved list')}<p class="modal-description">Create a list for a class, group, or favorite study routine.</p><form id="newListForm"><div class="form-field"><label for="newListName">List name</label><input id="newListName" name="name" required maxlength="28" placeholder="Example: Group project"></div><p class="form-error" id="newListError" role="alert" hidden></p><div class="modal-actions"><button type="button" class="secondary-button" data-modal-close>Cancel</button><button type="submit" class="primary-button">Create list</button></div></form>`)}
function resetFilters(){state.buildings=new Set(['HBLL','WSC','JKB']);state.study='any';state.groupSize=4;state.noise='any';state.private=false;state.outlets=false;data.savedFilters=null;save();render()}
function updateFilter(){renderFilters();renderRecommendations();if(state.view==='building')renderBuilding()}
function showMatches(){const match=allSpots().filter(matches).sort((a,b)=>rank(a)-rank(b));if(!state.buildings.size){showToast('Choose at least one building.');return}if(!match.length){openBuilding([...state.buildings][0]);showToast('No spaces match. Try changing a filter.');return}openBuilding(match[0].building,match[0].floor)}

document.addEventListener('click',event=>{
  const t=event.target.closest('button,a,[data-room],[data-campus-building]');if(!t)return;
  if(t.dataset.campusBuilding){showCampusBuilding(t.dataset.campusBuilding);return}
  if(t.hasAttribute('data-dismiss-campus')){$('#campusComingSoon').hidden=true;$$('.campus-building').forEach(el=>el.classList.remove('is-selected'));return}
  if(t.id==='campusZoomIn'||t.id==='campusZoomOut'||t.id==='campusZoomFit'){changeCampusZoom(t.id==='campusZoomIn'?.25:t.id==='campusZoomOut'?-.25:0,t.id==='campusZoomFit');return}
  if(t.dataset.findRoom){selectRoom(t.dataset.findRoom,t.dataset.roomFloor,true);return}
  if(t.dataset.room){selectRoom(t.dataset.room);return}
  if(t.hasAttribute('data-clear-room')){state.selectedRoom=null;updateRoomHighlight();return}
  if(t.id==='toggleRoomLabels'){state.roomLabels=!state.roomLabels;$('#floorPlan').classList.toggle('hide-room-labels',!state.roomLabels);t.setAttribute('aria-pressed',state.roomLabels);return}
  if(t.id==='zoomFit'){changeZoom(1-state.zoom);$('.plan-scroll').scrollLeft=0;$('.plan-scroll').scrollTop=0;return}
  if(t.matches('[data-modal-close]')){closeModal();return}
  if(t.id==='homeButton'||t.id==='navExplore'){setView('explore');return}
  if(t.id==='backToExplore'||t.id==='savedBack'){goBack();return}
  if(t.id==='navSaved'){setView('saved');return}
  if(t.id==='navReport'){openNewSpot();return}
  if(t.dataset.openReported){const s=spotById(t.dataset.openReported);if(s){openBuilding(s.building,s.floor);openSpot(s.id)}return}
  if(t.id==='clearFilters'||t.dataset.action==='clear'){resetFilters();return}
  if(t.id==='saveFilters'){data.savedFilters={study:state.study,noise:state.noise,private:state.private,outlets:state.outlets,groupSize:state.groupSize,buildings:[...state.buildings]};save();showToast('Filters saved on this device.');return}
  if(t.id==='showMatches'){showMatches();return}
  if(t.dataset.openBuilding){openBuilding(t.dataset.openBuilding);return}
  if(t.dataset.study){state.study=t.dataset.study;updateFilter();return}
  if(t.dataset.noise){state.noise=t.dataset.noise;updateFilter();return}
  if(t.dataset.floor){state.floor=t.dataset.floor;state.zoom=1;state.selectedSpot=null;state.selectedRoom=null;renderBuilding();return}
  if(t.dataset.wscLevel){const level=Number(t.dataset.wscLevel);state.floor=level<=3?`${level}${state.floor.endsWith('W')?'W':'E'}`:`${level}E`;state.zoom=1;state.selectedSpot=null;state.selectedRoom=null;renderBuilding();return}
  if(t.dataset.wscSide){state.floor=`${state.floor[0]}${t.dataset.wscSide==='West'?'W':'E'}`;state.zoom=1;state.selectedSpot=null;state.selectedRoom=null;renderBuilding();return}
  if(t.hasAttribute('data-hbll-level')){const level=Number(t.dataset.hbllLevel);state.floor=level===0?'B':`L${level}${level<=3&&state.floor.endsWith('N')?'N':''}`;state.zoom=1;state.selectedSpot=null;state.selectedRoom=null;$('#roomSearchResults').hidden=true;renderBuilding();return}
  if(t.dataset.hbllSide){const floor=BUILDINGS.HBLL.floors.find(f=>f.id===state.floor);state.floor=`L${floor.level}${t.dataset.hbllSide==='North'?'N':''}`;state.zoom=1;state.selectedSpot=null;state.selectedRoom=null;$('#roomSearchResults').hidden=true;renderBuilding();return}
  if(t.dataset.jkbLevel){const floor=BUILDINGS.JKB.floors.find(f=>f.level===Number(t.dataset.jkbLevel));if(!floor)return;state.floor=floor.id;state.zoom=1;state.selectedSpot=null;state.selectedRoom=null;$('#roomSearchResults').hidden=true;renderBuilding();return}
  if(t.id==='zoomOut'||t.id==='zoomIn'){changeZoom(t.id==='zoomIn'?.25:-.25);return}
  if(t.dataset.spot){const s=spotById(t.dataset.spot);if(state.view==='explore'){openBuilding(s.building,s.floor)}openSpot(s.id);return}
  if(t.dataset.openSaved){const s=spotById(t.dataset.openSaved);openBuilding(s.building,s.floor);openSpot(s.id);return}
  if(t.dataset.confirmSpot){openArrival(t.dataset.confirmSpot);return}
  if(t.dataset.saveSpot){openSave(t.dataset.saveSpot);return}
  if(t.dataset.saveConfirm){const id=t.dataset.saveConfirm;data.lists.forEach(l=>{const checked=!!$(`[data-save-list="${l.id}"]`)?.checked;l.spots=l.spots.filter(x=>x!==id);if(checked)l.spots.push(id)});save();renderSaved();closeModal();showToast('Saved lists updated.');return}
  if(t.id==='editFilters'||t.dataset.action==='edit'){setView('explore');$('#filterHeading').scrollIntoView({behavior:'smooth'});return}
  if(t.dataset.action==='explore'){setView('explore');return}
  if(t.id==='createList'){openCreateList();return}
  if(t.dataset.list){state.selectedList=t.dataset.list;renderSaved();return}
});
document.addEventListener('change',event=>{
  const t=event.target;
  if(t.closest('#buildingFilters')){state.buildings=new Set($$('#buildingFilters input:checked').map(x=>x.value));updateFilter()}
  if(t.id==='privateFilter'){state.private=t.checked;updateFilter()}
  if(t.id==='outletFilter'){state.outlets=t.checked;updateFilter()}
  if(t.id==='buildingSelect'){openBuilding(t.value)}
  if(t.id==='newBuilding'||t.id==='newType')updateNewSpotFloors();
});
$('#groupSize').addEventListener('input',e=>{state.groupSize=Number(e.target.value);updateFilter()});
$('#roomSearch').addEventListener('input',renderRoomSearch);
$('#roomSearch').addEventListener('keydown',event=>{if(event.key==='Enter'){const first=$('#roomSearchResults button');if(first){event.preventDefault();selectRoom(first.dataset.findRoom,first.dataset.roomFloor,true)}}else if(event.key==='Escape')$('#roomSearchResults').hidden=true});
document.addEventListener('keydown',event=>{const campus=event.target.closest('[data-campus-building]');if(campus&&(event.key==='Enter'||event.key===' ')){event.preventDefault();showCampusBuilding(campus.dataset.campusBuilding);return}const room=event.target.closest('#floorPlan .map-room');if(room&&(event.key==='Enter'||event.key===' ')){event.preventDefault();selectRoom(room.dataset.room)}});
document.addEventListener('pointerdown',event=>{if(!event.target.closest('.room-search-wrap'))$('#roomSearchResults').hidden=true});
$('#modalBackdrop').addEventListener('click',e=>{if(e.target.id==='modalBackdrop')closeModal()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('#modalBackdrop').hidden)closeModal()});
document.addEventListener('submit',e=>{
  if(e.target.id==='arrivalForm'){e.preventDefault();void submitArrival(e.target);return}
  if(e.target.id==='newSpotForm'){e.preventDefault();const f=e.target.elements;const name=f.name.value.trim();const type=f.type.value;const capacity=type==='group'?Number(f.capacity.value):1;if(name.length<3||(type==='group'&&(capacity<2||capacity>8))){$('#newSpotError').textContent='Enter a spot name and a group size from 2 to 8.';$('#newSpotError').hidden=false;return}const chosenFloor=BUILDINGS[f.building.value].floors.find(fl=>fl.id===f.floor.value);const spot={id:`custom-${Date.now()}`,building:f.building.value,floor:f.floor.value,name,type,capacity,private:f.private.checked,outlets:f.outlets.checked,noise:f.noise.value,busy:null,reserved:false,x:chosenFloor?.defaultX??29,y:chosenFloor?.defaultY??72,typical:[],detail:f.detail.value.trim()};data.customSpots.push(spot);save();closeModal();openBuilding(spot.building,spot.floor);render();showToast('New spot added on this device.');return}
  if(e.target.id==='newListForm'){e.preventDefault();const name=e.target.elements.name.value.trim();if(!name||name.length>28){$('#newListError').textContent='Enter a list name from 1 to 28 characters, not just spaces.';$('#newListError').hidden=false;return}const id=`list-${Date.now()}`;data.lists.push({id,name,spots:[]});state.selectedList=id;save();closeModal();setView('saved');showToast('List created.');return}
});
renderCampusMap();
window.addEventListener('resize',()=>changeCampusZoom(0));
render();
renderDatabaseStatus();
void database.initialize().then(()=>{renderDatabaseStatus();render()}).catch(()=>{database.error='The database connection could not initialize. Check .env and refresh to retry.';renderDatabaseStatus()});
