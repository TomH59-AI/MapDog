// MapDog - Site Acquisition Parcel Search Frontend
let currentResults = []
let currentMode = 'county' // 'county', 'coordinate', 'bulk', or 'scip'
let currentSCIP = null

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
  const scipSection = document.getElementById('scipSection')
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
  const btnBase = 'px-4 py-2 bg-gray-200 text-gray-700 font-semibold rounded-lg transition-all'
  countyBtn.className = btnBase
  coordinateBtn.className = btnBase
  bulkBtn.className = btnBase
  scipBtn.className = btnBase

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
    scipBtn.className = 'px-4 py-2 bg-teal-600 text-white font-semibold rounded-lg transition-all'
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
  const notFoundCount = data.meta?.notFound || 0
  const notFoundPins = data.notFound || []

  if (found === 0) {
    resultsDiv.innerHTML = `
      <div class="text-center py-8 bg-yellow-50 border-2 border-yellow-300 rounded-lg">
        <i class="fas fa-exclamation-triangle text-yellow-600 text-4xl mb-3"></i>
        <p class="text-lg font-semibold text-gray-800">No parcels found</p>
        <p class="text-sm text-gray-600 mt-2">Requested: ${requested} PINs • Found: 0</p>
        <p class="text-xs text-gray-500 mt-2">Check that PINs are correct for ${county} county</p>
        ${notFoundPins.length > 0 ? `
          <details class="mt-3 text-left max-w-md mx-auto">
            <summary class="cursor-pointer text-sm text-gray-600">Show unmatched PINs</summary>
            <pre class="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto max-h-32">${notFoundPins.join('\n')}</pre>
          </details>
        ` : ''}
      </div>
    `
    return
  }

  resultsDiv.innerHTML = `
    <div class="mb-4 p-4 bg-purple-50 border-2 border-purple-300 rounded-lg">
      <div class="flex justify-between items-start">
        <div class="flex-1">
          <h3 class="text-xl font-bold text-gray-800">
            <i class="fas fa-layer-group text-purple-600 mr-2"></i>
            Search Ring Results
          </h3>
          ${searchRingName ? `<p class="text-sm font-semibold text-purple-700 mt-1">${searchRingName}</p>` : ''}
          <p class="text-sm text-gray-600 mt-2">
            <span class="font-semibold">County:</span> ${county} •
            <span class="font-semibold">Requested:</span> ${requested} PINs •
            <span class="font-semibold text-green-600">Found:</span> ${found} parcels
            ${notFoundCount > 0 ? ` • <span class="font-semibold text-orange-600">Not Found:</span> ${notFoundCount}` : ''}
          </p>
          ${notFoundPins.length > 0 ? `
            <details class="mt-2">
              <summary class="cursor-pointer text-xs text-orange-600 hover:text-orange-800">
                <i class="fas fa-exclamation-circle mr-1"></i>${notFoundCount} PINs not found in MapWise
              </summary>
              <pre class="mt-1 p-2 bg-orange-50 border border-orange-200 rounded text-xs overflow-auto max-h-24">${notFoundPins.join('\n')}</pre>
            </details>
          ` : ''}
        </div>
        <button
          onclick="saveAllBulkParcels('${county}', '${searchRingName}')"
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

// ========================================
// SCIP Generator Functions
// ========================================

// Generate SCIP Report
async function generateSCIP() {
  // Gather form data
  const siteName = document.getElementById('scipSiteName').value.trim()
  const siteId = document.getElementById('scipSiteId').value.trim()
  const address = document.getElementById('scipAddress').value.trim()
  const city = document.getElementById('scipCity').value.trim()
  const county = document.getElementById('scipCounty').value.trim().toUpperCase()
  const state = document.getElementById('scipState').value.trim()
  const zip = document.getElementById('scipZip').value.trim()
  const lat = document.getElementById('scipLat').value.trim()
  const lon = document.getElementById('scipLon').value.trim()
  const jurisdiction = document.getElementById('scipJurisdiction').value.trim()

  const ownerName = document.getElementById('scipOwnerName').value.trim()
  const ownerAddress = document.getElementById('scipOwnerAddress').value.trim()
  const ownerCity = document.getElementById('scipOwnerCity').value.trim()
  const ownerState = document.getElementById('scipOwnerState').value.trim()
  const ownerZip = document.getElementById('scipOwnerZip').value.trim()
  const ownerPhone = document.getElementById('scipOwnerPhone').value.trim()
  const ownerEmail = document.getElementById('scipOwnerEmail').value.trim()

  const parcelPin = document.getElementById('scipParcelPin').value.trim()

  // Validate required fields
  if (!lat || !lon) {
    alert('⚠️ Latitude and Longitude are required\n\nGet coordinates from RF Engineer or Google Maps')
    return
  }

  if (!siteName) {
    alert('⚠️ Site Name is required')
    return
  }

  showLoading(true, 'Generating SCIP Report... Querying multiple data sources...')

  try {
    const response = await fetch('/api/scip/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        siteName, siteId, address, city, county, state, zip, lat, lon, jurisdiction,
        ownerName, ownerAddress, ownerCity, ownerState, ownerZip, ownerPhone, ownerEmail,
        parcelPin
      })
    })

    const data = await response.json()

    if (data.error) {
      throw new Error(data.error + (data.details ? '\n\n' + data.details : ''))
    }

    currentSCIP = data.scip
    displaySCIPResults(data.scip)
    loadStats()

  } catch (error) {
    showError(error.message)
  } finally {
    showLoading(false)
  }
}

// Display SCIP Results
function displaySCIPResults(scip) {
  const resultsDiv = document.getElementById('results')

  resultsDiv.innerHTML = `
    <div class="bg-gradient-to-r from-teal-50 to-cyan-50 border-2 border-teal-400 rounded-lg p-4">
      <div class="flex justify-between items-start mb-4">
        <h3 class="text-2xl font-bold text-gray-800">
          <i class="fas fa-file-alt text-teal-600 mr-2"></i>
          SCIP Report: ${scip.siteInfo.siteName || 'Unnamed Site'}
        </h3>
        <div class="flex gap-2">
          <button onclick="exportSCIPToCSV()" class="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg">
            <i class="fas fa-download mr-2"></i>Export CSV
          </button>
          <button onclick="printSCIP()" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
            <i class="fas fa-print mr-2"></i>Print
          </button>
        </div>
      </div>

      <p class="text-xs text-gray-500 mb-4">
        <i class="fas fa-clock mr-1"></i>Generated: ${new Date(scip.generatedAt).toLocaleString()}
      </p>

      <!-- Site Information -->
      <div class="mb-4 p-3 bg-white rounded-lg border border-teal-200">
        <h4 class="font-bold text-teal-700 mb-2 border-b pb-1">
          <i class="fas fa-map-pin mr-2"></i>Site Information
        </h4>
        <div class="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
          <div><span class="font-semibold">Site Name:</span> ${scip.siteInfo.siteName || 'N/A'}</div>
          <div><span class="font-semibold">Site ID:</span> ${scip.siteInfo.siteId || 'N/A'}</div>
          <div><span class="font-semibold">Address:</span> ${scip.siteInfo.address || 'N/A'}</div>
          <div><span class="font-semibold">City:</span> ${scip.siteInfo.city || 'N/A'}</div>
          <div><span class="font-semibold">County:</span> ${scip.siteInfo.county || 'N/A'}</div>
          <div><span class="font-semibold">State/ZIP:</span> ${scip.siteInfo.state || ''} ${scip.siteInfo.zip || ''}</div>
          <div><span class="font-semibold">Latitude:</span> ${scip.siteInfo.latitude}</div>
          <div><span class="font-semibold">Longitude:</span> ${scip.siteInfo.longitude}</div>
          <div><span class="font-semibold">Jurisdiction:</span> ${scip.siteInfo.jurisdiction || 'N/A'}</div>
        </div>
      </div>

      <!-- Property Owner -->
      <div class="mb-4 p-3 bg-white rounded-lg border border-teal-200">
        <h4 class="font-bold text-teal-700 mb-2 border-b pb-1">
          <i class="fas fa-user mr-2"></i>Property Owner Information
        </h4>
        <div class="grid grid-cols-2 gap-2 text-sm">
          <div><span class="font-semibold">Owner Name:</span> ${scip.propertyInfo.ownerName || 'N/A'}</div>
          <div><span class="font-semibold">Phone:</span> ${scip.propertyInfo.ownerPhone || 'N/A'}</div>
          <div class="col-span-2"><span class="font-semibold">Mailing Address:</span> ${scip.propertyInfo.ownerAddress || 'N/A'} ${scip.propertyInfo.ownerCity || ''} ${scip.propertyInfo.ownerState || ''} ${scip.propertyInfo.ownerZip || ''}</div>
          <div><span class="font-semibold">Email:</span> ${scip.propertyInfo.ownerEmail || 'N/A'}</div>
        </div>
      </div>

      <!-- Ground & Site Data -->
      <div class="mb-4 p-3 bg-white rounded-lg border border-teal-200">
        <h4 class="font-bold text-teal-700 mb-2 border-b pb-1">
          <i class="fas fa-mountain mr-2"></i>Ground & Site Data
        </h4>
        <div class="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
          <div><span class="font-semibold">Elevation:</span> ${scip.groundSiteData.elevationFt || 'N/A'} ft <span class="text-xs text-gray-500">(${scip.groundSiteData.elevationSource || 'N/A'})</span></div>
          <div><span class="font-semibold">Property Type:</span> ${scip.groundSiteData.propertyType || 'N/A'}</div>
          <div><span class="font-semibold">Land Use:</span> ${scip.groundSiteData.landUse || 'N/A'}</div>
          <div><span class="font-semibold">Year Built:</span> ${scip.groundSiteData.yearBuilt || 'N/A'}</div>
          <div><span class="font-semibold">Building Sq Ft:</span> ${scip.groundSiteData.buildingSqFt ? scip.groundSiteData.buildingSqFt.toLocaleString() : 'N/A'}</div>
        </div>
      </div>

      <!-- Parcel & Tax Data -->
      <div class="mb-4 p-3 bg-white rounded-lg border border-teal-200">
        <h4 class="font-bold text-teal-700 mb-2 border-b pb-1">
          <i class="fas fa-file-invoice-dollar mr-2"></i>Parcel & Tax Data
        </h4>
        <div class="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
          <div><span class="font-semibold">APN:</span> ${scip.parcelTaxData.apn || scip.parcelTaxData.pin || 'N/A'}</div>
          <div><span class="font-semibold">FIPS:</span> ${scip.parcelTaxData.fips || 'N/A'}</div>
          <div><span class="font-semibold">Lot Size:</span> ${scip.parcelTaxData.lotSizeSqFt ? scip.parcelTaxData.lotSizeSqFt.toLocaleString() + ' sq ft' : 'N/A'} ${scip.parcelTaxData.lotSizeAcres ? '(' + scip.parcelTaxData.lotSizeAcres + ' acres)' : ''}</div>
          <div><span class="font-semibold">Assessed Value:</span> ${scip.parcelTaxData.assessedValue ? '$' + scip.parcelTaxData.assessedValue.toLocaleString() : 'N/A'}</div>
          <div><span class="font-semibold">Market Value:</span> ${scip.parcelTaxData.marketValue ? '$' + scip.parcelTaxData.marketValue.toLocaleString() : 'N/A'}</div>
          <div><span class="font-semibold">Tax Amount:</span> ${scip.parcelTaxData.taxAmount ? '$' + scip.parcelTaxData.taxAmount.toLocaleString() : 'N/A'} ${scip.parcelTaxData.taxYear ? '(' + scip.parcelTaxData.taxYear + ')' : ''}</div>
          <div class="col-span-2 md:col-span-3"><span class="font-semibold">Legal Description:</span> ${scip.parcelTaxData.legalDescription || 'N/A'}</div>
        </div>
      </div>

      <!-- Environmental -->
      <div class="mb-4 p-3 bg-white rounded-lg border border-teal-200">
        <h4 class="font-bold text-teal-700 mb-2 border-b pb-1">
          <i class="fas fa-leaf mr-2"></i>Environmental
        </h4>
        <div class="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
          <div><span class="font-semibold">FEMA Flood Zone:</span> <span class="${scip.environmental.floodZone?.includes('A') || scip.environmental.floodZone?.includes('V') ? 'text-red-600 font-bold' : 'text-green-600'}">${scip.environmental.floodZone || 'N/A'}</span></div>
          <div><span class="font-semibold">Special Flood Hazard:</span> ${scip.environmental.sfha || 'N/A'}</div>
          <div><span class="font-semibold">Wetlands:</span> ${scip.environmental.wetlands || 'N/A'}</div>
          <div><span class="font-semibold">Historic Preservation:</span> ${scip.environmental.historicPreservation || 'N/A'}</div>
          <div><span class="font-semibold">Endangered Species:</span> ${scip.environmental.endangeredSpecies || 'N/A'}</div>
        </div>
      </div>

      <!-- Zoning -->
      <div class="mb-4 p-3 bg-white rounded-lg border border-teal-200">
        <h4 class="font-bold text-teal-700 mb-2 border-b pb-1">
          <i class="fas fa-building mr-2"></i>Zoning
        </h4>
        <div class="grid grid-cols-2 gap-2 text-sm">
          <div><span class="font-semibold">Classification:</span> ${scip.zoning.classification || 'N/A'}</div>
          <div><span class="font-semibold">Tower Permitted:</span> ${scip.zoning.towerPermitted || 'N/A'}</div>
          <div><span class="font-semibold">Height Restrictions:</span> ${scip.zoning.heightRestrictions || 'N/A'}</div>
          <div><span class="font-semibold">Setback Requirements:</span> ${scip.zoning.setbackRequirements || 'N/A'}</div>
        </div>
      </div>

      <!-- Utilities -->
      <div class="mb-4 p-3 bg-white rounded-lg border border-teal-200">
        <h4 class="font-bold text-teal-700 mb-2 border-b pb-1">
          <i class="fas fa-bolt mr-2"></i>Utilities
        </h4>
        <div class="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
          <div><span class="font-semibold">Power:</span> ${scip.utilities.powerAvailable || 'N/A'}</div>
          <div><span class="font-semibold">Telco:</span> ${scip.utilities.telcoAvailable || 'N/A'}</div>
          <div><span class="font-semibold">Fiber:</span> ${scip.utilities.fiberAvailable || 'N/A'}</div>
        </div>
      </div>

      <!-- Nearby Towers -->
      ${scip.nearbyTowers && scip.nearbyTowers.count > 0 ? `
        <div class="mb-4 p-3 bg-white rounded-lg border border-teal-200">
          <h4 class="font-bold text-teal-700 mb-2 border-b pb-1">
            <i class="fas fa-broadcast-tower mr-2"></i>Nearby Cell Towers (${scip.nearbyTowers.count} found within ~1km)
          </h4>
          <div class="text-xs overflow-x-auto">
            <table class="w-full">
              <thead><tr class="bg-gray-100"><th class="p-1">Radio</th><th class="p-1">MCC</th><th class="p-1">MNC</th><th class="p-1">LAC</th><th class="p-1">Cell ID</th><th class="p-1">Range (m)</th></tr></thead>
              <tbody>
                ${scip.nearbyTowers.towers.map(t => `<tr class="border-b"><td class="p-1">${t.radio}</td><td class="p-1">${t.mcc}</td><td class="p-1">${t.mnc}</td><td class="p-1">${t.lac}</td><td class="p-1">${t.cellid}</td><td class="p-1">${t.range || 'N/A'}</td></tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>
      ` : ''}

      <!-- Map Links -->
      <div class="p-3 bg-white rounded-lg border border-teal-200">
        <h4 class="font-bold text-teal-700 mb-2 border-b pb-1">
          <i class="fas fa-map mr-2"></i>Map Links
        </h4>
        <div class="flex flex-wrap gap-2">
          <a href="${scip.mapLinks.googleMaps}" target="_blank" class="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm">
            <i class="fas fa-map-marker-alt mr-1"></i>Google Maps
          </a>
          <a href="${scip.mapLinks.googleEarth}" target="_blank" class="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm">
            <i class="fas fa-globe mr-1"></i>Google Earth
          </a>
          <a href="${scip.mapLinks.bingMaps}" target="_blank" class="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-sm">
            <i class="fas fa-map mr-1"></i>Bing Maps
          </a>
          <a href="${scip.mapLinks.openStreetMap}" target="_blank" class="px-3 py-1 bg-orange-600 hover:bg-orange-700 text-white rounded text-sm">
            <i class="fas fa-map-marked mr-1"></i>OpenStreetMap
          </a>
          <a href="${scip.mapLinks.usgsTopoMap}" target="_blank" class="px-3 py-1 bg-yellow-600 hover:bg-yellow-700 text-white rounded text-sm">
            <i class="fas fa-mountain mr-1"></i>USGS Topo
          </a>
        </div>
      </div>
    </div>
  `
}

// Export SCIP to CSV
function exportSCIPToCSV() {
  if (!currentSCIP) {
    alert('No SCIP data to export')
    return
  }

  const s = currentSCIP
  const rows = [
    ['SITE CANDIDATE INFORMATION PACKAGE (SCIP)'],
    ['Generated', new Date(s.generatedAt).toLocaleString()],
    [''],
    ['SITE INFORMATION'],
    ['Site Name', s.siteInfo.siteName],
    ['Site ID', s.siteInfo.siteId],
    ['Address', s.siteInfo.address],
    ['City', s.siteInfo.city],
    ['County', s.siteInfo.county],
    ['State', s.siteInfo.state],
    ['ZIP', s.siteInfo.zip],
    ['Latitude', s.siteInfo.latitude],
    ['Longitude', s.siteInfo.longitude],
    ['Jurisdiction', s.siteInfo.jurisdiction],
    [''],
    ['PROPERTY OWNER'],
    ['Owner Name', s.propertyInfo.ownerName],
    ['Owner Address', s.propertyInfo.ownerAddress],
    ['Owner City', s.propertyInfo.ownerCity],
    ['Owner State', s.propertyInfo.ownerState],
    ['Owner ZIP', s.propertyInfo.ownerZip],
    ['Owner Phone', s.propertyInfo.ownerPhone],
    ['Owner Email', s.propertyInfo.ownerEmail],
    [''],
    ['GROUND & SITE DATA'],
    ['Elevation (ft)', s.groundSiteData.elevationFt],
    ['Elevation Source', s.groundSiteData.elevationSource],
    ['Property Type', s.groundSiteData.propertyType],
    ['Land Use', s.groundSiteData.landUse],
    ['Year Built', s.groundSiteData.yearBuilt],
    ['Building Sq Ft', s.groundSiteData.buildingSqFt],
    [''],
    ['PARCEL & TAX DATA'],
    ['APN', s.parcelTaxData.apn || s.parcelTaxData.pin],
    ['FIPS', s.parcelTaxData.fips],
    ['Lot Size (sq ft)', s.parcelTaxData.lotSizeSqFt],
    ['Lot Size (acres)', s.parcelTaxData.lotSizeAcres],
    ['Assessed Value', s.parcelTaxData.assessedValue],
    ['Market Value', s.parcelTaxData.marketValue],
    ['Tax Amount', s.parcelTaxData.taxAmount],
    ['Tax Year', s.parcelTaxData.taxYear],
    ['Legal Description', s.parcelTaxData.legalDescription],
    [''],
    ['ENVIRONMENTAL'],
    ['Flood Zone', s.environmental.floodZone],
    ['Special Flood Hazard Area', s.environmental.sfha],
    ['Wetlands', s.environmental.wetlands],
    ['Historic Preservation', s.environmental.historicPreservation],
    ['Endangered Species', s.environmental.endangeredSpecies],
    [''],
    ['ZONING'],
    ['Classification', s.zoning.classification],
    ['Tower Permitted', s.zoning.towerPermitted],
    ['Height Restrictions', s.zoning.heightRestrictions],
    ['Setback Requirements', s.zoning.setbackRequirements],
    [''],
    ['UTILITIES'],
    ['Power Available', s.utilities.powerAvailable],
    ['Telco Available', s.utilities.telcoAvailable],
    ['Fiber Available', s.utilities.fiberAvailable],
    [''],
    ['MAP LINKS'],
    ['Google Maps', s.mapLinks.googleMaps],
    ['Google Earth', s.mapLinks.googleEarth],
    ['Bing Maps', s.mapLinks.bingMaps],
    ['OpenStreetMap', s.mapLinks.openStreetMap],
    ['USGS Topo', s.mapLinks.usgsTopoMap]
  ]

  const csv = rows.map(row => row.map(cell => `"${String(cell || '').replace(/"/g, '""')}"`).join(',')).join('\n')

  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `SCIP-${s.siteInfo.siteName || 'report'}-${Date.now()}.csv`
  a.click()
  URL.revokeObjectURL(url)

  alert('✅ SCIP exported to CSV')
}

// Print SCIP
function printSCIP() {
  window.print()
}

// Clear SCIP Form
function clearSCIPForm() {
  document.getElementById('scipSiteName').value = ''
  document.getElementById('scipSiteId').value = ''
  document.getElementById('scipAddress').value = ''
  document.getElementById('scipCity').value = ''
  document.getElementById('scipCounty').value = ''
  document.getElementById('scipState').value = ''
  document.getElementById('scipZip').value = ''
  document.getElementById('scipLat').value = ''
  document.getElementById('scipLon').value = ''
  document.getElementById('scipJurisdiction').value = ''
  document.getElementById('scipOwnerName').value = ''
  document.getElementById('scipOwnerAddress').value = ''
  document.getElementById('scipOwnerCity').value = ''
  document.getElementById('scipOwnerState').value = ''
  document.getElementById('scipOwnerZip').value = ''
  document.getElementById('scipOwnerPhone').value = ''
  document.getElementById('scipOwnerEmail').value = ''
  document.getElementById('scipParcelPin').value = ''
  document.getElementById('results').innerHTML = ''
  currentSCIP = null
}
