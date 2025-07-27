-- Add Missing Behavioral Event Optimizations
-- This migration adds database optimizations for the behavioral_event table that were missing

-- Check if the behavioral_event table exists before applying optimizations
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'behavioral_event') THEN
    -- 1. Add check constraints for eventName validation if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'behavioral_event' AND constraint_name = 'behavioral_event_event_name_check') THEN
      ALTER TABLE behavioral_event 
        ADD CONSTRAINT behavioral_event_event_name_check 
        CHECK (event_name ~ '^[a-zA-Z0-9_-]+$' AND LENGTH(event_name) BETWEEN 1 AND 100);
    END IF;

    -- 2. Create composite indexes for common query patterns if they don't exist
    -- Index for queries filtering by userId, createdAt, and entityType
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'behavioral_event' AND indexname = 'behavioral_event_user_created_entity_idx') THEN
      CREATE INDEX CONCURRENTLY behavioral_event_user_created_entity_idx 
        ON behavioral_event USING btree (user_id, created_at, entity_type);
    END IF;

    -- Additional composite indexes for common query patterns
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'behavioral_event' AND indexname = 'behavioral_event_user_entity_created_idx') THEN
      CREATE INDEX CONCURRENTLY behavioral_event_user_entity_created_idx 
        ON behavioral_event USING btree (user_id, entity_type, created_at);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'behavioral_event' AND indexname = 'behavioral_event_entity_created_user_idx') THEN
      CREATE INDEX CONCURRENTLY behavioral_event_entity_created_user_idx 
        ON behavioral_event USING btree (entity_type, created_at, user_id);
    END IF;

    -- 3. Add GIN indexes for JSON context queries if they don't exist
    -- GIN index for efficient JSON queries on the context column
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'behavioral_event' AND indexname = 'behavioral_event_context_gin_idx') THEN
      CREATE INDEX CONCURRENTLY behavioral_event_context_gin_idx 
        ON behavioral_event USING gin (context);
    END IF;

    -- GIN index for text search within JSON context
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'behavioral_event' AND indexname = 'behavioral_event_context_text_gin_idx') THEN
      CREATE INDEX CONCURRENTLY behavioral_event_context_text_gin_idx 
        ON behavioral_event USING gin (context jsonb_path_ops);
    END IF;
  ELSE
    RAISE NOTICE 'behavioral_event table does not exist, skipping optimizations';
  END IF;
END $$;

-- Migration metadata
-- This migration was generated to add missing database optimizations for behavioral events.