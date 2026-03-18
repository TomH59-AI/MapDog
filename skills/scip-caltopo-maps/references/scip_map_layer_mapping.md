# SCIP Map → CalTopo Layer Mapping

This reference maps each required SCIP map to its CalTopo layer configuration
and any external overlay sources needed.

## Standard SCIP Maps (11)

| # | Map Name | CalTopo Base | CalTopo Overlay | External Overlay | Zoom |
|---|----------|-------------|-----------------|-----------------|------|
| 01 | Aerial Map | `imagery` | — | — | 14-16 |
| 02 | Topography Map | `mbt` (Topo) | `c` (Contours) | — | 14 |
| 03 | Floodplain Map | `imagery` | — | FEMA NFHL WMS | 14 |
| 04 | Zoning Map | `mbh` (Hybrid) | — | — | 14 |
| 05 | FLU Map | `mbr` (Roads) | — | — | 14 |
| 06 | Wetlands Map | `imagery` | — | USFWS NWI REST | 14 |
| 07 | Airport Map | `faa` (FAA Sectional) | — | ArcGIS Airport query | 11 |
| 08 | Cell Tower Map | `imagery` | — | FCC ASR / OpenCellID | 14 |
| 09 | Parcel Map | `imagery` | `mba` (Overlay) | — | 16-17 |
| 10 | Wind Speed Map | `r3` (Terrain) | — | NREL (optional) | 12-14 |
| 11 | Search Ring Map | `mbh` (Hybrid) | — | — | 13 |

## 3D Tilted Viewsheds (4)

| # | Direction | Heading | Pitch | Source |
|---|-----------|---------|-------|--------|
| 12 | North | 0° | -15° | Cesium Ion |
| 13 | East | 90° | -15° | Cesium Ion |
| 14 | South | 180° | -15° | Cesium Ion |
| 15 | West | 270° | -15° | Cesium Ion |

Camera height: 60m AGL (above treeline)
Fallback: CalTopo Enhanced Relief (`r2`) if Playwright unavailable

## Zoom Level Guide

| Zoom | Approx. Coverage | Use Case |
|------|------------------|----------|
| 11 | ~50 miles | Airport context |
| 12 | ~25 miles | Wind speed regional |
| 13 | ~10 miles | Search ring |
| 14 | ~2 miles | Standard site maps |
| 15 | ~1 mile | Detailed area |
| 16 | ~0.5 miles | Parcel detail |
| 17 | ~0.25 miles | Close-up parcel |

## CalTopo Interactive URL Overlays

For interactive CalTopo links in SCIP documents:

| Overlay | URL Code | Description |
|---------|----------|-------------|
| Parcel Lines | `parcel_ln` | Property boundary lines |
| Parcel Numbers | `parcel_no` | APN/parcel ID labels |
| Public Lands | `sma` | Federal/state land boundaries |
| Contours | `c` | Elevation contour lines |
| Slope Shading | `sf` | Slope angle visualization |
| MapBuilder | `mba` | Roads, trails, labels overlay |

Example URL with parcel overlay:
```
https://caltopo.com/map.html#ll=34.2572,-83.8451&z=14&b=imagery&a=parcel_ln
```
