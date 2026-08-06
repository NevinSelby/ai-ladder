ALTER TABLE `profile_state` ADD `cloud_preference` text DEFAULT 'gcp' NOT NULL;
ALTER TABLE `profile_state` ADD `onboarded` integer DEFAULT 0 NOT NULL;
ALTER TABLE `srs_states` ADD `suspended` integer DEFAULT 0 NOT NULL;
CREATE TABLE `submissions` (
	`id` text PRIMARY KEY NOT NULL,
	`mode` text NOT NULL,
	`node_ids` text NOT NULL,
	`difficulty` text NOT NULL,
	`stem` text NOT NULL,
	`payload` text NOT NULL,
	`explanation` text NOT NULL,
	`source_url` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`created_at` text NOT NULL,
	`synced_at` text
);
