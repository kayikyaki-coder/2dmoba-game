/* Harita verisi. Elle ya da harita editörüyle (http://localhost:8080/tools/mapeditor.html) düzenlenir.
   Şekiller: daire { c:[x,y], r }, dikdörtgen { x, y, w, h }, çokgen { poly:[[x,y],...] }.
   walls: geçilmez, görüşü keser (mermiler üstünden geçer). bushes: çalılar (içindeki birim dışarıdan görünmez, aynı çalıya giren görür, çalıdan vuran 1,5 sn görünür).
   lanes: takım 0 üssünden takım 1 üssüne nokta listesi. structs: takım 0 yapıları (dış kule, iç kule, üs kulesi, nexus);
   takım 1'inkiler x'te aynalanır.
   11.10.2026 "1 koridor + orman": altta tek koridor, üst yarı orman (kamplar data.js JUNGLE). Eski iki koridorlu harita: old/map_data_2koridor.js
   (eski: koridor 1 üstte aktif, pts [[320,1100],[560,700],[1000,420],[1700,300],[2600,270],...], kuleler [1900,293],[1150,395]). */
export const MAP_DATA = {
  "w": 5200,
  "h": 2200,
  "lanes": [
    { "id": "bottom", "name": "Koridor", "active": true, "width": 520, "pts": [[320,1100],[560,1500],[1000,1780],[1700,1900],[2600,1930],[3500,1900],[4200,1780],[4640,1500],[4880,1100]] }
  ],
  "walls": [
    { "c": [0,0], "r": 600 },
    { "c": [5200,0], "r": 600 },
    { "c": [0,2200], "r": 600 },
    { "c": [5200,2200], "r": 600 },
    { "x": 1150, "y": 1260, "w": 450, "h": 270 },
    { "x": 3600, "y": 1260, "w": 450, "h": 270 },
    { "x": 1820, "y": 1320, "w": 460, "h": 270 },
    { "x": 2920, "y": 1320, "w": 460, "h": 270 },
    { "c": [1250,560], "r": 140 },
    { "c": [3950,560], "r": 140 },
    { "x": 1350, "y": 700, "w": 430, "h": 170 },
    { "x": 3420, "y": 700, "w": 430, "h": 170 },
    { "c": [2000,1010], "r": 105 },
    { "c": [3200,1010], "r": 105 },
    { "c": [2300,330], "r": 120 },
    { "c": [2900,330], "r": 120 },
    { "c": [2380,1160], "r": 95 },
    { "c": [2820,1160], "r": 95 },
    { "c": [850,800], "r": 90 },
    { "c": [4350,800], "r": 90 },
    { "c": [2600,600], "r": 115 }
  ],
  "bushes": [
    { "c": [1500,1130], "r": 75 },
    { "c": [3700,1130], "r": 75 },
    { "c": [2230,760], "r": 70 },
    { "c": [2970,760], "r": 70 },
    { "c": [1710,1560], "r": 70 },
    { "c": [3490,1560], "r": 70 },
    { "poly": [[2200,2200],[2350,2075],[2600,2100],[2925,2075],[3000,2200]] }
  ],
  "structs": [["tower",1900,1907],["tower",1150,1805],["base",650,1100],["nexus",320,1100]]
};
