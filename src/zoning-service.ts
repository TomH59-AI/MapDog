/**
 * Zoning Ordinance Service
 * Fetches zoning, permitting, and regulatory information from Notion database
 */

import { Client } from '@notionhq/client'

export interface ZoningOrdinanceData {
  // Zoning Overview
  zoningJurisdiction?: string
  zoningContactName?: string
  zoningContactPhone?: string
  zoningContactEmail?: string
  zoningProcessDescription?: string
  zoningFees?: string
  zoningApprovalTimeframe?: string
  propertyZoningDistrict?: string
  propertyFutureLandUse?: string
  propertyCurrentUsage?: string
  meetsMinimumLotRequirements?: boolean

  // Tower Specifics
  ldcSectionReferences?: string
  maximumTowerHeight?: string
  stealthRequired?: boolean
  requiredCollocations?: number
  residentialSeparation?: string
  towerSeparation?: string
  separationMeasuredFrom?: string
  fallZoneRequirements?: string
  specialTowerLandscaping?: string
  zoningNotes?: string

  // Site Plan Overview
  sitePlanJurisdiction?: string
  sitePlanContactName?: string
  sitePlanContactPhone?: string
  sitePlanContactEmail?: string
  sitePlanFees?: string
  sitePlanApprovalTimeframe?: string
  existingSitePlanToAmend?: boolean
  concurrentToZoningOrBp?: string
  sitePlanSubmittalDeadlines?: string
  sitePlanSubmissionFormat?: string
  sitePlanNotes?: string

  // Building Permit Information
  buildingPermitJurisdiction?: string
  buildingDeptContactName?: string
  buildingDeptContactPhone?: string
  buildingDeptContactEmail?: string
  gcMustSubmit?: boolean
  buildingPermitFees?: string
  buildingPermitTimeframe?: string
  bondRequired?: boolean
  e911AddressAssigned?: string
  buildingPermitNotes?: string
}

/**
 * Fetch zoning ordinance data from Notion database
 */
export async function fetchZoningOrdinances(
  notionApiKey: string,
  zoningDatabaseId: string,
  county: string,
  zoningDistrict?: string
): Promise<ZoningOrdinanceData> {
  const notion = new Client({ auth: notionApiKey })

  try {
    // Query Notion database for county zoning ordinances
    const response = await notion.databases.query({
      database_id: zoningDatabaseId,
      filter: {
        and: [
          {
            property: 'County',
            select: {
              equals: county
            }
          },
          ...(zoningDistrict ? [{
            property: 'Zoning District',
            rich_text: {
              contains: zoningDistrict
            }
          }] : [])
        ]
      },
      page_size: 1
    })

    if (response.results.length === 0) {
      console.log(`No zoning ordinances found for ${county}${zoningDistrict ? ` - ${zoningDistrict}` : ''}`)
      return {}
    }

    const page = response.results[0]
    const properties = 'properties' in page ? page.properties : {}

    // Extract zoning data from Notion page
    return {
      // Zoning Overview
      zoningJurisdiction: extractText(properties['Zoning Jurisdiction']),
      zoningContactName: extractText(properties['Zoning Contact Name']),
      zoningContactPhone: extractText(properties['Zoning Contact Phone']),
      zoningContactEmail: extractText(properties['Zoning Contact Email']),
      zoningProcessDescription: extractText(properties['Zoning Process']),
      zoningFees: extractText(properties['Zoning Fees']),
      zoningApprovalTimeframe: extractText(properties['Zoning Approval Timeframe']),
      propertyZoningDistrict: extractText(properties['Zoning District']),
      propertyFutureLandUse: extractText(properties['Future Land Use']),
      propertyCurrentUsage: extractText(properties['Current Usage']),
      meetsMinimumLotRequirements: extractCheckbox(properties['Meets Minimum Lot Requirements']),

      // Tower Specifics
      ldcSectionReferences: extractText(properties['LDC Section Reference(s)']),
      maximumTowerHeight: extractText(properties['Maximum Tower Height']),
      stealthRequired: extractCheckbox(properties['Stealth Required']),
      requiredCollocations: extractNumber(properties['Required Collocations']),
      residentialSeparation: extractText(properties['Residential Separation']),
      towerSeparation: extractText(properties['Tower Separation']),
      separationMeasuredFrom: extractText(properties['Measured From']),
      fallZoneRequirements: extractText(properties['Fall Zone Requirements']),
      specialTowerLandscaping: extractText(properties['Special Tower Landscaping']),
      zoningNotes: extractText(properties['Zoning Notes']),

      // Site Plan Overview
      sitePlanJurisdiction: extractText(properties['Site Plan Jurisdiction']),
      sitePlanContactName: extractText(properties['Site Plan Contact Name']),
      sitePlanContactPhone: extractText(properties['Site Plan Contact Phone']),
      sitePlanContactEmail: extractText(properties['Site Plan Contact Email']),
      sitePlanFees: extractText(properties['Site Plan Fees']),
      sitePlanApprovalTimeframe: extractText(properties['Site Plan Approval Timeframe']),
      existingSitePlanToAmend: extractCheckbox(properties['Existing Site Plan to Amend']),
      concurrentToZoningOrBp: extractText(properties['Concurrent to Zoning or BP']),
      sitePlanSubmittalDeadlines: extractText(properties['Submittal Deadlines']),
      sitePlanSubmissionFormat: extractText(properties['Submission Format']),
      sitePlanNotes: extractText(properties['Site Plan Notes']),

      // Building Permit Information
      buildingPermitJurisdiction: extractText(properties['Building Permit Jurisdiction']),
      buildingDeptContactName: extractText(properties['Building Dept Contact Name']),
      buildingDeptContactPhone: extractText(properties['Building Dept Contact Phone']),
      buildingDeptContactEmail: extractText(properties['Building Dept Contact Email']),
      gcMustSubmit: extractCheckbox(properties['GC Must Submit']),
      buildingPermitFees: extractText(properties['Building Permit Fees']),
      buildingPermitTimeframe: extractText(properties['Building Permit Timeframe']),
      bondRequired: extractCheckbox(properties['Bond Required']),
      e911AddressAssigned: extractText(properties['E911 Address Assigned']),
      buildingPermitNotes: extractText(properties['Building Permit Notes'])
    }

  } catch (error) {
    console.error('Error fetching zoning ordinances from Notion:', error)
    return {}
  }
}

/**
 * Fetch existing conditions data (utilities, emergency services)
 */
export async function fetchExistingConditions(
  county: string,
  address?: string
): Promise<Partial<ZoningOrdinanceData>> {
  // In production, this would integrate with:
  // - Utility company APIs for power/fiber/telco providers
  // - FAA database for nearest airport
  // - County/city databases for police/fire departments
  // - Water management district databases

  // For now, return placeholders based on county
  return {
    waterManagementDistrict: guessWaterManagementDistrict(county),
    hazardousWasteConcerns: 'None identified - site visit recommended',
    accessNotes: 'To be determined during site visit',
    fiberAvailable: undefined,
    nearestAirportName: 'Unknown',
    nearestAirportDistance: 'Unknown'
  }
}

/**
 * Helper function to extract text from Notion property
 */
function extractText(property: any): string | undefined {
  if (!property) return undefined

  if (property.type === 'title' && property.title?.length > 0) {
    return property.title[0].plain_text
  }

  if (property.type === 'rich_text' && property.rich_text?.length > 0) {
    return property.rich_text[0].plain_text
  }

  if (property.type === 'select' && property.select) {
    return property.select.name
  }

  return undefined
}

/**
 * Helper function to extract checkbox from Notion property
 */
function extractCheckbox(property: any): boolean | undefined {
  if (!property) return undefined
  if (property.type === 'checkbox') {
    return property.checkbox
  }
  return undefined
}

/**
 * Helper function to extract number from Notion property
 */
function extractNumber(property: any): number | undefined {
  if (!property) return undefined
  if (property.type === 'number') {
    return property.number
  }
  return undefined
}

/**
 * Guess water management district based on county
 */
function guessWaterManagementDistrict(county: string): string {
  const countyUpper = county.toUpperCase()

  // Florida Water Management Districts
  if (['ORANGE', 'SEMINOLE', 'OSCEOLA', 'LAKE', 'BREVARD', 'VOLUSIA'].includes(countyUpper)) {
    return 'St. Johns River Water Management District (SJRWMD)'
  }

  if (['MIAMI-DADE', 'BROWARD', 'PALM BEACH', 'MARTIN', 'ST. LUCIE'].includes(countyUpper)) {
    return 'South Florida Water Management District (SFWMD)'
  }

  if (['HILLSBOROUGH', 'PINELLAS', 'PASCO', 'POLK', 'MANATEE', 'SARASOTA'].includes(countyUpper)) {
    return 'Southwest Florida Water Management District (SWFWMD)'
  }

  if (['ALACHUA', 'COLUMBIA', 'GILCHRIST', 'LAFAYETTE', 'SUWANNEE'].includes(countyUpper)) {
    return 'Suwannee River Water Management District (SRWMD)'
  }

  if (['BAY', 'ESCAMBIA', 'OKALOOSA', 'WALTON', 'SANTA ROSA'].includes(countyUpper)) {
    return 'Northwest Florida Water Management District (NWFWMD)'
  }

  return 'Unknown Water Management District'
}

/**
 * Lookup utility providers for a location
 */
export async function lookupUtilityProviders(
  county: string,
  address?: string
): Promise<{
  powerProviderName?: string
  powerProviderPhone?: string
  telcoProviderName?: string
  telcoProviderPhone?: string
  localPoliceMunicipality?: string
  localPolicePhone?: string
  localFireDeptMunicipality?: string
  localFireDeptPhone?: string
}> {
  // In production, integrate with:
  // - Utility company databases
  // - County emergency services databases
  // - 911 dispatch records

  // Placeholder data
  return {
    powerProviderName: 'To be determined',
    powerProviderPhone: 'TBD',
    telcoProviderName: 'To be determined',
    telcoProviderPhone: 'TBD',
    localPoliceMunicipality: county,
    localPolicePhone: '911 or TBD',
    localFireDeptMunicipality: county,
    localFireDeptPhone: '911 or TBD'
  }
}
