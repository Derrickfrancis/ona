# Transport App — feature checklist

Check items off as you build. Grouped in the order you'll likely build them.

## Data
- [ ] `stops.json` — at least 6-8 real, verified stops for the first corridor
- [ ] `routes.json` — every route that serves those stops
- [ ] `route_stops.json` — stop order per route
- [ ] `segments.json` — time + fare range per leg, with source and confidence
- [ ] Data-access layer (`getStops()`, `getRoutes()`, `getSegments()`) — reads JSON now, swaps to Supabase later without touching other code

## Routing engine
- [ ] Find stops within walking distance of a given point (or, for v1, match from a dropdown)
- [ ] Direct-route search (one route serves both origin and destination)
- [ ] One-transfer search (two routes share a stop)
- [ ] Time and fare totals per route option
- [ ] Peak vs. off-peak time handling
- [ ] Scoring formula (time, cost, transfers) with adjustable weights
- [ ] "Best route" selection

## Custom route builder
- [ ] Leg picker: from stop → mode → to stop, filtered to what's reachable
- [ ] Connection check between consecutive legs
- [ ] Warning state when legs don't connect
- [ ] Running total (time + fare) as legs are added
- [ ] Compare custom route total to what auto-search would suggest

## API and search
- [ ] API route that runs the routing engine server-side
- [ ] Search form: from / to dropdowns (or autocomplete once geocoding is added)
- [ ] Loading state
- [ ] Validation error (missing origin/destination)
- [ ] "No routes found" state (area not covered yet)
- [ ] Connection/network error state with retry

## Results and detail
- [ ] Route options list, best one flagged
- [ ] Mode badges (color-coded: danfo, BRT, keke)
- [ ] Route detail screen: leg-by-leg breakdown
- [ ] "Why this route" text (start with a template, upgrade to Claude API)
- [ ] Cost shown as a range, not a fixed number, for informal modes

## Map
- [ ] Static map placeholder (v1)
- [ ] Route line drawn on map (v2)
- [ ] Stop markers

## Feedback loop
- [ ] "Is this fare still correct?" prompt
- [ ] Report/correction form
- [ ] Submission confirmation state
- [ ] (Later) Admin review queue before a correction goes live

## Polish and deployment
- [ ] Mobile-responsive layout (test on an actual phone)
- [ ] `.env.local` set up with real keys
- [ ] Deploy to Vercel
- [ ] Test 4-5 real trips by hand and confirm the numbers are right
- [ ] Short "About / How it works" text for first-time users
- [ ] Disclaimer that fares and times are estimates

## After the MVP (stretch, not required for delivery)
- [ ] Move data to Supabase + PostGIS
- [ ] Redis caching for repeat searches
- [ ] Admin review dashboard
- [ ] Second and third corridor
- [ ] Free-text geocoding instead of dropdowns
