CREATE TABLE "coach_insights" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_profile_id" uuid NOT NULL,
	"scope" varchar(32) NOT NULL,
	"title" varchar(160) NOT NULL,
	"severity" varchar(16) NOT NULL,
	"description" text NOT NULL,
	"evidence" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "match_participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"match_id" uuid NOT NULL,
	"player_profile_id" uuid,
	"puuid" varchar(128) NOT NULL,
	"riot_display_name" varchar(128),
	"champion_name" varchar(64) NOT NULL,
	"champion_id" integer NOT NULL,
	"team_id" integer NOT NULL,
	"win" boolean NOT NULL,
	"lane" varchar(32),
	"role" varchar(32),
	"kills" integer DEFAULT 0 NOT NULL,
	"deaths" integer DEFAULT 0 NOT NULL,
	"assists" integer DEFAULT 0 NOT NULL,
	"total_minions_killed" integer DEFAULT 0 NOT NULL,
	"neutral_minions_killed" integer DEFAULT 0 NOT NULL,
	"gold_earned" integer DEFAULT 0 NOT NULL,
	"total_damage_dealt_to_champions" integer DEFAULT 0 NOT NULL,
	"vision_score" integer DEFAULT 0 NOT NULL,
	"wards_placed" integer DEFAULT 0 NOT NULL,
	"wards_killed" integer DEFAULT 0 NOT NULL,
	"detector_flags" jsonb,
	"derived_stats" jsonb
);
--> statement-breakpoint
CREATE TABLE "matches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"riot_match_id" varchar(32) NOT NULL,
	"game_creation" timestamp with time zone NOT NULL,
	"game_duration" integer NOT NULL,
	"game_mode" varchar(32) NOT NULL,
	"queue_id" integer NOT NULL,
	"platform_id" varchar(16) NOT NULL,
	"raw_json" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "player_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_name" varchar(64) NOT NULL,
	"tag_line" varchar(16) NOT NULL,
	"platform_region" varchar(16) NOT NULL,
	"regional_route" varchar(16) NOT NULL,
	"puuid" varchar(128) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ranked_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_profile_id" uuid NOT NULL,
	"queue_type" varchar(32) NOT NULL,
	"tier" varchar(32),
	"rank" varchar(8),
	"league_points" integer,
	"wins" integer DEFAULT 0 NOT NULL,
	"losses" integer DEFAULT 0 NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "coach_insights" ADD CONSTRAINT "coach_insights_player_profile_id_player_profiles_id_fk" FOREIGN KEY ("player_profile_id") REFERENCES "public"."player_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_participants" ADD CONSTRAINT "match_participants_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_participants" ADD CONSTRAINT "match_participants_player_profile_id_player_profiles_id_fk" FOREIGN KEY ("player_profile_id") REFERENCES "public"."player_profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ranked_snapshots" ADD CONSTRAINT "ranked_snapshots_player_profile_id_player_profiles_id_fk" FOREIGN KEY ("player_profile_id") REFERENCES "public"."player_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "coach_insights_player_profile_id_idx" ON "coach_insights" USING btree ("player_profile_id");--> statement-breakpoint
CREATE INDEX "match_participants_match_id_idx" ON "match_participants" USING btree ("match_id");--> statement-breakpoint
CREATE INDEX "match_participants_player_profile_id_idx" ON "match_participants" USING btree ("player_profile_id");--> statement-breakpoint
CREATE UNIQUE INDEX "match_participants_match_puuid_idx" ON "match_participants" USING btree ("match_id","puuid");--> statement-breakpoint
CREATE UNIQUE INDEX "matches_riot_match_id_idx" ON "matches" USING btree ("riot_match_id");--> statement-breakpoint
CREATE UNIQUE INDEX "player_profiles_puuid_idx" ON "player_profiles" USING btree ("puuid");--> statement-breakpoint
CREATE UNIQUE INDEX "player_profiles_riot_id_idx" ON "player_profiles" USING btree ("game_name","tag_line","platform_region");--> statement-breakpoint
CREATE INDEX "ranked_snapshots_player_profile_id_idx" ON "ranked_snapshots" USING btree ("player_profile_id");