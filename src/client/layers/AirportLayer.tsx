import React, { useState, useEffect } from 'react'
import { GeoJSON, Circle, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import scipData from '../scipSchema'

interface AirportLayerProps {
  visible?: boolean
  showSurfaces?: boolean
}

// Airport marker icon
const airportIcon = L.divIcon({
  className: 'airport-marker',
  html: `<div style="background: #1e40af; color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 12px; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">✈</div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12]
})

// FAA Surface colors
const surfaceColors = {
  'horizontal': '#3b82f6',
  'conical': '#60a5fa',
  'approach': '#f59e0b',
  'transitional': '#ef4444',
  'primary': '#dc2626'
}

interface Airport {
  id: string
  name: string
  icao?: string
  iata?: string
  lat: number
  lng: number
  elevation?: number
  type?: string
  runways?: Array<{
    id: string
    length: number
    width: number
    heading: number
  }>
}

export default function AirportLayer({ visible = true, showSurfaces = false }: AirportLayerProps) {
  const [airports, setAirports] = useState<Airport[]>([])
  const [surfaces, setSurfaces] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!visible) return

    setLoading(true)

    // Load airport data
    Promise.all([
      fetch('/data/airports.geojson')
        .then(res => res.ok ? res.json() : null)
        .catch(() => null),
      showSurfaces
        ? fetch('/data/faa-surfaces.geojson')
            .then(res => res.ok ? res.json() : null)
            .catch(() => null)
        : Promise.resolve(null)
    ]).then(([airportData, surfaceData]) => {
      if (airportData) {
        const airportList = airportData.features?.map((f: any) => ({
          id: f.properties?.id || f.properties?.ICAO,
          name: f.properties?.name || f.properties?.NAME,
          icao: f.properties?.icao || f.properties?.ICAO,
          iata: f.properties?.iata || f.properties?.IATA,
          lat: f.geometry?.coordinates?.[1] || f.properties?.lat,
          lng: f.geometry?.coordinates?.[0] || f.properties?.lng,
          elevation: f.properties?.elevation || f.properties?.ELEV,
          type: f.properties?.type || f.properties?.TYPE
        })) || []
        setAirports(airportList)
      }

      if (surfaceData) {
        setSurfaces(surfaceData)
      }

      setLoading(false)
    })
  }, [visible, showSurfaces])

  // Update scipData.maps.airport when layer is visible
  useEffect(() => {
    if (visible && airports.length > 0) {
      scipData.maps.airport = 'FAA Airports with Part 77 Notification Zones'
    } else if (!visible) {
      scipData.maps.airport = ''
    }
  }, [visible, airports])

  if (!visible) return null

  // FAA Part 77 surfaces style
  const getSurfaceStyle = (feature: any) => {
    const surfaceType = feature?.properties?.surface_type || 'horizontal'
    return {
      fillColor: surfaceColors[surfaceType as keyof typeof surfaceColors] || surfaceColors.horizontal,
      weight: 1,
      opacity: 0.6,
      color: '#1e40af',
      fillOpacity: 0.2
    }
  }

  return (
    <>
      {/* Airport markers */}
      {airports.map(airport => (
        <Marker
          key={airport.id}
          position={[airport.lat, airport.lng]}
          icon={airportIcon}
        >
          <Popup>
            <div className="p-2 min-w-[200px]">
              <h4 className="font-bold text-blue-800">{airport.name}</h4>
              <table className="text-sm mt-2">
                {airport.icao && <tr><td className="font-semibold pr-2">ICAO:</td><td>{airport.icao}</td></tr>}
                {airport.iata && <tr><td className="font-semibold pr-2">IATA:</td><td>{airport.iata}</td></tr>}
                {airport.elevation && <tr><td className="font-semibold pr-2">Elevation:</td><td>{airport.elevation} ft</td></tr>}
                {airport.type && <tr><td className="font-semibold pr-2">Type:</td><td>{airport.type}</td></tr>}
              </table>
              <p className="text-xs text-gray-500 mt-2">Source: FAA</p>
            </div>
          </Popup>
        </Marker>
      ))}

      {/* Airport notification zones (simplified Part 77) */}
      {airports.map(airport => (
        <Circle
          key={`zone-${airport.id}`}
          center={[airport.lat, airport.lng]}
          radius={9260} // 5 nautical miles in meters (FAA notification radius)
          pathOptions={{
            fillColor: '#3b82f6',
            fillOpacity: 0.05,
            color: '#1e40af',
            weight: 1,
            dashArray: '5, 5'
          }}
        />
      ))}

      {/* FAA Part 77 surfaces (if loaded) */}
      {surfaces && (
        <GeoJSON
          data={surfaces}
          style={getSurfaceStyle}
          onEachFeature={(feature, layer) => {
            const props = feature.properties || {}
            layer.bindPopup(`
              <div class="p-2">
                <h4 class="font-bold">FAA Part 77 Surface</h4>
                <p class="text-sm">${props.surface_type || 'Surface'}</p>
                ${props.height_agl ? `<p class="text-sm">Height AGL: ${props.height_agl} ft</p>` : ''}
                <p class="text-xs text-gray-500 mt-2">Consult FAA for official determinations</p>
              </div>
            `)
          }}
        />
      )}
    </>
  )
}
