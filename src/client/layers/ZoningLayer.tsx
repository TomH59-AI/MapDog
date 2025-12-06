import React, { useState, useEffect } from 'react'
import { GeoJSON } from 'react-leaflet'

interface ZoningLayerProps {
  visible?: boolean
  opacity?: number
  county?: string
}

// Zoning category colors
const zoningColors: Record<string, string> = {
  // Residential
  'R': '#fbbf24',      // Residential - yellow
  'R-1': '#fcd34d',
  'R-2': '#fde047',
  'R-3': '#fef08a',
  'RS': '#facc15',
  'RM': '#eab308',
  'RH': '#ca8a04',

  // Commercial
  'C': '#f97316',      // Commercial - orange
  'C-1': '#fb923c',
  'C-2': '#fdba74',
  'CB': '#f97316',
  'CC': '#ea580c',

  // Industrial
  'I': '#a855f7',      // Industrial - purple
  'I-1': '#c084fc',
  'I-2': '#a855f7',
  'M': '#9333ea',
  'M-1': '#a855f7',
  'M-2': '#7c3aed',

  // Agricultural
  'A': '#22c55e',      // Agricultural - green
  'AG': '#16a34a',
  'AR': '#15803d',
  'A-1': '#4ade80',

  // Office/Business
  'O': '#3b82f6',      // Office - blue
  'OI': '#60a5fa',
  'B': '#2563eb',

  // Mixed Use
  'MU': '#ec4899',     // Mixed Use - pink
  'MX': '#f472b6',
  'PD': '#db2777',     // Planned Development

  // Special
  'PUD': '#14b8a6',    // Planned Unit Development - teal
  'CZ': '#0d9488',     // Conservation

  'default': '#94a3b8'
}

export default function ZoningLayer({ visible = true, opacity = 0.35, county }: ZoningLayerProps) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!visible) return

    setLoading(true)

    // Try county-specific first, then generic
    const url = county
      ? `/data/zoning-${county.toLowerCase()}.geojson`
      : '/data/zoning.geojson'

    fetch(url)
      .then(res => {
        if (!res.ok) throw new Error('Zoning data not available')
        return res.json()
      })
      .then(geojson => {
        setData(geojson)
        setLoading(false)
      })
      .catch(err => {
        console.log('Zoning data not loaded:', err.message)
        setLoading(false)
      })
  }, [visible, county])

  if (!visible || !data) return null

  const getStyle = (feature: any) => {
    const zone = feature?.properties?.ZONING ||
                feature?.properties?.ZONE ||
                feature?.properties?.ZONE_CODE ||
                'default'

    // Find matching color by checking prefixes
    let color = zoningColors['default']
    for (const [key, value] of Object.entries(zoningColors)) {
      if (zone.toUpperCase().startsWith(key)) {
        color = value
        break
      }
    }

    return {
      fillColor: color,
      weight: 1,
      opacity: 0.6,
      color: '#475569',
      fillOpacity: opacity
    }
  }

  const onEachFeature = (feature: any, layer: L.Layer) => {
    const props = feature.properties || {}
    const zone = props.ZONING || props.ZONE || props.ZONE_CODE || 'Unknown'
    const description = props.ZONE_DESC || props.DESCRIPTION || getZoneDescription(zone)

    layer.bindPopup(`
      <div class="p-2">
        <h4 class="font-bold text-gray-800">Zoning: ${zone}</h4>
        <p class="text-sm text-gray-600">${description}</p>
        ${props.OVERLAY ? `<p class="text-sm">Overlay: ${props.OVERLAY}</p>` : ''}
        <p class="text-xs text-gray-500 mt-2">Source: County GIS</p>
      </div>
    `)
  }

  return (
    <GeoJSON
      data={data}
      style={getStyle}
      onEachFeature={onEachFeature}
    />
  )
}

function getZoneDescription(zone: string): string {
  const z = zone.toUpperCase()
  if (z.startsWith('R')) return 'Residential District'
  if (z.startsWith('C')) return 'Commercial District'
  if (z.startsWith('I') || z.startsWith('M')) return 'Industrial District'
  if (z.startsWith('A')) return 'Agricultural District'
  if (z.startsWith('O')) return 'Office District'
  if (z.includes('MU') || z.includes('MX')) return 'Mixed Use District'
  if (z.includes('PUD') || z.includes('PD')) return 'Planned Development'
  return 'Zoning District'
}
