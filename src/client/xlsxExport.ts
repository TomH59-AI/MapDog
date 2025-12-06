/**
 * SCIP XLSX Export - Exports scipData to multi-sheet Excel file
 */
import * as XLSX from 'xlsx'
import scipData from './scipSchema'

/**
 * Export SCIP data to XLSX file
 */
export function exportSCIPXLSX(filename: string = 'SCIP_Package.xlsx'): void {
  const wb = XLSX.utils.book_new()

  // Sheet 1: SCIP Main Data
  const scipRows = [
    ['SITE CANDIDATE INFORMATION PACKAGE'],
    [],
    ['SITE ACQUISITION'],
    ['Agent Name', scipData.agent.name],
    ['Agent Phone', scipData.agent.phone],
    ['Agent Email', scipData.agent.email],
    ['Submittal Date', scipData.agent.submittal_date],
    [],
    ['SEARCH RING INFORMATION'],
    ['Site Name', scipData.search_ring.site_name],
    ['Latitude', scipData.search_ring.latitude],
    ['Longitude', scipData.search_ring.longitude],
    ['Search Radius', scipData.search_ring.search_radius],
    ['SARF Height', scipData.search_ring.sarf_height],
    ['SARF', scipData.search_ring.sarf],
    [],
    ['PROJECT INFORMATION'],
    ['Tower Type', scipData.project_info.tower_type],
    ['Tower Height', scipData.project_info.tower_height],
    ['Centerlines Available', scipData.project_info.centerlines_available],
    ['Ground Elevation', scipData.project_info.ground_elevation],
    ['Compound Size', scipData.project_info.compound_size],
    ['Latitude', scipData.project_info.latitude],
    ['Longitude', scipData.project_info.longitude],
    ['Distance from Ring Center', scipData.project_info.distance_from_ring_center],
    [],
    ['SITE INFORMATION (Property Appraiser)'],
    ['Parcel County', scipData.site_info.parcel_county],
    ['Parcel ID', scipData.site_info.parcel_id],
    ['Owner Name', scipData.site_info.owner_name],
    ['Street Address', scipData.site_info.street_address],
    ['City', scipData.site_info.city],
    ['State', scipData.site_info.state],
    ['ZIP', scipData.site_info.zip],
    ['Parcel Size (Acres)', scipData.site_info.parcel_size_acres],
    ['Parcel Dimensions (ft)', scipData.site_info.parcel_dimensions_ft],
    ['Conforming Size', scipData.site_info.conforming_size],
    ['Taxes Paid to Date', scipData.site_info.taxes_paid_to_date],
    [],
    ['OWNER INFORMATION'],
    ['Owner Names', scipData.owner_info.names],
    ['Contact Person', scipData.owner_info.contact_person],
    ['Mailing Address', scipData.owner_info.mailing_address],
    ['Email', scipData.owner_info.email],
    ['Phone', scipData.owner_info.phone],
    [],
    ['LEASE INFORMATION'],
    ['Effective Date', scipData.lease_info.effective_date],
    ['Initial Term Length', scipData.lease_info.initial_term_length],
    ['Renewal Terms', scipData.lease_info.renewal_terms],
    ['Option Periods', scipData.lease_info.option_periods],
    ['Base Lease Fee', scipData.lease_info.base_lease_fee],
    ['Escalation Rate', scipData.lease_info.escalation_rate],
    ['Collocation Revenue', scipData.lease_info.collocation_revenue],
    ['Capital Contribution', scipData.lease_info.capital_contribution],
    [],
    ['LANDOWNER NOTES'],
    ['Concerns', scipData.landowner_notes.concerns],
    ['HOA or CDD', scipData.landowner_notes.hoa_or_cdd],
    [],
    ['DIRECTIONS'],
    ['General Directions', scipData.directions.general_directions],
    [],
    ['EXISTING CONDITIONS'],
    ['Flood Zones', scipData.existing_conditions.flood_zones],
    ['Wetland Concerns', scipData.existing_conditions.wetland_concerns],
    ['Water Management District', scipData.existing_conditions.water_management_district],
    ['Hazardous Waste Concerns', scipData.existing_conditions.hazardous_waste_concerns],
    ['Access Notes', scipData.existing_conditions.access_notes],
    ['Power Provider', scipData.existing_conditions.power_provider],
    ['Fiber Available', scipData.existing_conditions.fiber_available],
    ['Telco Provider', scipData.existing_conditions.telco_provider],
    ['Nearest Airport', scipData.existing_conditions.nearest_airport],
    ['Local Police', scipData.existing_conditions.local_police],
    ['Local Fire Dept', scipData.existing_conditions.local_fire_dept],
    [],
    ['SITE NOTES'],
    ['Development Concerns', scipData.site_notes.development_concerns],
    [],
    ['ZONING OVERVIEW'],
    ['Jurisdiction', scipData.zoning_overview.jurisdiction],
    ['Contact Info', scipData.zoning_overview.contact_info],
    ['Process', scipData.zoning_overview.process],
    ['Fees', scipData.zoning_overview.fees],
    ['Approval Timeframe', scipData.zoning_overview.approval_timeframe],
    ['Zoning District', scipData.zoning_overview.district],
    ['Future Land Use', scipData.zoning_overview.future_land_use],
    ['Current Usage', scipData.zoning_overview.current_usage],
    ['Meets Min Lot Requirements', scipData.zoning_overview.meets_min_lot_requirements],
    [],
    ['TOWER SPECIFICS'],
    ['LDC Section Refs', scipData.tower_specifics.ldc_section_refs],
    ['Max Height', scipData.tower_specifics.max_height],
    ['Stealth Required', scipData.tower_specifics.stealth_required],
    ['Required Collocations', scipData.tower_specifics.required_collocations],
    ['Residential Separation', scipData.tower_specifics.residential_separation],
    ['Tower Separation', scipData.tower_specifics.tower_separation],
    ['Measured From', scipData.tower_specifics.measured_from],
    ['Fall Zone', scipData.tower_specifics.fall_zone],
    ['Special Landscaping', scipData.tower_specifics.special_landscaping],
    [],
    ['ZONING NOTES'],
    ['Concerns', scipData.zoning_notes.concerns],
    [],
    ['SITE PLAN OVERVIEW'],
    ['Jurisdiction', scipData.site_plan_overview.jurisdiction],
    ['Contact Info', scipData.site_plan_overview.contact_info],
    ['Fees', scipData.site_plan_overview.fees],
    ['Approval Timeframe', scipData.site_plan_overview.approval_timeframe],
    ['Existing Plan to Amend', scipData.site_plan_overview.existing_plan_to_amend],
    ['Concurrent to Zoning/BP', scipData.site_plan_overview.concurrent_to_zoning_or_bp],
    ['Submittal Deadlines', scipData.site_plan_overview.submittal_deadlines],
    ['Submission Format', scipData.site_plan_overview.submission_format],
    [],
    ['SITE PLAN NOTES'],
    ['Concerns', scipData.site_plan_notes.concerns],
    [],
    ['BUILDING PERMIT INFO'],
    ['Jurisdiction', scipData.building_permit_info.jurisdiction],
    ['Contact Info', scipData.building_permit_info.contact_info],
    ['GC Required', scipData.building_permit_info.gc_required],
    ['Fees', scipData.building_permit_info.fees],
    ['Timeframe', scipData.building_permit_info.timeframe],
    ['Bond Required', scipData.building_permit_info.bond_required],
    ['E911 Address Assigned', scipData.building_permit_info.e911_address_assigned],
    [],
    ['BUILDING PERMIT NOTES'],
    ['Concerns', scipData.building_permit_notes.concerns],
    [],
    ['APPROVALS'],
    ['Project Manager', scipData.approvals.project_manager],
    ['Program Manager', scipData.approvals.program_manager],
    ['CEO', scipData.approvals.ceo],
    ['Carrier', scipData.approvals.carrier],
    [],
    ['CONTACT SUMMARY'],
    ['Candidate ID', scipData.contact_summary.candidate_id],
    ['Summary of Contact', scipData.contact_summary.summary_of_contact],
    ['SARF', scipData.contact_summary.sarf]
  ]

  const wsScip = XLSX.utils.aoa_to_sheet(scipRows)

  // Set column widths
  wsScip['!cols'] = [{ wch: 30 }, { wch: 50 }]

  XLSX.utils.book_append_sheet(wb, wsScip, 'SCIP')

  // Sheet 2: MAPS
  const mapsRows = [
    ['MAPS'],
    [],
    ['Map Type', 'Source/Description'],
    ['Aerial', scipData.maps.aerial],
    ['Topography', scipData.maps.topography],
    ['Floodplain', scipData.maps.floodplain],
    ['Zoning', scipData.maps.zoning],
    ['Future Land Use', scipData.maps.flu],
    ['Wetlands', scipData.maps.wetlands],
    ['Parcel', scipData.maps.parcel],
    ['Wind Speed', scipData.maps.wind_speed],
    ['Airport', scipData.maps.airport]
  ]

  const wsMaps = XLSX.utils.aoa_to_sheet(mapsRows)
  wsMaps['!cols'] = [{ wch: 20 }, { wch: 50 }]
  XLSX.utils.book_append_sheet(wb, wsMaps, 'MAPS')

  // Sheet 3: PHOTOGRAPHS
  const photosRows = [
    ['PHOTOGRAPHS'],
    [],
    ['Photo Type', 'Description/Filename'],
    ['Proposed Site', scipData.photos.proposed_site],
    ['North', scipData.photos.north],
    ['South', scipData.photos.south],
    ['East', scipData.photos.east],
    ['West', scipData.photos.west],
    ['Access ROW Connection', scipData.photos.access_row_connection],
    ['Access Along', scipData.photos.access_along],
    ['Power (Nearest Pole)', scipData.photos.power_nearest_pole],
    ['Telco (Nearest Demarc)', scipData.photos.telco_nearest_demarc],
    ['Site Sketch', scipData.photos.site_sketch]
  ]

  const wsPhotos = XLSX.utils.aoa_to_sheet(photosRows)
  wsPhotos['!cols'] = [{ wch: 25 }, { wch: 50 }]
  XLSX.utils.book_append_sheet(wb, wsPhotos, 'PHOTOGRAPHS')

  // Download the file
  XLSX.writeFile(wb, filename)
}

/**
 * Export parcels to GeoJSON file
 */
export function exportParcelsGeoJSON(parcels: any[], filename: string = 'parcels.geojson'): void {
  const geojson = {
    type: 'FeatureCollection',
    features: parcels
      .filter(p => p.geometry)
      .map(p => ({
        type: 'Feature',
        properties: {
          pin: p.identifiers?.pin || p.parcelid || '',
          owner: p.owner?.primary_name || '',
          address: p.site?.address || p.owner?.address_line1 || '',
          city: p.site?.city || '',
          county: p.meta?.county || '',
          acres: p.land?.acres_gis || p.land?.acres_deed || 0,
          zoning: p.land?.zoning || '',
          landUse: p.land?.land_use?.luse_desc || '',
          marketValue: p.valuation?.market?.total || 0
        },
        geometry: p.geometry
      }))
  }

  const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: 'application/geo+json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Export parcels to CSV
 */
export function exportParcelsCSV(parcels: any[], filename: string = 'parcels.csv'): void {
  const rows = parcels.map(p => ({
    PIN: p.identifiers?.pin || p.parcelid || '',
    Owner: p.owner?.primary_name || '',
    Address: p.site?.address || p.owner?.address_line1 || '',
    City: p.site?.city || '',
    County: p.meta?.county || '',
    Acres: p.land?.acres_gis || p.land?.acres_deed || '',
    Zoning: p.land?.zoning || '',
    'Land Use': p.land?.land_use?.luse_desc || '',
    'Market Value': p.valuation?.market?.total || ''
  }))

  const ws = XLSX.utils.json_to_sheet(rows)
  const csv = XLSX.utils.sheet_to_csv(ws)

  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
