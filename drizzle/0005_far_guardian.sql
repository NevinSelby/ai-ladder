ALTER TABLE `profile_state` ADD `display_name` text;--> statement-breakpoint
ALTER TABLE `profile_state` ADD `haptics_enabled` integer DEFAULT 1 NOT NULL;