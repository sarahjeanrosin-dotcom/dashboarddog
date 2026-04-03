-- Add frame_url column to branding table
-- Run this in Supabase SQL Editor

alter table branding
  add column if not exists frame_url text;
