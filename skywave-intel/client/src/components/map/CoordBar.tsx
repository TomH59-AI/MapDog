/*
 * CoordBar — Coordinate input bar with search ring radius
 * Mission Control: glass panel, amber accents, monospace data
 */
import { useState, useCallback, useRef } from "react";
import { useSite, API_KEYS } from "@/contexts/SiteContext";
import { mapInstance } from "./MapCanvas";
import { Search, Crosshair, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import * as turf from "@turf/turf";

export function CoordBar() {
  const { site, setSite, updateSite } = useSite();
  const [input, setInput] = useState("");
  const [radius, setRadius] = useState("2");
  const inputRef = useRef<HTMLInputElement>(null);

  const flyToSite = useCallback((lat: number, lon: number, radiusMiles: number) => {
    const map = mapInstance;
    if (!map) return;

    // Create search ring GeoJSON
    const center = turf.point([lon, lat]);
    const ring = turf.circle(center, radiusMiles, { steps: 80, units: 'miles' });

    // Update map sources
    const ringSource = map.getSource('search-ring') as mapboxgl.GeoJSONSource;
    const markerSource = map.getSource('site-marker') as mapboxgl.GeoJSONSource;

    if (ringSource) ringSource.setData(ring);
    if (markerSource) {
      markerSource.setData({
        type: 'FeatureCollection',
        features: [{ type: 'Feature', geometry: { type: 'Point', coordinates: [lon, lat] }, properties: {} }],
      });
    }

    // Fly to location
    const bounds = turf.bbox(ring);
    map.fitBounds(bounds as [number, number, number, number], {
      padding: { top: 100, bottom: 60, left: 60, right: 400 },
      duration: 2000,
    });

    // Set site data
    setSite({ lat, lon, radiusMiles, radiusUnit: 'miles' });

    // Fetch FCC tower data
    fetchFCCTowers(lat, lon, radiusMiles, map);

    toast.success(`Site locked: ${lat.toFixed(6)}, ${lon.toFixed(6)}`);
  }, [setSite]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = input.trim().replace(/[°'"NSEW]/gi, '').replace(/\s+/g, ' ');

    // Try parsing various formats
    let lat: number | null = null;
    let lon: number | null = null;

    // Format: "lat, lon" or "lat lon"
    const parts = cleaned.split(/[,\s]+/).filter(Boolean);
    if (parts.length >= 2) {
      lat = parseFloat(parts[0]);
      lon = parseFloat(parts[1]);
    }

    if (lat === null || lon === null || isNaN(lat) || isNaN(lon)) {
      toast.error("Invalid coordinates. Use format: 35.1234, -89.5678");
      return;
    }

    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      toast.error("Coordinates out of range");
      return;
    }

    const r = parseFloat(radius) || 2;
    flyToSite(lat, lon, r);
  }, [input, radius, flyToSite]);

  const handleReset = useCallback(() => {
    setInput("");
    setSite(null);
    const map = mapInstance;
    if (map) {
      const ringSource = map.getSource('search-ring') as mapboxgl.GeoJSONSource;
      const markerSource = map.getSource('site-marker') as mapboxgl.GeoJSONSource;
      const towerSource = map.getSource('fcc-towers') as mapboxgl.GeoJSONSource;
      if (ringSource) ringSource.setData({ type: 'FeatureCollection', features: [] });
      if (markerSource) markerSource.setData({ type: 'FeatureCollection', features: [] });
      if (towerSource) towerSource.setData({ type: 'FeatureCollection', features: [] });
      map.flyTo({ center: [-96, 39.5], zoom: 4, duration: 1500 });
    }
  }, [setSite]);

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <div className="glass-panel rounded-xl flex items-center flex-1 px-3 py-1.5 gap-2 focus-within:amber-glow focus-within:border-amber/30 transition-all duration-300">
        <Crosshair className="w-4 h-4 text-amber shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Enter coordinates (35.1234, -89.5678)"
          className="bg-transparent text-sm font-data text-foreground placeholder:text-muted-foreground outline-none flex-1 min-w-0"
        />
        <div className="flex items-center gap-1 shrink-0 border-l border-border pl-2">
          <input
            type="number"
            value={radius}
            onChange={(e) => setRadius(e.target.value)}
            min="0.1"
            max="50"
            step="0.5"
            className="bg-transparent text-xs font-data text-amber w-10 text-center outline-none"
          />
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">mi</span>
        </div>
      </div>
      <button
        type="submit"
        className="glass-panel rounded-xl p-2 text-amber hover:amber-glow hover:border-amber/30 transition-all duration-200"
      >
        <Search className="w-4 h-4" />
      </button>
      {site && (
        <button
          type="button"
          onClick={handleReset}
          className="glass-panel rounded-xl p-2 text-muted-foreground hover:text-destructive hover:border-destructive/30 transition-all duration-200"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      )}
    </form>
  );
}

async function fetchFCCTowers(lat: number, lon: number, radiusMiles: number, map: mapboxgl.Map) {
  try {
    const radiusKm = radiusMiles * 1.60934;
    const url = `https://geo.fcc.gov/api/contours/find?lat=${lat}&lon=${lon}&distance=${radiusKm}&format=json`;
    // FCC ASR API for antenna structures
    const asrUrl = `https://geo.fcc.gov/api/census/area?lat=${lat}&lon=${lon}&censusYear=2020&format=json`;

    // Try OpenCelliD-style approach with FCC data
    const response = await fetch(
      `https://services.arcgis.com/jIL9msH9OI208GCb/arcgis/rest/services/Cellular_Towers/FeatureServer/0/query?where=1%3D1&outFields=*&geometry=${lon-0.1},${lat-0.1},${lon+0.1},${lat+0.1}&geometryType=esriGeometryEnvelope&inSR=4326&spatialRel=esriSpatialRelIntersects&outSR=4326&f=geojson`
    );

    if (response.ok) {
      const data = await response.json();
      if (data.features?.length) {
        const source = map.getSource('fcc-towers') as mapboxgl.GeoJSONSource;
        if (source) source.setData(data);
      }
    }
  } catch (err) {
    console.warn('Tower data fetch failed:', err);
  }
}
