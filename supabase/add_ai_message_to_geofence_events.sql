-- ============================================================
-- MIGRATION: Add ai_message column to geofence_events
-- Phase 13B — stores Gemini-generated alert wording alongside
--             each LEFT/RETURNED geofence event so the family
--             dashboard can display the actual AI-generated text.
--
-- Safe to re-run: ALTER TABLE … ADD COLUMN IF NOT EXISTS
-- ============================================================

ALTER TABLE public.geofence_events
  ADD COLUMN IF NOT EXISTS ai_message text;

-- Existing rows get NULL which is the correct default:
-- the family-alerts endpoint will fall back gracefully when
-- ai_message is NULL (old events pre-migration).

COMMENT ON COLUMN public.geofence_events.ai_message IS
  'Gemini-generated plain-language alert message produced at event time. '
  'NULL for routine check events and for events recorded before this migration. '
  'Falls back to a deterministic template if Gemini was unavailable.';
