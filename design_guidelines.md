# Design Guidelines: AI Health Insights Platform

## Design Approach

**Selected System**: Hybrid approach combining Apple Health Interface Guidelines (trust, clarity, medical context) with Material Design (data visualization, information hierarchy)

**Design Philosophy**: Medical-grade clarity meets personal wellness. Create a professional, trustworthy interface that makes complex health data accessible and actionable.

**Key Principles**:
- Clinical clarity without clinical coldness
- Data-forward design with human warmth
- Immediate actionability for insights
- Privacy-conscious visual language

## Color Palette

**Light Mode**:
- Primary: 210 100% 45% (Medical blue - trust, calm)
- Background: 0 0% 98% (Soft white for extended reading)
- Surface: 0 0% 100% (Pure white cards)
- Success: 142 71% 45% (Health green for positive metrics)
- Warning: 38 92% 50% (Amber for attention areas)
- Critical: 0 84% 60% (Red for concerning biomarkers)
- Text Primary: 222 47% 11%
- Text Secondary: 215 20% 45%

**Dark Mode**:
- Primary: 210 100% 60% (Lighter blue for contrast)
- Background: 222 47% 11% (Deep navy-black)
- Surface: 217 33% 17% (Elevated dark blue-gray)
- Success: 142 71% 55%
- Warning: 38 92% 60%
- Critical: 0 84% 70%
- Text Primary: 0 0% 98%
- Text Secondary: 215 20% 65%

**Accent Colors** (Data Visualization):
- Chart 1: 270 70% 60% (Purple)
- Chart 2: 190 70% 50% (Teal)
- Chart 3: 25 85% 60% (Orange)

## Typography

**Font Families**:
- Primary: Inter (Google Fonts) - UI elements, data labels
- Secondary: SF Mono / Roboto Mono (Google Fonts) - Numerical data, measurements
- Headers: Inter with weight variation

**Scale**:
- H1: text-4xl font-bold (Dashboard headers)
- H2: text-2xl font-semibold (Section titles)
- H3: text-xl font-semibold (Card headers)
- Body: text-base font-normal (Content)
- Small: text-sm (Labels, metadata)
- Metric Display: text-5xl font-bold tracking-tight (Key health numbers)

## Layout System

**Spacing Primitives**: Use Tailwind units of 2, 4, 6, 8, 12, 16 for consistent rhythm
- Component padding: p-4 to p-6
- Section spacing: space-y-8
- Card gaps: gap-6
- Page margins: px-8 py-12

**Grid Structure**:
- Main dashboard: 12-column responsive grid
- Sidebar: 280px fixed (navigation, quick stats)
- Content area: flex-1 with max-w-7xl
- Card layouts: grid-cols-1 md:grid-cols-2 lg:grid-cols-3

## Component Library

**Navigation**:
- Fixed sidebar with icon + label navigation
- Sections: Dashboard, Health Records, Meal Plans, Training, Insights, Settings
- Active state: Subtle background fill with accent border-left

**Dashboard Cards**:
- Elevated cards with subtle shadow (shadow-sm)
- Rounded corners: rounded-lg
- Border: Subtle 1px border in light mode, none in dark mode
- Hover: Subtle scale transform (scale-105)

**Data Visualization**:
- Line charts for trends (weight, biomarkers over time)
- Bar charts for comparative metrics
- Circular progress indicators for goal tracking
- Color-coded zones (optimal, caution, concerning)
- Chart.js or Recharts for consistency

**Health Metric Cards**:
- Large numerical display (metric value)
- Trend indicator (↑ ↓ with color coding)
- Comparison to previous period/target
- Mini sparkline showing 7-day trend
- Status badge (optimal/warning/critical)

**Form Inputs**:
- Material-style filled inputs with floating labels
- Clear validation states with inline error messages
- Date/time pickers for logging activities
- Steppers for numerical inputs (weight, reps, etc.)
- Consistent dark mode background (not white)

**Recommendation Cards**:
- Distinct visual treatment from data cards
- Icon indicating category (meal/exercise/supplement)
- Priority indicator (high/medium/low)
- Actionable CTA button
- Expandable detail section

**Action Buttons**:
- Primary: Solid fill with primary color
- Secondary: Outline with subtle hover fill
- Tertiary: Ghost style for less emphasis
- Size variants: lg for primary actions, md for secondary

**Data Tables**:
- Striped rows for readability
- Sortable column headers
- Responsive: Stack on mobile
- Sticky headers on scroll
- Highlight row on hover

**Health Record Viewer**:
- PDF preview in modal/side panel
- Extracted data highlights
- AI insights callouts
- Download/share options

## Accessibility & Responsive Design

**Mobile-First**:
- Single column card stack on mobile
- Bottom navigation bar (sticky)
- Swipeable chart views
- Collapsible sections for data density

**Desktop Optimization**:
- Multi-column dashboard (2-3 columns)
- Persistent sidebar navigation
- Larger chart displays
- Side-by-side comparisons

**Touch Targets**: Minimum 44px for all interactive elements

**Dark Mode**: System preference detection with manual toggle, consistent implementation across all inputs and surfaces

## Visual Style

**Imagery**: No hero images - this is a utility dashboard. Use icons (Heroicons) for navigation and categories. Medical/health illustrations for empty states only.

**Data Emphasis**: Numbers and trends are the visual focus, not decorative elements

**White Space**: Generous padding around metrics for scanning, tighter grouping for related data

**Elevation**: Minimal use - only for modals and important notifications

**Animations**: Subtle entrance animations for data updates, smooth transitions for navigation, no distracting motion