CREATE TABLE `billing_configs` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`breakfast_rate` real DEFAULT 30,
	`lunch_rate` real DEFAULT 50,
	`dinner_rate` real DEFAULT 60,
	`utility_split_method` text DEFAULT 'even',
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_billing_configs_tenant` ON `billing_configs` (`tenant_id`);--> statement-breakpoint
ALTER TABLE `rent_invoices` ADD `food_charges` real DEFAULT 0;