CREATE TABLE `spy_frames` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`video_row_id` integer NOT NULL,
	`idx` integer NOT NULL,
	`timestamp_sec` integer NOT NULL,
	`frame_path` text NOT NULL,
	FOREIGN KEY (`video_row_id`) REFERENCES `spy_videos`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `spy_frame_video_idx` ON `spy_frames` (`video_row_id`,`idx`);--> statement-breakpoint
CREATE TABLE `spy_runs` (
	`channel_id` text PRIMARY KEY NOT NULL,
	`source_url` text DEFAULT '' NOT NULL,
	`channel_title` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'idle' NOT NULL,
	`step` text,
	`progress` integer DEFAULT 0 NOT NULL,
	`total` integer DEFAULT 0 NOT NULL,
	`error` text,
	`started_at` text,
	`completed_at` text,
	FOREIGN KEY (`channel_id`) REFERENCES `channels`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `spy_videos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`channel_id` text NOT NULL,
	`video_id` text NOT NULL,
	`rank` integer NOT NULL,
	`title` text DEFAULT '' NOT NULL,
	`view_count` integer DEFAULT 0 NOT NULL,
	`duration_sec` integer DEFAULT 0 NOT NULL,
	`published_at` text,
	`thumbnail_path` text,
	`transcript` text DEFAULT '' NOT NULL,
	`transcript_status` text DEFAULT 'pending' NOT NULL,
	`frames_status` text DEFAULT 'skipped' NOT NULL,
	FOREIGN KEY (`channel_id`) REFERENCES `channels`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `spy_channel_video` ON `spy_videos` (`channel_id`,`video_id`);