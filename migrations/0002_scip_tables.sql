-- SCIP (Site Candidate Information Package) Projects
CREATE TABLE IF NOT EXISTS scip_projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_name TEXT NOT NULL,
  search_ring_center_lat REAL NOT NULL,
  search_ring_center_lon REAL NOT NULL,
  search_radius_miles REAL DEFAULT 0.5,
  county TEXT NOT NULL,
  rf_engineer_name TEXT,
  carrier TEXT,
  project_notes TEXT,
  status TEXT DEFAULT 'draft',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- SCIP Site Candidates (Individual Properties)
CREATE TABLE IF NOT EXISTS scip_candidates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  parcel_id TEXT NOT NULL,
  candidate_rank INTEGER,

  -- Site Identification
  site_name TEXT,
  site_address TEXT,
  site_city TEXT,
  site_state TEXT DEFAULT 'FL',
  site_zip TEXT,
  site_county TEXT,
  latitude REAL,
  longitude REAL,

  -- Property Information
  owner_name TEXT,
  owner_address TEXT,
  owner_phone TEXT,
  owner_email TEXT,
  parcel_number TEXT,
  parcel_acres REAL,
  lot_size TEXT,

  -- Zoning & Land Use
  zoning_designation TEXT,
  land_use TEXT,
  current_use TEXT,
  zoning_allows_towers BOOLEAN DEFAULT 0,
  conditional_use_permit_required BOOLEAN DEFAULT 0,

  -- Access & Infrastructure
  access_road_type TEXT,
  road_frontage_feet REAL,
  utility_power_available BOOLEAN DEFAULT 0,
  utility_water_available BOOLEAN DEFAULT 0,
  utility_sewer_available BOOLEAN DEFAULT 0,
  utility_gas_available BOOLEAN DEFAULT 0,

  -- Environmental
  wetlands_present BOOLEAN DEFAULT 0,
  flood_zone TEXT,
  endangered_species BOOLEAN DEFAULT 0,
  historical_site BOOLEAN DEFAULT 0,
  environmental_concerns TEXT,

  -- RF Engineering
  elevation_feet REAL,
  terrain_type TEXT,
  line_of_sight TEXT,
  rf_propagation_score REAL,

  -- Site Characteristics
  topography TEXT,
  vegetation TEXT,
  site_accessibility TEXT,
  neighboring_land_use TEXT,

  -- Financial
  assessed_value REAL,
  market_value REAL,
  estimated_lease_rate TEXT,

  -- Images & Documents
  aerial_image_url TEXT,
  street_view_url TEXT,
  topo_map_url TEXT,
  zoning_map_url TEXT,
  additional_images TEXT, -- JSON array

  -- Scoring
  overall_score REAL DEFAULT 0,
  score_breakdown TEXT, -- JSON object

  -- MapWise Raw Data
  mapwise_data TEXT, -- Full JSON response

  -- Notion Integration
  notion_page_id TEXT,
  notion_synced_at DATETIME,

  -- Metadata
  status TEXT DEFAULT 'candidate',
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (project_id) REFERENCES scip_projects(id) ON DELETE CASCADE
);

-- SCIP Generation Log (Track API calls and data sources)
CREATE TABLE IF NOT EXISTS scip_generation_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  candidate_id INTEGER NOT NULL,
  data_source TEXT NOT NULL, -- 'mapwise', 'notion', 'geocoding', 'aerial_imagery', etc.
  api_endpoint TEXT,
  request_params TEXT, -- JSON
  response_status INTEGER,
  data_retrieved TEXT, -- Brief description
  error_message TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (candidate_id) REFERENCES scip_candidates(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_scip_projects_county ON scip_projects(county);
CREATE INDEX IF NOT EXISTS idx_scip_projects_status ON scip_projects(status);
CREATE INDEX IF NOT EXISTS idx_scip_projects_created ON scip_projects(created_at);

CREATE INDEX IF NOT EXISTS idx_scip_candidates_project ON scip_candidates(project_id);
CREATE INDEX IF NOT EXISTS idx_scip_candidates_rank ON scip_candidates(candidate_rank);
CREATE INDEX IF NOT EXISTS idx_scip_candidates_score ON scip_candidates(overall_score);
CREATE INDEX IF NOT EXISTS idx_scip_candidates_status ON scip_candidates(status);
CREATE INDEX IF NOT EXISTS idx_scip_candidates_parcel ON scip_candidates(parcel_id);

CREATE INDEX IF NOT EXISTS idx_scip_log_candidate ON scip_generation_log(candidate_id);
CREATE INDEX IF NOT EXISTS idx_scip_log_source ON scip_generation_log(data_source);
