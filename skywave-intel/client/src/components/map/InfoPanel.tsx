/*
 * InfoPanel — Bottom-left floating data readout
 * Shows current site coordinates, elevation, radius, and quick stats
 */
import { useSite, API_KEYS } from "@/contexts/SiteContext";
import { MapPin, Ruler, Mountain, Radio } from "lucide-react";
import { useEffect, useState } from "react";
import { mapInstance } from "./MapCanvas";

export function InfoPanel() {
  const { site } = useSite();
  const [elevation, setElevation] = useState<string | null>(null);
  const [cursorCoords, setCursorCoords] = useState<{ lat: number; lon: number } | null>(null);

  // Track cursor position on map
  useEffect(() => {
    const map = mapInstance;
    if (!map) return;

    const handler = (e: mapboxgl.MapMouseEvent) => {
      setCursorCoords({ lat: e.lngLat.lat, lon: e.lngLat.lng });
    };
    map.on('mousemove', handler);
    return () => { map.off('mousemove', handler); };
  }, []);

  // Fetch elevation when site is set
  useEffect(() => {
    if (!site) { setElevation(null); return; }
    const fetchElev = async () => {
      try {
        const res = await fetch(
          `https://api.mapbox.com/v4/mapbox.mapbox-terrain-v2/tilequery/${site.lon},${site.lat}.json?layers=contour&access_token=${API_KEYS.MAPBOX_TOKEN}`
        );
        if (res.ok) {
          const data = await res.json();
          if (data.features?.length) {
            const maxElev = Math.max(...data.features.map((f: any) => f.properties.ele));
            const elevFt = Math.round(maxElev * 3.28084);
            setElevation(`${elevFt} ft`);
          }
        }
      } catch { setElevation(null); }
    };
    fetchElev();
  }, [site]);

  return (
    <div className="absolute bottom-8 left-4 z-10 flex flex-col gap-2">
      {/* Cursor readout */}
      {cursorCoords && (
        <div className="glass-panel rounded-lg px-3 py-1.5 flex items-center gap-3">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Cursor</span>
          <span className="text-xs font-data text-foreground/80">
            {cursorCoords.lat.toFixed(6)}, {cursorCoords.lon.toFixed(6)}
          </span>
        </div>
      )}

      {/* Site data */}
      {site && (
        <div className="glass-panel rounded-xl px-4 py-3 space-y-2 amber-glow" style={{ minWidth: 260 }}>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1.5 h-1.5 rounded-full bg-signal-green animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber">Site Locked</span>
          </div>

          <DataRow icon={<MapPin className="w-3 h-3" />} label="Coords" value={`${site.lat.toFixed(6)}, ${site.lon.toFixed(6)}`} />
          <DataRow icon={<Ruler className="w-3 h-3" />} label="Radius" value={`${site.radiusMiles} mi`} />
          {elevation && <DataRow icon={<Mountain className="w-3 h-3" />} label="Elev" value={elevation} />}
          {site.county && <DataRow icon={<Radio className="w-3 h-3" />} label="County" value={`${site.county}, ${site.state}`} />}
        </div>
      )}
    </div>
  );
}

function DataRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-[10px] uppercase tracking-wider">{label}</span>
      </div>
      <span className="text-xs font-data text-foreground font-medium">{value}</span>
    </div>
  );
}
