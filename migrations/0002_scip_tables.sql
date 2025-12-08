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

  -- Existing Conditions
  water_management_district TEXT,
  hazardous_waste_concerns TEXT,
  access_notes TEXT,
  power_provider_name TEXT,
  power_provider_phone TEXT,
  fiber_available BOOLEAN DEFAULT 0,
  telco_provider_name TEXT,
  telco_provider_phone TEXT,
  nearest_airport_name TEXT,
  nearest_airport_distance TEXT,
  local_police_municipality TEXT,
  local_police_phone TEXT,
  local_fire_dept_municipality TEXT,
  local_fire_dept_phone TEXT,
  site_development_concerns TEXT,

  -- Zoning Overview
  zoning_jurisdiction TEXT,
  zoning_contact_name TEXT,
  zoning_contact_phone TEXT,
  zoning_contact_email TEXT,
  zoning_process_description TEXT,
  zoning_fees TEXT,
  zoning_approval_timeframe TEXT,
  property_zoning_district TEXT,
  property_future_land_use TEXT,
  property_current_usage TEXT,
  meets_minimum_lot_requirements BOOLEAN DEFAULT 0,

  -- Tower Specifics
  ldc_section_references TEXT,
  maximum_tower_height TEXT,
  stealth_required BOOLEAN DEFAULT 0,
  required_collocations INTEGER,
  residential_separation TEXT,
  tower_separation TEXT,
  separation_measured_from TEXT,
  fall_zone_requirements TEXT,
  special_tower_landscaping TEXT,
  zoning_notes TEXT,

  -- Site Plan Overview
  site_plan_jurisdiction TEXT,
  site_plan_contact_name TEXT,
  site_plan_contact_phone TEXT,
  site_plan_contact_email TEXT,
  site_plan_fees TEXT,
  site_plan_approval_timeframe TEXT,
  existing_site_plan_to_amend BOOLEAN DEFAULT 0,
  concurrent_to_zoning_or_bp TEXT,
  site_plan_submittal_deadlines TEXT,
  site_plan_submission_format TEXT,
  site_plan_notes TEXT,

  -- Building Permit Information
  building_permit_jurisdiction TEXT,
  building_dept_contact_name TEXT,
  building_dept_contact_phone TEXT,
  building_dept_contact_email TEXT,
  gc_must_submit BOOLEAN DEFAULT 0,
  building_permit_fees TEXT,
  building_permit_timeframe TEXT,
  bond_required BOOLEAN DEFAULT 0,
  e911_address_assigned TEXT,
  building_permit_notes TEXT,

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
