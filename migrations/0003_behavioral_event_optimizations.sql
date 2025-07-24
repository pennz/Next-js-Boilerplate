-- Behavioral Event Optimizations
-- This migration adds database optimizations for the behavioral_event table

-- 1. Add check constraints for eventName validation
ALTER TABLE behavioral_event 
  ADD CONSTRAINT behavioral_event_event_name_check 
  CHECK (event_name ~ '^[a-zA-Z0-9_-]+$' AND LENGTH(event_name) BETWEEN 1 AND 100);

-- 2. Create composite indexes for common query patterns
-- Index for queries filtering by userId, createdAt, and entityType
CREATE INDEX CONCURRENTLY behavioral_event_user_created_entity_idx 
  ON behavioral_event USING btree (user_id, created_at, entity_type);

-- Additional composite indexes for common query patterns
CREATE INDEX CONCURRENTLY behavioral_event_user_entity_created_idx 
  ON behavioral_event USING btree (user_id, entity_type, created_at);

CREATE INDEX CONCURRENTLY behavioral_event_entity_created_user_idx 
  ON behavioral_event USING btree (entity_type, created_at, user_id);

-- 3. Add GIN indexes for JSON context queries
-- GIN index for efficient JSON queries on the context column
CREATE INDEX CONCURRENTLY behavioral_event_context_gin_idx 
  ON behavioral_event USING gin (context);

-- GIN index for text search within JSON context
CREATE INDEX CONCURRENTLY behavioral_event_context_text_gin_idx 
  ON behavioral_event USING gin (context jsonb_path_ops);

-- 4. Documentation for partitioning strategy (as comments)
/*
Partitioning Strategy for Future Scaling:

As the behavioral_event table grows, partitioning will become essential for performance.
Here's a recommended partitioning strategy:

1. Time-based Partitioning (Recommended):
   - Partition by created_at date (monthly or yearly)
   - Example: behavioral_event_2024_01, behavioral_event_2024_02, etc.
   - This approach works well for time-series data and analytics queries

2. Hybrid Partitioning:
   - Combine time-based partitioning with user_id range partitioning
   - Useful for user-specific analytics

3. Implementation Steps:
   a. Create a partitioned table with the same schema
   b. Migrate existing data to partitions
   c. Update application code to work with partitioned table
   d. Set up automated partition creation for future periods

4. Considerations:
   - Foreign key constraints to partitioned tables have limitations
   - Some operations may need to be performed on each partition individually
   - Monitor partition sizes to ensure balanced distribution

5. Tools for Management:
   - Use PostgreSQL's built-in partitioning features (PostgreSQL 10+)
   - Consider pg_partman extension for automated partition management
*/

-- Migration metadata
-- This migration was generated on 2025-01-24 to add database optimizations for behavioral events.