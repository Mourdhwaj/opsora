CREATE TABLE `revoked_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`token` text NOT NULL,
	`expires_at` text NOT NULL,
	`revoked_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `revoked_tokens_token_unique` ON `revoked_tokens` (`token`);