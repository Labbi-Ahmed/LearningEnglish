-- 0016_speaking_recordings_transcript.sql
-- Add transcript column to speaking_recordings for storing STT output.
-- Depends on: 0008_speaking_recordings.sql

alter table speaking_recordings add column if not exists transcript text;
