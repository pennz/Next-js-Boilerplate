CREATE TYPE "public"."constraint_type" AS ENUM('injury', 'schedule', 'equipment', 'location', 'medical');--> statement-breakpoint
CREATE TYPE "public"."day_of_week" AS ENUM('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday');--> statement-breakpoint
CREATE TYPE "public"."entity_type" AS ENUM('health_record', 'training_session', 'exercise_log', 'health_goal', 'ui_interaction');--> statement-breakpoint
CREATE TYPE "public"."equipment" AS ENUM('none', 'dumbbells', 'barbell', 'resistance_bands', 'kettlebell', 'treadmill', 'bike');--> statement-breakpoint
CREATE TYPE "public"."fitness_goal_type" AS ENUM('weight_loss', 'muscle_gain', 'endurance', 'strength', 'flexibility', 'general_fitness');--> statement-breakpoint
CREATE TYPE "public"."severity" AS ENUM('low', 'medium', 'high');--> statement-breakpoint
CREATE TYPE "public"."time_of_day" AS ENUM('morning', 'afternoon', 'evening', 'night');--> statement-breakpoint
CREATE TYPE "public"."workout_type" AS ENUM('strength', 'cardio', 'yoga', 'pilates', 'crossfit', 'running', 'cycling', 'swimming');--> statement-breakpoint
CREATE TABLE "behavioral_event" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"event_name" varchar(100) NOT NULL,
	"entity_type" "entity_type" NOT NULL,
	"entity_id" integer,
	"context" jsonb,
	"session_id" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "context_pattern" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"context_type" varchar(50) NOT NULL,
	"context_name" varchar(100) NOT NULL,
	"context_data" jsonb NOT NULL,
	"frequency" integer NOT NULL,
	"time_of_day" time_of_day,
	"day_of_week" "day_of_week",
	"location" varchar(100),
	"weather" varchar(50),
	"mood" varchar(50),
	"energy_level" integer,
	"stress_level" integer,
	"social_context" varchar(100),
	"behavior_correlations" jsonb,
	"outcome_impact" jsonb,
	"predictive_power" numeric(5, 2),
	"first_observed" timestamp DEFAULT now() NOT NULL,
	"last_observed" timestamp DEFAULT now() NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "micro_behavior_pattern" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"pattern_name" varchar(100) NOT NULL,
	"behavior_type" varchar(50) NOT NULL,
	"frequency" integer NOT NULL,
	"frequency_period" varchar(20) DEFAULT 'week' NOT NULL,
	"consistency" numeric(5, 2),
	"strength" numeric(5, 2),
	"triggers" jsonb,
	"outcomes" jsonb,
	"context" jsonb,
	"correlations" jsonb,
	"confidence" numeric(5, 2),
	"sample_size" integer DEFAULT 0 NOT NULL,
	"first_observed" timestamp DEFAULT now() NOT NULL,
	"last_observed" timestamp DEFAULT now() NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_constraint" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"constraint_type" "constraint_type" NOT NULL,
	"severity" "severity" DEFAULT 'medium' NOT NULL,
	"title" varchar(100) NOT NULL,
	"description" varchar(500),
	"affected_body_parts" varchar(200),
	"restricted_exercises" varchar(500),
	"restricted_equipment" varchar(200),
	"time_restrictions" jsonb,
	"start_date" timestamp DEFAULT now() NOT NULL,
	"end_date" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"notes" varchar(1000),
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_fitness_goal" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"goal_type" "fitness_goal_type" NOT NULL,
	"target_value" numeric(10, 2),
	"current_value" numeric(10, 2),
	"unit" varchar(20),
	"target_date" timestamp,
	"priority" integer DEFAULT 1 NOT NULL,
	"status" "goal_status" DEFAULT 'active' NOT NULL,
	"description" varchar(500),
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_preference" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"preferred_workout_types" varchar(200),
	"preferred_equipment" varchar(200),
	"preferred_time_of_day" time_of_day,
	"preferred_days_of_week" varchar(100),
	"session_duration_min" integer DEFAULT 30 NOT NULL,
	"session_duration_max" integer DEFAULT 60 NOT NULL,
	"workout_frequency_per_week" integer DEFAULT 3 NOT NULL,
	"rest_day_preference" varchar(100),
	"intensity_preference" "difficulty_level" DEFAULT 'intermediate' NOT NULL,
	"music_preference" boolean DEFAULT true NOT NULL,
	"reminder_enabled" boolean DEFAULT true NOT NULL,
	"auto_progression_enabled" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_preference_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "user_profile" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"fitness_level" "difficulty_level" DEFAULT 'beginner' NOT NULL,
	"experience_years" integer DEFAULT 0 NOT NULL,
	"timezone" varchar(50) DEFAULT 'UTC' NOT NULL,
	"date_of_birth" timestamp,
	"height" numeric(5, 2),
	"weight" numeric(5, 2),
	"activity_level" varchar(20) DEFAULT 'moderate' NOT NULL,
	"profile_completeness" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_profile_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE INDEX "behavioral_event_user_created_at_idx" ON "behavioral_event" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "behavioral_event_user_event_name_idx" ON "behavioral_event" USING btree ("user_id","event_name");--> statement-breakpoint
CREATE INDEX "behavioral_event_event_name_created_at_idx" ON "behavioral_event" USING btree ("event_name","created_at");--> statement-breakpoint
CREATE INDEX "context_pattern_user_context_type_idx" ON "context_pattern" USING btree ("user_id","context_type");--> statement-breakpoint
CREATE INDEX "context_pattern_user_active_idx" ON "context_pattern" USING btree ("user_id","is_active");--> statement-breakpoint
CREATE INDEX "context_pattern_time_of_day_idx" ON "context_pattern" USING btree ("time_of_day");--> statement-breakpoint
CREATE INDEX "context_pattern_day_of_week_idx" ON "context_pattern" USING btree ("day_of_week");--> statement-breakpoint
CREATE INDEX "context_pattern_predictive_power_idx" ON "context_pattern" USING btree ("predictive_power");--> statement-breakpoint
CREATE INDEX "micro_behavior_pattern_user_behavior_type_idx" ON "micro_behavior_pattern" USING btree ("user_id","behavior_type");--> statement-breakpoint
CREATE INDEX "micro_behavior_pattern_user_active_idx" ON "micro_behavior_pattern" USING btree ("user_id","is_active");--> statement-breakpoint
CREATE INDEX "micro_behavior_pattern_strength_idx" ON "micro_behavior_pattern" USING btree ("strength");--> statement-breakpoint
CREATE INDEX "micro_behavior_pattern_last_observed_idx" ON "micro_behavior_pattern" USING btree ("last_observed");--> statement-breakpoint
CREATE INDEX "user_constraint_user_constraint_type_idx" ON "user_constraint" USING btree ("user_id","constraint_type");--> statement-breakpoint
CREATE INDEX "user_constraint_user_active_idx" ON "user_constraint" USING btree ("user_id","is_active");--> statement-breakpoint
CREATE INDEX "user_constraint_severity_idx" ON "user_constraint" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "user_fitness_goal_user_goal_type_idx" ON "user_fitness_goal" USING btree ("user_id","goal_type");--> statement-breakpoint
CREATE INDEX "user_fitness_goal_user_status_idx" ON "user_fitness_goal" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "user_preference_user_id_idx" ON "user_preference" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_preference_time_of_day_idx" ON "user_preference" USING btree ("preferred_time_of_day");--> statement-breakpoint
CREATE INDEX "user_profile_user_id_idx" ON "user_profile" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_profile_fitness_level_idx" ON "user_profile" USING btree ("fitness_level");