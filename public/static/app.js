// MapDog - Site Acquisition Parcel Search Frontend
let currentResults = []
let currentMode = 'county' // 'county' or 'bulk'

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  loadStats()
  
  // Allow Enter key to trigger search
  document.getElementById('countyInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchParcels()
  })
})

// Switch between search modes
function switchMode(mode) {
  currentMode = mode

  const countySection = document.getElementById('countyInput').parentElement.parentElement
  const coordinateSection = document.getElementById('coordinateSearchSection')
  const bulkSection = document.getElementById('bulkSearchSection')
  const scipSection = document.getElementById('scipSearchSection')
  const countyBtn = document.getElementById('countyModeBtn')
  const coordinateBtn = document.getElementById('coordinateModeBtn')
  const bulkBtn = document.getElementById('bulkModeBtn')
  const scipBtn = document.getElementById('scipModeBtn')

  // Hide all sections
  countySection.classList.add('hidden')
  coordinateSection.classList.add('hidden')
  bulkSection.classList.add('hidden')
  scipSection.classList.add('hidden')

  // Reset button styles
  countyBtn.className = 'px-4 py-2 bg-gray-200 text-gray-700 font-semibold rounded-lg transition-all'
  coordinateBtn.className = 'px-4 py-2 bg-gray-200 text-gray-700 font-semibold rounded-lg transition-all'
  bulkBtn.className = 'px-4 py-2 bg-gray-200 text-gray-700 font-semibold rounded-lg transition-all'
  scipBtn.className = 'px-4 py-2 bg-gray-200 text-gray-700 font-semibold rounded-lg transition-all'

  // Show selected section and highlight button
  if (mode === 'county') {
    countySection.classList.remove('hidden')
    countyBtn.className = 'px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg transition-all'
  } else if (mode === 'coordinate') {
    coordinateSection.classList.remove('hidden')
    coordinateBtn.className = 'px-4 py-2 bg-red-600 text-white font-semibold rounded-lg transition-all'
  } else if (mode === 'bulk') {
    bulkSection.classList.remove('hidden')
    bulkBtn.className = 'px-4 py-2 bg-purple-600 text-white font-semibold rounded-lg transition-all'
  } else if (mode === 'scip') {
    scipSection.classList.remove('hidden')
    scipBtn.className = 'px-4 py-2 bg-emerald-600 text-white font-semibold rounded-lg transition-all'
  }

  // Clear results when switching
  document.getElementById('results').innerHTML = ''
}

// Coordinate-based search for RF sites
async function coordinateSearch() {
  const lat = document.getElementById('coordLat').value.trim()
  const lon = document.getElementById('coordLon').value.trim()
  const radius = document.getElementById('coordRadius').value.trim()
  const unit = document.getElementById('coordUnit').value
  const county = document.getElementById('coordCounty').value.trim().toUpperCase()
  const siteName = document.getElementById('coordSiteName').value.trim()
  
  // Validate inputs
  if (!lat || !lon) {
    alert('⚠️ Please enter latitude and longitude\n\nGet these from your RF Engineer')
    return
  }
  
  if (!county) {
    alert('⚠️ Please enter a county name\n\nExample: ORANGE, ALACHUA')
    return
  }
  
  if (!radius || parseFloat(radius) <= 0) {
    alert('⚠️ Please enter a valid radius\n\nExample: 1 mile, 2 km')
    return
  }
  
  showLoading(true, `Searching ${radius} ${unit} radius around coordinates...`)
  
  try {
    const response = await fetch('/api/parcels/coordinate-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lat,
        lon,
        radius,
        unit,
        county,
        siteName
      })
    })
    
    const data = await response.json()
    
    if (data.error) {
      throw new Error(data.error + (data.hint ? '\n\n💡 ' + data.hint : ''))
    }
    
    currentResults = data.results || []
    displayCoordinateResults(data, county, siteName)
    loadStats()
    
  } catch (error) {
    showError(error.message)
  } finally {
    showLoading(false)
  }
}

// Display coordinate search results
function displayCoordinateResults(data, county, siteName) {
  const resultsDiv = document.getElementById('results')
  const meta = data.meta || {}
  const found = meta.total || 0
  
  if (found === 0) {
    resultsDiv.innerHTML = `
      <div class="text-center py-8 bg-yellow-50 border-2 border-yellow-300 rounded-lg">
        <i class="fas fa-crosshairs text-yellow-600 text-4xl mb-3"></i>
        <p class="text-lg font-semibold text-gray-800">No parcels found</p>
        <p class="text-sm text-gray-600 mt-2">County: ${county}</p>
        <p class="text-xs text-gray-500 mt-2">Try a different county or larger radius</p>
      </div>
    `
    return
  }
  
  resultsDiv.innerHTML = `
    <div class="mb-4 p-4 bg-red-50 border-2 border-red-300 rounded-lg">
      <div class="flex justify-between items-start">
        <div class="flex-1">
          <h3 class="text-xl font-bold text-gray-800">
            <i class="fas fa-crosshairs text-red-600 mr-2"></i>
            RF Search Ring Results
          </h3>
          ${siteName ? `<p class="text-sm font-semibold text-red-700 mt-1">${siteName}</p>` : ''}
          <div class="grid grid-cols-2 gap-3 mt-3 text-sm">
            <div><span class="font-semibold">Center:</span> ${meta.centerLat}, ${meta.centerLon}</div>
            <div><span class="font-semibold">Radius:</span> ${meta.radiusMiles} miles</div>
            <div><span class="font-semibold">County:</span> ${county}</div>
            <div><span class="font-semibold text-green-600">Parcels:</span> ${found}</div>
          </div>
          <p class="text-xs text-yellow-600 mt-2 bg-yellow-100 p-2 rounded">
            <i class="fas fa-info-circle mr-1"></i>
            ${meta.note || 'Showing parcels in county. Use address to verify distance.'}
          </p>
        </div>
        <button 
          onclick="saveAllCoordinateParcels('${county}', '${siteName}', ${meta.centerLat}, ${meta.centerLon}, ${meta.radiusMiles})"
          class="ml-4 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all"
          title="Save all to favorites"
        >
          <i class="fas fa-save mr-2"></i>Save All
        </button>
      </div>
    </div>
    <div class="space-y-3 max-h-96 overflow-y-auto">
      ${currentResults.map((parcel, index) => renderParcelCard(parcel, index, county)).join('')}
    </div>
  `
}

// Save all parcels from coordinate search
async function saveAllCoordinateParcels(county, siteName, lat, lon, radius) {
  if (!currentResults || currentResults.length === 0) {
    alert('No parcels to save')
    return
  }
  
  const notes = siteName 
    ? `RF Site: ${siteName} (${lat}, ${lon}, ${radius}mi radius)` 
    : `Coordinate search: ${lat}, ${lon}, ${radius}mi`
  
  let saved = 0
  let errors = 0
  
  showLoading(true, `Saving ${currentResults.length} parcels...`)
  
  for (const parcel of currentResults) {
    const pin = parcel.identifiers?.pin || 'unknown'
    try {
      const response = await fetch('/api/parcels/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parcelId: pin,
          county,
          parcelData: parcel,
          notes
        })
      })
      if (response.ok) saved++
      else errors++
    } catch (error) {
      errors++
    }
  }
  
  showLoading(false)
  alert(`✅ Saved ${saved} parcels${errors > 0 ? `\n⚠️ ${errors} failed to save` : ''}`)
  loadStats()
}

// Clear coordinate search form
function clearCoordinateSearch() {
  document.getElementById('coordLat').value = ''
  document.getElementById('coordLon').value = ''
  document.getElementById('coordRadius').value = '1'
  document.getElementById('coordUnit').value = 'miles'
  document.getElementById('coordCounty').value = ''
  document.getElementById('coordSiteName').value = ''
  document.getElementById('results').innerHTML = ''
  currentResults = []
}

// Bulk search parcels by PIN list
async function bulkSearchParcels() {
  const pinListText = document.getElementById('pinListInput').value.trim()
  const county = document.getElementById('bulkCounty').value.trim().toUpperCase()
  const searchRingName = document.getElementById('searchRingName').value.trim()
  
  if (!pinListText) {
    alert('⚠️ Please paste a PIN list\n\nOne PIN per line from your search ring tool')
    return
  }
  
  if (!county) {
    alert('⚠️ Please enter a county name\n\nExample: ORANGE, ALACHUA')
    return
  }
  
  // Parse PIN list (split by newlines, remove empty lines)
  const pins = pinListText.split('\n')
    .map(pin => pin.trim())
    .filter(pin => pin.length > 0)
  
  if (pins.length === 0) {
    alert('⚠️ No valid PINs found\n\nMake sure each PIN is on a new line')
    return
  }
  
  if (pins.length > 50) {
    if (!confirm(`You have ${pins.length} PINs. Only the first 50 will be searched. Continue?`)) {
      return
    }
  }
  
  showLoading(true, `Fetching ${Math.min(pins.length, 50)} parcels...`)
  
  try {
    const response = await fetch('/api/parcels/bulk-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pins: pins.slice(0, 50),
        county,
        searchRingName: searchRingName || null
      })
    })
    
    const data = await response.json()
    
    if (data.error) {
      throw new Error(data.error + (data.hint ? '\n\n💡 ' + data.hint : ''))
    }
    
    currentResults = data.results || []
    displayBulkResults(data, county, searchRingName)
    loadStats()
    
  } catch (error) {
    showError(error.message)
  } finally {
    showLoading(false)
  }
}

// Display bulk search results
function displayBulkResults(data, county, searchRingName) {
  const resultsDiv = document.getElementById('results')
  const requested = data.meta?.requested || 0
  const found = data.meta?.found || 0
  const errors = data.meta?.errors || 0
  
  if (found === 0) {
    resultsDiv.innerHTML = `
      <div class="text-center py-8 bg-yellow-50 border-2 border-yellow-300 rounded-lg">
        <i class="fas fa-exclamation-triangle text-yellow-600 text-4xl mb-3"></i>
        <p class="text-lg font-semibold text-gray-800">No parcels found</p>
        <p class="text-sm text-gray-600 mt-2">Requested: ${requested} PINs • Found: 0</p>
        <p class="text-xs text-gray-500 mt-2">Check that PINs are correct for ${county} county</p>
      </div>
    `
    return
  }
  
  resultsDiv.innerHTML = `
    <div class="mb-4 p-4 bg-purple-50 border-2 border-purple-300 rounded-lg">
      <div class="flex justify-between items-start">
        <div>
          <h3 class="text-xl font-bold text-gray-800">
            <i class="fas fa-layer-group text-purple-600 mr-2"></i>
            Search Ring Results
          </h3>
          ${searchRingName ? `<p class="text-sm font-semibold text-purple-700 mt-1">${searchRingName}</p>` : ''}
          <p class="text-sm text-gray-600 mt-2">
            <span class="font-semibold">County:</span> ${county} • 
            <span class="font-semibold">Requested:</span> ${requested} PINs • 
            <span class="font-semibold text-green-600">Found:</span> ${found} parcels
            ${errors > 0 ? ` • <span class="font-semibold text-red-600">Errors:</span> ${errors}` : ''}
          </p>
        </div>
        <button 
          onclick="saveAllBulkParcels('${county}', '${searchRingName}')"
          class="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all"
          title="Save all to favorites"
        >
          <i class="fas fa-save mr-2"></i>Save All
        </button>
      </div>
    </div>
    <div class="space-y-3 max-h-96 overflow-y-auto">
      ${currentResults.map((parcel, index) => renderParcelCard(parcel, index, county)).join('')}
    </div>
  `
}

// Save all parcels from bulk search
async function saveAllBulkParcels(county, searchRingName) {
  if (!currentResults || currentResults.length === 0) {
    alert('No parcels to save')
    return
  }
  
  const notes = searchRingName ? `Search Ring: ${searchRingName}` : 'Bulk search import'
  let saved = 0
  let errors = 0
  
  showLoading(true, `Saving ${currentResults.length} parcels...`)
  
  for (const parcel of currentResults) {
    const pin = parcel.identifiers?.pin || 'unknown'
    try {
      const response = await fetch('/api/parcels/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parcelId: pin,
          county,
          parcelData: parcel,
          notes
        })
      })
      if (response.ok) saved++
      else errors++
    } catch (error) {
      errors++
    }
  }
  
  showLoading(false)
  alert(`✅ Saved ${saved} parcels${errors > 0 ? `\n⚠️ ${errors} failed to save` : ''}`)
  loadStats()
}

// Clear bulk search form
function clearBulkSearch() {
  document.getElementById('pinListInput').value = ''
  document.getElementById('bulkCounty').value = ''
  document.getElementById('searchRingName').value = ''
  document.getElementById('results').innerHTML = ''
  currentResults = []
}

// SCIP - Search Coordinate In Property (ATTOM Data API)
// Searches 3 concentric rings: 0.25mi, 0.50mi, 1.0mi
async function scipSearch() {
  const lat = document.getElementById('scipLat').value.trim()
  const lon = document.getElementById('scipLon').value.trim()
  const siteName = document.getElementById('scipSiteName').value.trim()

  // Validate inputs
  if (!lat || !lon) {
    alert('⚠️ Please enter latitude and longitude\n\nGet these from your search ring center coordinates')
    return
  }

  const latitude = parseFloat(lat)
  const longitude = parseFloat(lon)

  if (isNaN(latitude) || isNaN(longitude)) {
    alert('⚠️ Invalid coordinates\n\nCoordinates must be valid numbers')
    return
  }

  if (latitude < -90 || latitude > 90) {
    alert('⚠️ Invalid latitude\n\nLatitude must be between -90 and 90')
    return
  }

  if (longitude < -180 || longitude > 180) {
    alert('⚠️ Invalid longitude\n\nLongitude must be between -180 and 180')
    return
  }

  showLoading(true, 'Searching 3 rings (0.25mi, 0.50mi, 1.0mi) for tower site candidates...')

  try {
    const response = await fetch('/api/parcels/scip-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lat, lon, siteName })
    })

    const data = await response.json()

    if (data.error) {
      throw new Error(data.error + (data.hint ? '\n\n💡 ' + data.hint : ''))
    }

    currentResults = data.candidates || []
    displayScipResults(data, siteName)
    loadStats()

  } catch (error) {
    showError(error.message)
  } finally {
    showLoading(false)
  }
}

// Display SCIP search results with map and candidate cards
function displayScipResults(data, siteName) {
  const resultsDiv = document.getElementById('results')
  const meta = data.meta || {}
  const candidates = data.candidates || []
  const rings = data.rings || {}

  if (candidates.length === 0) {
    resultsDiv.innerHTML = `
      <div class="text-center py-8 bg-yellow-50 border-2 border-yellow-300 rounded-lg">
        <i class="fas fa-bullseye text-yellow-600 text-4xl mb-3"></i>
        <p class="text-lg font-semibold text-gray-800">No tower site candidates found</p>
        <p class="text-sm text-gray-600 mt-2">Center: ${meta.centerLat}, ${meta.centerLon}</p>
        <p class="text-xs text-gray-500 mt-2">Try different coordinates in a more developed area</p>
      </div>
    `
    return
  }

  // Build ring summary
  const ringSummary = `
    <div class="grid grid-cols-3 gap-2 mt-3">
      <div class="text-center p-2 bg-red-100 rounded">
        <span class="font-bold text-red-700">${rings.ring025?.count || 0}</span>
        <p class="text-xs text-red-600">0.25 mi</p>
      </div>
      <div class="text-center p-2 bg-yellow-100 rounded">
        <span class="font-bold text-yellow-700">${rings.ring050?.count || 0}</span>
        <p class="text-xs text-yellow-600">0.50 mi</p>
      </div>
      <div class="text-center p-2 bg-green-100 rounded">
        <span class="font-bold text-green-700">${rings.ring100?.count || 0}</span>
        <p class="text-xs text-green-600">1.0 mi</p>
      </div>
    </div>
  `

  resultsDiv.innerHTML = `
    <div class="mb-4 p-4 bg-emerald-50 border-2 border-emerald-300 rounded-lg">
      <div class="flex justify-between items-start">
        <div class="flex-1">
          <h3 class="text-xl font-bold text-gray-800">
            <i class="fas fa-bullseye text-emerald-600 mr-2"></i>
            SCIP Tower Site Candidates
          </h3>
          ${siteName ? `<p class="text-sm font-semibold text-emerald-700 mt-1">${siteName}</p>` : ''}
          <div class="grid grid-cols-2 gap-3 mt-3 text-sm">
            <div><span class="font-semibold">Center:</span> ${meta.centerLat?.toFixed(6) || 'N/A'}, ${meta.centerLon?.toFixed(6) || 'N/A'}</div>
            <div><span class="font-semibold">Total Found:</span> ${meta.totalProperties || 0}</div>
          </div>
          ${ringSummary}
        </div>
        <button
          onclick="exportScipCandidates()"
          class="ml-4 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-all"
          title="Export candidates"
        >
          <i class="fas fa-download mr-2"></i>Export
        </button>
      </div>
    </div>

    <!-- Map Container -->
    <div id="scipMap" class="w-full h-64 rounded-lg border-2 border-gray-300 mb-4" style="background: #e5e7eb;">
      <div class="flex items-center justify-center h-full text-gray-500">
        <i class="fas fa-map mr-2"></i>
        <span>Map: Center (${meta.centerLat?.toFixed(4) || 'N/A'}, ${meta.centerLon?.toFixed(4) || 'N/A'}) with 3 search rings</span>
      </div>
    </div>

    <!-- Top Candidates -->
    <h4 class="text-lg font-bold text-gray-800 mb-3">
      <i class="fas fa-trophy text-yellow-500 mr-2"></i>
      Top ${candidates.length} Candidates (Ranked by Size & Zoning)
    </h4>
    <div class="space-y-4">
      ${candidates.map((candidate, index) => renderScipCandidateCard(candidate, index)).join('')}
    </div>
  `

  // Initialize map if Leaflet is available
  initScipMap(meta.centerLat, meta.centerLon, candidates)
}

// Render SCIP candidate card in the exact format specified
function renderScipCandidateCard(candidate, index) {
  const ringColor = candidate.distance <= 0.25 ? 'red' : candidate.distance <= 0.50 ? 'yellow' : 'green'
  const ringLabel = candidate.distance <= 0.25 ? '0.25 mi ring' : candidate.distance <= 0.50 ? '0.50 mi ring' : '1.0 mi ring'

  return `
    <div class="bg-white border-2 border-gray-300 rounded-lg p-5 shadow-md hover:shadow-lg transition-all">
      <div class="flex justify-between items-start mb-4">
        <div>
          <span class="inline-block px-2 py-1 text-xs font-bold rounded bg-${ringColor}-100 text-${ringColor}-700 mb-2">
            #${index + 1} - ${ringLabel}
          </span>
          <h4 class="text-lg font-bold text-gray-800">Candidate ${index + 1}</h4>
        </div>
        <button
          onclick="saveScipCandidate(${index})"
          class="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all"
          title="Save candidate"
        >
          <i class="fas fa-star"></i>
        </button>
      </div>

      <div class="space-y-2 text-sm">
        <div class="grid grid-cols-1 gap-1">
          <p><span class="font-semibold text-gray-700">Owner's Name:</span></p>
          <p class="text-gray-900 pl-2">${candidate.ownerName || 'N/A'}</p>
        </div>

        <div class="grid grid-cols-1 gap-1">
          <p><span class="font-semibold text-gray-700">Parcel Address:</span></p>
          <p class="text-gray-900 pl-2">${candidate.parcelAddress || 'N/A'}</p>
        </div>

        <div class="grid grid-cols-1 gap-1">
          <p><span class="font-semibold text-gray-700">Parcel ID:</span></p>
          <p class="text-gray-900 pl-2">${candidate.parcelId || 'N/A'}</p>
        </div>

        <div class="grid grid-cols-1 gap-1">
          <p><span class="font-semibold text-gray-700">Parcel Size (acres):</span></p>
          <p class="text-gray-900 pl-2">${candidate.parcelSizeAcres || 'N/A'}</p>
        </div>

        <div class="grid grid-cols-1 gap-1">
          <p><span class="font-semibold text-gray-700">Zoning Classification:</span></p>
          <p class="text-gray-900 pl-2">${candidate.zoningClassification || 'N/A'}${candidate.zoningCode ? ` (Zoning Code: ${candidate.zoningCode})` : ''}</p>
        </div>

        <div class="grid grid-cols-1 gap-1">
          <p><span class="font-semibold text-gray-700">Owner's Mailing Address:</span></p>
          <p class="text-gray-900 pl-2">${candidate.ownerMailingAddress || 'N/A'}</p>
        </div>

        <div class="grid grid-cols-1 gap-1">
          <p><span class="font-semibold text-gray-700">Coordinates:</span></p>
          <p class="text-gray-900 pl-2">Latitude: ${candidate.coordinates?.latitude || 'N/A'}</p>
          <p class="text-gray-900 pl-2">Longitude: ${candidate.coordinates?.longitude || 'N/A'}</p>
        </div>

        <div class="grid grid-cols-1 gap-1">
          <p><span class="font-semibold text-gray-700">FEMA Risk Factor Letter:</span></p>
          <p class="text-gray-900 pl-2">${candidate.femaRiskFactor || 'Check FEMA flood maps'}</p>
        </div>

        <div class="grid grid-cols-1 gap-1">
          <p><span class="font-semibold text-gray-700">Phone Number:</span></p>
          <p class="text-gray-900 pl-2">${candidate.phoneNumber || 'Not provided in source data'}</p>
        </div>

        <div class="grid grid-cols-1 gap-1">
          <p><span class="font-semibold text-gray-700">Email Address:</span></p>
          <p class="text-gray-900 pl-2">${candidate.emailAddress || 'Not provided in source data'}</p>
        </div>

        <div class="mt-3 pt-3 border-t border-gray-200">
          <p class="text-xs text-gray-500">
            <i class="fas fa-ruler mr-1"></i>Distance from center: ${candidate.distance?.toFixed(3) || 'N/A'} miles
            ${candidate.landUse ? ` | Land Use: ${candidate.landUse}` : ''}
          </p>
        </div>
      </div>
    </div>
  `
}

// Initialize SCIP map with Leaflet
function initScipMap(centerLat, centerLon, candidates) {
  // Check if Leaflet is loaded
  if (typeof L === 'undefined') {
    // Load Leaflet dynamically
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
    document.head.appendChild(link)

    const script = document.createElement('script')
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
    script.onload = () => createScipMap(centerLat, centerLon, candidates)
    document.head.appendChild(script)
  } else {
    createScipMap(centerLat, centerLon, candidates)
  }
}

// Create the actual map with circles
function createScipMap(centerLat, centerLon, candidates) {
  const mapContainer = document.getElementById('scipMap')
  if (!mapContainer || !centerLat || !centerLon) return

  mapContainer.innerHTML = '' // Clear placeholder

  const map = L.map('scipMap').setView([centerLat, centerLon], 13)

  // Add tile layer
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map)

  // Add center marker
  L.marker([centerLat, centerLon])
    .addTo(map)
    .bindPopup('<b>Search Ring Center</b>')

  // Draw concentric circles (miles to meters: 1 mile = 1609.34 meters)
  L.circle([centerLat, centerLon], {
    radius: 0.25 * 1609.34,
    color: '#ef4444',
    fillColor: '#fca5a5',
    fillOpacity: 0.2,
    weight: 2
  }).addTo(map).bindPopup('0.25 mile radius')

  L.circle([centerLat, centerLon], {
    radius: 0.50 * 1609.34,
    color: '#eab308',
    fillColor: '#fde047',
    fillOpacity: 0.15,
    weight: 2
  }).addTo(map).bindPopup('0.50 mile radius')

  L.circle([centerLat, centerLon], {
    radius: 1.0 * 1609.34,
    color: '#22c55e',
    fillColor: '#86efac',
    fillOpacity: 0.1,
    weight: 2
  }).addTo(map).bindPopup('1.0 mile radius')

  // Add candidate markers
  candidates.forEach((c, i) => {
    if (c.coordinates?.latitude && c.coordinates?.longitude) {
      const markerColor = c.distance <= 0.25 ? 'red' : c.distance <= 0.50 ? 'orange' : 'green'
      L.circleMarker([c.coordinates.latitude, c.coordinates.longitude], {
        radius: 8,
        fillColor: markerColor,
        color: '#000',
        weight: 1,
        fillOpacity: 0.8
      }).addTo(map)
        .bindPopup(`<b>Candidate ${i + 1}</b><br>${c.parcelAddress}<br>${c.parcelSizeAcres} acres`)
    }
  })

  // Fit bounds to show all circles
  map.fitBounds([[centerLat - 0.02, centerLon - 0.02], [centerLat + 0.02, centerLon + 0.02]])
}

// Save single SCIP candidate
async function saveScipCandidate(index) {
  const candidate = currentResults[index]
  if (!candidate) return

  const notes = prompt('Add notes for this candidate (optional):')

  try {
    const response = await fetch('/api/parcels/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        parcelId: candidate.parcelId,
        county: candidate.county || 'UNKNOWN',
        parcelData: candidate,
        notes: notes || `SCIP Candidate #${index + 1}`
      })
    })

    const data = await response.json()
    if (data.success) {
      alert('✅ Candidate saved to favorites!')
      loadStats()
    } else {
      throw new Error('Failed to save')
    }
  } catch (error) {
    alert(`❌ Failed to save candidate: ${error.message}`)
  }
}

// Export SCIP candidates to text format
function exportScipCandidates() {
  if (!currentResults || currentResults.length === 0) {
    alert('No candidates to export')
    return
  }

  let exportText = 'SCIP TOWER SITE CANDIDATES\n'
  exportText += '=' .repeat(50) + '\n\n'

  currentResults.forEach((c, i) => {
    exportText += `CANDIDATE ${i + 1}\n`
    exportText += '-'.repeat(30) + '\n'
    exportText += `Owner's Name:\n${c.ownerName || 'N/A'}\n\n`
    exportText += `Parcel Address:\n${c.parcelAddress || 'N/A'}\n\n`
    exportText += `Parcel ID:\n${c.parcelId || 'N/A'}\n\n`
    exportText += `Parcel Size (acres):\n${c.parcelSizeAcres || 'N/A'}\n\n`
    exportText += `Zoning Classification:\n${c.zoningClassification || 'N/A'}${c.zoningCode ? ` (Zoning Code: ${c.zoningCode})` : ''}\n\n`
    exportText += `Owner's Mailing Address:\n${c.ownerMailingAddress || 'N/A'}\n\n`
    exportText += `Coordinates:\nLatitude: ${c.coordinates?.latitude || 'N/A'}\nLongitude: ${c.coordinates?.longitude || 'N/A'}\n\n`
    exportText += `FEMA Risk Factor Letter:\n${c.femaRiskFactor || 'Check FEMA flood maps'}\n\n`
    exportText += `Phone Number:\n${c.phoneNumber || 'Not provided in source data'}\n\n`
    exportText += `Email Address:\n${c.emailAddress || 'Not provided in source data'}\n\n`
    exportText += '\n'
  })

  // Download as text file
  const blob = new Blob([exportText], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `scip-candidates-${Date.now()}.txt`
  a.click()
  URL.revokeObjectURL(url)

  alert(`✅ Exported ${currentResults.length} candidates`)
}

// Legacy render function (keep for compatibility)
function renderScipParcelCard(parcel, index) {
  const apn = parcel.identifiers?.apn || `ATTOM-${parcel.identifiers?.attom_id || index}`
  const owner = parcel.owner?.primary_name || 'N/A'
  const address = parcel.location?.address || parcel.location?.street || 'No address'
  const city = parcel.location?.city || 'N/A'
  const state = parcel.location?.state || ''
  const zipcode = parcel.location?.zipcode || ''
  const county = parcel.location?.county || 'N/A'
  const acres = parcel.land?.acres || 'N/A'
  const zoning = parcel.land?.zoning || 'N/A'
  const landUse = parcel.land?.land_use || 'N/A'
  const marketValue = parcel.valuation?.market_total || 0
  const distance = parcel.location?.distance
  const yearBuilt = parcel.building?.year_built
  const sqft = parcel.building?.sqft

  return `
    <div class="bg-emerald-50 border-2 border-emerald-200 rounded-lg p-4 hover:border-emerald-400 transition-all">
      <div class="flex justify-between items-start">
        <div class="flex-1">
          <h4 class="font-bold text-lg text-gray-800 mb-2">
            <i class="fas fa-map-pin text-emerald-600 mr-2"></i>
            APN: ${apn}
            ${distance ? `<span class="text-sm font-normal text-emerald-600 ml-2">(${distance.toFixed(2)} mi away)</span>` : ''}
          </h4>
          <div class="grid grid-cols-2 gap-2 text-sm mb-2">
            <div class="text-gray-600">
              <span class="font-semibold">Owner:</span> ${owner}
            </div>
            <div class="text-gray-600">
              <span class="font-semibold">County:</span> ${county}
            </div>
            <div class="text-gray-600 col-span-2">
              <span class="font-semibold">Address:</span> ${address}${city !== 'N/A' ? `, ${city}` : ''}${state ? `, ${state}` : ''} ${zipcode}
            </div>
            <div class="text-gray-600">
              <span class="font-semibold">Acres:</span> ${acres}
            </div>
            <div class="text-gray-600">
              <span class="font-semibold">Zoning:</span> ${zoning}
            </div>
            <div class="text-gray-600">
              <span class="font-semibold">Land Use:</span> ${landUse}
            </div>
            <div class="text-gray-600">
              <span class="font-semibold">Market Value:</span> $${marketValue.toLocaleString()}
            </div>
            ${yearBuilt ? `<div class="text-gray-600"><span class="font-semibold">Year Built:</span> ${yearBuilt}</div>` : ''}
            ${sqft ? `<div class="text-gray-600"><span class="font-semibold">Sq Ft:</span> ${sqft.toLocaleString()}</div>` : ''}
          </div>
          ${parcel.location?.latitude && parcel.location?.longitude ? `
            <p class="text-xs text-emerald-600 mt-1">
              <i class="fas fa-map-marker-alt mr-1"></i>
              ${parcel.location.latitude.toFixed(6)}, ${parcel.location.longitude.toFixed(6)}
            </p>
          ` : ''}
        </div>
        <button
          onclick="saveScipParcel('${apn.replace(/'/g, "\\'")}', ${index})"
          class="ml-4 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all transform hover:scale-105"
          title="Save to favorites"
        >
          <i class="fas fa-star"></i>
        </button>
      </div>
    </div>
  `
}

// Save single SCIP parcel
async function saveScipParcel(parcelId, index) {
  const parcel = currentResults[index]
  const county = parcel.location?.county || 'UNKNOWN'
  const notes = prompt('Add notes for this property (optional):')

  try {
    const response = await fetch('/api/parcels/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        parcelId,
        county,
        parcelData: parcel,
        notes
      })
    })

    const data = await response.json()

    if (data.success) {
      alert('✅ Property saved to favorites!')
      loadStats()
    } else {
      throw new Error('Failed to save')
    }
  } catch (error) {
    alert(`❌ Failed to save property: ${error.message}`)
  }
}

// Save all SCIP parcels
async function saveAllScipParcels(siteName, lat, lon, radius) {
  if (!currentResults || currentResults.length === 0) {
    alert('No properties to save')
    return
  }

  const notes = siteName
    ? `SCIP Site: ${siteName} (${lat}, ${lon}, ${radius}mi radius)`
    : `SCIP search: ${lat}, ${lon}, ${radius}mi`

  let saved = 0
  let errors = 0

  showLoading(true, `Saving ${currentResults.length} properties...`)

  for (const parcel of currentResults) {
    const apn = parcel.identifiers?.apn || `ATTOM-${parcel.identifiers?.attom_id}`
    const county = parcel.location?.county || 'UNKNOWN'
    try {
      const response = await fetch('/api/parcels/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parcelId: apn,
          county,
          parcelData: parcel,
          notes
        })
      })
      if (response.ok) saved++
      else errors++
    } catch (error) {
      errors++
    }
  }

  showLoading(false)
  alert(`✅ Saved ${saved} properties${errors > 0 ? `\n⚠️ ${errors} failed to save` : ''}`)
  loadStats()
}

// Clear SCIP search form
function clearScipSearch() {
  document.getElementById('scipLat').value = ''
  document.getElementById('scipLon').value = ''
  document.getElementById('scipSiteName').value = ''
  document.getElementById('results').innerHTML = ''
  currentResults = []
}

// Search parcels from MapWise API
async function searchParcels() {
  const county = document.getElementById('countyInput').value.trim().toUpperCase()
  const limit = document.getElementById('limitInput').value || 10
  
  // Client-side validation
  if (!county) {
    alert('⚠️ Please enter a county name\n\nExample: ALACHUA, ORANGE, MIAMI-DADE')
    return
  }
  
  // Validate county format
  if (!/^[A-Z\s\-]+$/.test(county)) {
    alert('⚠️ Invalid county name\n\nCounty name should contain only letters, spaces, and hyphens.\n\nExample: MIAMI-DADE, ST JOHNS')
    return
  }
  
  // Validate limit
  const limitNum = parseInt(limit, 10)
  if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
    alert('⚠️ Invalid limit\n\nLimit must be between 1 and 100')
    return
  }
  
  showLoading(true)
  
  try {
    const response = await fetch(`/api/parcels/search?county=${encodeURIComponent(county)}&limit=${limit}`)
    const data = await response.json()
    
    // Handle API errors with helpful messages
    if (data.error) {
      let errorMsg = data.error
      
      // Add hints if available
      if (data.hint) {
        errorMsg += '\n\n💡 ' + data.hint
      }
      
      // Special handling for rate limiting
      if (data.statusCode === 429) {
        errorMsg += '\n\n⏱️ Please wait 30 seconds before searching again.'
      }
      
      // Special handling for no API key
      if (data.statusCode === 401) {
        errorMsg += '\n\n🔑 The MapWise API key needs to be configured.'
      }
      
      throw new Error(errorMsg)
    }
    
    // Check if we got results (even if meta.record_count is 0)
    const recordCount = data.meta?.record_count || 0
    currentResults = data.data || []
    
    if (recordCount === 0) {
      const resultsDiv = document.getElementById('results')
      resultsDiv.innerHTML = `
        <div class="text-center py-8 bg-yellow-50 border-2 border-yellow-300 rounded-lg">
          <i class="fas fa-search text-yellow-600 text-4xl mb-3"></i>
          <p class="text-lg font-semibold text-gray-800">No parcels found for ${county}</p>
          <p class="text-sm text-gray-600 mt-2">${data.meta?.message || 'Try a different county or adjust your search.'}</p>
          ${data.meta?.total_count > 0 ? `
            <p class="text-xs text-gray-500 mt-2">
              Total parcels in ${county}: ${data.meta.total_count.toLocaleString()}
            </p>
          ` : ''}
        </div>
      `
      loadStats()
      return
    }
    
    displayResults(currentResults, county, data.meta)
    loadStats()
    
  } catch (error) {
    showError(error.message)
  } finally {
    showLoading(false)
  }
}

// Display search results
function displayResults(parcels, county, meta) {
  const resultsDiv = document.getElementById('results')
  
  if (!parcels || parcels.length === 0) {
    resultsDiv.innerHTML = `
      <div class="text-center py-8 text-gray-500">
        <i class="fas fa-search text-4xl mb-3"></i>
        <p class="text-lg">No parcels found for ${county}</p>
      </div>
    `
    return
  }
  
  const totalCount = meta?.total_count ? ` (${meta.total_count.toLocaleString()} total available)` : ''
  
  resultsDiv.innerHTML = `
    <div class="mb-4 flex justify-between items-center">
      <h3 class="text-xl font-bold text-gray-800">
        <i class="fas fa-map-marked-alt text-blue-600 mr-2"></i>
        Found ${parcels.length} parcels in ${county}${totalCount}
      </h3>
    </div>
    <div class="space-y-3 max-h-96 overflow-y-auto">
      ${parcels.map((parcel, index) => renderParcelCard(parcel, index, county)).join('')}
    </div>
  `
}

// Render individual parcel card
function renderParcelCard(parcel, index, county) {
  const pin = parcel.identifiers?.pin || `${county}-${index}`
  const owner = parcel.owner?.primary_name || 'N/A'
  const address = parcel.site?.address || 'No address'
  const acres = parcel.land?.acres_gis || parcel.land?.acres_deed || 'N/A'
  const zoning = parcel.land?.zoning || 'N/A'
  const landUse = parcel.land?.land_use?.luse_desc || 'N/A'
  const marketValue = parcel.valuation?.market?.total || 0
  const city = parcel.site?.city || parcel.owner?.city || 'N/A'
  
  return `
    <div class="bg-gray-50 border-2 border-gray-200 rounded-lg p-4 hover:border-blue-400 transition-all">
      <div class="flex justify-between items-start">
        <div class="flex-1">
          <h4 class="font-bold text-lg text-gray-800 mb-2">
            <i class="fas fa-map-pin text-red-500 mr-2"></i>
            PIN: ${pin}
          </h4>
          <div class="grid grid-cols-2 gap-2 text-sm mb-2">
            <div class="text-gray-600">
              <span class="font-semibold">Owner:</span> ${owner}
            </div>
            <div class="text-gray-600">
              <span class="font-semibold">City:</span> ${city}
            </div>
            <div class="text-gray-600">
              <span class="font-semibold">Address:</span> ${address}
            </div>
            <div class="text-gray-600">
              <span class="font-semibold">Acres:</span> ${typeof acres === 'string' ? parseFloat(acres).toFixed(2) : acres}
            </div>
            <div class="text-gray-600">
              <span class="font-semibold">Zoning:</span> ${zoning}
            </div>
            <div class="text-gray-600">
              <span class="font-semibold">Land Use:</span> ${landUse}
            </div>
            <div class="text-gray-600">
              <span class="font-semibold">Market Value:</span> $${marketValue.toLocaleString()}
            </div>
            <div class="text-gray-600">
              <span class="font-semibold">County:</span> ${county}
            </div>
          </div>
          ${parcel.meta?.pa_pin_link ? `
            <a href="${parcel.meta.pa_pin_link}" target="_blank" class="text-blue-600 hover:text-blue-800 text-xs">
              <i class="fas fa-external-link-alt mr-1"></i>View Property Details
            </a>
          ` : ''}
        </div>
        <button 
          onclick="saveParcel('${pin.replace(/'/g, "\\'")}', '${county}', ${index})"
          class="ml-4 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all transform hover:scale-105"
          title="Save to favorites"
        >
          <i class="fas fa-star"></i>
        </button>
      </div>
    </div>
  `
}

// Save parcel to favorites
async function saveParcel(parcelId, county, index) {
  const parcel = currentResults[index]
  const notes = prompt('Add notes for this parcel (optional):')
  
  try {
    const response = await fetch('/api/parcels/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        parcelId,
        county,
        parcelData: parcel,
        notes
      })
    })
    
    const data = await response.json()
    
    if (data.success) {
      alert('✅ Parcel saved to favorites!')
      loadStats()
    } else {
      throw new Error('Failed to save')
    }
  } catch (error) {
    alert(`❌ Failed to save parcel: ${error.message}`)
  }
}

// View saved parcels
async function viewSavedParcels() {
  showLoading(true)
  
  try {
    const response = await fetch('/api/parcels/saved')
    const parcels = await response.json()
    
    const resultsDiv = document.getElementById('results')
    
    if (!parcels || parcels.length === 0) {
      resultsDiv.innerHTML = `
        <div class="text-center py-8 text-gray-500">
          <i class="fas fa-star text-4xl mb-3"></i>
          <p class="text-lg">No saved parcels yet</p>
        </div>
      `
      return
    }
    
    resultsDiv.innerHTML = `
      <div class="mb-4">
        <h3 class="text-xl font-bold text-gray-800">
          <i class="fas fa-star text-yellow-500 mr-2"></i>
          Saved Parcels (${parcels.length})
        </h3>
      </div>
      <div class="space-y-3 max-h-96 overflow-y-auto">
        ${parcels.map(parcel => renderSavedParcelCard(parcel)).join('')}
      </div>
    `
  } catch (error) {
    showError('Failed to load saved parcels')
  } finally {
    showLoading(false)
  }
}

// Render saved parcel card
function renderSavedParcelCard(parcel) {
  const data = JSON.parse(parcel.parcel_data)
  const pin = data.identifiers?.pin || parcel.parcel_id
  const owner = data.owner?.primary_name || 'N/A'
  const address = data.site?.address || 'No address'
  const acres = data.land?.acres_gis || data.land?.acres_deed || 'N/A'
  const zoning = data.land?.zoning || 'N/A'
  const marketValue = data.valuation?.market?.total || 0
  
  return `
    <div class="bg-green-50 border-2 border-green-300 rounded-lg p-4">
      <div class="flex justify-between items-start">
        <div class="flex-1">
          <h4 class="font-bold text-lg text-gray-800 mb-2">
            <i class="fas fa-map-pin text-green-600 mr-2"></i>
            ${pin} - ${parcel.county}
          </h4>
          ${parcel.notes ? `
            <p class="text-sm text-gray-700 mb-2 italic bg-yellow-100 p-2 rounded">
              <i class="fas fa-sticky-note mr-1"></i>${parcel.notes}
            </p>
          ` : ''}
          <div class="grid grid-cols-2 gap-2 text-sm">
            <div class="text-gray-600">
              <span class="font-semibold">Owner:</span> ${owner}
            </div>
            <div class="text-gray-600">
              <span class="font-semibold">Address:</span> ${address}
            </div>
            <div class="text-gray-600">
              <span class="font-semibold">Acres:</span> ${typeof acres === 'string' ? parseFloat(acres).toFixed(2) : acres}
            </div>
            <div class="text-gray-600">
              <span class="font-semibold">Zoning:</span> ${zoning}
            </div>
            <div class="text-gray-600">
              <span class="font-semibold">Market Value:</span> $${marketValue.toLocaleString()}
            </div>
            <div class="text-gray-600">
              <span class="font-semibold">Status:</span> ${parcel.status}
            </div>
          </div>
          <p class="text-xs text-gray-500 mt-2">
            Saved: ${new Date(parcel.created_at).toLocaleDateString()}
          </p>
          ${data.meta?.pa_pin_link ? `
            <a href="${data.meta.pa_pin_link}" target="_blank" class="text-blue-600 hover:text-blue-800 text-xs mt-2 inline-block">
              <i class="fas fa-external-link-alt mr-1"></i>View Property Details
            </a>
          ` : ''}
        </div>
        <button 
          onclick="deleteSavedParcel(${parcel.id})"
          class="ml-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all"
          title="Delete"
        >
          <i class="fas fa-trash"></i>
        </button>
      </div>
    </div>
  `
}

// Delete saved parcel
async function deleteSavedParcel(id) {
  if (!confirm('Delete this saved parcel?')) return
  
  try {
    await fetch(`/api/parcels/saved/${id}`, { method: 'DELETE' })
    alert('✅ Parcel deleted')
    viewSavedParcels()
    loadStats()
  } catch (error) {
    alert('❌ Failed to delete parcel')
  }
}

// View search history
async function viewSearchHistory() {
  showLoading(true)
  
  try {
    const response = await fetch('/api/searches/history')
    const searches = await response.json()
    
    const resultsDiv = document.getElementById('results')
    
    if (!searches || searches.length === 0) {
      resultsDiv.innerHTML = `
        <div class="text-center py-8 text-gray-500">
          <i class="fas fa-history text-4xl mb-3"></i>
          <p class="text-lg">No search history yet</p>
        </div>
      `
      return
    }
    
    resultsDiv.innerHTML = `
      <div class="mb-4">
        <h3 class="text-xl font-bold text-gray-800">
          <i class="fas fa-history text-purple-600 mr-2"></i>
          Recent Searches (${searches.length})
        </h3>
      </div>
      <div class="space-y-2 max-h-96 overflow-y-auto">
        ${searches.map(search => `
          <div class="bg-purple-50 border border-purple-200 rounded-lg p-3 flex justify-between items-center">
            <div>
              <span class="font-bold text-gray-800">${search.county}</span>
              <span class="text-sm text-gray-600 ml-3">
                <i class="fas fa-list-ol mr-1"></i>${search.results_count} results
              </span>
              <span class="text-xs text-gray-500 ml-3">
                ${new Date(search.created_at).toLocaleString()}
              </span>
            </div>
            <button 
              onclick="document.getElementById('countyInput').value='${search.county}'; searchParcels()"
              class="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm"
            >
              <i class="fas fa-redo mr-1"></i>Repeat
            </button>
          </div>
        `).join('')}
      </div>
    `
  } catch (error) {
    showError('Failed to load search history')
  } finally {
    showLoading(false)
  }
}

// Export current results to CSV
function exportResults() {
  if (!currentResults || currentResults.length === 0) {
    alert('No results to export. Please search first.')
    return
  }
  
  // Define CSV columns
  const headers = [
    'PIN', 'County', 'Owner', 'Address', 'City', 'Zipcode', 
    'Acres (GIS)', 'Acres (Deed)', 'Zoning', 'Land Use', 
    'Market Value', 'Assessed Value', 'Year Built', 'Property Link'
  ]
  
  // Build CSV rows
  const rows = currentResults.map(parcel => {
    return [
      parcel.identifiers?.pin || '',
      parcel.meta?.county || '',
      parcel.owner?.primary_name || '',
      parcel.site?.address || parcel.owner?.address_line1 || '',
      parcel.site?.city || parcel.owner?.city || '',
      parcel.site?.zipcode || parcel.owner?.zipcode || '',
      parcel.land?.acres_gis || '',
      parcel.land?.acres_deed || '',
      parcel.land?.zoning || '',
      parcel.land?.land_use?.luse_desc || '',
      parcel.valuation?.market?.total || '',
      parcel.valuation?.assessed_total || '',
      parcel.building?.year_built_actual || '',
      parcel.meta?.pa_pin_link || ''
    ].map(value => `"${String(value).replace(/"/g, '""')}"`).join(',')
  })
  
  const csv = [headers.join(','), ...rows].join('\n')
  
  // Download
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `mapdog-parcels-${Date.now()}.csv`
  a.click()
  URL.revokeObjectURL(url)
  
  alert(`✅ Exported ${currentResults.length} parcels to CSV`)
}

// Load statistics
async function loadStats() {
  try {
    const response = await fetch('/api/stats')
    const stats = await response.json()
    
    document.getElementById('totalSearches').textContent = stats.totalSearches
    document.getElementById('savedCount').textContent = stats.savedParcels
    document.getElementById('lastSearch').textContent = stats.lastCounty
  } catch (error) {
    console.error('Failed to load stats:', error)
  }
}

// Show/hide loading indicator
function showLoading(show, message = 'Fetching parcels...') {
  const loadingDiv = document.getElementById('loading')
  if (show) {
    loadingDiv.innerHTML = `
      <i class="fas fa-spinner fa-spin text-4xl text-blue-600"></i>
      <p class="text-gray-600 mt-2">${message}</p>
    `
  }
  loadingDiv.classList.toggle('hidden', !show)
  if (show) {
    document.getElementById('results').innerHTML = ''
  }
}

// Show error message
function showError(message) {
  const resultsDiv = document.getElementById('results')
  
  // Parse message for better display
  const lines = message.split('\n').filter(line => line.trim())
  
  resultsDiv.innerHTML = `
    <div class="bg-red-100 border-2 border-red-400 rounded-lg p-6 text-center">
      <i class="fas fa-exclamation-triangle text-red-600 text-4xl mb-3"></i>
      ${lines.map((line, i) => {
        if (line.startsWith('💡') || line.startsWith('⏱️') || line.startsWith('🔑')) {
          return `<p class="text-sm text-gray-700 mt-2 bg-white p-2 rounded">${line}</p>`
        }
        return `<p class="text-red-800 font-semibold ${i > 0 ? 'mt-2' : ''}">${line}</p>`
      }).join('')}
      <button 
        onclick="document.getElementById('results').innerHTML=''" 
        class="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
      >
        Dismiss
      </button>
    </div>
  `
}
