export const TILE_LAYERS = {
  osm: {
    label: "OpenStreetMap",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    subdomains: ["a", "b", "c"] as string[],
    minimumLevel: 0,
    maximumLevel: 19,
    credit: "Map data © OpenStreetMap contributors",
  },
  arcgisImagery: {
    label: "ArcGIS World Imagery",
    // ESRI tile order: {z}/{y}/{x} (level/row/col)
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    subdomains: [] as string[],
    minimumLevel: 0,
    maximumLevel: 19,
    credit: "© Esri, Maxar, GeoEye, Earthstar Geographics",
  },
  arcgisHillshade: {
    label: "ArcGIS World Hillshade",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/Elevation/World_Hillshade/MapServer/tile/{z}/{y}/{x}",
    subdomains: [] as string[],
    minimumLevel: 0,
    maximumLevel: 16,
    credit: "© Esri, USGS, NOAA",
  },
  esriOcean: {
    label: "Esri World Ocean",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}",
    subdomains: [] as string[],
    minimumLevel: 0,
    maximumLevel: 13,
    credit: "© Esri, DeLorme, NaturalVue",
  },
  stadiaWatercolor: {
    label: "Stamen Watercolor",
    url: "https://tiles.stadiamaps.com/tiles/stamen_watercolor/{z}/{x}/{y}.jpg",
    subdomains: [] as string[],
    minimumLevel: 1,
    maximumLevel: 16,
    credit: "Map tiles by Stamen Design; Data © OpenStreetMap contributors",
  },
  stadiaToner: {
    label: "Stamen Toner",
    url: "https://tiles.stadiamaps.com/tiles/stamen_toner/{z}/{x}/{y}.png",
    subdomains: [] as string[],
    minimumLevel: 0,
    maximumLevel: 20,
    credit: "Map tiles by Stamen Design; Data © OpenStreetMap contributors",
  },
  stadiaSmooth: {
    label: "Stadia Alidade Smooth",
    url: "https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}.png",
    subdomains: [] as string[],
    minimumLevel: 0,
    maximumLevel: 20,
    credit: "© Stadia Maps, © OpenMapTiles, © OpenStreetMap contributors",
  },
  stadiaSmoothDark: {
    label: "Stadia Alidade Dark",
    url: "https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}.png",
    subdomains: [] as string[],
    minimumLevel: 0,
    maximumLevel: 20,
    credit: "© Stadia Maps, © OpenMapTiles, © OpenStreetMap contributors",
  },
  cartoDark: {
    label: "CARTO Dark",
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
    subdomains: ["a", "b", "c", "d"] as string[],
    minimumLevel: 0,
    maximumLevel: 19,
    credit: "© CARTO",
  },
  topo: {
    label: "地形圖",
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    subdomains: ["a", "b", "c"] as string[],
    minimumLevel: 0,
    maximumLevel: 17,
    credit: "© OpenTopoMap contributors",
  },
  nlscPhoto: {
    label: "國土影像（台灣）",
    // NLSC WMTS order: {z}/{y}/{x} (level/row/col)
    url: "https://wmts.nlsc.gov.tw/wmts/PHOTO2/default/GoogleMapsCompatible/{z}/{y}/{x}",
    subdomains: [] as string[],
    minimumLevel: 0,
    maximumLevel: 20,
    credit: "© 國土測繪中心",
  },
} as const;

export type TileLayerKey = keyof typeof TILE_LAYERS;

export const DEFAULT_LAYER_KEY: TileLayerKey = "osm";

export const INITIAL_CAMERA = {
  longitude: 121.57,
  latitude: 25.04,
  height: 50_000, // metres
} as const;
