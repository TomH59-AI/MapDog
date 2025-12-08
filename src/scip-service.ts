/**
 * SCIP (Site Candidate Information Package) Service
 * Automated generation of comprehensive site candidate packages for cell tower deployment
 */

export interface SCIPProject {
  projectName: string
  searchRingCenterLat: number
  searchRingCenterLon: number
  searchRadiusMiles: number
  county: string
  rfEngineerName?: string
  carrier?: string
  projectNotes?: string
}

export interface SCIPCandidate {
  parcelId: string
  rank: number
  siteName: string
  siteAddress: string
  latitude?: number
  longitude?: number
  ownerName?: string
  ownerAddress?: string
  parcelNumber?: string
  parcelAcres?: number
  zoningDesignation?: string
  landUse?: string
  currentUse?: string
  floodZone?: string
  elevationFeet?: number
  assessedValue?: number
  marketValue?: number
  overallScore: number
  scoreBreakdown: Record<string, number>
  mapwiseData: any
}

/**
 * Calculate distance between two coordinates in miles
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3959 // Earth's radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/**
 * Parse address to extract coordinates (simple geocoding placeholder)
 */
async function geocodeAddress(address: string): Promise<{ lat: number; lon: number } | null> {
  // In production, integrate with a real geocoding API (Google Maps, OpenCage, etc.)
  // For now, return null to indicate geocoding not available
  return null
}

/**
 * Score a property for cell tower suitability
 */
export function scoreProperty(parcel: any, centerLat: number, centerLon: number): {
  score: number
  breakdown: Record<string, number>
} {
  const breakdown: Record<string, number> = {}
  let totalScore = 0

  // 1. Distance from search ring center (20 points max)
  // Closer is better, within 0.5 miles is ideal
  if (parcel.latitude && parcel.longitude) {
    const distance = calculateDistance(centerLat, centerLon, parcel.latitude, parcel.longitude)
    if (distance <= 0.5) {
      breakdown.distance = 20
    } else if (distance <= 1.0) {
      breakdown.distance = 15
    } else if (distance <= 2.0) {
      breakdown.distance = 10
    } else {
      breakdown.distance = 5
    }
  } else {
    breakdown.distance = 10 // Unknown location, neutral score
  }
  totalScore += breakdown.distance

  // 2. Parcel size (20 points max)
  // Ideal: 1-5 acres for cell tower site
  const acres = parseFloat(parcel.acres || parcel.parcel_acres || '0')
  if (acres >= 1 && acres <= 5) {
    breakdown.size = 20
  } else if (acres > 0.5 && acres < 10) {
    breakdown.size = 15
  } else if (acres >= 10) {
    breakdown.size = 10
  } else {
    breakdown.size = 5
  }
  totalScore += breakdown.size

  // 3. Zoning (15 points max)
  const zoning = (parcel.zoning || parcel.zoning_designation || '').toLowerCase()
  if (zoning.includes('commercial') || zoning.includes('industrial')) {
    breakdown.zoning = 15
  } else if (zoning.includes('agricultural') || zoning.includes('rural')) {
    breakdown.zoning = 12
  } else if (zoning.includes('residential')) {
    breakdown.zoning = 8
  } else {
    breakdown.zoning = 10 // Unknown
  }
  totalScore += breakdown.zoning

  // 4. Land use (15 points max)
  const landUse = (parcel.land_use || parcel.current_use || '').toLowerCase()
  if (landUse.includes('vacant') || landUse.includes('undeveloped')) {
    breakdown.landUse = 15
  } else if (landUse.includes('agricultural')) {
    breakdown.landUse = 12
  } else if (landUse.includes('commercial')) {
    breakdown.landUse = 10
  } else {
    breakdown.landUse = 8
  }
  totalScore += breakdown.landUse

  // 5. Ownership type (10 points max)
  const owner = (parcel.owner || parcel.owner_name || '').toLowerCase()
  if (owner.includes('llc') || owner.includes('corp') || owner.includes('inc')) {
    breakdown.ownership = 10 // Corporate owners often easier to negotiate with
  } else if (owner.includes('trust') || owner.includes('estate')) {
    breakdown.ownership = 7
  } else {
    breakdown.ownership = 8 // Individual owners
  }
  totalScore += breakdown.ownership

  // 6. Property value (10 points max)
  // Higher value might indicate better location/infrastructure
  const marketValue = parseFloat(parcel.market_value || parcel.assessed_value || '0')
  if (marketValue > 100000 && marketValue < 500000) {
    breakdown.value = 10
  } else if (marketValue >= 50000 && marketValue <= 1000000) {
    breakdown.value = 8
  } else {
    breakdown.value = 6
  }
  totalScore += breakdown.value

  // 7. Road access (10 points max)
  const address = (parcel.address || parcel.site_address || '').toLowerCase()
  if (address.includes('rd') || address.includes('road') || address.includes('st') || address.includes('ave')) {
    breakdown.access = 10
  } else {
    breakdown.access = 7
  }
  totalScore += breakdown.access

  return {
    score: totalScore,
    breakdown
  }
}

/**
 * Enrich parcel data with additional information
 */
export async function enrichParcelData(parcel: any, centerLat: number, centerLon: number): Promise<any> {
  const enriched = { ...parcel }

  // Attempt to geocode if coordinates not available
  if (!enriched.latitude && enriched.address) {
    const coords = await geocodeAddress(enriched.address)
    if (coords) {
      enriched.latitude = coords.lat
      enriched.longitude = coords.lon
    }
  }

  // Calculate distance from search ring center
  if (enriched.latitude && enriched.longitude) {
    enriched.distanceFromCenter = calculateDistance(
      centerLat,
      centerLon,
      enriched.latitude,
      enriched.longitude
    )
  }

  // Normalize field names for consistency
  enriched.parcelAcres = parseFloat(enriched.acres || enriched.parcel_acres || '0')
  enriched.ownerName = enriched.owner || enriched.owner_name
  enriched.zoningDesignation = enriched.zoning || enriched.zoning_designation
  enriched.siteAddress = enriched.address || enriched.site_address
  enriched.assessedValue = parseFloat(enriched.assessed_value || enriched.taxvalue || '0')
  enriched.marketValue = parseFloat(enriched.market_value || enriched.assessed_value || '0')

  return enriched
}

/**
 * Generate aerial imagery URL for a location
 */
export function getAerialImageryURL(lat: number, lon: number, zoom: number = 18): string {
  // Using static map APIs - in production, use Google Maps Static API or Mapbox Static Images
  // This is a placeholder that returns a working static map
  return `https://api.mapbox.com/styles/v1/mapbox/satellite-v9/static/${lon},${lat},${zoom}/600x400@2x?access_token=YOUR_MAPBOX_TOKEN`
}

/**
 * Generate street view URL for a location
 */
export function getStreetViewURL(lat: number, lon: number): string {
  // Google Street View Static API
  return `https://maps.googleapis.com/maps/api/streetview?size=600x400&location=${lat},${lon}&key=YOUR_GOOGLE_API_KEY`
}

/**
 * Generate topographic map URL
 */
export function getTopoMapURL(lat: number, lon: number, zoom: number = 14): string {
  // Using OpenTopoMap or similar service
  return `https://api.mapbox.com/styles/v1/mapbox/outdoors-v12/static/${lon},${lat},${zoom}/600x400@2x?access_token=YOUR_MAPBOX_TOKEN`
}

/**
 * Fetch elevation data for a location
 */
export async function getElevation(lat: number, lon: number): Promise<number | null> {
  try {
    // Using Open-Elevation API (free, no API key required)
    const response = await fetch(
      `https://api.open-elevation.com/api/v1/lookup?locations=${lat},${lon}`
    )
    if (response.ok) {
      const data = await response.json()
      if (data.results && data.results[0]) {
        // Convert meters to feet
        return data.results[0].elevation * 3.28084
      }
    }
  } catch (error) {
    console.error('Elevation fetch error:', error)
  }
  return null
}

/**
 * Fetch flood zone information
 */
export async function getFloodZone(lat: number, lon: number): Promise<string> {
  // In production, integrate with FEMA API or similar
  // Placeholder logic
  return 'Unknown'
}

/**
 * Analyze environmental concerns
 */
export function analyzeEnvironmentalConcerns(parcel: any): {
  wetlands: boolean
  floodZone: string
  endangeredSpecies: boolean
  historicalSite: boolean
  concerns: string[]
} {
  const concerns: string[] = []

  // Analyze based on land use and zoning
  const landUse = (parcel.land_use || '').toLowerCase()
  const zoning = (parcel.zoning || '').toLowerCase()

  const wetlands = landUse.includes('wetland') || landUse.includes('marsh')
  if (wetlands) concerns.push('Potential wetlands present')

  const floodZone = parcel.flood_zone || 'X' // X = low risk
  if (floodZone !== 'X' && floodZone !== 'Unknown') {
    concerns.push(`Located in flood zone ${floodZone}`)
  }

  const endangeredSpecies = false // Would need wildlife database integration
  const historicalSite = landUse.includes('historical') || zoning.includes('historic')
  if (historicalSite) concerns.push('Potential historical site designation')

  return {
    wetlands,
    floodZone,
    endangeredSpecies,
    historicalSite,
    concerns
  }
}

/**
 * Estimate lease rate based on property characteristics
 */
export function estimateLeaseRate(parcel: any): string {
  const marketValue = parseFloat(parcel.market_value || parcel.assessed_value || '0')
  const acres = parseFloat(parcel.acres || parcel.parcel_acres || '0')

  // Typical cell tower lease rates: $1,000 - $3,000/month
  // Factors: location, property value, competition, negotiation

  let monthlyMin = 1000
  let monthlyMax = 2000

  if (marketValue > 300000) {
    monthlyMin = 1500
    monthlyMax = 3000
  }

  if (acres > 5) {
    monthlyMin += 500
    monthlyMax += 1000
  }

  return `$${monthlyMin.toLocaleString()} - $${monthlyMax.toLocaleString()}/month`
}

/**
 * Generate comprehensive SCIP data for a candidate
 */
export async function generateSCIPData(
  parcel: any,
  project: SCIPProject
): Promise<any> {
  // Enrich parcel data
  const enriched = await enrichParcelData(
    parcel,
    project.searchRingCenterLat,
    project.searchRingCenterLon
  )

  // Calculate property score
  const { score, breakdown } = scoreProperty(
    enriched,
    project.searchRingCenterLat,
    project.searchRingCenterLon
  )

  // Environmental analysis
  const environmental = analyzeEnvironmentalConcerns(enriched)

  // Get elevation if coordinates available
  let elevation = null
  if (enriched.latitude && enriched.longitude) {
    elevation = await getElevation(enriched.latitude, enriched.longitude)
  }

  // Generate image URLs if coordinates available
  let images = {}
  if (enriched.latitude && enriched.longitude) {
    images = {
      aerialImageUrl: getAerialImageryURL(enriched.latitude, enriched.longitude),
      streetViewUrl: getStreetViewURL(enriched.latitude, enriched.longitude),
      topoMapUrl: getTopoMapURL(enriched.latitude, enriched.longitude)
    }
  }

  // Estimate lease rate
  const estimatedLeaseRate = estimateLeaseRate(enriched)

  return {
    // Site Identification
    siteName: project.projectName,
    siteAddress: enriched.siteAddress,
    siteCity: enriched.city || '',
    siteState: 'FL',
    siteZip: enriched.zip || '',
    siteCounty: project.county,
    latitude: enriched.latitude,
    longitude: enriched.longitude,

    // Property Information
    ownerName: enriched.ownerName,
    ownerAddress: enriched.owner_address || '',
    parcelNumber: enriched.parcel_id || enriched.pin || '',
    parcelAcres: enriched.parcelAcres,
    lotSize: enriched.lot_size || `${enriched.parcelAcres} acres`,

    // Zoning & Land Use
    zoningDesignation: enriched.zoningDesignation,
    landUse: enriched.land_use,
    currentUse: enriched.current_use || enriched.land_use,
    zoningAllowsTowers: null, // Would need zoning code lookup
    conditionalUsePermitRequired: null,

    // Access & Infrastructure (placeholders - would need detailed analysis)
    accessRoadType: 'Public Road',
    roadFrontageFeet: null,
    utilityPowerAvailable: true,
    utilityWaterAvailable: null,
    utilitySwerAvailable: null,
    utilityGasAvailable: null,

    // Environmental
    wetlandsPresent: environmental.wetlands,
    floodZone: environmental.floodZone,
    endangeredSpecies: environmental.endangeredSpecies,
    historicalSite: environmental.historicalSite,
    environmentalConcerns: environmental.concerns.join('; '),

    // RF Engineering
    elevationFeet: elevation,
    terrainType: 'Unknown', // Would need terrain analysis
    lineOfSight: 'To be determined',
    rfPropagationScore: null,

    // Site Characteristics
    topography: 'Unknown',
    vegetation: 'Unknown',
    siteAccessibility: 'Good', // Placeholder
    neighboringLandUse: 'Unknown',

    // Financial
    assessedValue: enriched.assessedValue,
    marketValue: enriched.marketValue,
    estimatedLeaseRate,

    // Images & Documents
    ...images,
    additionalImages: [],

    // Scoring
    overallScore: score,
    scoreBreakdown: breakdown,

    // Raw Data
    mapwiseData: JSON.stringify(parcel),
    distanceFromCenter: enriched.distanceFromCenter
  }
}
