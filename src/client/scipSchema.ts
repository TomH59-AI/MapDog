/**
 * SCIP Schema - Single source of truth for Site Candidate Information Package
 *
 * This reactive object stores all SCIP field values and can be imported
 * anywhere in the app to read/write SCIP data.
 */

export const scipData = {
  // Metadata
  lastUpdated: '',

  // SITE ACQUISITION
  agent: {
    name: 'Tom Hodges',
    phone: '(248) 787-1888',
    email: 'hodgesthomas@outlook.com',
    submittal_date: new Date().toISOString().split('T')[0]
  },

  // SEARCH RING INFORMATION
  search_ring: {
    site_name: '',
    latitude: '',
    longitude: '',
    search_radius: '',
    sarf_height: '',
    sarf: ''
  },

  // PROJECT INFORMATION
  project_info: {
    tower_type: 'Self-Supporting',
    tower_height: "199'",
    centerlines_available: "189'",
    ground_elevation: '',
    compound_size: "75'x75'",
    latitude: '',
    longitude: '',
    distance_from_ring_center: ''
  },

  // SITE INFORMATION (from Property Appraiser's Office)
  site_info: {
    parcel_county: '',
    parcel_id: '',
    owner_name: '',
    street_address: '',
    city: '',
    state: '',
    zip: '',
    parcel_size_acres: '',
    parcel_dimensions_ft: '',
    conforming_size: '',
    taxes_paid_to_date: ''
  },

  // OWNER INFORMATION
  owner_info: {
    names: '',
    contact_person: '',
    mailing_address: '',
    email: '',
    phone: ''
  },

  // LEASE INFORMATION
  lease_info: {
    effective_date: '',
    initial_term_length: '5 years',
    renewal_terms: '5 x 5-year renewals',
    option_periods: '',
    base_lease_fee: '',
    escalation_rate: '3% annually',
    collocation_revenue: '',
    capital_contribution: ''
  },

  // LANDOWNER NOTES
  landowner_notes: {
    concerns: '',
    hoa_or_cdd: ''
  },

  // DIRECTIONS
  directions: {
    general_directions: ''
  },

  // PHOTOGRAPHS
  photos: {
    proposed_site: '',
    north: '',
    south: '',
    east: '',
    west: '',
    access_row_connection: '',
    access_along: '',
    power_nearest_pole: '',
    telco_nearest_demarc: '',
    site_sketch: ''
  },

  // EXISTING CONDITIONS
  existing_conditions: {
    flood_zones: '',
    wetland_concerns: '',
    water_management_district: '',
    hazardous_waste_concerns: '',
    access_notes: '',
    power_provider: '',
    fiber_available: '',
    telco_provider: '',
    nearest_airport: '',
    local_police: '',
    local_fire_dept: ''
  },

  // SITE NOTES
  site_notes: {
    development_concerns: ''
  },

  // MAPS
  maps: {
    aerial: '',
    topography: '',
    floodplain: '',
    zoning: '',
    flu: '',
    wetlands: '',
    parcel: '',
    wind_speed: '',
    airport: ''
  },

  // ZONING OVERVIEW
  zoning_overview: {
    jurisdiction: '',
    contact_info: '',
    process: '',
    fees: '',
    approval_timeframe: '',
    district: '',
    future_land_use: '',
    current_usage: '',
    meets_min_lot_requirements: ''
  },

  // TOWER SPECIFICS
  tower_specifics: {
    ldc_section_refs: '',
    max_height: '',
    stealth_required: '',
    required_collocations: '',
    residential_separation: '',
    tower_separation: '',
    measured_from: '',
    fall_zone: '',
    special_landscaping: ''
  },

  // ZONING NOTES
  zoning_notes: {
    concerns: ''
  },

  // SITE PLAN OVERVIEW
  site_plan_overview: {
    jurisdiction: '',
    contact_info: '',
    fees: '',
    approval_timeframe: '',
    existing_plan_to_amend: '',
    concurrent_to_zoning_or_bp: '',
    submittal_deadlines: '',
    submission_format: ''
  },

  // SITE PLAN NOTES
  site_plan_notes: {
    concerns: ''
  },

  // BUILDING PERMIT INFO
  building_permit_info: {
    jurisdiction: '',
    contact_info: '',
    gc_required: '',
    fees: '',
    timeframe: '',
    bond_required: '',
    e911_address_assigned: ''
  },

  // BUILDING PERMIT NOTES
  building_permit_notes: {
    concerns: ''
  },

  // APPROVALS
  approvals: {
    project_manager: '',
    program_manager: '',
    ceo: '',
    carrier: ''
  },

  // CONTACT SUMMARY
  contact_summary: {
    candidate_id: '',
    summary_of_contact: '',
    sarf: ''
  }
}

// Type for the schema
export type SCIPSchema = typeof scipData

// Helper to get nested value by dot path (e.g., "agent.name")
export function getField(path: string): string {
  const parts = path.split('.')
  let value: any = scipData
  for (const part of parts) {
    value = value?.[part]
  }
  return value ?? ''
}

// Update lastUpdated timestamp
function touch(): void {
  scipData.lastUpdated = new Date().toISOString()
}

// Helper to set nested value by dot path
export function setField(path: string, value: string): void {
  const parts = path.split('.')
  let obj: any = scipData
  for (let i = 0; i < parts.length - 1; i++) {
    obj = obj[parts[i]]
  }
  obj[parts[parts.length - 1]] = value
  touch()
}

// Populate site_info from parcel data
export function populateFromParcel(parcel: any): void {
  if (!parcel) return

  scipData.site_info.parcel_county = parcel.meta?.county || ''
  scipData.site_info.parcel_id = parcel.identifiers?.pin || parcel.parcelid || ''
  scipData.site_info.owner_name = parcel.owner?.primary_name || ''
  scipData.site_info.street_address = parcel.site?.address || parcel.owner?.address_line1 || ''
  scipData.site_info.city = parcel.site?.city || parcel.owner?.city || ''
  scipData.site_info.zip = parcel.site?.zipcode || parcel.owner?.zipcode || ''
  scipData.site_info.parcel_size_acres = parcel.land?.acres_gis?.toString() || parcel.land?.acres_deed?.toString() || ''

  // Detect state from county
  const county = (parcel.meta?.county || '').toUpperCase()
  const flCounties = ['MIAMI-DADE', 'BROWARD', 'PALM BEACH', 'HILLSBOROUGH', 'ORANGE', 'ALACHUA', 'DUVAL']
  const ncCounties = ['WAKE', 'MECKLENBURG', 'GUILFORD', 'DURHAM', 'FORSYTH']
  const gaCounties = ['FULTON', 'GWINNETT', 'COBB', 'DEKALB', 'CHATHAM']

  if (flCounties.some(fc => county.includes(fc))) {
    scipData.site_info.state = 'FL'
  } else if (ncCounties.some(nc => county.includes(nc))) {
    scipData.site_info.state = 'NC'
  } else if (gaCounties.some(gc => county.includes(gc))) {
    scipData.site_info.state = 'GA'
  }

  // Owner info
  scipData.owner_info.names = parcel.owner?.primary_name || ''
  scipData.owner_info.mailing_address = [
    parcel.owner?.address_line1,
    parcel.owner?.city,
    parcel.owner?.zipcode
  ].filter(Boolean).join(', ')

  // Zoning
  scipData.zoning_overview.district = parcel.land?.zoning || ''
  scipData.zoning_overview.current_usage = parcel.land?.land_use?.luse_desc || ''

  touch()
}

// Populate search_ring from coordinate search
export function populateFromSearchRing(data: {
  siteName?: string
  latitude?: number
  longitude?: number
  radius?: number
}): void {
  scipData.search_ring.site_name = data.siteName || ''
  scipData.search_ring.latitude = data.latitude?.toString() || ''
  scipData.search_ring.longitude = data.longitude?.toString() || ''
  scipData.search_ring.search_radius = data.radius?.toString() || ''

  touch()
}

// Reset to defaults
export function resetSCIP(): void {
  scipData.agent.name = 'Tom Hodges'
  scipData.agent.phone = '(248) 787-1888'
  scipData.agent.email = 'hodgesthomas@outlook.com'
  scipData.agent.submittal_date = new Date().toISOString().split('T')[0]

  scipData.project_info.tower_type = 'Self-Supporting'
  scipData.project_info.tower_height = "199'"
  scipData.project_info.centerlines_available = "189'"
  scipData.project_info.compound_size = "75'x75'"

  // Clear all other fields...
  scipData.search_ring.site_name = ''
  scipData.search_ring.latitude = ''
  scipData.search_ring.longitude = ''
  scipData.site_info.parcel_county = ''
  scipData.site_info.parcel_id = ''
  // ... etc
}

// Export as JSON (for debugging or API calls)
export function toJSON(): string {
  return JSON.stringify({ candidate: scipData }, null, 2)
}

export default scipData
