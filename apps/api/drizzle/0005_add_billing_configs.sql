-- Migration: Add billing_configs table for per-tenant configurable rates
CREATE TABLE IF NOT EXISTS billing_configs (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  breakfast_rate REAL DEFAULT 30,
  lunch_rate REAL DEFAULT 50,
  dinner_rate REAL DEFAULT 60,
  utility_split_method TEXT DEFAULT 'even',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_billing_configs_tenant ON billing_configs(tenant_id);
