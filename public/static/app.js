// MapDog - Site Acquisition Parcel Search Frontend
let currentResults = []

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  loadStats()
  
  // Allow Enter key to trigger search
  document.getElementById('countyInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchParcels()
  })
})

// Search parcels from MapWise API
async function searchParcels() {
  const county = document.getElementById('countyInput').value.trim().toUpperCase()
  const limit = document.getElementById('limitInput').value || 10
  
  if (!county) {
    alert('Please enter a county name')
    return
  }
  
  showLoading(true)
  
  try {
    const response = await fetch(`/api/parcels/search?county=${encodeURIComponent(county)}&limit=${limit}`)
    const data = await response.json()
    
    if (data.error) {
      throw new Error(data.details || data.error)
    }
    
    currentResults = data.features || []
    displayResults(currentResults, county)
    loadStats()
  } catch (error) {
    showError(`Search failed: ${error.message}`)
  } finally {
    showLoading(false)
  }
}

// Display search results
function displayResults(features, county) {
  const resultsDiv = document.getElementById('results')
  
  if (!features || features.length === 0) {
    resultsDiv.innerHTML = `
      <div class="text-center py-8 text-gray-500">
        <i class="fas fa-search text-4xl mb-3"></i>
        <p class="text-lg">No parcels found for ${county}</p>
      </div>
    `
    return
  }
  
  resultsDiv.innerHTML = `
    <div class="mb-4 flex justify-between items-center">
      <h3 class="text-xl font-bold text-gray-800">
        <i class="fas fa-map-marked-alt text-blue-600 mr-2"></i>
        Found ${features.length} parcels in ${county}
      </h3>
    </div>
    <div class="space-y-3 max-h-96 overflow-y-auto">
      ${features.map((feature, index) => renderParcelCard(feature, index, county)).join('')}
    </div>
  `
}

// Render individual parcel card
function renderParcelCard(feature, index, county) {
  const props = feature.properties || {}
  const parcelId = props.parcelid || props.PARCELID || props.id || `${county}-${index}`
  
  return `
    <div class="bg-gray-50 border-2 border-gray-200 rounded-lg p-4 hover:border-blue-400 transition-all">
      <div class="flex justify-between items-start">
        <div class="flex-1">
          <h4 class="font-bold text-lg text-gray-800 mb-2">
            <i class="fas fa-map-pin text-red-500 mr-2"></i>
            Parcel ID: ${parcelId}
          </h4>
          <div class="grid grid-cols-2 gap-2 text-sm">
            ${Object.entries(props).slice(0, 8).map(([key, value]) => `
              <div class="text-gray-600">
                <span class="font-semibold">${key}:</span> ${value || 'N/A'}
              </div>
            `).join('')}
          </div>
        </div>
        <button 
          onclick="saveParcel('${parcelId}', '${county}', ${index})"
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
  const props = data.properties || {}
  
  return `
    <div class="bg-green-50 border-2 border-green-300 rounded-lg p-4">
      <div class="flex justify-between items-start">
        <div class="flex-1">
          <h4 class="font-bold text-lg text-gray-800 mb-2">
            <i class="fas fa-map-pin text-green-600 mr-2"></i>
            ${parcel.parcel_id} - ${parcel.county}
          </h4>
          ${parcel.notes ? `
            <p class="text-sm text-gray-700 mb-2 italic">
              <i class="fas fa-sticky-note mr-1"></i>${parcel.notes}
            </p>
          ` : ''}
          <div class="grid grid-cols-2 gap-2 text-sm">
            ${Object.entries(props).slice(0, 6).map(([key, value]) => `
              <div class="text-gray-600">
                <span class="font-semibold">${key}:</span> ${value || 'N/A'}
              </div>
            `).join('')}
          </div>
          <p class="text-xs text-gray-500 mt-2">
            Saved: ${new Date(parcel.created_at).toLocaleDateString()}
          </p>
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
  
  // Extract all unique keys from properties
  const allKeys = new Set()
  currentResults.forEach(feature => {
    Object.keys(feature.properties || {}).forEach(key => allKeys.add(key))
  })
  
  // Build CSV
  const headers = Array.from(allKeys).join(',')
  const rows = currentResults.map(feature => {
    const props = feature.properties || {}
    return Array.from(allKeys).map(key => {
      const value = props[key] || ''
      return `"${String(value).replace(/"/g, '""')}"`
    }).join(',')
  })
  
  const csv = [headers, ...rows].join('\n')
  
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
function showLoading(show) {
  document.getElementById('loading').classList.toggle('hidden', !show)
  if (show) {
    document.getElementById('results').innerHTML = ''
  }
}

// Show error message
function showError(message) {
  const resultsDiv = document.getElementById('results')
  resultsDiv.innerHTML = `
    <div class="bg-red-100 border-2 border-red-400 rounded-lg p-4 text-center">
      <i class="fas fa-exclamation-triangle text-red-600 text-3xl mb-2"></i>
      <p class="text-red-800 font-semibold">${message}</p>
    </div>
  `
}
