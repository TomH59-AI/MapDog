/*
 * StyleSwitcher — Bottom-right map style toggle
 * Satellite, Streets, Terrain, Dark
 */
import { useSite } from "@/contexts/SiteContext";
import { useState } from "react";
import { Map, Satellite, Mountain, Moon } from "lucide-react";

const STYLES = [
  { id: 'satellite-streets-v12', label: 'Satellite', icon: Satellite },
  { id: 'streets-v12', label: 'Streets', icon: Map },
  { id: 'outdoors-v12', label: 'Terrain', icon: Mountain },
  { id: 'dark-v11', label: 'Dark', icon: Moon },
];

export function StyleSwitcher() {
  const { mapStyle, setMapStyle } = useSite();
  const [expanded, setExpanded] = useState(false);

  const current = STYLES.find(s => s.id === mapStyle) || STYLES[0];

  return (
    <div className="absolute bottom-8 right-4 z-10">
      <div
        className="glass-panel rounded-xl overflow-hidden transition-all duration-300"
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
      >
        {expanded ? (
          <div className="flex flex-col">
            {STYLES.map(style => {
              const Icon = style.icon;
              const active = style.id === mapStyle;
              return (
                <button
                  key={style.id}
                  onClick={() => { setMapStyle(style.id); setExpanded(false); }}
                  className={`
                    flex items-center gap-2.5 px-3 py-2 text-xs font-medium
                    transition-colors duration-150
                    ${active ? 'text-amber bg-amber/10' : 'text-muted-foreground hover:text-foreground hover:bg-white/5'}
                  `}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {style.label}
                </button>
              );
            })}
          </div>
        ) : (
          <button className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
            <current.icon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{current.label}</span>
          </button>
        )}
      </div>
    </div>
  );
}
