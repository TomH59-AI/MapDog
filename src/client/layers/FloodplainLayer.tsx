import React, { useState, useEffect } from 'react'
import { GeoJSON, useMap } from 'react-leaflet'
import scipData from '../scipSchema'

interface FloodplainLayerProps {
  visible?: boolean
  opacity?: number
}

// FEMA Flood Zone colors
const floodZoneColors: Record<string, string> = {
  'A': '#1e3a8a',      // High risk - dark blue
  'AE': '#1d4ed8',     // High risk with BFE
  'AH': '#2563eb',     // High risk - shallow flooding
  'AO': '#3b82f6',     // High risk - sheet flow
  'V': '#7c3aed',      // Coastal high risk - purple
  'VE': '#8b5cf6',     // Coastal with BFE
  'X': '#86efac',      // Minimal risk - light green
  'D': '#fde047',      // Undetermined - yellow
  'default': '#60a5fa'
}

export default function FloodplainLayer({ visible = true, opacity = 0.5 }: FloodplainLayerProps) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const map = useMap()

  useEffect(() => {
    if (!visible) return

    setLoading(true)
    setError(null)

    // Try to load cached GeoJSON first, fallback to placeholder
    fetch('/data/floodplain.geojson')
      .then(res => {
        if (!res.ok) throw new Error('Floodplain data not available')
        return res.json()
      })
      .then(geojson => {
        setData(geojson)
        setLoading(false)
      })
      .catch(err => {
        console.log('Floodplain data not loaded:', err.message)
        setError('Floodplain data not available')
        setLoading(false)
      })
  }, [visible])

  // Update scipData.maps.floodplain when layer is visible
  useEffect(() => {
    if (visible && data) {
      scipData.maps.floodplain = 'FEMA NFHL Flood Zones'
    } else if (!visible) {
      scipData.maps.floodplain = ''
    }
  }, [visible, data])

  if (!visible || !data) return null

  const getStyle = (feature: any) => {
    const zone = feature?.properties?.FLD_ZONE || feature?.properties?.ZONE_SUBTY || 'default'
    const color = floodZoneColors[zone] || floodZoneColors['default']

    return {
      fillColor: color,
      weight: 1,
      opacity: 0.8,
      color: '#1e40af',
      fillOpacity: opacity
    }
  }

  const onEachFeature = (feature: any, layer: L.Layer) => {
    const props = feature.properties || {}
    const zone = props.FLD_ZONE || props.ZONE_SUBTY || 'Unknown'
    const zoneName = getZoneName(zone)

    layer.bindPopup(`
      <div class="p-2">
        <h4 class="font-bold text-blue-800">Flood Zone: ${zone}</h4>
        <p class="text-sm text-gray-600">${zoneName}</p>
        ${props.STATIC_BFE ? `<p class="text-sm">Base Flood Elevation: ${props.STATIC_BFE} ft</p>` : ''}
        <p class="text-xs text-gray-500 mt-2">Source: FEMA NFHL</p>
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

function getZoneName(zone: string): string {
  const names: Record<string, string> = {
    'A': 'High Risk - 1% annual flood chance',
    'AE': 'High Risk - Base Flood Elevation determined',
    'AH': 'High Risk - Shallow flooding (1-3 ft)',
    'AO': 'High Risk - Sheet flow flooding',
    'V': 'Coastal High Risk - Wave action',
    'VE': 'Coastal High Risk - BFE determined',
    'X': 'Minimal Flood Risk',
    'D': 'Flood Risk Undetermined'
  }
  return names[zone] || 'Flood zone'
}
