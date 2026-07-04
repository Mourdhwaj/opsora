-- Migration: Add food_charges column to rent_invoices
ALTER TABLE rent_invoices ADD COLUMN food_charges REAL DEFAULT 0;
