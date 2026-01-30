-- Migration: Add patient details to reports table
-- Run this in Supabase SQL Editor

ALTER TABLE reports 
ADD COLUMN IF NOT EXISTS patient_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS patient_age VARCHAR(100),
ADD COLUMN IF NOT EXISTS patient_gender VARCHAR(50);

-- Update RLS if necessary (usually not needed if existing policies cover all columns)
-- But ensuring columns are visible to the user
COMMENT ON COLUMN reports.patient_name IS 'Extracted patient name from report';
COMMENT ON COLUMN reports.patient_age IS 'Extracted patient age from report';
COMMENT ON COLUMN reports.patient_gender IS 'Extracted patient gender from report';
