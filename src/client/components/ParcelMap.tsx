import React, { useEffect, useState } from 'react'
import { MapContainer, TileLayer, GeoJSON, useMap, LayersControl } from 'react-leaflet'
import type { Parcel } from '../App'
import L from 'leaflet'
import { FloodplainLayer, WetlandsLayer, ZoningLayer, AirportLayer } from '../layers'
import scipData from '../scipSchema'

// Fix Leaflet default marker icons
import icon from 'leaflet/dist/images/marker-icon.png'
import iconShadow from 'leaflet/dist/images/marker-shadow.png'

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
})
L.Marker.prototype.options.icon = DefaultIcon

interface ParcelMapProps {
  parcels: Parcel[]
}

// Component to track base layer changes and update scipData
function BaseLayerTracker() {
  const map = useMap()

  useEffect(() => {
    const handleBaseLayerChange = (e: L.LayersControlEvent) => {
      const layerName = e.name
      // Clear both first
      scipData.maps.aerial = ''
      scipData.maps.topography = ''

      if (layerName === 'Satellite') {
        scipData.maps.aerial = 'Esri World Imagery'
      } else if (layerName === 'Topo') {
        scipData.maps.topography = 'OpenTopoMap'
      } else if (layerName === 'OpenStreetMap') {
        scipData.maps.aerial = 'OpenStreetMap Base'
      }
    }

    map.on('baselayerchange', handleBaseLayerChange)

    // Set initial value
    scipData.maps.aerial = 'OpenStreetMap Base'

    return () => {
      map.off('baselayerchange', handleBaseLayerChange)
    }
  }, [map])

  return null
}

// Component to fit bounds when parcels change
function FitBounds({ parcels }: { parcels: Parcel[] }) {
  const map = useMap()

  useEffect(() => {
    if (parcels.length === 0) return

    const parcelsWithGeometry = parcels.filter(p => p.geometry)
    if (parcelsWithGeometry.length === 0) return

    try {
      const geojson = {
        type: 'FeatureCollection' as const,
        features: parcelsWithGeometry.map(p => ({
          type: 'Feature' as const,
          properties: {},
          geometry: p.geometry!
        }))
      }

      const layer = L.geoJSON(geojson as any)
      const bounds = layer.getBounds()
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [50, 50] })
      }
    } catch (e) {
      console.error('Error fitting bounds:', e)
    }
  }, [parcels, map])

  return null
}

// Layer control panel component
function LayerControlPanel({
  layers,
  onToggle
}: {
  layers: Record<string, boolean>
  onToggle: (layer: string) => void
}) {
  const layerConfig = [
    { id: 'parcels', label: 'Parcels', icon: 'fa-vector-square', color: 'blue' },
    { id: 'floodplain', label: 'Floodplain', icon: 'fa-water', color: 'blue' },
    { id: 'wetlands', label: 'Wetlands', icon: 'fa-leaf', color: 'green' },
    { id: 'zoning', label: 'Zoning', icon: 'fa-city', color: 'yellow' },
    { id: 'airports', label: 'Airports', icon: 'fa-plane', color: 'purple' }
  ]

  return (
    <div className="absolute top-4 right-4 z-[1000] bg-white rounded-lg shadow-lg p-3">
      <h4 className="font-bold text-sm text-gray-700 mb-2 border-b pb-1">
        <i className="fas fa-layer-group mr-2"></i>Layers
      </h4>
      <div className="space-y-1">
        {layerConfig.map(layer => (
          <label
            key={layer.id}
            className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded"
          >
            <input
              type="checkbox"
              checked={layers[layer.id]}
              onChange={() => onToggle(layer.id)}
              className="rounded"
            />
            <i className={`fas ${layer.icon} text-${layer.color}-600 w-4`}></i>
            <span className="text-sm">{layer.label}</span>
          </label>
        ))}
      </div>
    </div>
  )
}

export default function ParcelMap({ parcels }: ParcelMapProps) {
  const [layers, setLayers] = useState({
    parcels: true,
    floodplain: false,
    wetlands: false,
    zoning: false,
    airports: false
  })

  const toggleLayer = (layer: string) => {
    setLayers(prev => ({ ...prev, [layer]: !prev[layer] }))
  }

  // Convert parcels to GeoJSON FeatureCollection
  const geojsonData = {
    type: 'FeatureCollection' as const,
    features: parcels
      .filter(p => p.geometry)
      .map(p => ({
        type: 'Feature' as const,
        properties: {
          pin: p.identifiers?.pin || '',
          owner: p.owner?.primary_name || '',
          address: p.site?.address || p.owner?.address_line1 || '',
          city: p.site?.city || '',
          acres: p.land?.acres_gis || p.land?.acres_deed || 0,
          zoning: p.land?.zoning || '',
          landUse: p.land?.land_use?.luse_desc || '',
          marketValue: p.valuation?.market?.total || 0,
          county: p.meta?.county || ''
        },
        geometry: p.geometry!
      }))
  }

  // Update scipData.maps.parcel when parcels are displayed
  useEffect(() => {
    if (layers.parcels && geojsonData.features.length > 0) {
      scipData.maps.parcel = `${geojsonData.features.length} Parcels (MapWise Data)`
    } else if (!layers.parcels) {
      scipData.maps.parcel = ''
    }
  }, [layers.parcels, geojsonData.features.length])

  // Style for parcel polygons
  const parcelStyle = {
    fillColor: '#3b82f6',
    weight: 2,
    opacity: 1,
    color: '#1e40af',
    fillOpacity: 0.4
  }

  // Popup content for each parcel
  const onEachFeature = (feature: any, layer: L.Layer) => {
    const props = feature.properties
    const popupContent = `
      <div class="p-2 min-w-[200px]">
        <h3 class="font-bold text-lg mb-2">${props.pin || 'Unknown PIN'}</h3>
        <table class="text-sm w-full">
          <tr><td class="font-semibold pr-2">Owner:</td><td>${props.owner || '-'}</td></tr>
          <tr><td class="font-semibold pr-2">Address:</td><td>${props.address || '-'}</td></tr>
          <tr><td class="font-semibold pr-2">City:</td><td>${props.city || '-'}</td></tr>
          <tr><td class="font-semibold pr-2">County:</td><td>${props.county || '-'}</td></tr>
          <tr><td class="font-semibold pr-2">Acres:</td><td>${props.acres ? props.acres.toFixed(2) : '-'}</td></tr>
          <tr><td class="font-semibold pr-2">Zoning:</td><td>${props.zoning || '-'}</td></tr>
          <tr><td class="font-semibold pr-2">Land Use:</td><td>${props.landUse || '-'}</td></tr>
          <tr><td class="font-semibold pr-2">Market Value:</td><td>${props.marketValue ? '$' + props.marketValue.toLocaleString() : '-'}</td></tr>
        </table>
      </div>
    `
    layer.bindPopup(popupContent)
  }

  // Default center (Southeast US - covers NC and GA)
  const defaultCenter: [number, number] = [34.0, -82.0]
  const defaultZoom = 7

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        {/* Base layers */}
        <LayersControl position="bottomright">
          <LayersControl.BaseLayer checked name="OpenStreetMap">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Satellite">
            <TileLayer
              attribution='&copy; Esri'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Topo">
            <TileLayer
              attribution='&copy; OpenTopoMap'
              url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
            />
          </LayersControl.BaseLayer>
        </LayersControl>

        {/* GIS Overlay Layers */}
        <FloodplainLayer visible={layers.floodplain} />
        <WetlandsLayer visible={layers.wetlands} />
        <ZoningLayer visible={layers.zoning} />
        <AirportLayer visible={layers.airports} />

        {/* Parcel layer */}
        {layers.parcels && geojsonData.features.length > 0 && (
          <GeoJSON
            key={JSON.stringify(geojsonData)}
            data={geojsonData as any}
            style={parcelStyle}
            onEachFeature={onEachFeature}
          />
        )}

        <FitBounds parcels={parcels} />
        <BaseLayerTracker />
      </MapContainer>

      {/* Custom Layer Control */}
      <LayerControlPanel layers={layers} onToggle={toggleLayer} />

      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-[1000] bg-white p-3 rounded-lg shadow-lg">
        <h4 className="font-bold text-sm mb-2">Legend</h4>
        <div className="space-y-1 text-xs">
          {layers.parcels && (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-500 bg-opacity-40 border-2 border-blue-800 rounded"></div>
              <span>Parcel</span>
            </div>
          )}
          {layers.floodplain && (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-700 bg-opacity-50 border border-blue-900 rounded"></div>
              <span>Flood Zone</span>
            </div>
          )}
          {layers.wetlands && (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 bg-opacity-40 border border-green-800 rounded"></div>
              <span>Wetland</span>
            </div>
          )}
          {layers.zoning && (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-400 bg-opacity-40 border border-gray-600 rounded"></div>
              <span>Zoning</span>
            </div>
          )}
          {layers.airports && (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center text-white text-[8px]">✈</div>
              <span>Airport</span>
            </div>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-2 border-t pt-1">
          {geojsonData.features.length} parcels on map
        </p>
      </div>
    </div>
  )
}
