CREATE TABLE `lesson_progress` (
	`lesson_id` text PRIMARY KEY NOT NULL,
	`completed_at` text NOT NULL,
	`seconds_spent` integer DEFAULT 0 NOT NULL,
	`synced_at` text
);
--> statement-breakpoint
CREATE TABLE `streak_days` (
	`day` text PRIMARY KEY NOT NULL,
	`sessions` integer DEFAULT 1 NOT NULL,
	`xp` integer DEFAULT 0 NOT NULL,
	`items_answered` integer DEFAULT 0 NOT NULL,
	`lessons_read` integer DEFAULT 0 NOT NULL,
	`synced_at` text
);
