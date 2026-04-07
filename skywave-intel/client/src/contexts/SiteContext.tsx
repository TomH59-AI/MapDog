import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

// API Keys loaded from environment variables
// Create a .env file with VITE_MAPBOX_TOKEN, VITE_REGRID_TOKEN, VITE_CESIUM_ION_TOKEN, etc.
export const API_KEYS = {
  MAPBOX_TOKEN: import.meta.env.VITE_MAPBOX_TOKEN || '',
  REGRID_TOKEN: import.meta.env.VITE_REGRID_TOKEN || '',
  CESIUM_ION_TOKEN: import.meta.env.VITE_CESIUM_ION_TOKEN || '',
  AIRPORTS_TILESET: import.meta.env.VITE_AIRPORTS_TILESET || '',
  AIRPORTS_SOURCE_LAYER: import.meta.env.VITE_AIRPORTS_SOURCE_LAYER || '',
};

export interface SiteData {
  lat: number;
  lon: number;
  radiusMiles: number;
  radiusUnit: string;
  elevation?: string;
  parcelInfo?: Record<string, string>;
  nearbyTowers?: number;
  floodZone?: string;
  wetlands?: string;
  zoning?: string;
  county?: string;
  state?: string;
  siteName?: string;
}

export interface LayerState {
  id: string;
  name: string;
  visible: boolean;
  opacity: number;
  color: string;
  category: string;
}

interface SiteContextType {
  site: SiteData | null;
  setSite: (site: SiteData | null) => void;
  updateSite: (partial: Partial<SiteData>) => void;
  layers: LayerState[];
  toggleLayer: (id: string) => void;
  setLayerOpacity: (id: string, opacity: number) => void;
  activePanel: string | null;
  setActivePanel: (panel: string | null) => void;
  mapStyle: string;
  setMapStyle: (style: string) => void;
}

const DEFAULT_LAYERS: LayerState[] = [
  { id: 'hillshade', name: 'USGS Hillshade', visible: false, opacity: 60, color: '#8b5cf6', category: 'terrain' },
  { id: 'contours', name: 'USGS Contours', visible: false, opacity: 80, color: '#06b6d4', category: 'terrain' },
  { id: 'topo', name: 'USGS Topo', visible: false, opacity: 70, color: '#a855f7', category: 'terrain' },
  { id: 'wetlands', name: 'Wetlands (NWI)', visible: false, opacity: 55, color: '#10b981', category: 'environmental' },
  { id: 'wetlands-raster', name: 'Wetlands Raster', visible: false, opacity: 55, color: '#22d3ee', category: 'environmental' },
  { id: 'flood', name: 'FEMA Flood Zones', visible: false, opacity: 50, color: '#3b82f6', category: 'environmental' },
  { id: 'parcels', name: 'Parcels (Regrid)', visible: true, opacity: 100, color: '#eab308', category: 'infrastructure' },
  { id: 'airports', name: 'Airports', visible: false, opacity: 100, color: '#f97316', category: 'infrastructure' },
  { id: 'towers', name: 'Cell Towers', visible: false, opacity: 85, color: '#ef4444', category: 'infrastructure' },
  { id: 'search-ring', name: 'Search Ring', visible: true, opacity: 100, color: '#f59e0b', category: 'overlays' },
  { id: 'satellite-labels', name: 'Place Labels', visible: true, opacity: 100, color: '#ffffff', category: 'overlays' },
];

const SiteContext = createContext<SiteContextType | null>(null);

export function SiteProvider({ children }: { children: ReactNode }) {
  const [site, setSiteState] = useState<SiteData | null>(null);
  const [layers, setLayers] = useState<LayerState[]>(DEFAULT_LAYERS);
  const [activePanel, setActivePanel] = useState<string | null>(null);
  const [mapStyle, setMapStyle] = useState('satellite-streets-v12');

  const setSite = useCallback((s: SiteData | null) => setSiteState(s), []);

  const updateSite = useCallback((partial: Partial<SiteData>) => {
    setSiteState(prev => prev ? { ...prev, ...partial } : null);
  }, []);

  const toggleLayer = useCallback((id: string) => {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, visible: !l.visible } : l));
  }, []);

  const setLayerOpacity = useCallback((id: string, opacity: number) => {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, opacity } : l));
  }, []);

  return (
    <SiteContext.Provider value={{
      site, setSite, updateSite,
      layers, toggleLayer, setLayerOpacity,
      activePanel, setActivePanel,
      mapStyle, setMapStyle,
    }}>
      {children}
    </SiteContext.Provider>
  );
}

export function useSite() {
  const ctx = useContext(SiteContext);
  if (!ctx) throw new Error('useSite must be used within SiteProvider');
  return ctx;
}
