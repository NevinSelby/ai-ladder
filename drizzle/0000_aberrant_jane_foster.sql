CREATE TABLE `account_events` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`kind` text NOT NULL,
	`summary` text NOT NULL,
	`health_delta` integer DEFAULT 0 NOT NULL,
	`expectations_delta` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`synced_at` text
);
--> statement-breakpoint
CREATE INDEX `account_events_account_idx` ON `account_events` (`account_id`);--> statement-breakpoint
CREATE TABLE `accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`phase` text DEFAULT 'discovery' NOT NULL,
	`health` integer DEFAULT 70 NOT NULL,
	`expectations` integer DEFAULT 40 NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`updated_at` text NOT NULL,
	`synced_at` text
);
--> statement-breakpoint
CREATE TABLE `attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`item_id` text NOT NULL,
	`mode` text NOT NULL,
	`score` real NOT NULL,
	`response` text NOT NULL,
	`feedback` text,
	`meter` text NOT NULL,
	`xp` integer NOT NULL,
	`elapsed_ms` integer NOT NULL,
	`created_at` text NOT NULL,
	`synced_at` text
);
--> statement-breakpoint
CREATE INDEX `attempts_created_idx` ON `attempts` (`created_at`);--> statement-breakpoint
CREATE INDEX `attempts_unsynced_idx` ON `attempts` (`synced_at`);--> statement-breakpoint
CREATE TABLE `content_items` (
	`id` text PRIMARY KEY NOT NULL,
	`mode` text NOT NULL,
	`node_ids` text NOT NULL,
	`difficulty` text NOT NULL,
	`explanation` text NOT NULL,
	`citations` text DEFAULT '[]' NOT NULL,
	`payload` text NOT NULL,
	`origin` text DEFAULT 'seed' NOT NULL,
	`critic_score` real,
	`verified_at` text,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `content_items_mode_idx` ON `content_items` (`mode`);--> statement-breakpoint
CREATE TABLE `item_nodes` (
	`item_id` text NOT NULL,
	`node_id` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `item_nodes_node_idx` ON `item_nodes` (`node_id`);--> statement-breakpoint
CREATE INDEX `item_nodes_item_idx` ON `item_nodes` (`item_id`);--> statement-breakpoint
CREATE TABLE `pricing_snapshots` (
	`sku_id` text PRIMARY KEY NOT NULL,
	`service_id` text NOT NULL,
	`description` text NOT NULL,
	`unit` text NOT NULL,
	`unit_price` real NOT NULL,
	`fetched_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `profile_state` (
	`id` integer PRIMARY KEY DEFAULT 1 NOT NULL,
	`depth` integer DEFAULT 0 NOT NULL,
	`platform` integer DEFAULT 0 NOT NULL,
	`ai_craft` integer DEFAULT 0 NOT NULL,
	`client` integer DEFAULT 0 NOT NULL,
	`scope` integer DEFAULT 0 NOT NULL,
	`streak_days` integer DEFAULT 0 NOT NULL,
	`longest_streak` integer DEFAULT 0 NOT NULL,
	`last_session_date` text,
	`remote_user_id` text,
	`synced_at` text
);
--> statement-breakpoint
CREATE TABLE `srs_states` (
	`node_id` text PRIMARY KEY NOT NULL,
	`stability` real DEFAULT 0 NOT NULL,
	`difficulty` real DEFAULT 0 NOT NULL,
	`last_review` text,
	`due` text NOT NULL,
	`reps` integer DEFAULT 0 NOT NULL,
	`lapses` integer DEFAULT 0 NOT NULL,
	`synced_at` text
);
--> statement-breakpoint
CREATE TABLE `sync_cursors` (
	`table` text PRIMARY KEY NOT NULL,
	`cursor` text NOT NULL,
	`last_run_at` text DEFAULT (datetime('now')) NOT NULL
);
