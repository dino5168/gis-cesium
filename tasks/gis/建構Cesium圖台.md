
# Cesium 範例碼
``` js
// 1. 初始化 Viewer，將預設需要 Key 的影像、地形、基底圖切換器全部關閉
const viewer = new Cesium.Viewer('cesiumContainer', {
    imageryProvider: false,      // 關閉預設影像
    baseLayerPicker: false,      // 關閉右上角的基底圖切換器（因為那些預設圖層都需要 Key）
    terrainProvider: undefined   // 關閉預設地形
});

// 2. 建立 OSM 影像圖層
const osmLayer = new Cesium.ImageryLayer(
    new Cesium.UrlTemplateImageryProvider({
        url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        subdomains: ['a', 'b', 'c'],
        minimumLevel: 0,
        maximumLevel: 19,
        credit: 'Map data © OpenStreetMap contributors' // 遵循 OSM 授權標示
    })
);

// 3. 將圖層加進地圖
viewer.imageryLayers.add(osmLayer);
```

# 任務
1. 檢核範例碼是否正確。
2. 使用範例碼新增一個頁面 DemoCesium 可以顯示 OSM 。

