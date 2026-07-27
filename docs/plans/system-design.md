
# OPSORA — COMPLETE SYSTEM DESIGN DOCUMENT
# Version: 1.0 | Date: June 2026
# Purpose: Production-ready blueprint for DeepSeek V4 Flash implementation

================================================================================
TABLE OF CONTENTS
================================================================================
1. Executive Summary & Architecture Philosophy
2. Complete Tech Stack (MVP + Phase 2)
3. System Architecture Diagrams
4. Database Schema Design (PostgreSQL)
5. API Design & Endpoints
6. Authentication & Authorization
7. IoT Architecture (Water + Electricity)
8. Real-Time Systems (WebSockets + Events)
9. Mobile App Architecture
10. AI/ML Architecture (Phase 2)
11. Multi-Tenancy Design
12. Security Architecture
13. Deployment & DevOps
14. Scalability Roadmap
15. Implementation Priority (MVP → Scale)
16. Code Structure & Conventions
17. Data Flow Diagrams
18. Third-Party Integrations
19. Cost Estimates
20. Monitoring & Observability

================================================================================
1. EXECUTIVE SUMMARY & ARCHITECTURE PHILOSOPHY
================================================================================

PRODUCT: Opsora — Operating System for PGs, Hostels, Co-Living Spaces, Student Housing

ARCHITECTURE PRINCIPLES:
├── Multi-tenant from Day 1 (tenant_id on every table, RLS enforced)
├── Modular Monolith → Microservices (when 10K+ tenants)
├── API-First (REST + WebSocket for real-time)
├── Event-Driven for async operations
├── IoT-Ready (MQTT + TimescaleDB for sensor data)
├── AI-Native (pgvector + LLM integration hooks)
└── Mobile-First Tenant Experience + Desktop Owner Dashboard

DEPLOYMENT STRATEGY:
├── Phase 1 (MVP): Vercel + Supabase ($0-50/month)
├── Phase 2 (Growth): AWS/GCP with Kubernetes ($500-2000/month)
└── Phase 3 (Scale): Multi-region, microservices ($5000+/month)

================================================================================
2. COMPLETE TECH STACK
================================================================================

## FRONTEND LAYER
- Owner Dashboard: Next.js 15 (App Router)
- Tenant Mobile App: React Native (Expo)
- UI Library: shadcn/ui + Tailwind CSS
- State Management: Zustand + TanStack Query
- Charts: Recharts + Tremor
- Maps/Layout: React-Flow (Floor Maps)

## BACKEND LAYER
- Primary API: Node.js + Fastify (not Express)
- ORM: Drizzle ORM (type-safe, lightweight)
- Validation: Zod (end-to-end type safety)
- Real-time: Socket.io (WebSocket layer)
- Queue: BullMQ (Redis-based job queue)
- Scheduler: node-cron + BullMQ

## DATABASE LAYER
- Primary DB: PostgreSQL 16 (Supabase/Neon)
- Timeseries: TimescaleDB (IoT sensor data)
- Cache: Redis (Upstash/Vercel KV)
- Search: Meilisearch (tenant search, rooms)
- Vector DB: pgvector (AI embeddings)
- File Storage: Supabase Storage / AWS S3

## IOT LAYER
- Protocol: MQTT (Mosquitto / EMQX)
- Gateway: Node-RED / Custom ESP32 firmware
- Sensors: Ultrasonic (water), CT clamp (elec)
- Data Pipeline: Ingest → TimescaleDB → Alerts

## AI/ML LAYER (Phase 2)
- LLM: OpenAI GPT-4o / Claude Sonnet 4.6
- Orchestration: LangChain / Vercel AI SDK
- Embeddings: OpenAI text-embedding-3-large
- Predictions: Python microservice (FastAPI)
- Models: scikit-learn / XGBoost / Prophet

## INFRASTRUCTURE
- Hosting: Vercel (frontend) + Railway/Fly.io
- Container: Docker + Docker Compose
- CI/CD: GitHub Actions
- Monitoring: Sentry + PostHog + Grafana
- Logs: Datadog / Grafana Loki
- Alerts: PagerDuty / OpsGenie

## THIRD-PARTY SERVICES
- Auth: Clerk (or Supabase Auth)
- Payments: Razorpay (India) + Stripe (Global)
- SMS: Twilio / MSG91 / Exotel
- WhatsApp: WhatsApp Business API (Meta)
- Email: Resend / SendGrid
- Push: Firebase Cloud Messaging (FCM)
- Maps: Google Maps API
- OCR: Tesseract / Google Vision (KYC docs)
- Accounting: Zoho Books API / Tally Prime API

WHY THIS STACK?
- Fastify over Express: 2x throughput, better async/await handling
- Drizzle ORM over Prisma: Zero runtime overhead, SQL-like syntax
- TimescaleDB over raw PostgreSQL: 10-100x faster time-series queries
- BullMQ over Bull: Native TypeScript, better Redis Cluster support
- React Native (Expo) over Flutter: Faster dev, larger ecosystem, easier hiring
- Clerk over Auth0: Better DX, cheaper at scale, native Next.js integration

================================================================================
3. SYSTEM ARCHITECTURE DIAGRAMS
================================================================================

## HIGH-LEVEL ARCHITECTURE

                                    +-------------+
                                    |   CDN/Edge  |
                                    |  (Vercel)   |
                                    +------+------+
                                           |
                    +----------------------+----------------------+
                    |                      |                      |
            +-------v-------+      +-----v-----+      +-------v--------+
            | Owner Web App |      | Tenant App|      | IoT Dashboard  |
            |  (Next.js 15) |      |(React Native)      |  (Next.js 15)  |
            +-------+-------+      +-----+-----+      +-------+--------+
                    |                     |                      |
                    +-------------+-------+----------+-----------+
                                  |                  |
                          +-------v------------------v-------+
                          |      API GATEWAY (Fastify)        |
                          |  - Rate Limiting (Redis)          |
                          |  - Auth Middleware (JWT)          |
                          |  - Request Validation (Zod)       |
                          |  - Tenant Resolution              |
                          +-------+---------------+-------+
                                  |                       |
                    +-------------+                       +-------------+
                    |                                               |
            +-------v-------+                           +-----------v--------+
            |  CORE API     |                           |   REAL-TIME API    |
            |  (REST)       |                           |   (WebSocket)      |
            |               |                           |                    |
            | - Occupancy   |                           | - IoT Live Data    |
            | - Rent        |                           | - Notifications    |
            | - Tenant CRUD |                           | - Chat             |
            | - Complaints  |                           | - Alerts           |
            | - Payments    |                           | - Floor Map Sync   |
            +-------+-------+                           +-----------+--------+
                    |                                               |
            +-------v-----------------------------------------------v-------+
            |                      EVENT BUS (Redis Pub/Sub)              |
            |  - rent.due.reminder  - complaint.created  - payment.success|
            |  - iot.water.low      - visitor.approved   - staff.assigned |
            +-------+--------------------------------------+---------------+
                    |                                      |
            +-------v-------+                      +-------v-------+
            |  JOB QUEUE    |                      |  NOTIFICATION   |
            |  (BullMQ)     |                      |  SERVICE        |
            |               |                      |                 |
            | - Rent Remind |                      | - Push (FCM)    |
            | - Late Fees   |                      | - SMS (MSG91)   |
            | - Reports     |                      | - Email         |
            | - IoT Alerts  |                      | - WhatsApp      |
            +-------+-------+                      +---------------+
                    |
        +-----------+-----------+
        |           |           |
   +----v----+ +----v----+ +----v----+
   |PostgreSQL| |Timescale | |  Redis   |
   |(Primary) | |  (IoT)   | | (Cache)  |
   +---------+ +---------+ +---------+
        |           |           |
        +-----------+-----------+
                    |
            +-------v-------+
            |  FILE STORAGE |
            | (Supabase S3) |
            |  - KYC Docs   |
            |  - Receipts   |
            |  - Photos     |
            +---------------+

## IOT DATA FLOW ARCHITECTURE

    +-------------+     +-------------+     +-------------+
    | Ultrasonic  |     |  CT Clamp   |     |  Smart      |
    |  Sensor     |     |   Meter     |     |  Switch     |
    | (Water)     |     |(Electricity)|     | (Appliance) |
    +------+------+     +------+------+     +------+------+
           |                   |                   |
           +-------------------+-------------------+
                               |
                    +----------v----------+
                    |    ESP32 / Raspberry  |
                    |      Pi Gateway       |
                    |  - MQTT Client        |
                    |  - Edge Processing    |
                    |  - Local Cache        |
                    +----------+----------+
                               | MQTT over TLS
                    +----------v----------+
                    |   MQTT BROKER         |
                    |   (EMQX / Mosquitto)  |
                    +----------+----------+
                               |
                    +----------v----------+
                    |   IOT INGEST SERVICE  |
                    |    (Node.js + MQTT)     |
                    |  - Data Validation      |
                    |  - Anomaly Detection    |
                    |  - Alert Triggering     |
                    +----------+----------+
                               |
              +----------------+----------------+
              |                |                |
       +------v------+  +------v------+  +------v------+
       | TimescaleDB |  |   Redis     |  |  Event Bus  |
       |  (Raw Data) |  |  (Live Feed)|  |  (Alerts)   |
       +-------------+  +-------------+  +-------------+

================================================================================
4. DATABASE SCHEMA DESIGN (PostgreSQL + TimescaleDB)
================================================================================

## TENANT ISOLATION (Every table has tenant_id with RLS)

-- Enable Row Level Security
ALTER TABLE ALL TABLES ENABLE ROW LEVEL SECURITY;

-- RLS Policy Template (applied to every table)
CREATE POLICY tenant_isolation ON table_name
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant')::UUID);

## CORE TABLES

### 1. TENANTS (Organizations/Property Owners)
CREATE TABLE tenants (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(255) NOT NULL,
    slug            VARCHAR(100) UNIQUE NOT NULL,
    email           VARCHAR(255) NOT NULL,
    phone           VARCHAR(20) NOT NULL,
    address         TEXT,
    city            VARCHAR(100),
    state           VARCHAR(100),
    pincode         VARCHAR(10),
    gst_number      VARCHAR(20),
    plan_type       VARCHAR(20) DEFAULT 'free',
    plan_expires_at TIMESTAMPTZ,
    max_properties  INTEGER DEFAULT 1,
    max_beds        INTEGER DEFAULT 50,
    is_active       BOOLEAN DEFAULT true,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

### 2. USERS (Staff + Owners + Admins)
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email           VARCHAR(255) NOT NULL,
    phone           VARCHAR(20),
    password_hash   VARCHAR(255) NOT NULL,
    full_name       VARCHAR(255) NOT NULL,
    role            VARCHAR(20) NOT NULL DEFAULT 'staff',
    avatar_url      VARCHAR(500),
    is_active       BOOLEAN DEFAULT true,
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, email)
);

### 3. PROPERTIES (Buildings)
CREATE TABLE properties (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    address         TEXT NOT NULL,
    city            VARCHAR(100) NOT NULL,
    state           VARCHAR(100) NOT NULL,
    pincode         VARCHAR(10),
    latitude        DECIMAL(10, 8),
    longitude       DECIMAL(11, 8),
    property_type   VARCHAR(20) NOT NULL DEFAULT 'pg',
    total_floors    INTEGER NOT NULL DEFAULT 1,
    total_rooms     INTEGER NOT NULL DEFAULT 0,
    total_beds      INTEGER NOT NULL DEFAULT 0,
    occupied_beds   INTEGER NOT NULL DEFAULT 0,
    vacant_beds     INTEGER NOT NULL DEFAULT 0,
    wifi_ssid       VARCHAR(100),
    wifi_password   VARCHAR(100),
    amenities       JSONB DEFAULT '[]',
    status          VARCHAR(20) DEFAULT 'active',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

### 4. FLOORS
CREATE TABLE floors (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    property_id     UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    floor_number    INTEGER NOT NULL,
    floor_name      VARCHAR(50),
    total_rooms     INTEGER NOT NULL DEFAULT 0,
    total_beds      INTEGER NOT NULL DEFAULT 0,
    occupied_beds   INTEGER NOT NULL DEFAULT 0,
    layout_data     JSONB,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(property_id, floor_number)
);

### 5. ROOMS
CREATE TABLE rooms (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    property_id     UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    floor_id        UUID NOT NULL REFERENCES floors(id) ON DELETE CASCADE,
    room_number     VARCHAR(20) NOT NULL,
    room_type       VARCHAR(20) NOT NULL DEFAULT 'shared',
    sharing_type    INTEGER DEFAULT 2,
    total_beds      INTEGER NOT NULL DEFAULT 2,
    occupied_beds   INTEGER NOT NULL DEFAULT 0,
    vacant_beds     INTEGER NOT NULL DEFAULT 2,
    reserved_beds   INTEGER NOT NULL DEFAULT 0,
    blocked_beds    INTEGER NOT NULL DEFAULT 0,
    rent_per_bed    DECIMAL(10, 2) NOT NULL DEFAULT 5000.00,
    deposit_amount  DECIMAL(10, 2) NOT NULL DEFAULT 10000.00,
    amenities       JSONB DEFAULT '[]',
    status          VARCHAR(20) DEFAULT 'available',
    floor_position  JSONB,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(property_id, room_number)
);

### 6. BEDS
CREATE TABLE beds (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    property_id     UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    floor_id        UUID NOT NULL REFERENCES floors(id) ON DELETE CASCADE,
    room_id         UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    bed_number      VARCHAR(10) NOT NULL,
    bed_type        VARCHAR(20) DEFAULT 'standard',
    status          VARCHAR(20) DEFAULT 'vacant',
    current_tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
    rent_amount     DECIMAL(10, 2) NOT NULL DEFAULT 5000.00,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(room_id, bed_number)
);

### 7. TENANT_PROFILES (Residents)
CREATE TABLE tenant_profiles (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    property_id     UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    room_id         UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    bed_id          UUID NOT NULL REFERENCES beds(id) ON DELETE CASCADE,

    full_name       VARCHAR(255) NOT NULL,
    phone           VARCHAR(20) NOT NULL,
    email           VARCHAR(255),
    date_of_birth   DATE,
    gender          VARCHAR(10),
    blood_group     VARCHAR(5),

    aadhaar_number  VARCHAR(12),
    pan_number      VARCHAR(10),
    passport_number VARCHAR(20),

    occupation      VARCHAR(50),
    company_name    VARCHAR(255),
    college_name    VARCHAR(255),
    work_address    TEXT,

    emergency_name  VARCHAR(255),
    emergency_phone VARCHAR(20),
    emergency_relation VARCHAR(50),

    move_in_date    DATE NOT NULL,
    move_out_date   DATE,
    notice_date     DATE,
    notice_period_days INTEGER DEFAULT 30,

    rent_amount     DECIMAL(10, 2) NOT NULL,
    deposit_paid    DECIMAL(10, 2) NOT NULL DEFAULT 0,
    deposit_balance DECIMAL(10, 2) NOT NULL DEFAULT 0,

    status          VARCHAR(20) DEFAULT 'active',

    aadhaar_front_url   VARCHAR(500),
    aadhaar_back_url    VARCHAR(500),
    pan_card_url        VARCHAR(500),
    passport_url        VARCHAR(500),
    police_verification_url VARCHAR(500),
    photo_url           VARCHAR(500),

    food_opt_in       BOOLEAN DEFAULT true,
    breakfast_opt_in  BOOLEAN DEFAULT true,
    lunch_opt_in      BOOLEAN DEFAULT false,
    dinner_opt_in     BOOLEAN DEFAULT true,
    dietary_preference  VARCHAR(50),

    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, phone)
);

### 8. RENT_PAYMENTS
CREATE TABLE rent_payments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    property_id     UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    room_id         UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    bed_id          UUID NOT NULL REFERENCES beds(id) ON DELETE CASCADE,
    tenant_profile_id UUID NOT NULL REFERENCES tenant_profiles(id) ON DELETE CASCADE,

    month_year      VARCHAR(7) NOT NULL,
    due_date        DATE NOT NULL,
    paid_date       DATE,

    rent_amount     DECIMAL(10, 2) NOT NULL,
    electricity_charge DECIMAL(10, 2) DEFAULT 0,
    water_charge    DECIMAL(10, 2) DEFAULT 0,
    food_charge     DECIMAL(10, 2) DEFAULT 0,
    maintenance_charge DECIMAL(10, 2) DEFAULT 0,
    late_fee        DECIMAL(10, 2) DEFAULT 0,
    discount        DECIMAL(10, 2) DEFAULT 0,
    total_amount    DECIMAL(10, 2) NOT NULL,
    paid_amount     DECIMAL(10, 2) DEFAULT 0,
    balance_amount  DECIMAL(10, 2) NOT NULL,

    payment_method  VARCHAR(20),
    transaction_id  VARCHAR(100),
    payment_gateway VARCHAR(50),
    payment_status  VARCHAR(20) DEFAULT 'pending',

    receipt_number  VARCHAR(50) UNIQUE,
    receipt_url     VARCHAR(500),

    notes           TEXT,
    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

### 9. COMPLAINTS / TICKETS
CREATE TABLE complaints (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    property_id     UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    room_id         UUID REFERENCES rooms(id) ON DELETE SET NULL,
    bed_id          UUID REFERENCES beds(id) ON DELETE SET NULL,
    tenant_profile_id UUID REFERENCES tenant_profiles(id) ON DELETE SET NULL,

    ticket_number   VARCHAR(20) UNIQUE NOT NULL,
    category        VARCHAR(30) NOT NULL,
    priority        VARCHAR(10) DEFAULT 'medium',
    title           VARCHAR(255) NOT NULL,
    description     TEXT NOT NULL,

    status          VARCHAR(20) DEFAULT 'open',
    assigned_to     UUID REFERENCES users(id) ON DELETE SET NULL,
    assigned_at     TIMESTAMPTZ,
    resolved_at     TIMESTAMPTZ,
    closed_at       TIMESTAMPTZ,

    resolution_notes TEXT,
    resolution_photos JSONB DEFAULT '[]',

    tenant_rating   INTEGER CHECK (tenant_rating BETWEEN 1 AND 5),
    tenant_feedback TEXT,

    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

### 10. COMPLAINT_COMMENTS (Thread)
CREATE TABLE complaint_comments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    complaint_id    UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
    user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
    tenant_profile_id UUID REFERENCES tenant_profiles(id) ON DELETE SET NULL,
    comment         TEXT NOT NULL,
    is_internal     BOOLEAN DEFAULT false,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

### 11. VISITORS
CREATE TABLE visitors (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    property_id     UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,

    name            VARCHAR(255) NOT NULL,
    phone           VARCHAR(20) NOT NULL,
    email           VARCHAR(255),
    id_proof_type   VARCHAR(20),
    id_proof_number VARCHAR(50),
    id_proof_url    VARCHAR(500),
    photo_url       VARCHAR(500),

    purpose         VARCHAR(100) NOT NULL,
    whom_to_meet    UUID REFERENCES tenant_profiles(id) ON DELETE SET NULL,
    expected_date   DATE NOT NULL,
    expected_time   TIME,

    tenant_approved BOOLEAN,
    tenant_approved_at TIMESTAMPTZ,
    owner_approved  BOOLEAN,
    owner_approved_at TIMESTAMPTZ,
    approved_by     UUID REFERENCES users(id),

    entry_time      TIMESTAMPTZ,
    exit_time       TIMESTAMPTZ,
    entry_logged_by UUID REFERENCES users(id),
    exit_logged_by  UUID REFERENCES users(id),

    status          VARCHAR(20) DEFAULT 'pending',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

### 12. STAFF
CREATE TABLE staff (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    property_id     UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    user_id         UUID REFERENCES users(id) ON DELETE SET NULL,

    full_name       VARCHAR(255) NOT NULL,
    phone           VARCHAR(20) NOT NULL,
    email           VARCHAR(255),
    role            VARCHAR(30) NOT NULL,
    salary          DECIMAL(10, 2),
    shift_start     TIME,
    shift_end       TIME,
    weekly_off      VARCHAR(20) DEFAULT 'sunday',

    aadhaar_url     VARCHAR(500),
    photo_url       VARCHAR(500),

    is_active       BOOLEAN DEFAULT true,
    joined_date     DATE NOT NULL,
    left_date       DATE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

### 13. STAFF_ATTENDANCE
CREATE TABLE staff_attendance (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    staff_id        UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    date            DATE NOT NULL,
    check_in        TIMESTAMPTZ,
    check_out       TIMESTAMPTZ,
    check_in_location JSONB,
    check_out_location JSONB,
    status          VARCHAR(20) DEFAULT 'present',
    notes           TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(staff_id, date)
);

### 14. TASKS
CREATE TABLE tasks (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    property_id     UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    assigned_to     UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,

    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    task_type       VARCHAR(30) NOT NULL,
    priority        VARCHAR(10) DEFAULT 'medium',
    status          VARCHAR(20) DEFAULT 'pending',

    scheduled_date  DATE,
    scheduled_time  TIME,
    completed_at    TIMESTAMPTZ,
    completion_photos JSONB DEFAULT '[]',
    completion_notes TEXT,

    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

### 15. FOOD_MENU
CREATE TABLE food_menu (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    property_id     UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,

    date            DATE NOT NULL,
    meal_type       VARCHAR(20) NOT NULL,
    items           JSONB NOT NULL,
    is_special      BOOLEAN DEFAULT false,
    special_name    VARCHAR(100),

    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(property_id, date, meal_type)
);

### 16. FOOD_RATINGS
CREATE TABLE food_ratings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    food_menu_id    UUID NOT NULL REFERENCES food_menu(id) ON DELETE CASCADE,
    tenant_profile_id UUID NOT NULL REFERENCES tenant_profiles(id) ON DELETE CASCADE,

    rating          INTEGER CHECK (rating BETWEEN 1 AND 5),
    feedback        TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(food_menu_id, tenant_profile_id)
);

### 17. MEAL_ATTENDANCE
CREATE TABLE meal_attendance (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    property_id     UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    tenant_profile_id UUID NOT NULL REFERENCES tenant_profiles(id) ON DELETE CASCADE,

    date            DATE NOT NULL,
    breakfast       BOOLEAN DEFAULT false,
    lunch           BOOLEAN DEFAULT false,
    dinner          BOOLEAN DEFAULT false,

    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_profile_id, date)
);

## IOT TABLES (TimescaleDB Hypertables)

### 18. WATER_TANKS
CREATE TABLE water_tanks (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    property_id     UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,

    name            VARCHAR(100) NOT NULL,
    tank_type       VARCHAR(20) DEFAULT 'overhead',
    capacity_liters DECIMAL(10, 2) NOT NULL,
    sensor_id       VARCHAR(50) UNIQUE,
    location        VARCHAR(100),

    low_level_alert DECIMAL(5, 2) DEFAULT 20.00,
    critical_level_alert DECIMAL(5, 2) DEFAULT 10.00,
    overflow_alert  BOOLEAN DEFAULT true,

    is_active       BOOLEAN DEFAULT true,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

### 19. WATER_READINGS (TimescaleDB Hypertable)
CREATE TABLE water_readings (
    time            TIMESTAMPTZ NOT NULL,
    tenant_id       UUID NOT NULL,
    property_id     UUID NOT NULL,
    tank_id         UUID NOT NULL REFERENCES water_tanks(id) ON DELETE CASCADE,

    level_percentage DECIMAL(5, 2) NOT NULL,
    level_liters    DECIMAL(10, 2) NOT NULL,
    temperature     DECIMAL(5, 2),

    consumption_liters DECIMAL(10, 2),
    flow_rate       DECIMAL(10, 2),

    is_anomaly      BOOLEAN DEFAULT false,
    anomaly_reason  VARCHAR(100),

    raw_data        JSONB
);

-- Convert to TimescaleDB hypertable
SELECT create_hypertable('water_readings', 'time', chunk_time_interval => INTERVAL '1 day');

### 20. ELECTRICITY_METERS
CREATE TABLE electricity_meters (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    property_id     UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,

    meter_number    VARCHAR(50) NOT NULL,
    meter_type      VARCHAR(20) DEFAULT 'main',
    floor_id        UUID REFERENCES floors(id) ON DELETE SET NULL,
    room_id         UUID REFERENCES rooms(id) ON DELETE SET NULL,

    sensor_id       VARCHAR(50) UNIQUE,
    max_capacity_kw   DECIMAL(10, 2),

    cost_per_unit   DECIMAL(10, 4) DEFAULT 7.50,
    fixed_charge    DECIMAL(10, 2) DEFAULT 0,

    high_usage_alert DECIMAL(10, 2) DEFAULT 50.00,

    is_active       BOOLEAN DEFAULT true,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

### 21. ELECTRICITY_READINGS (TimescaleDB Hypertable)
CREATE TABLE electricity_readings (
    time            TIMESTAMPTZ NOT NULL,
    tenant_id       UUID NOT NULL,
    property_id     UUID NOT NULL,
    meter_id        UUID NOT NULL REFERENCES electricity_meters(id) ON DELETE CASCADE,

    power_kw        DECIMAL(10, 4) NOT NULL,
    voltage         DECIMAL(10, 2),
    current_amp     DECIMAL(10, 4),
    frequency       DECIMAL(5, 2),
    power_factor    DECIMAL(5, 2),

    total_kwh       DECIMAL(15, 4) NOT NULL,
    daily_kwh       DECIMAL(10, 4),

    estimated_cost  DECIMAL(10, 2),

    is_anomaly      BOOLEAN DEFAULT false,
    anomaly_reason  VARCHAR(100),

    raw_data        JSONB
);

SELECT create_hypertable('electricity_readings', 'time', chunk_time_interval => INTERVAL '1 day');

### 22. TANKER_ORDERS
CREATE TABLE tanker_orders (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    property_id     UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    tank_id         UUID NOT NULL REFERENCES water_tanks(id) ON DELETE CASCADE,

    order_date      DATE NOT NULL,
    supplier_name   VARCHAR(255),
    supplier_phone  VARCHAR(20),
    ordered_liters  DECIMAL(10, 2) NOT NULL,
    delivered_liters DECIMAL(10, 2),
    actual_added_liters DECIMAL(10, 2),
    cost_per_tanker DECIMAL(10, 2),
    total_cost      DECIMAL(10, 2),

    status          VARCHAR(20) DEFAULT 'ordered',
    delivery_time   TIMESTAMPTZ,
    verified_by     UUID REFERENCES users(id),
    notes           TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

## MAINTENANCE & ASSETS

### 23. ASSETS
CREATE TABLE assets (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    property_id     UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,

    name            VARCHAR(255) NOT NULL,
    asset_type      VARCHAR(30) NOT NULL,
    brand           VARCHAR(100),
    model           VARCHAR(100),
    serial_number   VARCHAR(100),

    location        VARCHAR(100),
    floor_id        UUID REFERENCES floors(id) ON DELETE SET NULL,
    room_id         UUID REFERENCES rooms(id) ON DELETE SET NULL,

    purchase_date   DATE,
    purchase_cost   DECIMAL(10, 2),
    warranty_expiry DATE,

    maintenance_frequency VARCHAR(20),
    last_service_date DATE,
    next_service_date DATE,

    status          VARCHAR(20) DEFAULT 'active',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

### 24. MAINTENANCE_LOGS
CREATE TABLE maintenance_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    asset_id        UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,

    service_type    VARCHAR(30) NOT NULL,
    description     TEXT NOT NULL,
    performed_by    UUID REFERENCES users(id),
    vendor_name     VARCHAR(255),
    vendor_phone    VARCHAR(20),
    cost            DECIMAL(10, 2),

    before_photos   JSONB DEFAULT '[]',
    after_photos    JSONB DEFAULT '[]',

    service_date    DATE NOT NULL,
    next_due_date   DATE,

    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

## NOTIFICATIONS & ACTIVITY LOGS

### 25. NOTIFICATIONS
CREATE TABLE notifications (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
    tenant_profile_id UUID REFERENCES tenant_profiles(id) ON DELETE CASCADE,

    title           VARCHAR(255) NOT NULL,
    message         TEXT NOT NULL,
    type            VARCHAR(30) NOT NULL,
    priority        VARCHAR(10) DEFAULT 'normal',

    action_url      VARCHAR(500),
    action_type     VARCHAR(50),

    push_sent       BOOLEAN DEFAULT false,
    push_delivered  BOOLEAN DEFAULT false,
    sms_sent        BOOLEAN DEFAULT false,
    email_sent      BOOLEAN DEFAULT false,
    whatsapp_sent   BOOLEAN DEFAULT false,

    is_read         BOOLEAN DEFAULT false,
    read_at         TIMESTAMPTZ,

    created_at      TIMESTAMPTZ DEFAULT NOW()
);

### 26. ACTIVITY_LOGS (Audit Trail)
CREATE TABLE activity_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

    actor_type      VARCHAR(20) NOT NULL,
    actor_id        UUID NOT NULL,
    actor_name      VARCHAR(255),

    action          VARCHAR(50) NOT NULL,
    entity_type     VARCHAR(50) NOT NULL,
    entity_id       UUID,

    old_values      JSONB,
    new_values      JSONB,
    ip_address      INET,
    user_agent      TEXT,

    created_at      TIMESTAMPTZ DEFAULT NOW()
);

## AI / ANALYTICS TABLES (Phase 2)

### 27. AI_INSIGHTS
CREATE TABLE ai_insights (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    property_id     UUID REFERENCES properties(id) ON DELETE CASCADE,

    insight_type    VARCHAR(50) NOT NULL,
    category        VARCHAR(30) NOT NULL,

    title           VARCHAR(255) NOT NULL,
    description     TEXT NOT NULL,
    confidence_score DECIMAL(4, 3),

    data_snapshot   JSONB,

    suggested_action TEXT,
    action_taken    BOOLEAN DEFAULT false,
    action_taken_by UUID REFERENCES users(id),
    action_taken_at TIMESTAMPTZ,

    is_dismissed    BOOLEAN DEFAULT false,
    dismissed_by    UUID REFERENCES users(id),
    dismissed_at    TIMESTAMPTZ,

    created_at      TIMESTAMPTZ DEFAULT NOW()
);

### 28. EMBEDDINGS (for AI search / RAG)
CREATE TABLE document_embeddings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

    source_type     VARCHAR(30) NOT NULL,
    source_id       UUID NOT NULL,

    content         TEXT NOT NULL,
    embedding       VECTOR(1536),

    metadata        JSONB,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for vector similarity search
CREATE INDEX ON document_embeddings USING ivfflat (embedding vector_cosine_ops);

## INDEXES FOR PERFORMANCE

-- Tenant isolation indexes
CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_properties_tenant ON properties(tenant_id);
CREATE INDEX idx_rooms_tenant ON rooms(tenant_id);
CREATE INDEX idx_beds_tenant ON beds(tenant_id);
CREATE INDEX idx_tenant_profiles_tenant ON tenant_profiles(tenant_id);
CREATE INDEX idx_payments_tenant ON rent_payments(tenant_id);
CREATE INDEX idx_complaints_tenant ON complaints(tenant_id);

-- Common query patterns
CREATE INDEX idx_rooms_property ON rooms(property_id);
CREATE INDEX idx_rooms_floor ON rooms(floor_id);
CREATE INDEX idx_beds_room ON beds(room_id);
CREATE INDEX idx_beds_status ON beds(status) WHERE status = 'vacant';
CREATE INDEX idx_tenant_profiles_room ON tenant_profiles(room_id);
CREATE INDEX idx_tenant_profiles_bed ON tenant_profiles(bed_id);
CREATE INDEX idx_tenant_profiles_status ON tenant_profiles(status);
CREATE INDEX idx_payments_status ON rent_payments(payment_status);
CREATE INDEX idx_payments_due_date ON rent_payments(due_date);
CREATE INDEX idx_payments_month ON rent_payments(month_year);
CREATE INDEX idx_complaints_status ON complaints(status);
CREATE INDEX idx_complaints_assigned ON complaints(assigned_to);
CREATE INDEX idx_complaints_created ON complaints(created_at DESC);
CREATE INDEX idx_visitors_status ON visitors(status);
CREATE INDEX idx_staff_attendance_date ON staff_attendance(date);
CREATE INDEX idx_food_menu_date ON food_menu(date);
CREATE INDEX idx_meal_attendance_date ON meal_attendance(date);

-- TimescaleDB indexes
CREATE INDEX idx_water_readings_tank_time ON water_readings(tank_id, time DESC);
CREATE INDEX idx_electricity_readings_meter_time ON electricity_readings(meter_id, time DESC);

-- Full-text search
CREATE INDEX idx_tenant_profiles_search ON tenant_profiles 
  USING gin(to_tsvector('english', coalesce(full_name, '') || ' ' || coalesce(phone, '') || ' ' || coalesce(email, '')));

CREATE INDEX idx_complaints_search ON complaints 
  USING gin(to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, '')));

/api';

export default async function DashboardPage() {
  const overview = await api.get('/dashboard/overview');

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <MetricsCards data={overview.data} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <OccupancyChart data={overview.data.occupancyTrend} />
        <RecentActivity data={overview.data.recentActivity} />
      </div>
    </div>
  );
}
```

```typescript
// apps/web/src/lib/api.ts
import { getSession } from '@clerk/nextjs/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function api(endpoint: string, options: RequestInit = {}) {
  const session = await getSession();
  const token = await session?.getToken();

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'X-Tenant-ID': session?.user.publicMetadata.tenantId as string,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'API request failed');
  }

  return response.json();
}
```

================================================================================
APPENDIX G: REACT NATIVE MOBILE BOILERPLATE (For DeepSeek Implementation)
================================================================================

```typescript
// apps/mobile/src/app/(tabs)/index.tsx
import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { RentDueCard } from '@/components/dashboard/RentDueCard';
import { WaterStatusCard } from '@/components/dashboard/WaterStatusCard';
import { TodayMenuCard } from '@/components/dashboard/TodayMenuCard';
import { api } from '@/services/api';

export default function DashboardScreen() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/dashboard/overview'),
  });

  return (
    <ScrollView
      refreshControl={
        <RefreshControl refreshing={isLoading} onRefresh={refetch} />
      }
      className="flex-1 bg-gray-50"
    >
      <View className="p-4 space-y-4">
        <Text className="text-2xl font-bold">Good Morning!</Text>
        <RentDueCard data={data?.rentDue} />
        <WaterStatusCard data={data?.waterStatus} />
        <TodayMenuCard data={data?.todayMenu} />
      </View>
    </ScrollView>
  );
}
```

```typescript
// apps/mobile/src/services/api.ts
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const api = axios.create({
  baseURL: 'https://api.opsora.app/v1',
  timeout: 10000,
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('auth_token');
  const tenantId = await AsyncStorage.getItem('tenant_id');

  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (tenantId) config.headers['X-Tenant-ID'] = tenantId;

  return config;
});

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      // Handle token refresh or logout
    }
    return Promise.reject(error);
  }
);

export { api };
```

================================================================================
APPENDIX H: IOT ESP32 FIRMWARE BOILERPLATE (For DeepSeek Implementation)
================================================================================

```cpp
// firmware/esp32-water-monitor/src/main.cpp
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <NewPing.h>

// Configuration (set via captive portal or BLE)
const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
const char* MQTT_BROKER = "mqtt.opsora.app";
const int MQTT_PORT = 8883;
const char* TENANT_ID = "your-tenant-id";
const char* PROPERTY_ID = "your-property-id";
const char* TANK_ID = "your-tank-id";
const char* DEVICE_ID = "esp32-water-001";

// Sensor pins
#define TRIGGER_PIN  5
#define ECHO_PIN     18
#define MAX_DISTANCE 400  // Maximum distance in cm

// Tank configuration
const float TANK_HEIGHT_CM = 150.0;  // Total tank height
const float TANK_CAPACITY_L = 5000.0; // Total capacity in liters

NewPing sonar(TRIGGER_PIN, ECHO_PIN, MAX_DISTANCE);
WiFiClientSecure wifiClient;
PubSubClient mqttClient(wifiClient);

void setup() {
  Serial.begin(115200);

  // Connect to WiFi
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("
WiFi Connected");

  // Configure MQTT
  wifiClient.setInsecure(); // Use proper TLS in production
  mqttClient.setServer(MQTT_BROKER, MQTT_PORT);
  mqttClient.setCallback(mqttCallback);

  connectMQTT();
}

void connectMQTT() {
  while (!mqttClient.connected()) {
    String clientId = "opsora-" + String(DEVICE_ID);
    if (mqttClient.connect(clientId.c_str())) {
      Serial.println("MQTT Connected");
      // Subscribe to config topic
      String configTopic = "opsora/" + String(TENANT_ID) + "/" + String(PROPERTY_ID) + 
                          "/water/" + String(TANK_ID) + "/config";
      mqttClient.subscribe(configTopic.c_str());
    } else {
      delay(5000);
    }
  }
}

void loop() {
  if (!mqttClient.connected()) connectMQTT();
  mqttClient.loop();

  // Read sensor every 30 seconds
  static unsigned long lastRead = 0;
  if (millis() - lastRead >= 30000) {
    lastRead = millis();
    readAndPublish();
  }
}

void readAndPublish() {
  // Get distance in cm
  float distance = sonar.ping_cm();

  if (distance == 0) {
    Serial.println("Sensor error - no reading");
    return;
  }

  // Calculate water level
  float waterHeight = TANK_HEIGHT_CM - distance;
  float levelPercentage = (waterHeight / TANK_HEIGHT_CM) * 100.0;
  float levelLiters = (levelPercentage / 100.0) * TANK_CAPACITY_L;

  // Clamp values
  levelPercentage = constrain(levelPercentage, 0, 100);
  levelLiters = constrain(levelLiters, 0, TANK_CAPACITY_L);

  // Build JSON payload
  StaticJsonDocument<256> doc;
  doc["tenant_id"] = TENANT_ID;
  doc["property_id"] = PROPERTY_ID;
  doc["tank_id"] = TANK_ID;
  doc["device_id"] = DEVICE_ID;
  doc["level_percentage"] = levelPercentage;
  doc["level_liters"] = levelLiters;
  doc["distance_cm"] = distance;
  doc["timestamp"] = getISOTimestamp();

  char payload[256];
  serializeJson(doc, payload);

  // Publish to MQTT
  String topic = "opsora/" + String(TENANT_ID) + "/" + String(PROPERTY_ID) + 
                 "/water/" + String(TANK_ID) + "/level";

  if (mqttClient.publish(topic.c_str(), payload)) {
    Serial.println("Published: " + String(payload));
  } else {
    Serial.println("Publish failed");
  }

  // Check alert thresholds
  checkAlerts(levelPercentage);
}

void checkAlerts(float levelPercentage) {
  if (levelPercentage < 10.0) {
    publishAlert("critical_low", levelPercentage);
  } else if (levelPercentage < 20.0) {
    publishAlert("low", levelPercentage);
  } else if (levelPercentage > 95.0) {
    publishAlert("overflow", levelPercentage);
  }
}

void publishAlert(const char* type, float level) {
  StaticJsonDocument<256> doc;
  doc["type"] = type;
  doc["level"] = level;
  doc["timestamp"] = getISOTimestamp();

  char payload[256];
  serializeJson(doc, payload);

  String topic = "opsora/" + String(TENANT_ID) + "/" + String(PROPERTY_ID) + 
                 "/water/" + String(TANK_ID) + "/alert";
  mqttClient.publish(topic.c_str(), payload);
}

void mqttCallback(char* topic, byte* payload, unsigned int length) {
  // Handle config updates from server
  StaticJsonDocument<512> doc;
  deserializeJson(doc, payload, length);

  // Update thresholds, calibration, etc.
  Serial.println("Config received: " + String(topic));
}

String getISOTimestamp() {
  // Simplified - use NTP in production
  return "2026-06-20T12:00:00Z";
}
```

================================================================================
APPENDIX I: PACKAGE.JSON FILES (For DeepSeek Implementation)
================================================================================

```json
// Root package.json
{
  "name": "opsora",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev",
    "lint": "turbo run lint",
    "test": "turbo run test",
    "db:generate": "turbo run db:generate",
    "db:migrate": "turbo run db:migrate",
    "db:studio": "turbo run db:studio"
  },
  "devDependencies": {
    "turbo": "^2.0.0",
    "typescript": "^5.4.0"
  }
}
```

```json
// apps/api/package.json
{
  "name": "@opsora/api",
  "version": "1.0.0",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:studio": "drizzle-kit studio",
    "lint": "eslint src/**/*.ts",
    "test": "vitest"
  },
  "dependencies": {
    "fastify": "^4.28.0",
    "@fastify/cors": "^9.0.0",
    "@fastify/jwt": "^8.0.0",
    "@fastify/swagger": "^8.14.0",
    "@fastify/swagger-ui": "^4.0.0",
    "fastify-type-provider-zod": "^2.0.0",
    "drizzle-orm": "^0.31.0",
    "pg": "^8.12.0",
    "redis": "^4.6.0",
    "bullmq": "^5.8.0",
    "mqtt": "^5.7.0",
    "zod": "^3.23.0",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.2",
    "pino": "^9.2.0",
    "pino-pretty": "^11.2.0",
    "date-fns": "^3.6.0",
    "uuid": "^10.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.14.0",
    "@types/bcryptjs": "^2.4.6",
    "@types/jsonwebtoken": "^9.0.6",
    "@types/uuid": "^10.0.0",
    "drizzle-kit": "^0.22.0",
    "tsx": "^4.15.0",
    "typescript": "^5.4.0",
    "vitest": "^1.6.0"
  }
}
```

```json
// apps/web/package.json
{
  "name": "@opsora/web",
  "version": "1.0.0",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest"
  },
  "dependencies": {
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "@clerk/nextjs": "^5.0.0",
    "@tanstack/react-query": "^5.45.0",
    "zustand": "^4.5.0",
    "recharts": "^2.12.0",
    "lucide-react": "^0.396.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.3.0",
    "date-fns": "^3.6.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@types/node": "^20.14.0",
    "typescript": "^5.4.0",
    "tailwindcss": "^3.4.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0",
    "eslint": "^8.57.0",
    "eslint-config-next": "^15.0.0",
    "vitest": "^1.6.0"
  }
}
```

```json
// apps/mobile/package.json
{
  "name": "@opsora/mobile",
  "version": "1.0.0",
  "main": "expo/AppEntry.js",
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web",
    "build:android": "eas build --platform android",
    "build:ios": "eas build --platform ios"
  },
  "dependencies": {
    "expo": "~51.0.0",
    "expo-router": "~3.5.0",
    "expo-secure-store": "~13.0.0",
    "expo-notifications": "~0.28.0",
    "expo-image-picker": "~15.0.0",
    "expo-local-authentication": "~14.0.0",
    "expo-background-fetch": "~12.0.0",
    "expo-network": "~6.0.0",
    "expo-haptics": "~13.0.0",
    "react": "18.2.0",
    "react-native": "0.74.0",
    "@clerk/clerk-expo": "^1.0.0",
    "@tanstack/react-query": "^5.45.0",
    "zustand": "^4.5.0",
    "axios": "^1.7.0",
    "socket.io-client": "^4.7.0",
    "date-fns": "^3.6.0",
    "react-native-reanimated": "~3.10.0",
    "react-native-gesture-handler": "~2.16.0",
    "react-native-safe-area-context": "4.10.0",
    "react-native-screens": "3.31.0",
    "@react-native-async-storage/async-storage": "1.23.0"
  },
  "devDependencies": {
    "@babel/core": "^7.24.0",
    "@types/react": "~18.2.0",
    "typescript": "^5.4.0"
  }
}
```

================================================================================
DOCUMENT END
================================================================================

# INSTRUCTIONS FOR DEEPSEEK V4 FLASH IMPLEMENTATION

This document provides a complete blueprint for building Opsora. When giving this
to DeepSeek V4 Flash, include these specific instructions:

1. START WITH MVP: Implement only Phase 1 features (Occupancy, Tenant, Rent,
   Complaints, Water IoT, Mobile App)

2. USE THE PROVIDED BOILERPLATE: Appendices E-I contain starter code for Fastify
   API, Next.js Dashboard, React Native Mobile, and ESP32 Firmware

3. FOLLOW THE DATABASE SCHEMA EXACTLY: Use the PostgreSQL schema in Section 4
   with Drizzle ORM for type safety

4. IMPLEMENT MULTI-TENANCY FIRST: Every table must have tenant_id with RLS

5. USE THE API ENDPOINTS: Section 5 lists all required endpoints - implement
   them in order of priority

6. SETUP IOT PIPELINE: Use MQTT (EMQX/Mosquitto) + TimescaleDB for sensor data

7. INTEGRATE PAYMENTS: Razorpay for India (UPI, QR, Cards) with webhook handling

8. BUILD MOBILE APP: React Native (Expo) with push notifications (FCM)

9. ADD REAL-TIME: Socket.io for live updates (water levels, payments, complaints)

10. DEPLOY WITH DOCKER: Use the docker-compose in Section 13 for local dev

KEY DECISIONS ALREADY MADE:
- Fastify over Express (performance)
- Drizzle ORM over Prisma (zero runtime overhead)
- TimescaleDB over raw PostgreSQL (time-series performance)
- React Native (Expo) over Flutter (ecosystem + hiring)
- Clerk over Auth0 (better DX + cheaper)
- BullMQ over Bull (TypeScript native)

DO NOT:
- Use MongoDB (relational data needs PostgreSQL)
- Build custom auth (use Clerk)
- Skip RLS policies (security critical)
- Skip API validation (use Zod everywhere)
- Skip error handling (use structured logging)
