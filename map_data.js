/* Harita verisi. Elle ya da harita editörüyle (http://localhost:8080/tools/mapeditor.html) düzenlenir.
   Şekiller: daire { c:[x,y], r }, dikdörtgen { x, y, w, h }, çokgen { poly:[[x,y],...] }.
   walls: geçilmez, görüşü keser (mermiler üstünden geçer). bushes: çalılar (içindeki birim dışarıdan görünmez, aynı çalıya giren görür, çalıdan vuran 1,5 sn görünür).
   lanes: takım 0 üssünden takım 1 üssüne nokta listesi. structs: takım 0 yapıları (dış kule, iç kule, üs kulesi, nexus);
   takım 1'inkiler x'te aynalanır. */
export const MAP_DATA = {
  "w": 5200,
  "h": 2200,
  "lanes": [
    { "id": "top", "name": "Koridor 1", "active": true, "width": 520, "pts": [[320,1100],[560,700],[1000,420],[1700,300],[2600,270],[3500,300],[4200,420],[4640,700],[4880,1100]] },
    { "id": "bottom", "name": "Koridor 2", "active": false, "width": 520, "pts": [[320,1100],[560,1500],[1000,1780],[1700,1900],[2600,1930],[3500,1900],[4200,1780],[4640,1500],[4880,1100]] }
  ],
  "walls": [
    { "c": [0,0], "r": 600 },
    { "c": [5200,0], "r": 600 },
    { "c": [0,2200], "r": 600 },
    { "c": [5200,2200], "r": 600 },
    { "x": 1150, "y": 660, "w": 1100, "h": 330 },
    { "x": 2950, "y": 660, "w": 1100, "h": 330 },
    { "x": 1150, "y": 1210, "w": 1100, "h": 330 },
    { "x": 2950, "y": 1210, "w": 1100, "h": 330 },
    { "c": [2600,1100], "r": 150 },
    { "c": [1700,1100], "r": 75 },
    { "c": [3500,1100], "r": 50 }
  ],
  "bushes": [
    { "poly": [[2275,600],[2400,725],[2250,875],[2250,675],[2025,675],[2025,575]] },
    { "poly": [[3175,575],[3175,675],[2950,675],[2950,875],[2800,725],[2925,600]] },
    { "poly": [[2200,0],[2350,125],[2600,100],[2925,125],[3000,0]] }
  ],
  "structs": [["tower",1900,293],["tower",1150,395],["base",650,1100],["nexus",320,1100]]
};
