CREATE TABLE `channels` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`niche` text DEFAULT '',
	`lang` text DEFAULT 'vi' NOT NULL,
	`ref_url` text DEFAULT '',
	`ref_notes` text DEFAULT '',
	`ref_analysis` text DEFAULT '',
	`dna` text DEFAULT '',
	`style` text DEFAULT '',
	`topics` text DEFAULT '',
	`thumbnails` text DEFAULT '',
	`metadata` text DEFAULT '',
	`current_script_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `form_drafts` (
	`channel_id` text NOT NULL,
	`form_key` text NOT NULL,
	`data` text NOT NULL,
	PRIMARY KEY(`channel_id`, `form_key`),
	FOREIGN KEY (`channel_id`) REFERENCES `channels`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `inventory_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`channel_id` text NOT NULL,
	`type` text NOT NULL,
	`ref_id` text NOT NULL,
	`label` text DEFAULT '',
	`prompt` text DEFAULT '' NOT NULL,
	FOREIGN KEY (`channel_id`) REFERENCES `channels`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `inv_channel_type_ref` ON `inventory_items` (`channel_id`,`type`,`ref_id`);--> statement-breakpoint
CREATE TABLE `inventory_meta` (
	`channel_id` text PRIMARY KEY NOT NULL,
	`raw_output` text DEFAULT '',
	FOREIGN KEY (`channel_id`) REFERENCES `channels`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `scene_prompts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`channel_id` text NOT NULL,
	`type` text NOT NULL,
	`num` integer NOT NULL,
	`level` text DEFAULT '',
	`character` text DEFAULT '',
	`location` text DEFAULT '',
	`prompt` text DEFAULT '' NOT NULL,
	FOREIGN KEY (`channel_id`) REFERENCES `channels`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sp_channel_type_num` ON `scene_prompts` (`channel_id`,`type`,`num`);--> statement-breakpoint
CREATE TABLE `scene_prompts_meta` (
	`channel_id` text PRIMARY KEY NOT NULL,
	`raw_output` text DEFAULT '',
	FOREIGN KEY (`channel_id`) REFERENCES `channels`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `scenes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`channel_id` text NOT NULL,
	`num` integer NOT NULL,
	`level` text DEFAULT '',
	`vo` text DEFAULT '' NOT NULL,
	`character` text DEFAULT '',
	`background` text DEFAULT '',
	`camera` text DEFAULT 'medium shot',
	`duration` integer DEFAULT 0,
	`chars` integer DEFAULT 0,
	`words` integer DEFAULT 0,
	FOREIGN KEY (`channel_id`) REFERENCES `channels`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `scenes_channel_num` ON `scenes` (`channel_id`,`num`);--> statement-breakpoint
CREATE TABLE `scripts` (
	`id` text PRIMARY KEY NOT NULL,
	`channel_id` text NOT NULL,
	`idx` integer NOT NULL,
	`topic` text DEFAULT '',
	`hook` text DEFAULT '',
	`angle` text DEFAULT '',
	`pillar` text DEFAULT 'P1',
	`minutes` integer DEFAULT 18,
	`structure` text DEFAULT 'auto',
	`sections` text DEFAULT 'auto',
	`pov` text DEFAULT 'mixed-1-2-3',
	`custom_structure` text DEFAULT '',
	`script_text` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`channel_id`) REFERENCES `channels`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `scripts_channel_idx` ON `scripts` (`channel_id`,`idx`);--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text
);
--> statement-breakpoint
CREATE TABLE `visual_prompts` (
	`channel_id` text NOT NULL,
	`key` text NOT NULL,
	`value` text DEFAULT '' NOT NULL,
	PRIMARY KEY(`channel_id`, `key`),
	FOREIGN KEY (`channel_id`) REFERENCES `channels`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `voice_clips` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`channel_id` text NOT NULL,
	`num` integer NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`file_path` text,
	`size` integer,
	`generated_at` text,
	`error` text,
	FOREIGN KEY (`channel_id`) REFERENCES `channels`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `vc_channel_num` ON `voice_clips` (`channel_id`,`num`);--> statement-breakpoint
CREATE TABLE `voice_config` (
	`channel_id` text PRIMARY KEY NOT NULL,
	`provider` text DEFAULT 'elevenlabs' NOT NULL,
	`api_key` text DEFAULT '',
	`voice_id` text DEFAULT '',
	`model_id` text DEFAULT 'eleven_multilingual_v2',
	`language_code` text DEFAULT 'vi',
	`stability` real DEFAULT 0.5,
	`similarity_boost` real DEFAULT 0.75,
	`speed` real DEFAULT 1,
	FOREIGN KEY (`channel_id`) REFERENCES `channels`(`id`) ON UPDATE no action ON DELETE cascade
);
