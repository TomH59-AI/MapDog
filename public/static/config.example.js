/**
 * MapDog Intel Map — API Configuration (EXAMPLE)
 * ────────────────────────────────────────────────
 * Copy this file to config.js and fill in your API keys.
 *   cp config.example.js config.js
 *
 * DO NOT commit config.js — it is .gitignore'd.
 */
const MAP_CONFIG = {
  // Mapbox GL JS — get yours at https://account.mapbox.com/
  MAPBOX_TOKEN: 'YOUR_MAPBOX_TOKEN_HERE',

  // Regrid Parcel Tiles — get yours at https://regrid.com/
  REGRID_TOKEN: 'YOUR_REGRID_TOKEN_HERE',

  // Mapbox Tileset IDs (custom uploads)
  AIRPORTS_TILESET: 'mapbox://YOUR_USERNAME.YOUR_TILESET_ID',
  AIRPORTS_SOURCE_LAYER: 'YOUR_SOURCE_LAYER_NAME',

  // Default map center (CONUS center)
  DEFAULT_CENTER: [-96.0, 39.5],
  DEFAULT_ZOOM: 4
};
