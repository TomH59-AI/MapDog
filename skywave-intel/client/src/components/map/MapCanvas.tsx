/*
 * MapCanvas — Full-bleed Mapbox GL map with all GIS data layers
 * Layers: Hillshade, Contours, Topo, Wetlands, Wetlands Raster,
 *         FEMA Flood, Parcels (Regrid), Airports, Cell Towers, Search Ring
 */
import { useEffect, useRef, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import { useSite, API_KEYS } from "@/contexts/SiteContext";

mapboxgl.accessToken = API_KEYS.MAPBOX_TOKEN;

// Export map instance for other components
export let mapInstance: mapboxgl.Map | null = null;

export function MapCanvas({ onReady }: { onReady: () => void }) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const { layers, mapStyle, site } = useSite();

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: `mapbox://styles/mapbox/${mapStyle}`,
      center: [-96.0, 39.5],
      zoom: 4,
      pitch: 0,
      bearing: 0,
      attributionControl: false,
    });

    map.addControl(new mapboxgl.NavigationControl({ showCompass: true }), 'top-right');
    map.addControl(new mapboxgl.ScaleControl({ maxWidth: 200 }), 'bottom-left');
    map.addControl(new mapboxgl.AttributionControl({ compact: true }), 'bottom-right');

    map.on('load', () => {
      addSources(map);
      addLayers(map);
      setupInteractions(map);
      onReady();
    });

    mapRef.current = map;
    mapInstance = map;

    return () => {
      map.remove();
      mapRef.current = null;
      mapInstance = null;
    };
  }, []);

  // Sync layer visibility
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    layers.forEach(layer => {
      const layerMappings: Record<string, string[]> = {
        'hillshade': ['hillshade-layer'],
        'contours': ['contours-layer'],
        'topo': ['topo-layer'],
        'wetlands': ['wetlands-layer'],
        'wetlands-raster': ['wetlands-raster-layer'],
        'flood': ['flood-layer'],
        'parcels': ['parcel-line', 'parcel-fill'],
        'airports': ['airports-circles', 'airports-labels'],
        'towers': ['towers-layer'],
        'search-ring': ['ring-fill', 'ring-stroke', 'site-marker', 'site-pulse'],
      };

      const ids = layerMappings[layer.id] || [];
      ids.forEach(id => {
        if (map.getLayer(id)) {
          map.setLayoutProperty(id, 'visibility', layer.visible ? 'visible' : 'none');
        }
      });

      // Opacity for raster layers
      const opacityMap: Record<string, string> = {
        'hillshade': 'hillshade-layer',
        'contours': 'contours-layer',
        'topo': 'topo-layer',
        'wetlands': 'wetlands-layer',
        'wetlands-raster': 'wetlands-raster-layer',
        'flood': 'flood-layer',
      };
      if (opacityMap[layer.id] && map.getLayer(opacityMap[layer.id])) {
        map.setPaintProperty(opacityMap[layer.id], 'raster-opacity', layer.opacity / 100);
      }
    });
  }, [layers]);

  // Style change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    map.setStyle(`mapbox://styles/mapbox/${mapStyle}`);
    map.once('style.load', () => {
      addSources(map);
      addLayers(map);
      setupInteractions(map);
    });
  }, [mapStyle]);

  return (
    <div ref={mapContainer} className="absolute inset-0 w-full h-full" />
  );
}

function addSources(map: mapboxgl.Map) {
  // USGS Hillshade
  if (!map.getSource('usgs-hillshade')) {
    map.addSource('usgs-hillshade', {
      type: 'raster',
      tiles: ['https://basemap.nationalmap.gov/arcgis/services/USGSShadedReliefOnly/MapServer/WMSServer?service=WMS&request=GetMap&version=1.3.0&layers=0&styles=&format=image/png&transparent=true&height=256&width=256&crs=EPSG:3857&bbox={bbox-epsg-3857}'],
      tileSize: 256,
    });
  }

  // USGS Contours
  if (!map.getSource('usgs-contours')) {
    map.addSource('usgs-contours', {
      type: 'raster',
      tiles: ['https://basemap.nationalmap.gov/arcgis/services/Contours/MapServer/WMSServer?service=WMS&request=GetMap&version=1.3.0&layers=0&styles=&format=image/png&transparent=true&height=256&width=256&crs=EPSG:3857&bbox={bbox-epsg-3857}'],
      tileSize: 256,
    });
  }

  // USGS Topo
  if (!map.getSource('usgs-topo')) {
    map.addSource('usgs-topo', {
      type: 'raster',
      tiles: ['https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer/tile/{z}/{y}/{x}'],
      tileSize: 256,
    });
  }

  // USFWS Wetlands (NWI)
  if (!map.getSource('wetlands')) {
    map.addSource('wetlands', {
      type: 'raster',
      tiles: ['https://fwspublicservices.wim.usgs.gov/wetlandsmapservice/services/Wetlands/MapServer/WMSServer?service=WMS&request=GetMap&version=1.3.0&layers=0&styles=&format=image/png&transparent=true&height=256&width=256&crs=EPSG:3857&bbox={bbox-epsg-3857}'],
      tileSize: 256,
    });
  }

  // USFWS Wetlands Raster
  if (!map.getSource('wetlands-raster')) {
    map.addSource('wetlands-raster', {
      type: 'raster',
      tiles: ['https://fwspublicservices.wim.usgs.gov/wetlandsmapservice/services/Wetlands_Raster/MapServer/WMSServer?service=WMS&request=GetMap&version=1.3.0&layers=0&styles=&format=image/png&transparent=true&height=256&width=256&crs=EPSG:3857&bbox={bbox-epsg-3857}'],
      tileSize: 256,
    });
  }

  // FEMA Flood Zones
  if (!map.getSource('fema-flood')) {
    map.addSource('fema-flood', {
      type: 'raster',
      tiles: ['https://hazards.fema.gov/gis/nfhl/rest/services/public/NFHL/MapServer/export?bbox={bbox-epsg-3857}&bboxSR=3857&imageSR=3857&size=256,256&format=png32&transparent=true&f=image&layers=show:28'],
      tileSize: 256,
    });
  }

  // Regrid Parcels
  if (!map.getSource('parcels')) {
    map.addSource('parcels', {
      type: 'vector',
      tiles: [`https://tiles.regrid.com/v1/parcel/{z}/{x}/{y}.pbf?token=${API_KEYS.REGRID_TOKEN}`],
    });
  }

  // Airports (custom Mapbox tileset)
  if (!map.getSource('airports')) {
    map.addSource('airports', {
      type: 'vector',
      url: API_KEYS.AIRPORTS_TILESET,
    });
  }

  // Search Ring (GeoJSON)
  if (!map.getSource('search-ring')) {
    map.addSource('search-ring', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    });
  }

  // Site Marker (GeoJSON)
  if (!map.getSource('site-marker')) {
    map.addSource('site-marker', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    });
  }

  // Cell Towers (GeoJSON, loaded dynamically)
  if (!map.getSource('fcc-towers')) {
    map.addSource('fcc-towers', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    });
  }
}

function addLayers(map: mapboxgl.Map) {
  // Raster layers (off by default)
  const rasterLayers = [
    { id: 'hillshade-layer', source: 'usgs-hillshade', opacity: 0.6 },
    { id: 'contours-layer', source: 'usgs-contours', opacity: 0.8 },
    { id: 'topo-layer', source: 'usgs-topo', opacity: 0.7 },
    { id: 'wetlands-layer', source: 'wetlands', opacity: 0.55 },
    { id: 'wetlands-raster-layer', source: 'wetlands-raster', opacity: 0.55 },
    { id: 'flood-layer', source: 'fema-flood', opacity: 0.5 },
  ];

  rasterLayers.forEach(({ id, source, opacity }) => {
    if (!map.getLayer(id)) {
      map.addLayer({
        id, type: 'raster', source,
        paint: { 'raster-opacity': opacity },
        layout: { visibility: 'none' },
      });
    }
  });

  // Regrid Parcel lines
  if (!map.getLayer('parcel-line')) {
    map.addLayer({
      id: 'parcel-line', type: 'line', source: 'parcels',
      'source-layer': 'parcel',
      paint: {
        'line-color': '#eab308',
        'line-width': ['interpolate', ['linear'], ['zoom'], 10, 0.3, 14, 1, 18, 2],
      },
      layout: { visibility: 'visible' },
    });
  }

  // Parcel fill (for click)
  if (!map.getLayer('parcel-fill')) {
    map.addLayer({
      id: 'parcel-fill', type: 'fill', source: 'parcels',
      'source-layer': 'parcel',
      paint: { 'fill-color': '#eab308', 'fill-opacity': 0 },
      layout: { visibility: 'visible' },
    });
  }

  // Airports circles
  if (!map.getLayer('airports-circles')) {
    map.addLayer({
      id: 'airports-circles', type: 'circle', source: 'airports',
      'source-layer': API_KEYS.AIRPORTS_SOURCE_LAYER,
      minzoom: 6,
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 6, 3, 10, 6, 14, 10],
        'circle-color': '#f97316', 'circle-stroke-color': '#fff', 'circle-stroke-width': 1.5,
        'circle-opacity': 0.9,
      },
      layout: { visibility: 'none' },
    });
  }

  // Airports labels
  if (!map.getLayer('airports-labels')) {
    map.addLayer({
      id: 'airports-labels', type: 'symbol', source: 'airports',
      'source-layer': API_KEYS.AIRPORTS_SOURCE_LAYER,
      minzoom: 8,
      layout: {
        'text-field': ['get', 'airport_name'], 'text-size': 11,
        'text-offset': [0, 1.5], 'text-anchor': 'top', 'text-allow-overlap': false,
        visibility: 'none',
      },
      paint: { 'text-color': '#fbbf24', 'text-halo-color': 'rgba(10,14,23,0.8)', 'text-halo-width': 2 },
    });
  }

  // Cell Towers
  if (!map.getLayer('towers-layer')) {
    map.addLayer({
      id: 'towers-layer', type: 'circle', source: 'fcc-towers',
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 3, 12, 6, 16, 10],
        'circle-color': '#ef4444', 'circle-stroke-color': '#fff', 'circle-stroke-width': 1,
        'circle-opacity': 0.85,
      },
      layout: { visibility: 'none' },
    });
  }

  // Search Ring fill
  if (!map.getLayer('ring-fill')) {
    map.addLayer({
      id: 'ring-fill', type: 'fill', source: 'search-ring',
      paint: { 'fill-color': '#f59e0b', 'fill-opacity': 0.08 },
    });
  }

  // Search Ring stroke
  if (!map.getLayer('ring-stroke')) {
    map.addLayer({
      id: 'ring-stroke', type: 'line', source: 'search-ring',
      paint: { 'line-color': '#f59e0b', 'line-width': 2.5, 'line-dasharray': [3, 2] },
    });
  }

  // Site marker
  if (!map.getLayer('site-marker')) {
    map.addLayer({
      id: 'site-marker', type: 'circle', source: 'site-marker',
      paint: {
        'circle-radius': 8, 'circle-color': '#ef4444',
        'circle-stroke-color': '#fff', 'circle-stroke-width': 3,
      },
    });
  }

  // Site marker pulse
  if (!map.getLayer('site-pulse')) {
    map.addLayer({
      id: 'site-pulse', type: 'circle', source: 'site-marker',
      paint: {
        'circle-radius': 20, 'circle-color': '#ef4444', 'circle-opacity': 0.15,
        'circle-stroke-color': '#ef4444', 'circle-stroke-width': 1, 'circle-stroke-opacity': 0.3,
      },
    });
  }
}

function setupInteractions(map: mapboxgl.Map) {
  // Parcel click popup
  map.on('click', 'parcel-fill', (e) => {
    if (!e.features?.length) return;
    const props = e.features[0].properties || {};
    const fields = [
      ['Owner', props.owner || props.parcelnumb_no_formatting],
      ['Address', props.address || props.mailadd],
      ['APN', props.parcelnumb || props.apn],
      ['Acres', props.ll_gisacre ? parseFloat(props.ll_gisacre).toFixed(2) : ''],
      ['Zoning', props.zoning || props.zoning_id],
      ['Land Use', props.usecode || props.landuse],
      ['County', props.county],
      ['State', props.state2],
    ].filter(([, v]) => v);

    const html = `
      <div style="font-family:Inter,sans-serif;">
        <div style="font-size:14px;font-weight:700;color:#f59e0b;margin-bottom:8px;">
          <i class="fas fa-vector-square" style="margin-right:6px;"></i>Parcel Info
        </div>
        ${fields.map(([l, v]) => `
          <div style="display:flex;justify-content:space-between;padding:3px 0;font-size:12px;">
            <span style="color:#94a3b8;">${l}</span>
            <span style="color:#e2e8f0;font-family:'JetBrains Mono',monospace;font-weight:500;">${v}</span>
          </div>
        `).join('')}
      </div>
    `;
    new mapboxgl.Popup({ maxWidth: '320px' }).setLngLat(e.lngLat).setHTML(html).addTo(map);
  });

  // Airport click popup
  map.on('click', 'airports-circles', (e) => {
    if (!e.features?.length) return;
    const props = e.features[0].properties || {};
    const fields = [
      ['Municipality', props.municipality],
      ['Region', props.airport_US_region],
      ['Elevation', props.airport_elevation_ft ? `${props.airport_elevation_ft} ft` : ''],
      ['Type', props.airport_type],
    ].filter(([, v]) => v);

    const html = `
      <div style="font-family:Inter,sans-serif;">
        <div style="font-size:14px;font-weight:700;color:#f59e0b;margin-bottom:8px;">
          <i class="fas fa-plane" style="margin-right:6px;"></i>${props.airport_name || 'Airport'}
        </div>
        ${fields.map(([l, v]) => `
          <div style="display:flex;justify-content:space-between;padding:3px 0;font-size:12px;">
            <span style="color:#94a3b8;">${l}</span>
            <span style="color:#e2e8f0;font-family:'JetBrains Mono',monospace;">${v}</span>
          </div>
        `).join('')}
      </div>
    `;
    new mapboxgl.Popup({ maxWidth: '300px' }).setLngLat(e.lngLat).setHTML(html).addTo(map);
  });

  // Tower click popup
  map.on('click', 'towers-layer', (e) => {
    if (!e.features?.length) return;
    const props = e.features[0].properties || {};
    const fields = [
      ['Reg #', props.reg_num],
      ['Owner', props.owner],
      ['Height', props.height ? `${props.height} ft` : ''],
      ['Type', props.structure_type],
      ['City', props.city],
      ['State', props.state],
    ].filter(([, v]) => v);

    const html = `
      <div style="font-family:Inter,sans-serif;">
        <div style="font-size:14px;font-weight:700;color:#f59e0b;margin-bottom:8px;">
          <i class="fas fa-broadcast-tower" style="margin-right:6px;"></i>Cell Tower
        </div>
        ${fields.map(([l, v]) => `
          <div style="display:flex;justify-content:space-between;padding:3px 0;font-size:12px;">
            <span style="color:#94a3b8;">${l}</span>
            <span style="color:#e2e8f0;font-family:'JetBrains Mono',monospace;">${v}</span>
          </div>
        `).join('')}
      </div>
    `;
    new mapboxgl.Popup({ maxWidth: '300px' }).setLngLat(e.lngLat).setHTML(html).addTo(map);
  });

  // Cursor changes
  ['parcel-fill', 'airports-circles', 'towers-layer'].forEach(layer => {
    map.on('mouseenter', layer, () => { map.getCanvas().style.cursor = 'pointer'; });
    map.on('mouseleave', layer, () => { map.getCanvas().style.cursor = ''; });
  });
}
