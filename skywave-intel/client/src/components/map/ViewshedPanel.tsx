/*
 * ViewshedPanel — Cesium 3D tilted viewshed from N/S/E/W
 * Shows above-treeline views for RF line-of-sight analysis
 * Uses Cesium Ion API for terrain + 3D tiles
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { useSite, API_KEYS } from "@/contexts/SiteContext";
import { X, Camera, Download, Compass, Loader2 } from "lucide-react";

const DIRECTIONS = [
  { label: 'North', heading: 0, icon: 'N' },
  { label: 'East', heading: 90, icon: 'E' },
  { label: 'South', heading: 180, icon: 'S' },
  { label: 'West', heading: 270, icon: 'W' },
];

export function ViewshedPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { site } = useSite();
  const [activeDir, setActiveDir] = useState(0);
  const [towerHeight, setTowerHeight] = useState(150);
  const [loading, setLoading] = useState(false);
  const [cesiumReady, setCesiumReady] = useState(false);
  const viewerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load Cesium dynamically
  useEffect(() => {
    if ((window as any).Cesium) {
      setCesiumReady(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cesium.com/downloads/cesiumjs/releases/1.124/Build/Cesium/Cesium.js';
    script.onload = () => setCesiumReady(true);
    document.head.appendChild(script);
  }, []);

  // Initialize/update Cesium viewer
  useEffect(() => {
    if (!open || !cesiumReady || !containerRef.current || !site) return;

    const Cesium = (window as any).Cesium;
    if (!Cesium) return;

    Cesium.Ion.defaultAccessToken = API_KEYS.CESIUM_ION_TOKEN;

    // Destroy existing viewer
    if (viewerRef.current) {
      try { viewerRef.current.destroy(); } catch {}
      viewerRef.current = null;
    }

    setLoading(true);

    try {
      const viewer = new Cesium.Viewer(containerRef.current, {
        terrainProvider: Cesium.createWorldTerrain(),
        baseLayerPicker: false,
        geocoder: false,
        homeButton: false,
        sceneModePicker: false,
        selectionIndicator: false,
        timeline: false,
        animation: false,
        navigationHelpButton: false,
        fullscreenButton: false,
        infoBox: false,
        creditContainer: document.createElement('div'),
        requestRenderMode: true,
        maximumRenderTimeChange: Infinity,
      });

      // Add 3D buildings
      try {
        const tileset = viewer.scene.primitives.add(
          new Cesium.Cesium3DTileset({
            url: Cesium.IonResource.fromAssetId(96188),
          })
        );
      } catch {}

      viewerRef.current = viewer;
      flyToDirection(viewer, site.lat, site.lon, towerHeight, DIRECTIONS[activeDir].heading);
    } catch (err) {
      console.error('Cesium init error:', err);
    }

    return () => {
      if (viewerRef.current) {
        try { viewerRef.current.destroy(); } catch {}
        viewerRef.current = null;
      }
    };
  }, [open, cesiumReady, site]);

  // Update view direction
  useEffect(() => {
    if (!viewerRef.current || !site) return;
    flyToDirection(viewerRef.current, site.lat, site.lon, towerHeight, DIRECTIONS[activeDir].heading);
  }, [activeDir, towerHeight]);

  const flyToDirection = useCallback((viewer: any, lat: number, lon: number, height: number, heading: number) => {
    const Cesium = (window as any).Cesium;
    if (!Cesium) return;

    setLoading(true);
    const heightMeters = height * 0.3048; // ft to meters
    const treelineOffset = 15; // ~50ft above treeline

    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(lon, lat, heightMeters + treelineOffset),
      orientation: {
        heading: Cesium.Math.toRadians(heading),
        pitch: Cesium.Math.toRadians(-5), // Slightly below horizon for RF view
        roll: 0,
      },
      duration: 1.5,
      complete: () => setLoading(false),
    });
  }, []);

  const captureScreenshot = useCallback(() => {
    if (!viewerRef.current) return;
    const viewer = viewerRef.current;
    viewer.render();
    const canvas = viewer.scene.canvas;
    const link = document.createElement('a');
    link.download = `skywave-viewshed-${DIRECTIONS[activeDir].label.toLowerCase()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }, [activeDir]);

  return (
    <div
      className={`
        absolute top-14 right-14 z-20 w-[480px]
        glass-panel rounded-2xl overflow-hidden
        transition-all duration-300 ease-out
        ${open ? 'opacity-100 translate-x-0 pointer-events-auto' : 'opacity-0 translate-x-4 pointer-events-none'}
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Compass className="w-4 h-4 text-cyan" />
          <span className="text-xs font-bold uppercase tracking-widest text-cyan">3D Viewshed</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={captureScreenshot} className="text-muted-foreground hover:text-amber transition-colors p-1">
            <Camera className="w-4 h-4" />
          </button>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Direction tabs */}
      <div className="flex border-b border-border">
        {DIRECTIONS.map((dir, i) => (
          <button
            key={dir.label}
            onClick={() => setActiveDir(i)}
            className={`
              flex-1 py-2 text-xs font-bold uppercase tracking-wider text-center
              transition-all duration-200
              ${i === activeDir
                ? 'text-amber bg-amber/10 border-b-2 border-amber'
                : 'text-muted-foreground hover:text-foreground hover:bg-white/3'
              }
            `}
          >
            {dir.icon}
          </button>
        ))}
      </div>

      {/* Tower height control */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-border">
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Tower Height</span>
        <input
          type="range"
          min="50"
          max="400"
          step="10"
          value={towerHeight}
          onChange={(e) => setTowerHeight(parseInt(e.target.value))}
          className="flex-1 accent-amber"
        />
        <span className="text-xs font-data text-amber w-12 text-right">{towerHeight} ft</span>
      </div>

      {/* Cesium viewport */}
      <div className="relative" style={{ height: 320 }}>
        {!site ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            <div className="text-center">
              <Compass className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-xs">Enter coordinates to view 3D terrain</p>
            </div>
          </div>
        ) : (
          <>
            <div ref={containerRef} className="w-full h-full" />
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-navy/50 backdrop-blur-sm">
                <Loader2 className="w-6 h-6 text-amber animate-spin" />
              </div>
            )}
          </>
        )}

        {/* Direction label overlay */}
        {site && (
          <div className="absolute top-3 left-3 glass-panel rounded-lg px-2.5 py-1 flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-cyan" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-cyan">
              Looking {DIRECTIONS[activeDir].label}
            </span>
          </div>
        )}
      </div>

      {/* Info footer */}
      <div className="px-4 py-2 border-t border-border">
        <p className="text-[10px] text-muted-foreground">
          RF line-of-sight view from {towerHeight}ft above ground. Terrain data via Cesium Ion World Terrain.
        </p>
      </div>
    </div>
  );
}
