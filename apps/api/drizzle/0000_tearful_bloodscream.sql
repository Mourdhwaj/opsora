CREATE TABLE `activity_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`actor_type` text NOT NULL,
	`actor_id` text NOT NULL,
	`actor_name` text,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text,
	`old_values` text,
	`new_values` text,
	`ip_address` text,
	`user_agent` text,
	`created_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_activity_logs_tenant` ON `activity_logs` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `idx_activity_logs_entity` ON `activity_logs` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE INDEX `idx_activity_logs_created` ON `activity_logs` (`created_at`);--> statement-breakpoint
CREATE TABLE `assets` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`property_id` text NOT NULL,
	`name` text NOT NULL,
	`asset_type` text NOT NULL,
	`brand` text,
	`model` text,
	`serial_number` text,
	`location` text,
	`floor_id` text,
	`room_id` text,
	`purchase_date` text,
	`purchase_cost` real,
	`warranty_expiry` text,
	`maintenance_frequency` text,
	`last_service_date` text,
	`next_service_date` text,
	`status` text DEFAULT 'active',
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `beds` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`property_id` text NOT NULL,
	`floor_id` text NOT NULL,
	`room_id` text NOT NULL,
	`bed_number` text NOT NULL,
	`bed_type` text DEFAULT 'standard',
	`status` text DEFAULT 'vacant',
	`current_tenant_id` text,
	`rent_amount` real DEFAULT 5000 NOT NULL,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`floor_id`) REFERENCES `floors`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`room_id`) REFERENCES `rooms`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `complaint_comments` (
	`id` text PRIMARY KEY NOT NULL,
	`complaint_id` text NOT NULL,
	`user_id` text,
	`tenant_profile_id` text,
	`comment` text NOT NULL,
	`is_internal` integer DEFAULT false,
	`created_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`complaint_id`) REFERENCES `complaints`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `complaints` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`property_id` text NOT NULL,
	`room_id` text,
	`bed_id` text,
	`tenant_profile_id` text,
	`ticket_number` text NOT NULL,
	`category` text NOT NULL,
	`priority` text DEFAULT 'medium',
	`title` text NOT NULL,
	`description` text NOT NULL,
	`status` text DEFAULT 'open',
	`assigned_to` text,
	`assigned_at` text,
	`resolved_at` text,
	`closed_at` text,
	`resolution_notes` text,
	`resolution_photos` text DEFAULT '[]',
	`tenant_rating` integer,
	`tenant_feedback` text,
	`created_by` text,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `complaints_ticket_number_unique` ON `complaints` (`ticket_number`);--> statement-breakpoint
CREATE TABLE `electricity_meters` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`property_id` text NOT NULL,
	`meter_number` text NOT NULL,
	`meter_type` text DEFAULT 'main',
	`floor_id` text,
	`room_id` text,
	`sensor_id` text,
	`max_capacity_kw` real,
	`cost_per_unit` real DEFAULT 7.5,
	`fixed_charge` real DEFAULT 0,
	`high_usage_alert` real DEFAULT 50,
	`is_active` integer DEFAULT true,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `electricity_meters_sensor_id_unique` ON `electricity_meters` (`sensor_id`);--> statement-breakpoint
CREATE TABLE `electricity_readings` (
	`id` text PRIMARY KEY NOT NULL,
	`time` text NOT NULL,
	`tenant_id` text NOT NULL,
	`property_id` text NOT NULL,
	`meter_id` text NOT NULL,
	`power_kw` real NOT NULL,
	`voltage` real,
	`current_amp` real,
	`frequency` real,
	`power_factor` real,
	`total_kwh` real NOT NULL,
	`daily_kwh` real,
	`estimated_cost` real,
	`is_anomaly` integer DEFAULT false,
	`anomaly_reason` text,
	`raw_data` text,
	FOREIGN KEY (`meter_id`) REFERENCES `electricity_meters`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `floors` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`property_id` text NOT NULL,
	`floor_number` integer NOT NULL,
	`floor_name` text,
	`total_rooms` integer DEFAULT 0 NOT NULL,
	`total_beds` integer DEFAULT 0 NOT NULL,
	`occupied_beds` integer DEFAULT 0 NOT NULL,
	`layout_data` text,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `food_menu` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`property_id` text NOT NULL,
	`date` text NOT NULL,
	`meal_type` text NOT NULL,
	`items` text NOT NULL,
	`is_special` integer DEFAULT false,
	`special_name` text,
	`poll_id` text,
	`finalized_by` text,
	`finalized_at` text,
	`status` text DEFAULT 'draft',
	`attendance_expected` integer DEFAULT 0,
	`attendance_actual` integer DEFAULT 0,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`poll_id`) REFERENCES `food_polls`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `food_poll_options` (
	`id` text PRIMARY KEY NOT NULL,
	`poll_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`vote_count` integer DEFAULT 0,
	`created_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`poll_id`) REFERENCES `food_polls`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `food_polls` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`property_id` text,
	`title` text NOT NULL,
	`meal_type` text NOT NULL,
	`date` text NOT NULL,
	`deadline` text NOT NULL,
	`status` text DEFAULT 'draft',
	`created_by` text,
	`finalized_option_id` text,
	`finalize_reason` text,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `food_ratings` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`food_menu_id` text NOT NULL,
	`tenant_profile_id` text NOT NULL,
	`rating` integer,
	`feedback` text,
	`tags` text,
	`comment` text,
	`created_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`food_menu_id`) REFERENCES `food_menu`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tenant_profile_id`) REFERENCES `tenant_profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `food_votes` (
	`id` text PRIMARY KEY NOT NULL,
	`poll_id` text NOT NULL,
	`tenant_profile_id` text NOT NULL,
	`selected_option_id` text NOT NULL,
	`voted_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`poll_id`) REFERENCES `food_polls`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tenant_profile_id`) REFERENCES `tenant_profiles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`selected_option_id`) REFERENCES `food_poll_options`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_food_votes_poll_resident` ON `food_votes` (`poll_id`,`tenant_profile_id`);--> statement-breakpoint
CREATE TABLE `ingredient_formulas` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`meal_type` text NOT NULL,
	`item_name` text NOT NULL,
	`ingredient_name` text NOT NULL,
	`quantity_per_person` real NOT NULL,
	`unit` text DEFAULT 'kg' NOT NULL,
	`created_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `maintenance_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`asset_id` text NOT NULL,
	`service_type` text NOT NULL,
	`description` text NOT NULL,
	`performed_by` text,
	`vendor_name` text,
	`vendor_phone` text,
	`cost` real,
	`before_photos` text DEFAULT '[]',
	`after_photos` text DEFAULT '[]',
	`service_date` text NOT NULL,
	`next_due_date` text,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `meal_attendance` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`property_id` text NOT NULL,
	`tenant_profile_id` text NOT NULL,
	`date` text NOT NULL,
	`breakfast` text DEFAULT 'no',
	`lunch` text DEFAULT 'no',
	`dinner` text DEFAULT 'no',
	`created_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tenant_profile_id`) REFERENCES `tenant_profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`user_id` text,
	`tenant_profile_id` text,
	`title` text NOT NULL,
	`message` text NOT NULL,
	`type` text NOT NULL,
	`priority` text DEFAULT 'normal',
	`action_url` text,
	`action_type` text,
	`push_sent` integer DEFAULT false,
	`push_delivered` integer DEFAULT false,
	`sms_sent` integer DEFAULT false,
	`email_sent` integer DEFAULT false,
	`whatsapp_sent` integer DEFAULT false,
	`is_read` integer DEFAULT false,
	`read_at` text,
	`created_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `payment_activities` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`tenant_profile_id` text,
	`invoice_id` text,
	`activity_type` text NOT NULL,
	`description` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tenant_profile_id`) REFERENCES `tenant_profiles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`invoice_id`) REFERENCES `rent_invoices`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `payment_proofs` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`invoice_id` text NOT NULL,
	`tenant_profile_id` text NOT NULL,
	`amount_paid` real NOT NULL,
	`payment_date` text NOT NULL,
	`transaction_reference` text,
	`screenshot_url` text NOT NULL,
	`notes` text,
	`status` text DEFAULT 'pending',
	`submitted_at` text DEFAULT (datetime('now')),
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`invoice_id`) REFERENCES `rent_invoices`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tenant_profile_id`) REFERENCES `tenant_profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `payment_reminders` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`invoice_id` text,
	`tenant_profile_id` text,
	`channel` text DEFAULT 'in_app' NOT NULL,
	`reminder_type` text NOT NULL,
	`message` text,
	`sent_at` text DEFAULT (datetime('now')),
	`created_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`invoice_id`) REFERENCES `rent_invoices`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tenant_profile_id`) REFERENCES `tenant_profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `payment_verifications` (
	`id` text PRIMARY KEY NOT NULL,
	`proof_id` text NOT NULL,
	`tenant_id` text NOT NULL,
	`verified_by` text NOT NULL,
	`verification_status` text NOT NULL,
	`rejection_reason` text,
	`notes` text,
	`verified_at` text DEFAULT (datetime('now')),
	`created_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`proof_id`) REFERENCES `payment_proofs`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `properties` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`name` text NOT NULL,
	`address` text NOT NULL,
	`city` text NOT NULL,
	`state` text NOT NULL,
	`pincode` text,
	`latitude` real,
	`longitude` real,
	`property_type` text DEFAULT 'pg' NOT NULL,
	`total_floors` integer DEFAULT 1 NOT NULL,
	`total_rooms` integer DEFAULT 0 NOT NULL,
	`total_beds` integer DEFAULT 0 NOT NULL,
	`occupied_beds` integer DEFAULT 0 NOT NULL,
	`vacant_beds` integer DEFAULT 0 NOT NULL,
	`wifi_ssid` text,
	`wifi_password` text,
	`amenities` text DEFAULT '[]',
	`status` text DEFAULT 'active',
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `receipts` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`invoice_id` text NOT NULL,
	`receipt_number` text NOT NULL,
	`amount` real NOT NULL,
	`payment_date` text NOT NULL,
	`verified_by` text NOT NULL,
	`generated_at` text DEFAULT (datetime('now')),
	`created_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`invoice_id`) REFERENCES `rent_invoices`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `receipts_receipt_number_unique` ON `receipts` (`receipt_number`);--> statement-breakpoint
CREATE TABLE `rent_invoices` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`property_id` text NOT NULL,
	`tenant_profile_id` text NOT NULL,
	`invoice_number` text NOT NULL,
	`month_year` text NOT NULL,
	`rent_amount` real NOT NULL,
	`utility_charges` real DEFAULT 0,
	`late_fee` real DEFAULT 0,
	`discounts` real DEFAULT 0,
	`total_amount` real NOT NULL,
	`due_date` text NOT NULL,
	`status` text DEFAULT 'pending',
	`generated_at` text DEFAULT (datetime('now')),
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tenant_profile_id`) REFERENCES `tenant_profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `rent_invoices_invoice_number_unique` ON `rent_invoices` (`invoice_number`);--> statement-breakpoint
CREATE TABLE `rent_payments` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`property_id` text NOT NULL,
	`room_id` text NOT NULL,
	`bed_id` text NOT NULL,
	`tenant_profile_id` text NOT NULL,
	`month_year` text NOT NULL,
	`due_date` text NOT NULL,
	`paid_date` text,
	`rent_amount` real NOT NULL,
	`electricity_charge` real DEFAULT 0,
	`water_charge` real DEFAULT 0,
	`food_charge` real DEFAULT 0,
	`maintenance_charge` real DEFAULT 0,
	`late_fee` real DEFAULT 0,
	`discount` real DEFAULT 0,
	`total_amount` real NOT NULL,
	`paid_amount` real DEFAULT 0,
	`balance_amount` real NOT NULL,
	`payment_method` text,
	`transaction_id` text,
	`payment_gateway` text,
	`payment_status` text DEFAULT 'pending',
	`receipt_number` text,
	`receipt_url` text,
	`notes` text,
	`created_by` text,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`room_id`) REFERENCES `rooms`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`bed_id`) REFERENCES `beds`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tenant_profile_id`) REFERENCES `tenant_profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `rent_payments_receipt_number_unique` ON `rent_payments` (`receipt_number`);--> statement-breakpoint
CREATE TABLE `rooms` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`property_id` text NOT NULL,
	`floor_id` text NOT NULL,
	`room_number` text NOT NULL,
	`room_type` text DEFAULT 'shared' NOT NULL,
	`sharing_type` integer DEFAULT 2,
	`total_beds` integer DEFAULT 2 NOT NULL,
	`occupied_beds` integer DEFAULT 0 NOT NULL,
	`vacant_beds` integer DEFAULT 2 NOT NULL,
	`reserved_beds` integer DEFAULT 0 NOT NULL,
	`blocked_beds` integer DEFAULT 0 NOT NULL,
	`rent_per_bed` real DEFAULT 5000 NOT NULL,
	`deposit_amount` real DEFAULT 10000 NOT NULL,
	`amenities` text DEFAULT '[]',
	`status` text DEFAULT 'available',
	`floor_position` text,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`floor_id`) REFERENCES `floors`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `staff` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`property_id` text NOT NULL,
	`user_id` text,
	`full_name` text NOT NULL,
	`phone` text NOT NULL,
	`email` text,
	`role` text NOT NULL,
	`salary` real,
	`shift_start` text,
	`shift_end` text,
	`weekly_off` text DEFAULT 'sunday',
	`aadhaar_url` text,
	`photo_url` text,
	`is_active` integer DEFAULT true,
	`joined_date` text NOT NULL,
	`left_date` text,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `staff_attendance` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`staff_id` text NOT NULL,
	`date` text NOT NULL,
	`check_in` text,
	`check_out` text,
	`check_in_location` text,
	`check_out_location` text,
	`status` text DEFAULT 'present',
	`notes` text,
	`created_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`staff_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `tanker_orders` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`property_id` text NOT NULL,
	`tank_id` text NOT NULL,
	`order_date` text NOT NULL,
	`supplier_name` text,
	`supplier_phone` text,
	`ordered_liters` real NOT NULL,
	`delivered_liters` real,
	`actual_added_liters` real,
	`cost_per_tanker` real,
	`total_cost` real,
	`status` text DEFAULT 'ordered',
	`delivery_time` text,
	`verified_by` text,
	`notes` text,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tank_id`) REFERENCES `water_tanks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`property_id` text NOT NULL,
	`assigned_to` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`task_type` text NOT NULL,
	`priority` text DEFAULT 'medium',
	`status` text DEFAULT 'pending',
	`scheduled_date` text,
	`scheduled_time` text,
	`completed_at` text,
	`completion_photos` text DEFAULT '[]',
	`completion_notes` text,
	`created_by` text,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`assigned_to`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `tenant_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`property_id` text NOT NULL,
	`room_id` text NOT NULL,
	`bed_id` text NOT NULL,
	`full_name` text NOT NULL,
	`phone` text NOT NULL,
	`email` text,
	`date_of_birth` text,
	`gender` text,
	`blood_group` text,
	`aadhaar_number` text,
	`pan_number` text,
	`passport_number` text,
	`occupation` text,
	`company_name` text,
	`college_name` text,
	`work_address` text,
	`emergency_name` text,
	`emergency_phone` text,
	`emergency_relation` text,
	`move_in_date` text NOT NULL,
	`move_out_date` text,
	`notice_date` text,
	`notice_period_days` integer DEFAULT 30,
	`rent_amount` real NOT NULL,
	`deposit_paid` real DEFAULT 0 NOT NULL,
	`deposit_balance` real DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'active',
	`aadhaar_front_url` text,
	`aadhaar_back_url` text,
	`pan_card_url` text,
	`passport_url` text,
	`police_verification_url` text,
	`photo_url` text,
	`food_opt_in` integer DEFAULT true,
	`breakfast_opt_in` integer DEFAULT true,
	`lunch_opt_in` integer DEFAULT false,
	`dinner_opt_in` integer DEFAULT true,
	`dietary_preference` text,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`room_id`) REFERENCES `rooms`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`bed_id`) REFERENCES `beds`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `tenants` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`email` text NOT NULL,
	`phone` text NOT NULL,
	`address` text,
	`city` text,
	`state` text,
	`pincode` text,
	`gst_number` text,
	`plan_type` text DEFAULT 'free',
	`plan_expires_at` text,
	`max_properties` integer DEFAULT 1,
	`max_beds` integer DEFAULT 50,
	`is_active` integer DEFAULT true,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tenants_slug_unique` ON `tenants` (`slug`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`email` text NOT NULL,
	`phone` text,
	`password_hash` text NOT NULL,
	`full_name` text NOT NULL,
	`role` text DEFAULT 'staff' NOT NULL,
	`tenant_profile_id` text,
	`avatar_url` text,
	`is_active` integer DEFAULT true,
	`last_login_at` text,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tenant_profile_id`) REFERENCES `tenant_profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_users_tenant_email` ON `users` (`tenant_id`,`email`);--> statement-breakpoint
CREATE TABLE `visitors` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`property_id` text NOT NULL,
	`name` text NOT NULL,
	`phone` text NOT NULL,
	`email` text,
	`id_proof_type` text,
	`id_proof_number` text,
	`id_proof_url` text,
	`photo_url` text,
	`purpose` text NOT NULL,
	`whom_to_meet` text,
	`expected_date` text NOT NULL,
	`expected_time` text,
	`tenant_approved` integer,
	`tenant_approved_at` text,
	`owner_approved` integer,
	`owner_approved_at` text,
	`approved_by` text,
	`entry_time` text,
	`exit_time` text,
	`entry_logged_by` text,
	`exit_logged_by` text,
	`status` text DEFAULT 'pending',
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `water_readings` (
	`id` text PRIMARY KEY NOT NULL,
	`time` text NOT NULL,
	`tenant_id` text NOT NULL,
	`property_id` text NOT NULL,
	`tank_id` text NOT NULL,
	`level_percentage` real NOT NULL,
	`level_liters` real NOT NULL,
	`temperature` real,
	`consumption_liters` real,
	`flow_rate` real,
	`is_anomaly` integer DEFAULT false,
	`anomaly_reason` text,
	`raw_data` text,
	FOREIGN KEY (`tank_id`) REFERENCES `water_tanks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `water_tanks` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`property_id` text NOT NULL,
	`name` text NOT NULL,
	`tank_type` text DEFAULT 'overhead',
	`capacity_liters` real NOT NULL,
	`sensor_id` text,
	`location` text,
	`low_level_alert` real DEFAULT 20,
	`critical_level_alert` real DEFAULT 10,
	`overflow_alert` integer DEFAULT true,
	`is_active` integer DEFAULT true,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `water_tanks_sensor_id_unique` ON `water_tanks` (`sensor_id`);