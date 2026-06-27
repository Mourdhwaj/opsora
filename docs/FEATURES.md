# Opsora — Feature Requirements v2.0

## 1. Electricity Consumption Dashboard (Stock Market Style)
- **Line chart** showing daily power consumption (kWh) over time — like a stock ticker
- **Real-time power indicator** with sparkline mini-chart
- **Calendar date picker** — click any day to see that day's hourly breakdown
- **Cost trend** with up/down arrows showing cost vs previous period
- **Color-coded bars**: green = low usage, yellow = moderate, red = high usage
- **Summary cards**: Total kWh, Average daily, Peak load, Total cost

## 2. Water Consumption Dashboard
- **Line chart** showing daily water consumption (liters) over time
- **Calendar date picker** — click any day to see that day's usage
- **Tank level history** over time with fill/unfill visualization
- **Summary cards**: Total consumption, Average daily, Peak usage, Tanker orders
- **Anomaly alerts** highlighted on the chart

## 3. Admin User Checkout Flow
- **Checkout button** on each active resident row
- **Confirmation modal** with summary (name, room, dates, pending balance)
- **Auto-frees bed**, updates room occupancy, updates property occupancy
- **Sets moveOutDate** to today, status to 'checked_out'
- **Toast notification** on success

## 4. Smart Room Allocation Engine
- **Gender-based allocation**: Males → male rooms, Females → female rooms
- **Couples**: Detected via relationship field → separate room (type: 'single' or 'couple')
- **AI Suggestions**: API endpoint suggests best room based on:
  - Available beds matching gender
  - Floor preference
  - Rent budget
  - Roommate compatibility (occupation, age)
- **Allocation preview** before confirming check-in

## 5. Building Model Update
- **5 floors × 10 rooms × 2 beds per room** = 100 beds total
- Room numbering: `FLOOR-ROOM` (e.g., `101`, `102`, ..., `510`)
- Each room has a `gender` field: 'male', 'female', or 'mixed'
- Each room has a `type` field: 'shared', 'single', 'couple'

## 6. Sort & Filter Menu
- **Residents page**: Sort by name, room, floor, move-in date, rent, status
- **Rooms view**: Sort by room number, floor, occupancy, rent
- **Filter chips**: Gender, floor, status (active/checked_out), room type

## 7. Mobile Optimization (All Pages)
- **Bottom tab navigation** on mobile for admin dashboard
- **Card-based layouts** replacing tables on small screens
- **Touch-friendly** controls (min 44px tap targets)
- **Safe area insets** for notched devices
- **Pull-to-refresh** gesture support
- **Responsive grids**: 1 col mobile, 2 col tablet, 3 col desktop
