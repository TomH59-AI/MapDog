-- ============================================================
-- Municode MCP: Telecom Ordinances Schema Migration
-- Run this in the Supabase SQL Editor before first use
-- ============================================================

ALTER TABLE telecom_ordinances ADD COLUMN IF NOT EXISTS public_hearing_required boolean DEFAULT NULL;
ALTER TABLE telecom_ordinances ADD COLUMN IF NOT EXISTS zoning_classifications text DEFAULT NULL;
ALTER TABLE telecom_ordinances ADD COLUMN IF NOT EXISTS contact_name text DEFAULT NULL;
ALTER TABLE telecom_ordinances ADD COLUMN IF NOT EXISTS contact_phone text DEFAULT NULL;
ALTER TABLE telecom_ordinances ADD COLUMN IF NOT EXISTS contact_email text DEFAULT NULL;
ALTER TABLE telecom_ordinances ADD COLUMN IF NOT EXISTS contact_department text DEFAULT NULL;
ALTER TABLE telecom_ordinances ADD COLUMN IF NOT EXISTS setback_details jsonb DEFAULT NULL;
ALTER TABLE telecom_ordinances ADD COLUMN IF NOT EXISTS height_details jsonb DEFAULT NULL;
ALTER TABLE telecom_ordinances ADD COLUMN IF NOT EXISTS fall_zone_details text DEFAULT NULL;
ALTER TABLE telecom_ordinances ADD COLUMN IF NOT EXISTS permit_details jsonb DEFAULT NULL;
ALTER TABLE telecom_ordinances ADD COLUMN IF NOT EXISTS summary text DEFAULT NULL;
ALTER TABLE telecom_ordinances ADD COLUMN IF NOT EXISTS keywords text[] DEFAULT NULL;

-- Also add comments for documentation
COMMENT ON COLUMN telecom_ordinances.public_hearing_required IS 'Whether a public hearing is required for new tower applications';
COMMENT ON COLUMN telecom_ordinances.zoning_classifications IS 'Zoning districts where towers are allowed (e.g., M-1 Industrial, C-2 Commercial)';
COMMENT ON COLUMN telecom_ordinances.setback_details IS 'Structured setback requirements by zone/type as JSON';
COMMENT ON COLUMN telecom_ordinances.height_details IS 'Structured height limit details by zone/type as JSON';
COMMENT ON COLUMN telecom_ordinances.fall_zone_details IS 'Fall zone / collapse radius requirements';
COMMENT ON COLUMN telecom_ordinances.permit_details IS 'Detailed permit requirements including type, fees, process as JSON';
COMMENT ON COLUMN telecom_ordinances.contact_name IS 'Zoning/planning department contact name';
COMMENT ON COLUMN telecom_ordinances.contact_phone IS 'Zoning/planning department phone number';
COMMENT ON COLUMN telecom_ordinances.contact_email IS 'Zoning/planning department email';
COMMENT ON COLUMN telecom_ordinances.contact_department IS 'Department name for zoning/planning inquiries';
COMMENT ON COLUMN telecom_ordinances.summary IS 'AI-generated summary of key telecom ordinance requirements';
COMMENT ON COLUMN telecom_ordinances.keywords IS 'Searchable keywords extracted from the ordinance text';

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_telecom_ordinances_state ON telecom_ordinances(state);
CREATE INDEX IF NOT EXISTS idx_telecom_ordinances_jurisdiction ON telecom_ordinances(jurisdiction);
