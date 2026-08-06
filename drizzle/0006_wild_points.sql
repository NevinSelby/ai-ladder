ALTER TABLE `profile_state` ADD `points` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE TABLE `quest_claims` (
	`day` text NOT NULL,
	`quest_id` text NOT NULL,
	`points` integer DEFAULT 0 NOT NULL,
	`claimed_at` text NOT NULL,
	PRIMARY KEY(`day`, `quest_id`)
);
