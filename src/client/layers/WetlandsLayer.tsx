import React, { useState, useEffect } from 'react'
import { GeoJSON } from 'react-leaflet'
import scipData from '../scipSchema'

interface WetlandsLayerProps {
  visible?: boolean
  opacity?: number
}

// NWI Wetland type colors
const wetlandColors: Record<string, string> = {
  'PEM': '#10b981',    // Palustrine Emergent - green
  'PFO': '#065f46',    // Palustrine Forested - dark green
  'PSS': '#34d399',    // Palustrine Scrub-Shrub - light green
  'PUB': '#06b6d4',    // Palustrine Unconsolidated Bottom - cyan
  'PAB': '#0891b2',    // Palustrine Aquatic Bed - teal
  'L': '#0ea5e9',      // Lacustrine - blue
  'R': '#3b82f6',      // Riverine - bright blue
  'E': '#6366f1',      // Estuarine - indigo
  'M': '#8b5cf6',      // Marine - purple
  'default': '#22c55e'
}

export default function WetlandsLayer({ visible = true, opacity = 0.4 }: WetlandsLayerProps) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!visible) return

    setLoading(true)

    fetch('/data/wetlands.geojson')
      .then(res => {
        if (!res.ok) throw new Error('Wetlands data not available')
        return res.json()
      })
      .then(geojson => {
        setData(geojson)
        setLoading(false)
      })
      .catch(err => {
        console.log('Wetlands data not loaded:', err.message)
        setLoading(false)
      })
  }, [visible])

  // Update scipData.maps.wetlands when layer is visible
  useEffect(() => {
    if (visible && data) {
      scipData.maps.wetlands = 'NWI/USFWS Wetlands'
    } else if (!visible) {
      scipData.maps.wetlands = ''
    }
  }, [visible, data])

  if (!visible || !data) return null

  const getStyle = (feature: any) => {
    const wetlandType = feature?.properties?.WETLAND_TYPE ||
                       feature?.properties?.ATTRIBUTE?.substring(0, 3) ||
                       'default'
    const color = wetlandColors[wetlandType] || wetlandColors['default']

    return {
      fillColor: color,
      weight: 1,
      opacity: 0.7,
      color: '#065f46',
      fillOpacity: opacity
    }
  }

  const onEachFeature = (feature: any, layer: L.Layer) => {
    const props = feature.properties || {}
    const wetlandType = props.WETLAND_TYPE || props.ATTRIBUTE || 'Unknown'
    const acres = props.ACRES ? props.ACRES.toFixed(2) : 'N/A'

    layer.bindPopup(`
      <div class="p-2">
        <h4 class="font-bold text-green-800">Wetland</h4>
        <table class="text-sm">
          <tr><td class="font-semibold pr-2">Type:</td><td>${wetlandType}</td></tr>
          <tr><td class="font-semibold pr-2">Classification:</td><td>${getWetlandName(wetlandType)}</td></tr>
          <tr><td class="font-semibold pr-2">Acres:</td><td>${acres}</td></tr>
        </table>
        <p class="text-xs text-gray-500 mt-2">Source: NWI / USFWS</p>
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

function getWetlandName(type: string): string {
  const names: Record<string, string> = {
    'PEM': 'Palustrine Emergent',
    'PFO': 'Palustrine Forested',
    'PSS': 'Palustrine Scrub-Shrub',
    'PUB': 'Palustrine Unconsolidated Bottom',
    'PAB': 'Palustrine Aquatic Bed',
    'L': 'Lacustrine (Lake)',
    'R': 'Riverine (River)',
    'E': 'Estuarine (Estuary)',
    'M': 'Marine (Ocean)'
  }
  return names[type.substring(0, 3)] || 'Wetland Area'
}
