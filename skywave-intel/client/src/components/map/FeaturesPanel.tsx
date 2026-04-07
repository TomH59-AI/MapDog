/*
 * FeaturesPanel — Slide-out panel with layer toggles
 * Mission Control: glass panel, grouped by category, amber accents
 */
import { useSite } from "@/contexts/SiteContext";
import { X, Mountain, TreePine, Building2, Crosshair } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";

const CATEGORY_META: Record<string, { label: string; icon: React.ReactNode }> = {
  terrain: { label: 'TERRAIN', icon: <Mountain className="w-3.5 h-3.5" /> },
  environmental: { label: 'ENVIRONMENTAL', icon: <TreePine className="w-3.5 h-3.5" /> },
  infrastructure: { label: 'INFRASTRUCTURE', icon: <Building2 className="w-3.5 h-3.5" /> },
  overlays: { label: 'OVERLAYS', icon: <Crosshair className="w-3.5 h-3.5" /> },
};

export function FeaturesPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { layers, toggleLayer, setLayerOpacity } = useSite();

  const grouped = layers.reduce((acc, layer) => {
    if (!acc[layer.category]) acc[layer.category] = [];
    acc[layer.category].push(layer);
    return acc;
  }, {} as Record<string, typeof layers>);

  return (
    <div
      className={`
        absolute top-14 right-14 z-20 w-80
        glass-panel rounded-2xl overflow-hidden
        transition-all duration-300 ease-out
        ${open ? 'opacity-100 translate-x-0 pointer-events-auto' : 'opacity-0 translate-x-4 pointer-events-none'}
      `}
      style={{ maxHeight: 'calc(100vh - 80px)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-amber animate-pulse" />
          <span className="text-xs font-bold uppercase tracking-widest text-amber">Feature Layers</span>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Layer groups */}
      <div className="overflow-y-auto p-3 space-y-4" style={{ maxHeight: 'calc(100vh - 140px)' }}>
        {Object.entries(grouped).map(([category, categoryLayers]) => (
          <div key={category}>
            <div className="flex items-center gap-2 mb-2 px-1">
              <span className="text-amber/70">{CATEGORY_META[category]?.icon}</span>
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                {CATEGORY_META[category]?.label || category}
              </span>
            </div>
            <div className="space-y-1">
              {categoryLayers.map(layer => (
                <div
                  key={layer.id}
                  className={`
                    rounded-xl px-3 py-2.5 transition-all duration-200
                    ${layer.visible ? 'bg-amber/5 border border-amber/15' : 'border border-transparent hover:bg-white/3'}
                  `}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{
                          backgroundColor: layer.color,
                          opacity: layer.visible ? 1 : 0.3,
                          boxShadow: layer.visible ? `0 0 8px ${layer.color}40` : 'none',
                        }}
                      />
                      <span className={`text-xs font-medium ${layer.visible ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {layer.name}
                      </span>
                    </div>
                    <Switch
                      checked={layer.visible}
                      onCheckedChange={() => toggleLayer(layer.id)}
                      className="scale-75"
                    />
                  </div>
                  {layer.visible && !['parcels', 'airports', 'towers', 'search-ring'].includes(layer.id) && (
                    <div className="mt-2 flex items-center gap-2 pl-5">
                      <span className="text-[10px] text-muted-foreground font-data w-7">{layer.opacity}%</span>
                      <Slider
                        value={[layer.opacity]}
                        onValueChange={([v]) => setLayerOpacity(layer.id, v)}
                        min={10}
                        max={100}
                        step={5}
                        className="flex-1"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
