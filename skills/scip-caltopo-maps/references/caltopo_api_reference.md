# CalTopo API Reference for SCIP Map Generation

## Account Details

| Field | Value |
|-------|-------|
| Account | hodges.thomas@gmail.com |
| Account ID | G2710M |
| Team | Skyline Trial |
| Subscription | Pro (auto-renews 5/8/2026) |
| WMTS URL | `https://caltopo.com/api/G2710M/wmts` |
| WMS URL | `https://caltopo.com/api/G2710M/wms?` |
| KML URL | `https://caltopo.com/api/G2710M/superoverlay.kml` |

## WMTS Tile URL Pattern

```
https://caltopo.com/api/{ACCOUNT_ID}/wmts/tile/{LAYER_ID}/{ZOOM}/{COL}/{ROW}.png
```

Tiles are 256x256 pixels, EPSG:3857 (Web Mercator), zoom levels 0-18.

## Available WMTS Layers

### Base Layers

| Layer Name | Identifier | SCIP Use |
|------------|-----------|----------|
| Topo (MapBuilder) | `mbt` | Topography Map |
| Hybrid | `mbh` | Zoning, Search Ring |
| Scanned Topos | `t` | Reference |
| Imagery | `imagery` | Aerial, Floodplain, Wetlands, Cell Tower, Parcel |
| Roads | `mbr` | FLU Map |
| FAA Sectional | `faa` | Airport Map |
| Normal Relief | `r` | Reference |
| Enhanced Relief | `r2` | Viewshed fallback |
| Terrain | `r3` | Wind Speed fallback |
| OpenStreetMap | `om` | Reference |

### Overlay Layers

| Layer Name | Identifier | SCIP Use |
|------------|-----------|----------|
| Contours | `c` | Topography overlay |
| 10ft Contours | `cf10` | Detail contours |
| MapBuilder Overlay | `mba` | Roads/labels overlay |
| Slope Angle Shading | `sf` | Terrain analysis |
| Public Lands | `sma` | Land ownership |
| Geology | `geology` | Reference |
| Structures | `structures` | Cell tower context |

## CalTopo URL Parameters

Interactive map URLs use hash fragments:
```
https://caltopo.com/map.html#ll={LAT},{LON}&z={ZOOM}&b={BASE}&a={OVERLAYS}
```

Overlay codes for URL (different from WMTS IDs):
- `parcel_ln` — Parcel boundary lines
- `parcel_no` — Parcel numbers
- `sma` — Public lands
- `c` — Contours
- `sf` — Slope angle shading
- `mba` — MapBuilder overlay

## Teams API Authentication

CalTopo Teams API uses HMAC-SHA256 signed requests:

1. Construct message: `{METHOD} {ENDPOINT}\n{EXPIRES}\n{PAYLOAD}`
2. Sign with base64-decoded credential secret
3. Include `id`, `expires`, `signature` as query params

### Endpoints

| Action | Method | Endpoint |
|--------|--------|----------|
| Create Map | POST | `/api/v1/map` |
| Get Map | GET | `/api/v1/map/{MAP_ID}` |
| Add Marker | POST | `/api/v1/map/{MAP_ID}/Marker` |
| Add Shape | POST | `/api/v1/map/{MAP_ID}/Shape` |
| List Team Maps | GET | `/api/v1/group/{GROUP_ID}/map` |

## External GIS Overlays

### FEMA NFHL (Floodplain)
```
https://hazards.fema.gov/gis/nfhl/services/public/NFHL/MapServer/WMSServer
?service=WMS&version=1.1.1&request=GetMap&layers=0&srs=EPSG:4326
&bbox={W},{S},{E},{N}&width={W}&height={H}&format=image/png&transparent=true
```

### USFWS NWI (Wetlands)
```
https://fwsprimary.wim.usgs.gov/server/rest/services/Wetlands/MapServer/export
?bbox={XMIN},{YMIN},{XMAX},{YMAX}&bboxSR=3857&imageSR=3857
&layers=show:0&size={W},{H}&format=png32&transparent=true&f=image
```

### Cesium Ion (3D Viewsheds)
- Asset ID 1 = Cesium World Terrain
- Token: stored in .secrets
- Renders via headless Chromium + CesiumJS
