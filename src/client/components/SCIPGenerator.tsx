import React, { useState, useEffect } from 'react'
import * as XLSX from 'xlsx'
import type { Parcel } from '../App'
import {
  SCIPData,
  defaultSCIP,
  TOWER_TYPES,
  FL_WATER_DISTRICTS,
  ZONING_PROCESSES
} from '../types/scip'

interface SCIPGeneratorProps {
  parcel?: Parcel | null
  searchRingData?: {
    siteName?: string
    latitude?: number
    longitude?: number
    radius?: number
  }
  onClose?: () => void
}

export default function SCIPGenerator({ parcel, searchRingData, onClose }: SCIPGeneratorProps) {
  const [scip, setScip] = useState<SCIPData>(defaultSCIP)
  const [activeSection, setActiveSection] = useState('siteAcquisition')
  const [isExporting, setIsExporting] = useState(false)

  // Auto-populate from parcel data
  useEffect(() => {
    if (parcel) {
      setScip(prev => ({
        ...prev,
        siteInfo: {
          ...prev.siteInfo,
          parcelCounty: parcel.meta?.county || '',
          parcelId: parcel.identifiers?.pin || parcel.parcelid || '',
          ownerName: parcel.owner?.primary_name || '',
          parcelStreetAddress: parcel.site?.address || parcel.owner?.address_line1 || '',
          parcelCity: parcel.site?.city || parcel.owner?.city || '',
          parcelState: detectState(parcel.meta?.county || ''),
          parcelZip: parcel.site?.zipcode || parcel.owner?.zipcode || '',
          parcelSize: parcel.land?.acres_gis?.toString() || parcel.land?.acres_deed?.toString() || ''
        },
        ownerInfo: {
          ...prev.ownerInfo,
          names: parcel.owner?.primary_name || '',
          mailingAddress: [
            parcel.owner?.address_line1,
            parcel.owner?.city,
            parcel.owner?.zipcode
          ].filter(Boolean).join(', ')
        },
        zoningOverview: {
          ...prev.zoningOverview,
          zoningDistrict: parcel.land?.zoning || '',
          currentUsage: parcel.land?.land_use?.luse_desc || ''
        }
      }))
    }
  }, [parcel])

  // Auto-populate from search ring data
  useEffect(() => {
    if (searchRingData) {
      setScip(prev => ({
        ...prev,
        searchRing: {
          ...prev.searchRing,
          siteName: searchRingData.siteName || '',
          latitude: searchRingData.latitude || null,
          longitude: searchRingData.longitude || null,
          searchRadius: searchRingData.radius?.toString() || ''
        }
      }))
    }
  }, [searchRingData])

  // Helper to detect state from county
  const detectState = (county: string): string => {
    const c = county.toUpperCase()
    const flCounties = ['MIAMI-DADE', 'BROWARD', 'PALM BEACH', 'HILLSBOROUGH', 'ORANGE', 'ALACHUA', 'DUVAL']
    const ncCounties = ['WAKE', 'MECKLENBURG', 'GUILFORD', 'DURHAM', 'FORSYTH']
    const gaCounties = ['FULTON', 'GWINNETT', 'COBB', 'DEKALB', 'CHATHAM']

    if (flCounties.some(fc => c.includes(fc))) return 'FL'
    if (ncCounties.some(nc => c.includes(nc))) return 'NC'
    if (gaCounties.some(gc => c.includes(gc))) return 'GA'
    return ''
  }

  // Update nested field
  const updateField = (section: keyof SCIPData, field: string, value: any) => {
    setScip(prev => ({
      ...prev,
      [section]: typeof prev[section] === 'object' && prev[section] !== null
        ? { ...prev[section] as object, [field]: value }
        : value
    }))
  }

  // Section definitions
  const sections = [
    { id: 'siteAcquisition', label: 'Site Acquisition', icon: 'fa-user-tie' },
    { id: 'searchRing', label: 'Search Ring', icon: 'fa-crosshairs' },
    { id: 'projectInfo', label: 'Project Info', icon: 'fa-broadcast-tower' },
    { id: 'siteInfo', label: 'Site Info', icon: 'fa-map-marker-alt' },
    { id: 'ownerInfo', label: 'Owner Info', icon: 'fa-id-card' },
    { id: 'leaseInfo', label: 'Lease Info', icon: 'fa-file-contract' },
    { id: 'existingConditions', label: 'Existing Conditions', icon: 'fa-clipboard-check' },
    { id: 'zoningOverview', label: 'Zoning', icon: 'fa-city' },
    { id: 'towerSpecifics', label: 'Tower Specs', icon: 'fa-ruler-vertical' },
    { id: 'sitePlanOverview', label: 'Site Plan', icon: 'fa-drafting-compass' },
    { id: 'buildingPermit', label: 'Building Permit', icon: 'fa-stamp' },
    { id: 'maps', label: 'Maps', icon: 'fa-map' },
    { id: 'approvals', label: 'Approvals', icon: 'fa-check-double' }
  ]

  // Export to XLSX
  const exportToXLSX = () => {
    setIsExporting(true)

    try {
      const wb = XLSX.utils.book_new()

      // Main SCIP data as rows
      const scipRows = [
        ['SITE CANDIDATE INFORMATION PACKAGE', ''],
        ['', ''],
        ['SITE ACQUISITION', ''],
        ['Agent Name', scip.siteAcquisition.agentName],
        ['Agent Phone', scip.siteAcquisition.agentPhone],
        ['Agent E-mail', scip.siteAcquisition.agentEmail],
        ['Submittal Date', scip.siteAcquisition.submittalDate],
        ['', ''],
        ['SEARCH RING INFORMATION', ''],
        ['Site Name', scip.searchRing.siteName],
        ['Latitude', scip.searchRing.latitude],
        ['Longitude', scip.searchRing.longitude],
        ['Search Radius', scip.searchRing.searchRadius],
        ['SARF Height', scip.searchRing.sarfHeight],
        ['SARF', scip.searchRing.sarf],
        ['', ''],
        ['PROJECT INFORMATION', ''],
        ['Tower Type', scip.projectInfo.towerType],
        ['Tower Height', scip.projectInfo.towerHeight],
        ['Centerlines Available', scip.projectInfo.centerlinesAvailable],
        ['Ground Elevation', scip.projectInfo.groundElevation],
        ['Compound Size (S.F. & dimensions)', scip.projectInfo.compoundSize],
        ['Latitude', scip.projectInfo.latitude],
        ['Longitude', scip.projectInfo.longitude],
        ['Distance from Search Ring Center', scip.projectInfo.distanceFromCenter],
        ['', ''],
        ['SITE INFORMATION (from Property Appraiser\'s Office)', ''],
        ['Parcel County', scip.siteInfo.parcelCounty],
        ['Parcel ID Number', scip.siteInfo.parcelId],
        ['Owner Name (on Deed)', scip.siteInfo.ownerName],
        ['Parcel Street Address', scip.siteInfo.parcelStreetAddress],
        ['Parcel City', scip.siteInfo.parcelCity],
        ['Parcel State', scip.siteInfo.parcelState],
        ['Parcel Zip', scip.siteInfo.parcelZip],
        ['Parcel Size (acres, MOL)', scip.siteInfo.parcelSize],
        ['Parcel Dimensions (feet)', scip.siteInfo.parcelDimensions],
        ['Conforming Size?', scip.siteInfo.conformingSize],
        ['Taxes Paid-to-Date?', scip.siteInfo.taxesPaid],
        ['', ''],
        ['OWNER INFORMATION', ''],
        ['Name(s)', scip.ownerInfo.names],
        ['Contact Person', scip.ownerInfo.contactPerson],
        ['Mailing Address', scip.ownerInfo.mailingAddress],
        ['E-mail Address', scip.ownerInfo.emailAddress],
        ['Phone Number', scip.ownerInfo.phoneNumber],
        ['', ''],
        ['LEASE INFORMATION', ''],
        ['Effective Date (signed or anticipated)', scip.leaseInfo.effectiveDate],
        ['Length of Initial Term', scip.leaseInfo.initialTerm],
        ['Length & Number of Renewal Terms', scip.leaseInfo.renewalTerms],
        ['Option Period(s)', scip.leaseInfo.optionPeriods],
        ['Base Lease Fee', scip.leaseInfo.baseLeaseFee],
        ['Escalation Rate', scip.leaseInfo.escalationRate],
        ['Collocation Revenue (if applicable)', scip.leaseInfo.collocationRevenue],
        ['Capital Contribution (if applicable)', scip.leaseInfo.capitalContribution],
        ['', ''],
        ['LANDOWNER NOTES', ''],
        ['Please elaborate on any concerns with landowner or lease terms. Is property within HOA or CDD?', scip.landownerNotes],
        ['', ''],
        ['DIRECTIONS TO SITE', ''],
        ['Please provide general directions.', scip.directions],
        ['', ''],
        ['EXISTING CONDITIONS', ''],
        ['Flood Zone(s)', scip.existingConditions.floodZones],
        ['Wetland Concerns?', scip.existingConditions.wetlandConcerns],
        ['Water Management District', scip.existingConditions.waterManagementDistrict],
        ['Hazardous Waste Concerns?', scip.existingConditions.hazardousWaste],
        ['Access Notes (ROW, driveway, code)', scip.existingConditions.accessNotes],
        ['Power Provider (name & phone)', scip.existingConditions.powerProvider],
        ['Fiber Available?', scip.existingConditions.fiberAvailable],
        ['Telco Provider (name & phone)', scip.existingConditions.telcoProvider],
        ['Nearest Airport (name & distance)', scip.existingConditions.nearestAirport],
        ['Local Police (municipality & phone)', scip.existingConditions.localPolice],
        ['Local Fire Dept (municipality & phone)', scip.existingConditions.localFireDept],
        ['', ''],
        ['SITE NOTES', ''],
        ['Please elaborate on any site development concerns', scip.siteNotes],
        ['', ''],
        ['ZONING OVERVIEW', ''],
        ['Zoning Jurisdiction', scip.zoningOverview.jurisdiction],
        ['Zoning Contact Information', scip.zoningOverview.contactInfo],
        ['Zoning Process', scip.zoningOverview.process],
        ['Zoning Fees', scip.zoningOverview.fees],
        ['Zoning Approval Timeframe', scip.zoningOverview.approvalTimeframe],
        ['Property Zoning District', scip.zoningOverview.zoningDistrict],
        ['Property Future Land Use', scip.zoningOverview.futureLandUse],
        ['Property Current Usage', scip.zoningOverview.currentUsage],
        ['Meets minimum lot requirements?', scip.zoningOverview.meetsLotRequirements],
        ['', ''],
        ['TOWER SPECIFICS', ''],
        ['LDC Section Reference(s)', scip.towerSpecifics.ldcReference],
        ['Maximum Tower Height', scip.towerSpecifics.maxTowerHeight],
        ['Stealth Required?', scip.towerSpecifics.stealthRequired],
        ['Required Collocations (#)', scip.towerSpecifics.requiredCollocations],
        ['Residential Separation (ft or %)', scip.towerSpecifics.residentialSeparation],
        ['Tower Separation (ft or %)', scip.towerSpecifics.towerSeparation],
        ['Measured from base or center', scip.towerSpecifics.measuredFrom],
        ['Fall Zone Requirements', scip.towerSpecifics.fallZoneRequirements],
        ['Special Tower Landscaping?', scip.towerSpecifics.specialLandscaping],
        ['', ''],
        ['ZONING NOTES', ''],
        ['Please elaborate on any zoning concerns, fees, etc.', scip.zoningNotes],
        ['', ''],
        ['SITE PLAN OVERVIEW', ''],
        ['Site Plan Jurisdiction', scip.sitePlanOverview.jurisdiction],
        ['Site Plan Contact Information', scip.sitePlanOverview.contactInfo],
        ['Site Plan Fees', scip.sitePlanOverview.fees],
        ['Timeframe for approval', scip.sitePlanOverview.approvalTimeframe],
        ['Existing Site Plan to Amend?', scip.sitePlanOverview.existingSitePlan],
        ['Concurrent to Zoning or BP?', scip.sitePlanOverview.concurrentToZoning],
        ['Submittal deadlines?', scip.sitePlanOverview.submittalDeadlines],
        ['Electronic, hard copy, or both?', scip.sitePlanOverview.submissionFormat],
        ['', ''],
        ['SITE PLAN NOTES', ''],
        ['Please elaborate on any site plan concerns, fees, etc.', scip.sitePlanNotes],
        ['', ''],
        ['BUILDING PERMIT INFORMATION', ''],
        ['Building Permit Jurisdiction', scip.buildingPermit.jurisdiction],
        ['Building Department Contact Info', scip.buildingPermit.contactInfo],
        ['Does GC have to submit?', scip.buildingPermit.gcMustSubmit],
        ['Building Permit Fees', scip.buildingPermit.fees],
        ['Building Permit Timeframe', scip.buildingPermit.timeframe],
        ['Bond Required?', scip.buildingPermit.bondRequired],
        ['E911 Address assigned?', scip.buildingPermit.e911Address],
        ['', ''],
        ['BUILDING PERMIT NOTES', ''],
        ['Please elaborate on any BP concerns, fees, etc.', scip.buildingPermitNotes],
        ['', ''],
        ['APPROVALS - Name and Date', ''],
        ['Project Manager', scip.approvals.projectManager],
        ['Program Manager', scip.approvals.programManager],
        ['CEO', scip.approvals.ceo],
        ['Carrier', scip.approvals.carrier]
      ]

      const ws = XLSX.utils.aoa_to_sheet(scipRows)

      // Set column widths
      ws['!cols'] = [
        { wch: 45 },
        { wch: 50 }
      ]

      XLSX.utils.book_append_sheet(wb, ws, 'SCIP')

      // Maps sheet (placeholder for images)
      const mapsRows = [
        ['MAPS - Insert Image Snippets', ''],
        ['', ''],
        ['Aerial', scip.maps.aerial || 'Attach image'],
        ['Topography', scip.maps.topography || 'Attach image'],
        ['Floodplain Map', scip.maps.floodplain || 'Attach image'],
        ['Zoning Map', scip.maps.zoning || 'Attach image'],
        ['FLU Map', scip.maps.flu || 'Attach image'],
        ['Wetlands Map', scip.maps.wetlands || 'Attach image'],
        ['Parcel Map', scip.maps.parcel || 'Attach image'],
        ['Wind Speed Map', scip.maps.windSpeed || 'Attach image'],
        ['Airport Map', scip.maps.airport || 'Attach image']
      ]

      const mapsWs = XLSX.utils.aoa_to_sheet(mapsRows)
      mapsWs['!cols'] = [{ wch: 25 }, { wch: 50 }]
      XLSX.utils.book_append_sheet(wb, mapsWs, 'Maps')

      // Photographs sheet
      const photosRows = [
        ['PHOTOGRAPHS', ''],
        ['', ''],
        ['Proposed Site', scip.photographs.proposedSite || 'Attach photo'],
        ['North from Site', scip.photographs.northFromSite || 'Attach photo'],
        ['South from Site', scip.photographs.southFromSite || 'Attach photo'],
        ['East from Site', scip.photographs.eastFromSite || 'Attach photo'],
        ['West from Site', scip.photographs.westFromSite || 'Attach photo'],
        ['Access - ROW Connection', scip.photographs.accessROW || 'Attach photo'],
        ['Access - along', scip.photographs.accessAlong || 'Attach photo'],
        ['Power (nearest pole)', scip.photographs.powerPole || 'Attach photo'],
        ['Telco (nearest demarc)', scip.photographs.telcoDemarc || 'Attach photo'],
        ['Site Sketch (within entire parcel)', scip.photographs.siteSketch || 'Attach sketch']
      ]

      const photosWs = XLSX.utils.aoa_to_sheet(photosRows)
      photosWs['!cols'] = [{ wch: 30 }, { wch: 50 }]
      XLSX.utils.book_append_sheet(wb, photosWs, 'Photographs')

      // Generate filename
      const siteName = scip.searchRing.siteName || 'Site'
      const date = new Date().toISOString().split('T')[0]
      const filename = `SCIP-${siteName.replace(/\s+/g, '_')}-${date}.xlsx`

      XLSX.writeFile(wb, filename)

      alert(`SCIP exported successfully!\n\nFile: ${filename}`)
    } catch (error) {
      console.error('Export error:', error)
      alert('Failed to export SCIP. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }

  // Render form section
  const renderSection = () => {
    switch (activeSection) {
      case 'siteAcquisition':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-800 border-b pb-2">Site Acquisition</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Agent Name" value={scip.siteAcquisition.agentName}
                onChange={(v) => updateField('siteAcquisition', 'agentName', v)} />
              <FormField label="Agent Phone" value={scip.siteAcquisition.agentPhone}
                onChange={(v) => updateField('siteAcquisition', 'agentPhone', v)} />
              <FormField label="Agent E-mail" type="email" value={scip.siteAcquisition.agentEmail}
                onChange={(v) => updateField('siteAcquisition', 'agentEmail', v)} />
              <FormField label="Submittal Date" type="date" value={scip.siteAcquisition.submittalDate}
                onChange={(v) => updateField('siteAcquisition', 'submittalDate', v)} />
            </div>
          </div>
        )

      case 'searchRing':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-800 border-b pb-2">Search Ring Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Site Name" value={scip.searchRing.siteName}
                onChange={(v) => updateField('searchRing', 'siteName', v)} />
              <FormField label="Latitude" type="number" value={scip.searchRing.latitude?.toString() || ''}
                onChange={(v) => updateField('searchRing', 'latitude', parseFloat(v) || null)} />
              <FormField label="Longitude" type="number" value={scip.searchRing.longitude?.toString() || ''}
                onChange={(v) => updateField('searchRing', 'longitude', parseFloat(v) || null)} />
              <FormField label="Search Radius" value={scip.searchRing.searchRadius}
                onChange={(v) => updateField('searchRing', 'searchRadius', v)} placeholder="e.g., 0.5 miles" />
              <FormField label="SARF Height" value={scip.searchRing.sarfHeight}
                onChange={(v) => updateField('searchRing', 'sarfHeight', v)} placeholder="e.g., 150 ft AGL" />
              <FormField label="SARF" value={scip.searchRing.sarf}
                onChange={(v) => updateField('searchRing', 'sarf', v)} />
            </div>
          </div>
        )

      case 'projectInfo':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-800 border-b pb-2">Project Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormSelect label="Tower Type" value={scip.projectInfo.towerType}
                onChange={(v) => updateField('projectInfo', 'towerType', v)} options={TOWER_TYPES} />
              <FormField label="Tower Height" value={scip.projectInfo.towerHeight}
                onChange={(v) => updateField('projectInfo', 'towerHeight', v)} placeholder="e.g., 150 ft" />
              <FormField label="Centerlines Available" value={scip.projectInfo.centerlinesAvailable}
                onChange={(v) => updateField('projectInfo', 'centerlinesAvailable', v)} />
              <FormField label="Ground Elevation" value={scip.projectInfo.groundElevation}
                onChange={(v) => updateField('projectInfo', 'groundElevation', v)} placeholder="e.g., 35 ft AMSL" />
              <FormField label="Compound Size (S.F. & dimensions)" value={scip.projectInfo.compoundSize}
                onChange={(v) => updateField('projectInfo', 'compoundSize', v)} placeholder="e.g., 2,500 SF (50x50)" />
              <FormField label="Latitude" type="number" value={scip.projectInfo.latitude?.toString() || ''}
                onChange={(v) => updateField('projectInfo', 'latitude', parseFloat(v) || null)} />
              <FormField label="Longitude" type="number" value={scip.projectInfo.longitude?.toString() || ''}
                onChange={(v) => updateField('projectInfo', 'longitude', parseFloat(v) || null)} />
              <FormField label="Distance from Search Ring Center" value={scip.projectInfo.distanceFromCenter}
                onChange={(v) => updateField('projectInfo', 'distanceFromCenter', v)} />
            </div>
          </div>
        )

      case 'siteInfo':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-800 border-b pb-2">
              Site Information
              <span className="text-sm font-normal text-gray-500 ml-2">(from Property Appraiser's Office)</span>
            </h3>
            {parcel && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">
                <i className="fas fa-check-circle mr-2"></i>
                Auto-populated from selected parcel
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Parcel County" value={scip.siteInfo.parcelCounty}
                onChange={(v) => updateField('siteInfo', 'parcelCounty', v)} />
              <FormField label="Parcel ID Number" value={scip.siteInfo.parcelId}
                onChange={(v) => updateField('siteInfo', 'parcelId', v)} />
              <FormField label="Owner Name (on Deed)" value={scip.siteInfo.ownerName}
                onChange={(v) => updateField('siteInfo', 'ownerName', v)} />
              <FormField label="Parcel Street Address" value={scip.siteInfo.parcelStreetAddress}
                onChange={(v) => updateField('siteInfo', 'parcelStreetAddress', v)} />
              <FormField label="Parcel City" value={scip.siteInfo.parcelCity}
                onChange={(v) => updateField('siteInfo', 'parcelCity', v)} />
              <FormField label="Parcel State" value={scip.siteInfo.parcelState}
                onChange={(v) => updateField('siteInfo', 'parcelState', v)} />
              <FormField label="Parcel Zip" value={scip.siteInfo.parcelZip}
                onChange={(v) => updateField('siteInfo', 'parcelZip', v)} />
              <FormField label="Parcel Size (acres, MOL)" value={scip.siteInfo.parcelSize}
                onChange={(v) => updateField('siteInfo', 'parcelSize', v)} />
              <FormField label="Parcel Dimensions (feet)" value={scip.siteInfo.parcelDimensions}
                onChange={(v) => updateField('siteInfo', 'parcelDimensions', v)} />
              <FormSelect label="Conforming Size?" value={scip.siteInfo.conformingSize}
                onChange={(v) => updateField('siteInfo', 'conformingSize', v)} options={['Yes', 'No', 'TBD']} />
              <FormSelect label="Taxes Paid-to-Date?" value={scip.siteInfo.taxesPaid}
                onChange={(v) => updateField('siteInfo', 'taxesPaid', v)} options={['Yes', 'No', 'TBD']} />
            </div>
          </div>
        )

      case 'ownerInfo':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-800 border-b pb-2">Owner Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Name(s)" value={scip.ownerInfo.names}
                onChange={(v) => updateField('ownerInfo', 'names', v)} />
              <FormField label="Contact Person" value={scip.ownerInfo.contactPerson}
                onChange={(v) => updateField('ownerInfo', 'contactPerson', v)} />
              <FormField label="Mailing Address" value={scip.ownerInfo.mailingAddress}
                onChange={(v) => updateField('ownerInfo', 'mailingAddress', v)} className="md:col-span-2" />
              <FormField label="E-mail Address" type="email" value={scip.ownerInfo.emailAddress}
                onChange={(v) => updateField('ownerInfo', 'emailAddress', v)} />
              <FormField label="Phone Number" value={scip.ownerInfo.phoneNumber}
                onChange={(v) => updateField('ownerInfo', 'phoneNumber', v)} />
            </div>
          </div>
        )

      case 'leaseInfo':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-800 border-b pb-2">Lease Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Effective Date (signed or anticipated)" type="date" value={scip.leaseInfo.effectiveDate}
                onChange={(v) => updateField('leaseInfo', 'effectiveDate', v)} />
              <FormField label="Length of Initial Term" value={scip.leaseInfo.initialTerm}
                onChange={(v) => updateField('leaseInfo', 'initialTerm', v)} />
              <FormField label="Length & Number of Renewal Terms" value={scip.leaseInfo.renewalTerms}
                onChange={(v) => updateField('leaseInfo', 'renewalTerms', v)} />
              <FormField label="Option Period(s)" value={scip.leaseInfo.optionPeriods}
                onChange={(v) => updateField('leaseInfo', 'optionPeriods', v)} />
              <FormField label="Base Lease Fee" value={scip.leaseInfo.baseLeaseFee}
                onChange={(v) => updateField('leaseInfo', 'baseLeaseFee', v)} placeholder="e.g., $1,500/month" />
              <FormField label="Escalation Rate" value={scip.leaseInfo.escalationRate}
                onChange={(v) => updateField('leaseInfo', 'escalationRate', v)} />
              <FormField label="Collocation Revenue (if applicable)" value={scip.leaseInfo.collocationRevenue}
                onChange={(v) => updateField('leaseInfo', 'collocationRevenue', v)} />
              <FormField label="Capital Contribution (if applicable)" value={scip.leaseInfo.capitalContribution}
                onChange={(v) => updateField('leaseInfo', 'capitalContribution', v)} />
            </div>
            <FormTextarea label="Landowner Notes" value={scip.landownerNotes}
              onChange={(v) => setScip(prev => ({ ...prev, landownerNotes: v }))}
              placeholder="Please elaborate on any concerns with landowner or lease terms. Is property within HOA or CDD?" />
            <FormTextarea label="Directions to Site" value={scip.directions}
              onChange={(v) => setScip(prev => ({ ...prev, directions: v }))}
              placeholder="Please provide general directions to the site." />
          </div>
        )

      case 'existingConditions':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-800 border-b pb-2">Existing Conditions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Flood Zone(s)" value={scip.existingConditions.floodZones}
                onChange={(v) => updateField('existingConditions', 'floodZones', v)} placeholder="e.g., Zone X, Zone AE" />
              <FormSelect label="Wetland Concerns?" value={scip.existingConditions.wetlandConcerns}
                onChange={(v) => updateField('existingConditions', 'wetlandConcerns', v)} options={['None', 'Yes - Minor', 'Yes - Significant', 'TBD']} />
              <FormSelect label="Water Management District" value={scip.existingConditions.waterManagementDistrict}
                onChange={(v) => updateField('existingConditions', 'waterManagementDistrict', v)} options={FL_WATER_DISTRICTS} />
              <FormSelect label="Hazardous Waste Concerns?" value={scip.existingConditions.hazardousWaste}
                onChange={(v) => updateField('existingConditions', 'hazardousWaste', v)} options={['None', 'Yes - Phase I Required', 'Yes - Phase II Required', 'TBD']} />
              <FormField label="Access Notes (ROW, driveway, code)" value={scip.existingConditions.accessNotes}
                onChange={(v) => updateField('existingConditions', 'accessNotes', v)} className="md:col-span-2" />
              <FormField label="Power Provider (name & phone)" value={scip.existingConditions.powerProvider}
                onChange={(v) => updateField('existingConditions', 'powerProvider', v)} />
              <FormSelect label="Fiber Available?" value={scip.existingConditions.fiberAvailable}
                onChange={(v) => updateField('existingConditions', 'fiberAvailable', v)} options={['Yes', 'No', 'TBD']} />
              <FormField label="Telco Provider (name & phone)" value={scip.existingConditions.telcoProvider}
                onChange={(v) => updateField('existingConditions', 'telcoProvider', v)} />
              <FormField label="Nearest Airport (name & distance)" value={scip.existingConditions.nearestAirport}
                onChange={(v) => updateField('existingConditions', 'nearestAirport', v)} />
              <FormField label="Local Police (municipality & phone)" value={scip.existingConditions.localPolice}
                onChange={(v) => updateField('existingConditions', 'localPolice', v)} />
              <FormField label="Local Fire Dept (municipality & phone)" value={scip.existingConditions.localFireDept}
                onChange={(v) => updateField('existingConditions', 'localFireDept', v)} />
            </div>
            <FormTextarea label="Site Notes" value={scip.siteNotes}
              onChange={(v) => setScip(prev => ({ ...prev, siteNotes: v }))}
              placeholder="Please elaborate on any site development concerns (terrain, foliage, obstructions, generators or microwaves prohibited)" />
          </div>
        )

      case 'zoningOverview':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-800 border-b pb-2">Zoning Overview</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Zoning Jurisdiction" value={scip.zoningOverview.jurisdiction}
                onChange={(v) => updateField('zoningOverview', 'jurisdiction', v)} />
              <FormField label="Zoning Contact Information" value={scip.zoningOverview.contactInfo}
                onChange={(v) => updateField('zoningOverview', 'contactInfo', v)} />
              <FormSelect label="Zoning Process" value={scip.zoningOverview.process}
                onChange={(v) => updateField('zoningOverview', 'process', v)} options={ZONING_PROCESSES} />
              <FormField label="Zoning Fees" value={scip.zoningOverview.fees}
                onChange={(v) => updateField('zoningOverview', 'fees', v)} />
              <FormField label="Zoning Approval Timeframe" value={scip.zoningOverview.approvalTimeframe}
                onChange={(v) => updateField('zoningOverview', 'approvalTimeframe', v)} />
              <FormField label="Property Zoning District" value={scip.zoningOverview.zoningDistrict}
                onChange={(v) => updateField('zoningOverview', 'zoningDistrict', v)} />
              <FormField label="Property Future Land Use" value={scip.zoningOverview.futureLandUse}
                onChange={(v) => updateField('zoningOverview', 'futureLandUse', v)} />
              <FormField label="Property Current Usage" value={scip.zoningOverview.currentUsage}
                onChange={(v) => updateField('zoningOverview', 'currentUsage', v)} />
              <FormSelect label="Meets minimum lot requirements?" value={scip.zoningOverview.meetsLotRequirements}
                onChange={(v) => updateField('zoningOverview', 'meetsLotRequirements', v)} options={['Yes', 'No', 'TBD']} />
            </div>
          </div>
        )

      case 'towerSpecifics':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-800 border-b pb-2">Tower Specifics</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="LDC Section Reference(s)" value={scip.towerSpecifics.ldcReference}
                onChange={(v) => updateField('towerSpecifics', 'ldcReference', v)} />
              <FormField label="Maximum Tower Height" value={scip.towerSpecifics.maxTowerHeight}
                onChange={(v) => updateField('towerSpecifics', 'maxTowerHeight', v)} />
              <FormSelect label="Stealth Required?" value={scip.towerSpecifics.stealthRequired}
                onChange={(v) => updateField('towerSpecifics', 'stealthRequired', v)} options={['No', 'Yes', 'Preferred', 'TBD']} />
              <FormField label="Required Collocations (#)" value={scip.towerSpecifics.requiredCollocations}
                onChange={(v) => updateField('towerSpecifics', 'requiredCollocations', v)} />
              <FormField label="Residential Separation (ft or %)" value={scip.towerSpecifics.residentialSeparation}
                onChange={(v) => updateField('towerSpecifics', 'residentialSeparation', v)} />
              <FormField label="Tower Separation (ft or %)" value={scip.towerSpecifics.towerSeparation}
                onChange={(v) => updateField('towerSpecifics', 'towerSeparation', v)} />
              <FormSelect label="Measured from base or center" value={scip.towerSpecifics.measuredFrom}
                onChange={(v) => updateField('towerSpecifics', 'measuredFrom', v)} options={['Base of tower', 'Center of compound', 'Property line', 'TBD']} />
              <FormField label="Fall Zone Requirements" value={scip.towerSpecifics.fallZoneRequirements}
                onChange={(v) => updateField('towerSpecifics', 'fallZoneRequirements', v)} />
              <FormSelect label="Special Tower Landscaping?" value={scip.towerSpecifics.specialLandscaping}
                onChange={(v) => updateField('towerSpecifics', 'specialLandscaping', v)} options={['No', 'Yes', 'TBD']} />
            </div>
            <FormTextarea label="Zoning Notes" value={scip.zoningNotes}
              onChange={(v) => setScip(prev => ({ ...prev, zoningNotes: v }))}
              placeholder="Please elaborate on any zoning concerns, fees, etc." />
          </div>
        )

      case 'sitePlanOverview':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-800 border-b pb-2">Site Plan Overview</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Site Plan Jurisdiction" value={scip.sitePlanOverview.jurisdiction}
                onChange={(v) => updateField('sitePlanOverview', 'jurisdiction', v)} />
              <FormField label="Site Plan Contact Information" value={scip.sitePlanOverview.contactInfo}
                onChange={(v) => updateField('sitePlanOverview', 'contactInfo', v)} />
              <FormField label="Site Plan Fees" value={scip.sitePlanOverview.fees}
                onChange={(v) => updateField('sitePlanOverview', 'fees', v)} />
              <FormField label="Timeframe for approval" value={scip.sitePlanOverview.approvalTimeframe}
                onChange={(v) => updateField('sitePlanOverview', 'approvalTimeframe', v)} />
              <FormSelect label="Existing Site Plan to Amend?" value={scip.sitePlanOverview.existingSitePlan}
                onChange={(v) => updateField('sitePlanOverview', 'existingSitePlan', v)} options={['No', 'Yes', 'TBD']} />
              <FormSelect label="Concurrent to Zoning or BP?" value={scip.sitePlanOverview.concurrentToZoning}
                onChange={(v) => updateField('sitePlanOverview', 'concurrentToZoning', v)} options={['Yes', 'No', 'TBD']} />
              <FormField label="Submittal deadlines?" value={scip.sitePlanOverview.submittalDeadlines}
                onChange={(v) => updateField('sitePlanOverview', 'submittalDeadlines', v)} />
              <FormSelect label="Electronic, hard copy, or both?" value={scip.sitePlanOverview.submissionFormat}
                onChange={(v) => updateField('sitePlanOverview', 'submissionFormat', v)} options={['Electronic only', 'Hard copy only', 'Both', 'TBD']} />
            </div>
            <FormTextarea label="Site Plan Notes" value={scip.sitePlanNotes}
              onChange={(v) => setScip(prev => ({ ...prev, sitePlanNotes: v }))}
              placeholder="Please elaborate on any site plan concerns, fees, etc." />
          </div>
        )

      case 'buildingPermit':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-800 border-b pb-2">Building Permit Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Building Permit Jurisdiction" value={scip.buildingPermit.jurisdiction}
                onChange={(v) => updateField('buildingPermit', 'jurisdiction', v)} />
              <FormField label="Building Department Contact Info" value={scip.buildingPermit.contactInfo}
                onChange={(v) => updateField('buildingPermit', 'contactInfo', v)} />
              <FormSelect label="Does GC have to submit?" value={scip.buildingPermit.gcMustSubmit}
                onChange={(v) => updateField('buildingPermit', 'gcMustSubmit', v)} options={['Yes', 'No', 'TBD']} />
              <FormField label="Building Permit Fees" value={scip.buildingPermit.fees}
                onChange={(v) => updateField('buildingPermit', 'fees', v)} />
              <FormField label="Building Permit Timeframe" value={scip.buildingPermit.timeframe}
                onChange={(v) => updateField('buildingPermit', 'timeframe', v)} />
              <FormSelect label="Bond Required?" value={scip.buildingPermit.bondRequired}
                onChange={(v) => updateField('buildingPermit', 'bondRequired', v)} options={['No', 'Yes', 'TBD']} />
              <FormField label="E911 Address assigned?" value={scip.buildingPermit.e911Address}
                onChange={(v) => updateField('buildingPermit', 'e911Address', v)} />
            </div>
            <FormTextarea label="Building Permit Notes" value={scip.buildingPermitNotes}
              onChange={(v) => setScip(prev => ({ ...prev, buildingPermitNotes: v }))}
              placeholder="Please elaborate on any BP concerns, fees, etc." />
          </div>
        )

      case 'maps':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-800 border-b pb-2">Maps</h3>
            <p className="text-sm text-gray-600">
              Use the Map tab to view layers, then screenshot/export for each map type.
              Map images can be attached directly in the exported Excel file.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { key: 'aerial', label: 'Aerial Map' },
                { key: 'topography', label: 'Topography Map' },
                { key: 'floodplain', label: 'Floodplain Map' },
                { key: 'zoning', label: 'Zoning Map' },
                { key: 'flu', label: 'FLU Map (Future Land Use)' },
                { key: 'wetlands', label: 'Wetlands Map' },
                { key: 'parcel', label: 'Parcel Map' },
                { key: 'windSpeed', label: 'Wind Speed Map' },
                { key: 'airport', label: 'Airport Map' }
              ].map(map => (
                <div key={map.key} className="border rounded-lg p-4 text-center">
                  <i className="fas fa-map text-4xl text-gray-300 mb-2"></i>
                  <p className="font-medium text-sm">{map.label}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {scip.maps[map.key as keyof typeof scip.maps] ? 'Attached' : 'Not attached'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )

      case 'approvals':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-800 border-b pb-2">Approvals - Name and Date</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Project Manager" value={scip.approvals.projectManager}
                onChange={(v) => updateField('approvals', 'projectManager', v)} placeholder="Name - Date" />
              <FormField label="Program Manager" value={scip.approvals.programManager}
                onChange={(v) => updateField('approvals', 'programManager', v)} placeholder="Name - Date" />
              <FormField label="CEO" value={scip.approvals.ceo}
                onChange={(v) => updateField('approvals', 'ceo', v)} placeholder="Name - Date" />
              <FormField label="Carrier" value={scip.approvals.carrier}
                onChange={(v) => updateField('approvals', 'carrier', v)} placeholder="Name - Date" />
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <i className="fas fa-file-alt text-white text-2xl"></i>
          <div>
            <h2 className="text-xl font-bold text-white">SCIP Generator</h2>
            <p className="text-blue-100 text-sm">Site Candidate Information Package</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={exportToXLSX}
            disabled={isExporting}
            className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg flex items-center gap-2 disabled:opacity-50"
          >
            {isExporting ? (
              <i className="fas fa-spinner fa-spin"></i>
            ) : (
              <i className="fas fa-file-excel"></i>
            )}
            Export XLSX
          </button>
          {onClose && (
            <button onClick={onClose} className="text-white hover:text-gray-200">
              <i className="fas fa-times text-xl"></i>
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Navigation */}
        <div className="w-56 bg-gray-50 border-r overflow-y-auto">
          {sections.map(section => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`w-full px-4 py-3 text-left flex items-center gap-3 transition-all ${
                activeSection === section.id
                  ? 'bg-blue-100 text-blue-700 border-r-4 border-blue-600'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <i className={`fas ${section.icon} w-5`}></i>
              <span className="text-sm font-medium">{section.label}</span>
            </button>
          ))}
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {renderSection()}
        </div>
      </div>
    </div>
  )
}

// Helper Components
function FormField({
  label,
  value,
  onChange,
  type = 'text',
  placeholder = '',
  className = ''
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  placeholder?: string
  className?: string
}) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
      />
    </div>
  )
}

function FormSelect({
  label,
  value,
  onChange,
  options,
  className = ''
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: string[]
  className?: string
}) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
      >
        <option value="">Select...</option>
        {options.map(opt => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  )
}

function FormTextarea({
  label,
  value,
  onChange,
  placeholder = '',
  rows = 3
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  rows?: number
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
      />
    </div>
  )
}
