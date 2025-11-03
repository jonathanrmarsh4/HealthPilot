CREATE TABLE "ai_actions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"action_type" text NOT NULL,
	"target_table" text NOT NULL,
	"target_id" varchar,
	"changes_before" jsonb,
	"changes_after" jsonb,
	"reasoning" text NOT NULL,
	"conversation_context" text,
	"success" integer DEFAULT 1 NOT NULL,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"action" varchar NOT NULL,
	"resource_type" varchar NOT NULL,
	"resource_id" varchar,
	"ip_address" varchar,
	"user_agent" varchar,
	"metadata" jsonb,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "biomarkers" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"type" text NOT NULL,
	"value" real NOT NULL,
	"unit" text NOT NULL,
	"recorded_at" timestamp DEFAULT now() NOT NULL,
	"source" text DEFAULT 'manual' NOT NULL,
	"record_id" varchar
);
--> statement-breakpoint
CREATE TABLE "chat_feedback" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"message_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"feedback_type" varchar NOT NULL,
	"context" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_messages" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coach_memory" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"memory_type" varchar NOT NULL,
	"summary" text NOT NULL,
	"embedding" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cost_budgets" (
	"id" serial PRIMARY KEY NOT NULL,
	"daily_cpu_ms_cap" bigint NOT NULL,
	"daily_jobs_cap" integer NOT NULL,
	"llm_input_tokens_cap" bigint NOT NULL,
	"llm_output_tokens_cap" bigint NOT NULL,
	"apply_scope" varchar(16) NOT NULL,
	"updated_by" varchar(80),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "cost_global_daily" (
	"date" date PRIMARY KEY NOT NULL,
	"jobs" integer DEFAULT 0,
	"ai_calls" integer DEFAULT 0,
	"cpu_ms" bigint DEFAULT 0,
	"tokens_in" bigint DEFAULT 0,
	"tokens_out" bigint DEFAULT 0,
	"cost_usd" numeric(12, 6) DEFAULT '0',
	"tier_breakdown_json" jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "cost_user_daily" (
	"user_id" varchar(40) NOT NULL,
	"date" date NOT NULL,
	"tier" varchar(16) NOT NULL,
	"jobs" integer DEFAULT 0,
	"ai_calls" integer DEFAULT 0,
	"cpu_ms" bigint DEFAULT 0,
	"tokens_in" bigint DEFAULT 0,
	"tokens_out" bigint DEFAULT 0,
	"cost_usd" numeric(12, 6) DEFAULT '0',
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "cost_user_daily_user_id_date_pk" PRIMARY KEY("user_id","date")
);
--> statement-breakpoint
CREATE TABLE "daily_health_insights" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(40) NOT NULL,
	"date" date NOT NULL,
	"generated_for" date NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"metric" varchar(64) NOT NULL,
	"severity" varchar(16) NOT NULL,
	"confidence" real NOT NULL,
	"evidence" jsonb,
	"status" varchar(16) DEFAULT 'active' NOT NULL,
	"score" real,
	"issued_by" varchar(64) DEFAULT 'system',
	"recommendation_id" varchar,
	"acknowledged_at" timestamp with time zone,
	"dismissed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "daily_metrics" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(40) NOT NULL,
	"name" varchar(64) NOT NULL,
	"value" real NOT NULL,
	"unit" varchar(32) NOT NULL,
	"observed_at" timestamp with time zone NOT NULL,
	"source" varchar(64) NOT NULL,
	"quality_flag" varchar(16) NOT NULL,
	"user_completion_status" varchar(16),
	"is_baseline_eligible" boolean DEFAULT true NOT NULL,
	"exclusion_reason" varchar(128),
	"ingestion_metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "daily_reminders" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"frequency" text DEFAULT 'daily' NOT NULL,
	"time_of_day" text,
	"linked_record_id" varchar,
	"active" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exercise_feedback" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"exercise_name" text NOT NULL,
	"feedback" text NOT NULL,
	"context" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exercise_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workout_session_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"exercise_name" text NOT NULL,
	"sets" integer,
	"reps" integer,
	"weight" real,
	"rest_time" integer,
	"personal_record" integer DEFAULT 0 NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exercise_media_attempt_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"hp_exercise_id" varchar,
	"hp_exercise_name" text NOT NULL,
	"target" text,
	"body_part" text,
	"equipment" text,
	"reason" text NOT NULL,
	"external_id" text,
	"chosen_id" text,
	"chosen_name" text,
	"score" real,
	"candidate_count" integer,
	"candidates" jsonb,
	"review_status" text DEFAULT 'pending' NOT NULL,
	"reviewed_by" varchar,
	"reviewed_at" timestamp,
	"approved_exercisedb_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exercise_set_details" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"training_load_session_id" varchar NOT NULL,
	"exercise_name" text NOT NULL,
	"set_index" integer NOT NULL,
	"weight" real,
	"reps" integer,
	"distance" real,
	"duration" integer,
	"rpe" integer,
	"difficulty_rating" integer,
	"form_quality" integer,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exercise_sets" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workout_session_id" varchar NOT NULL,
	"exercise_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"set_index" integer NOT NULL,
	"target_reps_low" integer,
	"target_reps_high" integer,
	"weight" real,
	"reps" integer,
	"distance" real,
	"duration" integer,
	"rpe_logged" integer,
	"completed" integer DEFAULT 0 NOT NULL,
	"notes" text,
	"rest_started_at" timestamp,
	"tempo" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exercise_templates" (
	"id" varchar PRIMARY KEY NOT NULL,
	"pattern" text NOT NULL,
	"modality" text NOT NULL,
	"angle" text DEFAULT 'neutral',
	"display_name" text NOT NULL,
	"muscles" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"instructions" text,
	"video_url" text,
	"difficulty" text DEFAULT 'intermediate',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exercisedb_exercises" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"exercise_id" text NOT NULL,
	"name" text NOT NULL,
	"body_part" text NOT NULL,
	"equipment" text NOT NULL,
	"target" text NOT NULL,
	"secondary_muscles" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"instructions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "exercisedb_exercises_exercise_id_unique" UNIQUE("exercise_id")
);
--> statement-breakpoint
CREATE TABLE "exercisedb_sync_log" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"synced_at" timestamp DEFAULT now() NOT NULL,
	"exercise_count" integer NOT NULL,
	"success" integer DEFAULT 1 NOT NULL,
	"error_message" text
);
--> statement-breakpoint
CREATE TABLE "exercises" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"muscles" text[] NOT NULL,
	"target" text,
	"body_part" text,
	"equipment" text NOT NULL,
	"increment_step" real DEFAULT 2.5 NOT NULL,
	"tempo_default" text,
	"rest_default" integer DEFAULT 90,
	"instructions" text,
	"video_url" text,
	"difficulty" text DEFAULT 'intermediate',
	"category" text NOT NULL,
	"tracking_type" text DEFAULT 'weight_reps' NOT NULL,
	"exercisedb_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "exercises_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "favorite_recipes" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"spoonacular_recipe_id" integer NOT NULL,
	"recipe_name" text NOT NULL,
	"image_url" text,
	"ready_in_minutes" integer,
	"servings" integer,
	"recipe_data" jsonb,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fitness_profiles" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"fitness_level" varchar DEFAULT 'intermediate' NOT NULL,
	"training_experience" integer,
	"current_training_frequency" integer,
	"has_gym_access" integer DEFAULT 0 NOT NULL,
	"gym_type" varchar,
	"home_equipment" text[],
	"special_facilities" text[],
	"recovery_equipment" text[],
	"primary_goal" varchar,
	"secondary_goals" text[],
	"preferred_workout_types" text[],
	"preferred_duration" integer,
	"preferred_intensity" varchar,
	"available_days" text[],
	"injuries" text[],
	"limitations" text[],
	"medical_conditions" text[],
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "fitness_profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "generated_workouts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(40) NOT NULL,
	"date" date NOT NULL,
	"workout_data" jsonb NOT NULL,
	"status" varchar(16) DEFAULT 'pending' NOT NULL,
	"accepted_snapshot" jsonb,
	"user_modifications" jsonb,
	"feedback_notes" text,
	"regeneration_count" integer DEFAULT 0 NOT NULL,
	"accepted_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "goal_conversations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"initial_input" text NOT NULL,
	"conversation_history" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"extracted_context" jsonb DEFAULT '{}'::jsonb,
	"detected_goal_type" text,
	"question_count" integer DEFAULT 0 NOT NULL,
	"ready_for_synthesis" integer DEFAULT 0 NOT NULL,
	"synthesized_goal" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "goal_metrics" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"goal_id" varchar NOT NULL,
	"metric_key" text NOT NULL,
	"label" text NOT NULL,
	"target_value" text,
	"unit" text,
	"source" text DEFAULT 'manual' NOT NULL,
	"direction" text DEFAULT 'increase' NOT NULL,
	"baseline_value" text,
	"current_value" text,
	"confidence" real,
	"priority" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "goal_milestones" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"goal_id" varchar NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"due_date" timestamp NOT NULL,
	"completion_rule" jsonb,
	"status" text DEFAULT 'pending' NOT NULL,
	"progress_pct" real DEFAULT 0 NOT NULL,
	"achieved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "goal_plan_sessions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"goal_plan_id" varchar NOT NULL,
	"session_template_id" text NOT NULL,
	"phase_number" integer NOT NULL,
	"phase_name" text NOT NULL,
	"week_number" integer NOT NULL,
	"week_label" text NOT NULL,
	"session_data" jsonb NOT NULL,
	"scheduled_for" timestamp,
	"scheduled_workout_id" varchar,
	"status" text DEFAULT 'unscheduled' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "goal_plans" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"goal_id" varchar NOT NULL,
	"plan_type" text NOT NULL,
	"period" text NOT NULL,
	"content_json" jsonb NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"source_prompt_hash" text,
	"is_active" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "goals" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"metric_type" text,
	"target_value" real,
	"current_value" real,
	"start_value" real,
	"target_value_data" jsonb,
	"current_value_data" jsonb,
	"start_value_data" jsonb,
	"unit" text,
	"input_text" text,
	"canonical_goal_type" text,
	"goal_entities_json" jsonb,
	"target_date" timestamp,
	"deadline" timestamp,
	"status" text DEFAULT 'active' NOT NULL,
	"notes" text,
	"created_by_ai" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"achieved_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "health_records" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"name" text NOT NULL,
	"file_id" text,
	"file_url" text,
	"type" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"error_message" text,
	"uploaded_at" timestamp DEFAULT now() NOT NULL,
	"analyzed_at" timestamp,
	"ai_analysis" jsonb,
	"extracted_data" jsonb
);
--> statement-breakpoint
CREATE TABLE "hk_events_raw" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"type" text NOT NULL,
	"ts_start_utc" timestamp,
	"ts_end_utc" timestamp,
	"ts_instant_utc" timestamp,
	"unit" text,
	"value_json" jsonb NOT NULL,
	"source" text DEFAULT 'health-auto-export' NOT NULL,
	"idempotency_key" text NOT NULL,
	"received_at_utc" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "insight_feedback" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"insight_id" varchar NOT NULL,
	"feedback" text NOT NULL,
	"context" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "insights" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"category" text NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"insight_data" jsonb,
	"actionable" integer DEFAULT 1 NOT NULL,
	"insight_type" text DEFAULT 'comment' NOT NULL,
	"dismissed" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"relevant_date" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "labs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(40) NOT NULL,
	"panel" varchar(64) NOT NULL,
	"marker" varchar(64) NOT NULL,
	"value" real NOT NULL,
	"unit" varchar(32) NOT NULL,
	"ref_low" real,
	"ref_high" real,
	"observed_at" timestamp with time zone NOT NULL,
	"source" varchar(64) DEFAULT 'lab' NOT NULL,
	"quality_flag" varchar(16) DEFAULT 'good' NOT NULL,
	"is_baseline_eligible" boolean DEFAULT true NOT NULL,
	"exclusion_reason" varchar(128),
	"ingestion_metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "landing_page_content" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hero_title" text DEFAULT 'HealthPilot' NOT NULL,
	"hero_subtitle" text DEFAULT 'Your Body, Decoded' NOT NULL,
	"hero_description" text NOT NULL,
	"hero_badge_text" text DEFAULT 'AI-Powered Health Intelligence',
	"hero_cta_primary" text DEFAULT 'Start Free',
	"hero_cta_primary_link" text DEFAULT '/api/login',
	"hero_cta_secondary" text DEFAULT 'Watch Demo',
	"hero_cta_secondary_link" text DEFAULT '/security',
	"hero_image_url" text,
	"hero_visible" integer DEFAULT 1 NOT NULL,
	"how_it_works_title" text DEFAULT 'How It Works',
	"how_it_works_subtitle" text DEFAULT 'Three steps from data to daily action.',
	"how_it_works_visible" integer DEFAULT 1 NOT NULL,
	"features_title" text DEFAULT 'Features',
	"features_subtitle" text,
	"features_visible" integer DEFAULT 1 NOT NULL,
	"testimonials_title" text DEFAULT 'What Our Users Say',
	"testimonials_subtitle" text,
	"testimonials_visible" integer DEFAULT 1 NOT NULL,
	"pricing_title" text DEFAULT 'Simple, Transparent Pricing',
	"pricing_subtitle" text,
	"pricing_visible" integer DEFAULT 1 NOT NULL,
	"meta_title" text,
	"meta_description" text,
	"meta_keywords" text,
	"og_title" text,
	"og_description" text,
	"og_image" text,
	"twitter_title" text,
	"twitter_description" text,
	"twitter_image" text,
	"canonical_url" text,
	"robots_meta" text DEFAULT 'index, follow',
	"google_analytics_id" text,
	"google_tag_manager_id" text,
	"meta_pixel_id" text,
	"premium_theme_enabled" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "landing_page_features" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"section" varchar NOT NULL,
	"icon" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"visible" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "landing_page_pricing_plans" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"price" text NOT NULL,
	"description" text,
	"features" text[] NOT NULL,
	"cta_text" text DEFAULT 'Get Started' NOT NULL,
	"cta_link" text NOT NULL,
	"highlighted" integer DEFAULT 0 NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"visible" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "landing_page_social_links" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"platform" varchar NOT NULL,
	"url" text NOT NULL,
	"icon" text,
	"order" integer DEFAULT 0 NOT NULL,
	"visible" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "landing_page_testimonials" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"role" text NOT NULL,
	"company" text,
	"photo_url" text,
	"quote" text NOT NULL,
	"rating" integer DEFAULT 5,
	"order" integer DEFAULT 0 NOT NULL,
	"visible" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meal_feedback" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"meal_library_id" varchar,
	"meal_plan_id" varchar,
	"feedback" text NOT NULL,
	"feedback_type" text DEFAULT 'session' NOT NULL,
	"swipe_direction" text,
	"user_was_premium" integer DEFAULT 0 NOT NULL,
	"notes" text,
	"meal_name" text,
	"meal_type" text,
	"cuisines" text[],
	"dish_types" text[],
	"calories" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meal_library" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"spoonacular_recipe_id" integer,
	"title" text NOT NULL,
	"description" text,
	"image_url" varchar,
	"source_url" text,
	"ready_in_minutes" integer,
	"servings" integer DEFAULT 1,
	"calories" integer,
	"protein" real,
	"carbs" real,
	"fat" real,
	"ingredients" jsonb,
	"instructions" text,
	"extended_ingredients" jsonb,
	"cuisines" text[],
	"dish_types" text[],
	"diets" text[],
	"meal_types" text[],
	"difficulty" text,
	"total_served" integer DEFAULT 0 NOT NULL,
	"thumbs_up_count" integer DEFAULT 0 NOT NULL,
	"thumbs_down_count" integer DEFAULT 0 NOT NULL,
	"conversion_rate" real DEFAULT 0,
	"status" text DEFAULT 'active' NOT NULL,
	"flagged_at" timestamp,
	"replaced_at" timestamp,
	"imported_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "meal_library_spoonacular_recipe_id_unique" UNIQUE("spoonacular_recipe_id")
);
--> statement-breakpoint
CREATE TABLE "meal_library_settings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"library_size_target" integer DEFAULT 100 NOT NULL,
	"deletion_threshold" real DEFAULT 0.4 NOT NULL,
	"replacement_frequency" text DEFAULT 'monthly' NOT NULL,
	"last_replacement_run" timestamp,
	"next_replacement_run" timestamp,
	"auto_replace_enabled" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meal_plans" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"meal_type" text NOT NULL,
	"calories" integer NOT NULL,
	"protein" real NOT NULL,
	"carbs" real NOT NULL,
	"fat" real NOT NULL,
	"prep_time" integer NOT NULL,
	"recipe" text,
	"detailed_recipe" text,
	"ingredients" text[],
	"servings" integer DEFAULT 1,
	"image_url" varchar,
	"scheduled_date" timestamp,
	"tags" text[],
	"spoonacular_recipe_id" integer,
	"source_url" text,
	"ready_in_minutes" integer,
	"health_score" real,
	"dish_types" text[],
	"diets" text[],
	"cuisines" text[],
	"extended_ingredients" jsonb,
	"analyzed_instructions" jsonb,
	"nutrition_data" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"user_feedback" text,
	"feedback_at" timestamp,
	"ai_reasoning" text,
	"meal_library_id" varchar
);
--> statement-breakpoint
CREATE TABLE "meal_recommendation_history" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"request_id" varchar NOT NULL,
	"meal_slot" varchar NOT NULL,
	"recommendations" jsonb NOT NULL,
	"filter_stats" jsonb,
	"scoring_weights" jsonb,
	"context_data" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "medical_reports" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"file_path" text NOT NULL,
	"file_name" text NOT NULL,
	"report_type" text,
	"source_format" text NOT NULL,
	"raw_data_json" jsonb,
	"interpreted_data_json" jsonb,
	"status" text DEFAULT 'pending' NOT NULL,
	"confidence_scores" jsonb,
	"user_feedback" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"processed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "message_usage" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"message_date" timestamp DEFAULT now() NOT NULL,
	"message_count" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "metric_standards" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"metric_key" text NOT NULL,
	"standard_type" text NOT NULL,
	"category" text NOT NULL,
	"age_min" integer,
	"age_max" integer,
	"gender" text DEFAULT 'all' NOT NULL,
	"value_min" real,
	"value_max" real,
	"value_single" real,
	"unit" text,
	"percentile" integer,
	"level" text,
	"source_name" text NOT NULL,
	"source_url" text,
	"source_description" text,
	"confidence_score" real DEFAULT 1 NOT NULL,
	"evidence_level" text DEFAULT 'professional_org' NOT NULL,
	"is_active" integer DEFAULT 1 NOT NULL,
	"verified_by_admin" integer DEFAULT 0 NOT NULL,
	"last_verified_at" timestamp,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mobile_sessions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "mobile_sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "muscle_group_engagements" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"workout_session_id" varchar NOT NULL,
	"muscle_group" text NOT NULL,
	"engagement_level" text NOT NULL,
	"total_sets" integer DEFAULT 0 NOT NULL,
	"total_volume" real,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_channels" (
	"user_id" varchar NOT NULL,
	"channel" varchar NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"quiet_hours" varchar DEFAULT '22:00-07:00',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_events" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"notification_id" varchar NOT NULL,
	"event" varchar NOT NULL,
	"event_at" timestamp with time zone DEFAULT now() NOT NULL,
	"meta" jsonb
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"channel" varchar NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"payload" jsonb,
	"deep_link" varchar,
	"scheduled_at" timestamp with time zone,
	"sent_at" timestamp with time zone,
	"read_at" timestamp with time zone,
	"provider_message_id" varchar,
	"status" varchar DEFAULT 'pending' NOT NULL,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nutrition_profiles" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"dietary_preferences" text[],
	"allergies" text[],
	"intolerances" text[],
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "nutrition_profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "page_tile_preferences" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"page" varchar NOT NULL,
	"visible" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"order" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "preference_vectors" (
	"user_id" varchar NOT NULL,
	"preference_type" varchar NOT NULL,
	"weight" real DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "proactive_suggestions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"metric_type" text NOT NULL,
	"current_value" real NOT NULL,
	"target_value" real NOT NULL,
	"deficit" real NOT NULL,
	"suggested_activity" text NOT NULL,
	"activity_type" text NOT NULL,
	"duration" integer,
	"reasoning" text NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"scheduled_for" timestamp,
	"notified_at" timestamp,
	"responded_at" timestamp,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "promo_codes" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar NOT NULL,
	"discount_percent" integer NOT NULL,
	"valid_from" timestamp NOT NULL,
	"valid_until" timestamp NOT NULL,
	"max_uses" integer,
	"current_uses" integer DEFAULT 0 NOT NULL,
	"allowed_tiers" text[],
	"is_active" integer DEFAULT 1 NOT NULL,
	"created_by" varchar NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "promo_codes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "readiness_scores" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"date" timestamp NOT NULL,
	"score" real NOT NULL,
	"quality" text NOT NULL,
	"recommendation" text NOT NULL,
	"reasoning" text NOT NULL,
	"sleep_score" real,
	"sleep_value" real,
	"hrv_score" real,
	"hrv_value" real,
	"resting_hr_score" real,
	"resting_hr_value" real,
	"workload_score" real,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "readiness_settings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"sleep_weight" real DEFAULT 0.4 NOT NULL,
	"hrv_weight" real DEFAULT 0.3 NOT NULL,
	"resting_hr_weight" real DEFAULT 0.15 NOT NULL,
	"workload_weight" real DEFAULT 0.15 NOT NULL,
	"alert_threshold" real DEFAULT 50 NOT NULL,
	"alerts_enabled" integer DEFAULT 1 NOT NULL,
	"use_personal_baselines" integer DEFAULT 0 NOT NULL,
	"personal_hrv_baseline" real,
	"personal_resting_hr_baseline" real,
	"personal_sleep_hours_baseline" real,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "readiness_settings_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "recommendations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"category" text NOT NULL,
	"priority" text NOT NULL,
	"details" text,
	"action_label" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"dismissed" integer DEFAULT 0 NOT NULL,
	"scheduled_at" timestamp,
	"training_schedule_id" varchar,
	"user_feedback" text,
	"dismiss_reason" text
);
--> statement-breakpoint
CREATE TABLE "recovery_protocols" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"description" text NOT NULL,
	"duration" integer,
	"difficulty" text NOT NULL,
	"benefits" text[],
	"instructions" text,
	"target_factors" text[],
	"tags" text[],
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "referrals" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"referrer_user_id" varchar NOT NULL,
	"referred_user_id" varchar,
	"referral_code" varchar NOT NULL,
	"status" varchar DEFAULT 'pending' NOT NULL,
	"converted_at" timestamp,
	"reward_granted" integer DEFAULT 0 NOT NULL,
	"rewarded_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "referrals_referral_code_unique" UNIQUE("referral_code")
);
--> statement-breakpoint
CREATE TABLE "reminder_completions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reminder_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"completed_at" timestamp DEFAULT now() NOT NULL,
	"date" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "safety_escalations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"trigger_keyword" varchar NOT NULL,
	"context" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scheduled_exercise_recommendations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"exercise_name" text NOT NULL,
	"exercise_type" text NOT NULL,
	"description" text NOT NULL,
	"duration" integer,
	"frequency" text NOT NULL,
	"recommended_by" text DEFAULT 'ai' NOT NULL,
	"reason" text NOT NULL,
	"is_supplementary" integer DEFAULT 1 NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"intent" text DEFAULT 'proactive_insight' NOT NULL,
	"scheduled_dates" text[],
	"user_feedback" text,
	"decline_reason" text,
	"recommended_at" timestamp DEFAULT now() NOT NULL,
	"scheduled_at" timestamp,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "scheduled_insights" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"insight_id" varchar,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"category" text NOT NULL,
	"activity_type" text NOT NULL,
	"duration" integer,
	"frequency" text NOT NULL,
	"context_trigger" text,
	"recommended_by" text DEFAULT 'ai' NOT NULL,
	"reason" text,
	"priority" text DEFAULT 'medium' NOT NULL,
	"insight_type" text DEFAULT 'actionable' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"scheduled_dates" text[],
	"user_feedback" text,
	"feedback_note" text,
	"recommended_at" timestamp DEFAULT now() NOT NULL,
	"scheduled_at" timestamp,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "scheduled_reminders" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"type" varchar NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"schedule" varchar NOT NULL,
	"deep_link" varchar,
	"enabled" boolean DEFAULT true NOT NULL,
	"last_sent_at" timestamp with time zone,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session_prs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workout_session_id" varchar NOT NULL,
	"exercise_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"pr_type" text NOT NULL,
	"value" real NOT NULL,
	"previous_best" real,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sleep_sessions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"bedtime" timestamp NOT NULL,
	"waketime" timestamp NOT NULL,
	"total_minutes" integer NOT NULL,
	"awake_minutes" integer DEFAULT 0,
	"light_minutes" integer DEFAULT 0,
	"deep_minutes" integer DEFAULT 0,
	"rem_minutes" integer DEFAULT 0,
	"sleep_score" integer,
	"quality" text,
	"source" text DEFAULT 'apple-health' NOT NULL,
	"episode_type" text DEFAULT 'primary',
	"episode_id" varchar,
	"night_key_local_date" text,
	"awakenings_count" integer DEFAULT 0,
	"longest_awake_bout_minutes" integer DEFAULT 0,
	"sleep_midpoint_local" timestamp,
	"sleep_efficiency" real,
	"flags" text[] DEFAULT ARRAY[]::text[],
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "smartfuel_guidance" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"themes_detected" text[] NOT NULL,
	"overview" text NOT NULL,
	"avoid_items" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"include_items" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"targets" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"tip" text,
	"guidance_data" jsonb NOT NULL,
	"rules_version" varchar DEFAULT '1.0.0' NOT NULL,
	"evidence_source" jsonb,
	"status" varchar DEFAULT 'active' NOT NULL,
	"superseded_by" varchar,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"stripe_subscription_id" varchar NOT NULL,
	"stripe_price_id" varchar NOT NULL,
	"tier" varchar NOT NULL,
	"billing_cycle" varchar NOT NULL,
	"status" varchar NOT NULL,
	"current_period_start" timestamp NOT NULL,
	"current_period_end" timestamp NOT NULL,
	"cancel_at_period_end" integer DEFAULT 0 NOT NULL,
	"canceled_at" timestamp,
	"trial_start" timestamp,
	"trial_end" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "subscriptions_stripe_subscription_id_unique" UNIQUE("stripe_subscription_id")
);
--> statement-breakpoint
CREATE TABLE "supplement_recommendations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"supplement_name" text NOT NULL,
	"dosage" text NOT NULL,
	"reason" text NOT NULL,
	"biomarker_linked" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"recommended_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supplements" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"name" text NOT NULL,
	"dosage" text NOT NULL,
	"timing" text NOT NULL,
	"purpose" text,
	"active" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "symptom_events" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"name" text NOT NULL,
	"coding" jsonb,
	"episode_id" varchar NOT NULL,
	"status" text NOT NULL,
	"severity" integer,
	"trend" text,
	"context" text[] DEFAULT ARRAY[]::text[],
	"notes" text,
	"signals" jsonb,
	"started_at" timestamp NOT NULL,
	"recorded_at" timestamp NOT NULL,
	"ended_at" timestamp,
	"source" text DEFAULT 'user' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" varchar(255) NOT NULL,
	"value" text NOT NULL,
	"description" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "system_settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "telemetry_job_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"job_id" varchar(40),
	"job_type" varchar(40),
	"user_id" varchar(40) NOT NULL,
	"tier" varchar(16) NOT NULL,
	"domain" varchar(16) NOT NULL,
	"queued_at" timestamp with time zone,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"duration_ms" integer,
	"queue_wait_ms" integer,
	"success" boolean,
	"error_code" varchar(64),
	"attempt" integer DEFAULT 1,
	"rows_read" integer DEFAULT 0,
	"rows_written" integer DEFAULT 0,
	"cpu_ms" integer DEFAULT 0,
	"mem_mb_peak" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "telemetry_llm_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(40) NOT NULL,
	"tier" varchar(16) NOT NULL,
	"llm_model" varchar(40) NOT NULL,
	"context_type" varchar(32) NOT NULL,
	"input_tokens" integer NOT NULL,
	"output_tokens" integer NOT NULL,
	"cache_hit" boolean DEFAULT false,
	"duration_ms" integer,
	"success" boolean,
	"error_code" varchar(64),
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "training_load_sessions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"workout_session_id" varchar NOT NULL,
	"total_volume" real,
	"total_tonnage" real,
	"avg_intensity" real,
	"peak_rpe" integer,
	"estimated_one_rep_max" real,
	"completion_status" text DEFAULT 'completed' NOT NULL,
	"overall_difficulty" integer,
	"fatigue_level" integer,
	"enjoyment_rating" integer,
	"would_repeat" integer,
	"exercises_too_easy" text[],
	"exercises_too_hard" text[],
	"pain_or_discomfort" text,
	"feedback_notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "training_schedules" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"day" text NOT NULL,
	"workout_type" text NOT NULL,
	"session_type" text DEFAULT 'workout' NOT NULL,
	"duration" integer NOT NULL,
	"intensity" text NOT NULL,
	"description" text,
	"exercises" jsonb NOT NULL,
	"is_optional" integer DEFAULT 0 NOT NULL,
	"core_program" integer DEFAULT 0 NOT NULL,
	"scheduled_for" timestamp,
	"completed" integer DEFAULT 0 NOT NULL,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_bandit_state" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"arm_key" varchar NOT NULL,
	"alpha" real DEFAULT 1 NOT NULL,
	"beta" real DEFAULT 1 NOT NULL,
	"last_updated" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_arm_unique" UNIQUE("user_id","arm_key")
);
--> statement-breakpoint
CREATE TABLE "user_consents" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"consent_type" varchar NOT NULL,
	"granted" integer DEFAULT 0 NOT NULL,
	"granted_at" timestamp,
	"revoked_at" timestamp,
	"ip_address" varchar,
	"user_agent" varchar,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_meal_preferences" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"meal_id" varchar NOT NULL,
	"signal" varchar NOT NULL,
	"strength" real DEFAULT 1 NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"meal_type" varchar,
	"context" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_protocol_completions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"protocol_id" varchar NOT NULL,
	"completed_at" timestamp DEFAULT now() NOT NULL,
	"date" text NOT NULL,
	"context" jsonb
);
--> statement-breakpoint
CREATE TABLE "user_protocol_preferences" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"protocol_id" varchar NOT NULL,
	"preference" text NOT NULL,
	"context" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_response_patterns" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"suggestion_id" varchar NOT NULL,
	"metric_type" text NOT NULL,
	"time_of_day" text NOT NULL,
	"hour_of_day" integer NOT NULL,
	"day_of_week" text NOT NULL,
	"response" text NOT NULL,
	"deficit_amount" real NOT NULL,
	"activity_type" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text DEFAULT '' NOT NULL,
	"password" text DEFAULT '' NOT NULL,
	"timezone" varchar DEFAULT 'UTC',
	"email" varchar,
	"first_name" varchar,
	"last_name" varchar,
	"profile_image_url" varchar,
	"role" varchar DEFAULT 'user' NOT NULL,
	"subscription_tier" varchar DEFAULT 'free' NOT NULL,
	"subscription_status" varchar DEFAULT 'active',
	"stripe_customer_id" varchar,
	"referral_code" varchar,
	"height" real,
	"date_of_birth" timestamp,
	"gender" varchar,
	"blood_type" varchar,
	"activity_level" varchar,
	"location" varchar,
	"dashboard_preferences" jsonb,
	"personal_context" jsonb,
	"onboarding_completed" integer DEFAULT 0 NOT NULL,
	"onboarding_step" varchar,
	"basic_info_complete" integer DEFAULT 0 NOT NULL,
	"training_setup_complete" integer DEFAULT 0 NOT NULL,
	"meals_setup_complete" integer DEFAULT 0 NOT NULL,
	"supplements_setup_complete" integer DEFAULT 0 NOT NULL,
	"biomarkers_setup_complete" integer DEFAULT 0 NOT NULL,
	"health_kit_setup_complete" integer DEFAULT 0 NOT NULL,
	"onboarding_started_at" timestamp,
	"onboarding_completed_at" timestamp,
	"eula_accepted_at" timestamp,
	"consent_given_at" timestamp,
	"deletion_scheduled_at" timestamp,
	"medical_reports_used_this_month" integer DEFAULT 0 NOT NULL,
	"medical_reports_month_start" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_referral_code_unique" UNIQUE("referral_code")
);
--> statement-breakpoint
CREATE TABLE "voice_sessions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"summary" text NOT NULL,
	"embedding" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workout_instances" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"workout_session_id" varchar,
	"workout_type" text NOT NULL,
	"source_type" text DEFAULT 'daily_recommendation' NOT NULL,
	"source_id" varchar,
	"snapshot_data" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workout_sessions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"workout_type" text NOT NULL,
	"session_type" text DEFAULT 'workout' NOT NULL,
	"start_time" timestamp NOT NULL,
	"end_time" timestamp NOT NULL,
	"duration" integer NOT NULL,
	"distance" real,
	"calories" integer,
	"avg_heart_rate" integer,
	"max_heart_rate" integer,
	"source_type" text DEFAULT 'manual' NOT NULL,
	"source_id" text,
	"training_schedule_id" varchar,
	"notes" text,
	"perceived_effort" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_feedback" ADD CONSTRAINT "chat_feedback_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coach_memory" ADD CONSTRAINT "coach_memory_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_recommendation_history" ADD CONSTRAINT "meal_recommendation_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "preference_vectors" ADD CONSTRAINT "preference_vectors_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referrer_user_id_users_id_fk" FOREIGN KEY ("referrer_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referred_user_id_users_id_fk" FOREIGN KEY ("referred_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "safety_escalations" ADD CONSTRAINT "safety_escalations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_bandit_state" ADD CONSTRAINT "user_bandit_state_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_consents" ADD CONSTRAINT "user_consents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_meal_preferences" ADD CONSTRAINT "user_meal_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_meal_preferences" ADD CONSTRAINT "user_meal_preferences_meal_id_meal_library_id_fk" FOREIGN KEY ("meal_id") REFERENCES "public"."meal_library"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voice_sessions" ADD CONSTRAINT "voice_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "audit_logs_timestamp_idx" ON "audit_logs" USING btree ("timestamp");--> statement-breakpoint
CREATE UNIQUE INDEX "biomarkers_dedup_idx" ON "biomarkers" USING btree ("user_id","type","recorded_at","source");--> statement-breakpoint
CREATE INDEX "chat_feedback_user_idx" ON "chat_feedback" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "chat_feedback_message_idx" ON "chat_feedback" USING btree ("message_id");--> statement-breakpoint
CREATE INDEX "coach_memory_user_idx" ON "coach_memory" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "coach_memory_type_idx" ON "coach_memory" USING btree ("memory_type");--> statement-breakpoint
CREATE INDEX "cost_user_daily_date_idx" ON "cost_user_daily" USING btree ("date");--> statement-breakpoint
CREATE INDEX "cost_user_daily_tier_date_idx" ON "cost_user_daily" USING btree ("tier","date");--> statement-breakpoint
CREATE INDEX "daily_health_insights_user_date_status_score_idx" ON "daily_health_insights" USING btree ("user_id","date","status","score" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "daily_health_insights_user_date_idx" ON "daily_health_insights" USING btree ("user_id","date");--> statement-breakpoint
CREATE INDEX "daily_health_insights_date_idx" ON "daily_health_insights" USING btree ("date");--> statement-breakpoint
CREATE UNIQUE INDEX "daily_health_insights_user_date_metric_active_idx" ON "daily_health_insights" USING btree ("user_id","date","metric") WHERE "daily_health_insights"."status" = 'active';--> statement-breakpoint
CREATE INDEX "daily_metrics_user_name_observed_desc_idx" ON "daily_metrics" USING btree ("user_id","name","observed_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "daily_metrics_user_name_baseline_idx" ON "daily_metrics" USING btree ("user_id","name","is_baseline_eligible") WHERE "daily_metrics"."is_baseline_eligible" = true;--> statement-breakpoint
CREATE INDEX "daily_metrics_observed_idx" ON "daily_metrics" USING btree ("observed_at");--> statement-breakpoint
CREATE INDEX "media_attempt_logs_reason_idx" ON "exercise_media_attempt_logs" USING btree ("reason");--> statement-breakpoint
CREATE INDEX "media_attempt_logs_review_status_idx" ON "exercise_media_attempt_logs" USING btree ("review_status");--> statement-breakpoint
CREATE INDEX "media_attempt_logs_hp_exercise_idx" ON "exercise_media_attempt_logs" USING btree ("hp_exercise_id");--> statement-breakpoint
CREATE INDEX "media_attempt_logs_created_at_idx" ON "exercise_media_attempt_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "exercise_set_details_user_exercise_created_idx" ON "exercise_set_details" USING btree ("user_id","exercise_name","created_at");--> statement-breakpoint
CREATE INDEX "exercise_sets_user_exercise_created_idx" ON "exercise_sets" USING btree ("user_id","exercise_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "exercise_templates_pattern_modality_angle_idx" ON "exercise_templates" USING btree ("pattern","modality","angle");--> statement-breakpoint
CREATE INDEX "exercisedb_exercises_name_idx" ON "exercisedb_exercises" USING btree ("name");--> statement-breakpoint
CREATE INDEX "exercisedb_exercises_body_part_idx" ON "exercisedb_exercises" USING btree ("body_part");--> statement-breakpoint
CREATE INDEX "exercisedb_exercises_equipment_idx" ON "exercisedb_exercises" USING btree ("equipment");--> statement-breakpoint
CREATE INDEX "exercisedb_exercises_target_idx" ON "exercisedb_exercises" USING btree ("target");--> statement-breakpoint
CREATE INDEX "generated_workouts_user_date_idx" ON "generated_workouts" USING btree ("user_id","date");--> statement-breakpoint
CREATE INDEX "generated_workouts_user_status_idx" ON "generated_workouts" USING btree ("user_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "generated_workouts_user_date_unique_idx" ON "generated_workouts" USING btree ("user_id","date");--> statement-breakpoint
CREATE INDEX "goal_conversations_user_idx" ON "goal_conversations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "goal_conversations_status_idx" ON "goal_conversations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "goal_metrics_goal_id_idx" ON "goal_metrics" USING btree ("goal_id");--> statement-breakpoint
CREATE INDEX "goal_metrics_metric_key_idx" ON "goal_metrics" USING btree ("metric_key");--> statement-breakpoint
CREATE INDEX "goal_milestones_goal_id_idx" ON "goal_milestones" USING btree ("goal_id");--> statement-breakpoint
CREATE INDEX "goal_milestones_due_date_idx" ON "goal_milestones" USING btree ("due_date");--> statement-breakpoint
CREATE INDEX "goal_plan_sessions_plan_id_idx" ON "goal_plan_sessions" USING btree ("goal_plan_id");--> statement-breakpoint
CREATE INDEX "goal_plan_sessions_template_id_idx" ON "goal_plan_sessions" USING btree ("session_template_id");--> statement-breakpoint
CREATE INDEX "goal_plan_sessions_status_idx" ON "goal_plan_sessions" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "goal_plan_sessions_plan_template_idx" ON "goal_plan_sessions" USING btree ("goal_plan_id","session_template_id");--> statement-breakpoint
CREATE INDEX "goal_plans_goal_id_idx" ON "goal_plans" USING btree ("goal_id");--> statement-breakpoint
CREATE INDEX "goal_plans_plan_type_idx" ON "goal_plans" USING btree ("plan_type");--> statement-breakpoint
CREATE INDEX "goals_user_id_idx" ON "goals" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "goals_canonical_type_idx" ON "goals" USING btree ("canonical_goal_type");--> statement-breakpoint
CREATE INDEX "goals_status_idx" ON "goals" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "hk_events_raw_idempotency_idx" ON "hk_events_raw" USING btree ("user_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "hk_events_raw_user_type_idx" ON "hk_events_raw" USING btree ("user_id","type");--> statement-breakpoint
CREATE INDEX "hk_events_raw_received_idx" ON "hk_events_raw" USING btree ("received_at_utc");--> statement-breakpoint
CREATE INDEX "labs_user_marker_observed_desc_idx" ON "labs" USING btree ("user_id","marker","observed_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "labs_user_marker_baseline_idx" ON "labs" USING btree ("user_id","marker","is_baseline_eligible") WHERE "labs"."is_baseline_eligible" = true;--> statement-breakpoint
CREATE INDEX "labs_observed_idx" ON "labs" USING btree ("observed_at");--> statement-breakpoint
CREATE INDEX "landing_page_features_section_idx" ON "landing_page_features" USING btree ("section");--> statement-breakpoint
CREATE INDEX "recommendation_user_idx" ON "meal_recommendation_history" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "recommendation_request_idx" ON "meal_recommendation_history" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "medical_reports_user_id_idx" ON "medical_reports" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "medical_reports_status_idx" ON "medical_reports" USING btree ("status");--> statement-breakpoint
CREATE INDEX "medical_reports_report_type_idx" ON "medical_reports" USING btree ("report_type");--> statement-breakpoint
CREATE INDEX "metric_standards_metric_key_idx" ON "metric_standards" USING btree ("metric_key");--> statement-breakpoint
CREATE INDEX "metric_standards_category_idx" ON "metric_standards" USING btree ("category");--> statement-breakpoint
CREATE INDEX "metric_standards_gender_idx" ON "metric_standards" USING btree ("gender");--> statement-breakpoint
CREATE INDEX "metric_standards_evidence_idx" ON "metric_standards" USING btree ("evidence_level");--> statement-breakpoint
CREATE INDEX "metric_standards_lookup_idx" ON "metric_standards" USING btree ("metric_key","gender","age_min","age_max");--> statement-breakpoint
CREATE INDEX "mobile_sessions_token_idx" ON "mobile_sessions" USING btree ("token");--> statement-breakpoint
CREATE INDEX "mobile_sessions_user_id_idx" ON "mobile_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "muscle_group_engagements_user_created_idx" ON "muscle_group_engagements" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "notification_channels_user_idx" ON "notification_channels" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "notification_channels_user_channel_unique" ON "notification_channels" USING btree ("user_id","channel");--> statement-breakpoint
CREATE INDEX "notification_events_notification_idx" ON "notification_events" USING btree ("notification_id");--> statement-breakpoint
CREATE INDEX "notification_events_event_at_idx" ON "notification_events" USING btree ("event_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "notifications_user_idx" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "notifications_user_status_idx" ON "notifications" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "notifications_user_read_idx" ON "notifications" USING btree ("user_id","read_at");--> statement-breakpoint
CREATE INDEX "notifications_scheduled_idx" ON "notifications" USING btree ("scheduled_at");--> statement-breakpoint
CREATE INDEX "notifications_status_scheduled_idx" ON "notifications" USING btree ("status","scheduled_at");--> statement-breakpoint
CREATE UNIQUE INDEX "page_tile_preferences_user_page_idx" ON "page_tile_preferences" USING btree ("user_id","page");--> statement-breakpoint
CREATE INDEX "preference_vectors_user_idx" ON "preference_vectors" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "preference_vectors_user_type_idx" ON "preference_vectors" USING btree ("user_id","preference_type");--> statement-breakpoint
CREATE INDEX "promo_codes_code_idx" ON "promo_codes" USING btree ("code");--> statement-breakpoint
CREATE INDEX "referrals_referrer_idx" ON "referrals" USING btree ("referrer_user_id");--> statement-breakpoint
CREATE INDEX "referrals_code_idx" ON "referrals" USING btree ("referral_code");--> statement-breakpoint
CREATE INDEX "safety_escalations_user_idx" ON "safety_escalations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "scheduled_reminders_user_idx" ON "scheduled_reminders" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "scheduled_reminders_user_type_idx" ON "scheduled_reminders" USING btree ("user_id","type");--> statement-breakpoint
CREATE INDEX "scheduled_reminders_enabled_idx" ON "scheduled_reminders" USING btree ("enabled");--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");--> statement-breakpoint
CREATE INDEX "smartfuel_guidance_user_generated_idx" ON "smartfuel_guidance" USING btree ("user_id","generated_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "smartfuel_guidance_user_status_idx" ON "smartfuel_guidance" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "subscriptions_user_id_idx" ON "subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "subscriptions_stripe_id_idx" ON "subscriptions" USING btree ("stripe_subscription_id");--> statement-breakpoint
CREATE INDEX "symptom_events_user_episode_idx" ON "symptom_events" USING btree ("user_id","episode_id");--> statement-breakpoint
CREATE INDEX "symptom_events_user_recorded_idx" ON "symptom_events" USING btree ("user_id","recorded_at");--> statement-breakpoint
CREATE INDEX "telemetry_job_events_user_started_idx" ON "telemetry_job_events" USING btree ("user_id","started_at");--> statement-breakpoint
CREATE INDEX "telemetry_job_events_type_started_idx" ON "telemetry_job_events" USING btree ("job_type","started_at");--> statement-breakpoint
CREATE INDEX "telemetry_job_events_tier_started_idx" ON "telemetry_job_events" USING btree ("tier","started_at");--> statement-breakpoint
CREATE INDEX "telemetry_llm_events_user_created_idx" ON "telemetry_llm_events" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "telemetry_llm_events_model_created_idx" ON "telemetry_llm_events" USING btree ("llm_model","created_at");--> statement-breakpoint
CREATE INDEX "training_load_sessions_user_created_idx" ON "training_load_sessions" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "user_meal_preference_idx" ON "user_meal_preferences" USING btree ("user_id","meal_id");--> statement-breakpoint
CREATE INDEX "preference_timestamp_idx" ON "user_meal_preferences" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "voice_sessions_user_idx" ON "voice_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "workout_instances_user_id_idx" ON "workout_instances" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "workout_instances_session_id_idx" ON "workout_instances" USING btree ("workout_session_id");--> statement-breakpoint
CREATE INDEX "workout_sessions_user_created_idx" ON "workout_sessions" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "workout_sessions_source_dedup_idx" ON "workout_sessions" USING btree ("user_id","source_type","source_id") WHERE "workout_sessions"."source_id" IS NOT NULL;