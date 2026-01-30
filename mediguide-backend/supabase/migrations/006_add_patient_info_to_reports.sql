-- Migration: Add Patient Info to Reports
-- Adds columns for extracted patient information from medical reports

ALTER TABLE reports 
ADD COLUMN IF NOT EXISTS patient_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS patient_age VARCHAR(50),
ADD COLUMN IF NOT EXISTS patient_gender VARCHAR(50);

-- Comment for clarity
COMMENT ON COLUMN reports.patient_name IS 'Extracted patient name from the report image';
COMMENT ON COLUMN reports.patient_age IS 'Extracted patient age from the report image';
COMMENT ON COLUMN reports.patient_gender IS 'Extracted patient gender from the report image';
