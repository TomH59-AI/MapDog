/**
 * SCIP - Site Candidate Information Package
 * Complete data structure for wireless tower site acquisition
 */

export interface SCIPData {
  // SITE ACQUISITION
  siteAcquisition: {
    agentName: string
    agentPhone: string
    agentEmail: string
    submittalDate: string
  }

  // SEARCH RING INFORMATION
  searchRing: {
    siteName: string
    latitude: number | null
    longitude: number | null
    searchRadius: string
    sarfHeight: string
    sarf: string
  }

  // PROJECT INFORMATION
  projectInfo: {
    towerType: string
    towerHeight: string
    centerlinesAvailable: string
    groundElevation: string
    compoundSize: string
    latitude: number | null
    longitude: number | null
    distanceFromCenter: string
  }

  // SITE INFORMATION (from Property Appraiser)
  siteInfo: {
    parcelCounty: string
    parcelId: string
    ownerName: string
    parcelStreetAddress: string
    parcelCity: string
    parcelState: string
    parcelZip: string
    parcelSize: string
    parcelDimensions: string
    conformingSize: string
    taxesPaid: string
  }

  // OWNER INFORMATION
  ownerInfo: {
    names: string
    contactPerson: string
    mailingAddress: string
    emailAddress: string
    phoneNumber: string
  }

  // LEASE INFORMATION
  leaseInfo: {
    effectiveDate: string
    initialTerm: string
    renewalTerms: string
    optionPeriods: string
    baseLeaseFee: string
    escalationRate: string
    collocationRevenue: string
    capitalContribution: string
  }

  // LANDOWNER NOTES
  landownerNotes: string

  // DIRECTIONS TO SITE
  directions: string

  // PHOTOGRAPHS
  photographs: {
    proposedSite: string
    northFromSite: string
    southFromSite: string
    eastFromSite: string
    westFromSite: string
    accessROW: string
    accessAlong: string
    powerPole: string
    telcoDemarc: string
    siteSketch: string
  }

  // EXISTING CONDITIONS
  existingConditions: {
    floodZones: string
    wetlandConcerns: string
    waterManagementDistrict: string
    hazardousWaste: string
    accessNotes: string
    powerProvider: string
    fiberAvailable: string
    telcoProvider: string
    nearestAirport: string
    localPolice: string
    localFireDept: string
  }

  // SITE NOTES
  siteNotes: string

  // MAPS - Base64 or URLs
  maps: {
    aerial: string
    topography: string
    floodplain: string
    zoning: string
    flu: string // Future Land Use
    wetlands: string
    parcel: string
    windSpeed: string
    airport: string
  }

  // ZONING OVERVIEW
  zoningOverview: {
    jurisdiction: string
    contactInfo: string
    process: string
    fees: string
    approvalTimeframe: string
    zoningDistrict: string
    futureLandUse: string
    currentUsage: string
    meetsLotRequirements: string
  }

  // TOWER SPECIFICS
  towerSpecifics: {
    ldcReference: string
    maxTowerHeight: string
    stealthRequired: string
    requiredCollocations: string
    residentialSeparation: string
    towerSeparation: string
    measuredFrom: string
    fallZoneRequirements: string
    specialLandscaping: string
  }

  // ZONING NOTES
  zoningNotes: string

  // SITE PLAN OVERVIEW
  sitePlanOverview: {
    jurisdiction: string
    contactInfo: string
    fees: string
    approvalTimeframe: string
    existingSitePlan: string
    concurrentToZoning: string
    submittalDeadlines: string
    submissionFormat: string
  }

  // SITE PLAN NOTES
  sitePlanNotes: string

  // BUILDING PERMIT INFORMATION
  buildingPermit: {
    jurisdiction: string
    contactInfo: string
    gcMustSubmit: string
    fees: string
    timeframe: string
    bondRequired: string
    e911Address: string
  }

  // BUILDING PERMIT NOTES
  buildingPermitNotes: string

  // APPROVALS
  approvals: {
    projectManager: string
    programManager: string
    ceo: string
    carrier: string
  }

  // CONTACT SUMMARY
  contactSummary: {
    candidateId: string
    summaryOfContact: string
    sarf: string
  }
}

// Default SCIP with agent defaults
export const defaultSCIP: SCIPData = {
  siteAcquisition: {
    agentName: 'Tom Hodges',
    agentPhone: '(248) 787-1888',
    agentEmail: 'hodgesthomas@outlook.com',
    submittalDate: new Date().toISOString().split('T')[0]
  },
  searchRing: {
    siteName: '',
    latitude: null,
    longitude: null,
    searchRadius: '',
    sarfHeight: '',
    sarf: ''
  },
  projectInfo: {
    towerType: 'Self-Support Lattice',
    towerHeight: "199'",
    centerlinesAvailable: "189'",
    groundElevation: '',
    compoundSize: "75'x75'",
    latitude: null,
    longitude: null,
    distanceFromCenter: ''
  },
  siteInfo: {
    parcelCounty: '',
    parcelId: '',
    ownerName: '',
    parcelStreetAddress: '',
    parcelCity: '',
    parcelState: '',
    parcelZip: '',
    parcelSize: '',
    parcelDimensions: '',
    conformingSize: '',
    taxesPaid: ''
  },
  ownerInfo: {
    names: '',
    contactPerson: '',
    mailingAddress: '',
    emailAddress: '',
    phoneNumber: ''
  },
  leaseInfo: {
    effectiveDate: '',
    initialTerm: '5 years',
    renewalTerms: '5 x 5-year renewals',
    optionPeriods: '',
    baseLeaseFee: '',
    escalationRate: '3% annually',
    collocationRevenue: '',
    capitalContribution: ''
  },
  landownerNotes: '',
  directions: '',
  photographs: {
    proposedSite: '',
    northFromSite: '',
    southFromSite: '',
    eastFromSite: '',
    westFromSite: '',
    accessROW: '',
    accessAlong: '',
    powerPole: '',
    telcoDemarc: '',
    siteSketch: ''
  },
  existingConditions: {
    floodZones: '',
    wetlandConcerns: '',
    waterManagementDistrict: '',
    hazardousWaste: '',
    accessNotes: '',
    powerProvider: '',
    fiberAvailable: '',
    telcoProvider: '',
    nearestAirport: '',
    localPolice: '',
    localFireDept: ''
  },
  siteNotes: '',
  maps: {
    aerial: '',
    topography: '',
    floodplain: '',
    zoning: '',
    flu: '',
    wetlands: '',
    parcel: '',
    windSpeed: '',
    airport: ''
  },
  zoningOverview: {
    jurisdiction: '',
    contactInfo: '',
    process: '',
    fees: '',
    approvalTimeframe: '',
    zoningDistrict: '',
    futureLandUse: '',
    currentUsage: '',
    meetsLotRequirements: ''
  },
  towerSpecifics: {
    ldcReference: '',
    maxTowerHeight: '',
    stealthRequired: '',
    requiredCollocations: '',
    residentialSeparation: '',
    towerSeparation: '',
    measuredFrom: '',
    fallZoneRequirements: '',
    specialLandscaping: ''
  },
  zoningNotes: '',
  sitePlanOverview: {
    jurisdiction: '',
    contactInfo: '',
    fees: '',
    approvalTimeframe: '',
    existingSitePlan: '',
    concurrentToZoning: '',
    submittalDeadlines: '',
    submissionFormat: ''
  },
  sitePlanNotes: '',
  buildingPermit: {
    jurisdiction: '',
    contactInfo: '',
    gcMustSubmit: '',
    fees: '',
    timeframe: '',
    bondRequired: '',
    e911Address: ''
  },
  buildingPermitNotes: '',
  approvals: {
    projectManager: '',
    programManager: '',
    ceo: '',
    carrier: ''
  },
  contactSummary: {
    candidateId: '',
    summaryOfContact: '',
    sarf: ''
  }
}

// Tower type options
export const TOWER_TYPES = [
  'Self-Support Lattice',
  'Monopole',
  'Guyed Tower',
  'Stealth - Monopine',
  'Stealth - Flagpole',
  'Stealth - Clock Tower',
  'Stealth - Church Steeple',
  'Rooftop',
  'Small Cell/Node',
  'DAS',
  'Other'
]

// Water Management Districts (Florida)
export const FL_WATER_DISTRICTS = [
  'SFWMD - South Florida Water Management District',
  'SJRWMD - St. Johns River Water Management District',
  'SWFWMD - Southwest Florida Water Management District',
  'SRWMD - Suwannee River Water Management District',
  'NWFWMD - Northwest Florida Water Management District'
]

// Common zoning processes
export const ZONING_PROCESSES = [
  'Administrative Approval',
  'Special Exception / Conditional Use',
  'Variance Required',
  'Rezoning Required',
  'By-Right',
  'Public Hearing Required'
]
