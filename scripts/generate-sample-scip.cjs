/**
 * Generate Sample SCIP Excel File
 * Run: node scripts/generate-sample-scip.js
 */
const XLSX = require('xlsx')

// Sample SCIP data (Emerald Lake example)
const scipData = {
  lastUpdated: new Date().toISOString(),
  agent: {
    name: 'Tom Hodges',
    phone: '(248) 787-1888',
    email: 'hodgesthomas@outlook.com',
    submittal_date: new Date().toISOString().split('T')[0]
  },
  search_ring: {
    site_name: 'Emerald Lake',
    latitude: '27.89845',
    longitude: '-80.59092',
    search_radius: '0.5',
    sarf_height: '199',
    sarf: 'SARF-2024-FL-001'
  },
  project_info: {
    tower_type: 'Self-Supporting',
    tower_height: "199'",
    centerlines_available: "189'",
    ground_elevation: '45 ft AMSL',
    compound_size: "75'x75'",
    latitude: '27.89845',
    longitude: '-80.59092',
    distance_from_ring_center: '0.2 mi'
  },
  site_info: {
    parcel_county: 'Brevard',
    parcel_id: '24-37-15-00-00123',
    owner_name: 'Emerald Lake Properties LLC',
    street_address: '1234 Lakeside Drive',
    city: 'Melbourne',
    state: 'FL',
    zip: '32940',
    parcel_size_acres: '2.5',
    parcel_dimensions_ft: '330 x 330',
    conforming_size: 'Yes',
    taxes_paid_to_date: 'Yes - Current'
  },
  owner_info: {
    names: 'Emerald Lake Properties LLC',
    contact_person: 'John Smith',
    mailing_address: '1234 Lakeside Drive, Melbourne, FL 32940',
    email: 'jsmith@emeraldlake.com',
    phone: '(321) 555-0123'
  },
  lease_info: {
    effective_date: '',
    initial_term_length: '5 years',
    renewal_terms: '5 x 5-year renewals',
    option_periods: '25 years total',
    base_lease_fee: '$1,800/month',
    escalation_rate: '3% annually',
    collocation_revenue: '50% revenue share',
    capital_contribution: 'N/A'
  },
  landowner_notes: {
    concerns: 'Prefers minimal visual impact. Interested in stealth design options.',
    hoa_or_cdd: 'No HOA. Property in Brevard County CDD.'
  },
  directions: {
    general_directions: 'From I-95, exit at Eau Gallie Blvd (Exit 183). Head east 2.5 miles to Wickham Rd. Turn right, go 1.2 miles. Property on left after Emerald Lake subdivision entrance.'
  },
  photos: {
    proposed_site: 'IMG_001_proposed_site.jpg',
    north: 'IMG_002_north.jpg',
    south: 'IMG_003_south.jpg',
    east: 'IMG_004_east.jpg',
    west: 'IMG_005_west.jpg',
    access_row_connection: 'IMG_006_access.jpg',
    access_along: 'IMG_007_access_along.jpg',
    power_nearest_pole: 'IMG_008_power.jpg',
    telco_nearest_demarc: 'IMG_009_telco.jpg',
    site_sketch: 'SKETCH_001_site_plan.pdf'
  },
  existing_conditions: {
    flood_zones: 'Zone AE - Base Flood Elevation 12 ft',
    wetland_concerns: 'NWI shows PFO wetland 200ft east of proposed site',
    water_management_district: 'St. Johns River WMD',
    hazardous_waste_concerns: 'None identified - Phase I ESA recommended',
    access_notes: 'Existing gravel road from Wickham Rd, 400ft to site',
    power_provider: 'Florida Power & Light',
    fiber_available: 'Yes - AT&T fiber at ROW',
    telco_provider: 'AT&T',
    nearest_airport: 'Melbourne International (MLB) - 4.2 miles NW',
    local_police: 'Melbourne Police Dept - (321) 608-6731',
    local_fire_dept: 'Brevard County Fire Rescue - Station 65'
  },
  site_notes: {
    development_concerns: 'Site is within 5 NM of MLB airport - FAA 7460 required. Soil borings recommended due to high water table.'
  },
  maps: {
    aerial: 'Esri World Imagery',
    topography: 'OpenTopoMap',
    floodplain: 'FEMA NFHL Flood Zones',
    zoning: 'Brevard County Zoning Districts',
    flu: 'Brevard County Future Land Use',
    wetlands: 'NWI/USFWS Wetlands',
    parcel: '12 Parcels (MapWise Data)',
    wind_speed: 'ASCE 7-22: 150 mph (Ultimate)',
    airport: 'FAA Airports with Part 77 Notification Zones'
  },
  zoning_overview: {
    jurisdiction: 'Brevard County',
    contact_info: 'Planning & Zoning - (321) 633-2070',
    process: 'Special Exception Required',
    fees: '$2,500 application + $500 advertising',
    approval_timeframe: '90-120 days',
    district: 'AU (Agricultural Residential)',
    future_land_use: 'Residential 1 (1 du/acre)',
    current_usage: 'Vacant/Agricultural',
    meets_min_lot_requirements: 'Yes - 2.5 acres exceeds 1 acre minimum'
  },
  tower_specifics: {
    ldc_section_refs: 'Sec. 62-1441 through 62-1449',
    max_height: '199 ft (with Special Exception)',
    stealth_required: 'Preferred but not required in AU zone',
    required_collocations: 'Minimum 3 carrier capacity required',
    residential_separation: '300 ft from nearest residence',
    tower_separation: '1 mile from existing towers',
    measured_from: 'Base of tower to property line',
    fall_zone: '100% of tower height',
    special_landscaping: '8 ft opaque buffer required'
  },
  zoning_notes: {
    concerns: 'Adjacent property owner may oppose. Recommend community outreach before filing.'
  },
  site_plan_overview: {
    jurisdiction: 'Brevard County',
    contact_info: 'Development Review - (321) 633-2072',
    fees: '$1,200 site plan review',
    approval_timeframe: '30-45 days after zoning approval',
    existing_plan_to_amend: 'N/A - New development',
    concurrent_to_zoning_or_bp: 'Can run concurrent with building permit',
    submittal_deadlines: '15th of each month',
    submission_format: 'Digital PDF + 3 paper copies'
  },
  site_plan_notes: {
    concerns: 'Stormwater management plan required. May need retention pond.'
  },
  building_permit_info: {
    jurisdiction: 'Brevard County Building Dept',
    contact_info: '(321) 633-2080',
    gc_required: 'Yes - FL licensed GC required',
    fees: '$3,500 estimated (based on construction value)',
    timeframe: '2-3 weeks for review',
    bond_required: 'No bond required',
    e911_address_assigned: 'Will be assigned at permit issuance'
  },
  building_permit_notes: {
    concerns: 'High wind zone - 150 mph design required. Foundation engineering critical.'
  },
  approvals: {
    project_manager: '',
    program_manager: '',
    ceo: '',
    carrier: ''
  },
  contact_summary: {
    candidate_id: 'FL-BRV-2024-001',
    summary_of_contact: 'Initial site visit 12/1/2024. Owner receptive to lease. Follow-up meeting scheduled for 12/15.',
    sarf: 'SARF-2024-FL-001'
  }
}

// Build workbook
const wb = XLSX.utils.book_new()

// Sheet 1: SCIP Main Data
const scipRows = [
  ['SITE CANDIDATE INFORMATION PACKAGE'],
  ['Generated:', new Date().toLocaleString()],
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
wsScip['!cols'] = [{ wch: 30 }, { wch: 60 }]
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

// Write file
const filename = 'SCIP_Emerald_Lake_Sample.xlsx'
XLSX.writeFile(wb, filename)

console.log(`✅ Generated: ${filename}`)
console.log(`   Location: ${process.cwd()}/${filename}`)
