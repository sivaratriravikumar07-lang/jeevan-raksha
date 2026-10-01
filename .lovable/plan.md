# Jeevan Raksha upgrade plan

Everything that already works (manual SOS, volume 3x, Voice Protection native service, SMS with Google Maps link, emergency calls, contacts, login, dashboard, permissions, Android setup) stays as it is. Only additions are made.

## What already exists (will be extended, not rebuilt)
- Language system (English, Telugu, Hindi) with Settings selector: wire the remaining pages (home, emergency, contacts, nearby, zones) to translations.
- Nearby Police / Hospitals: already uses live GPS through Google Maps. Add a 1 / 3 / 5 / 10 km radius picker, a combined "Emergency services" tab, distance, call and navigate buttons.
- Safe Zones: add a zone type (Home, College, School, Office), radius slider, Inside / Leaving / Outside badge, and an on/off switch for guardian alerts.
- Danger Zones: show Green / Yellow / Orange / Red levels on the map, with a clear "No verified data for this area" label instead of made-up numbers.
- Raksha AI chat becomes "Jeevan AI": add a mic button for voice typing, quick-help buttons, and links to app pages. Words like "help me" open the normal SOS countdown. The AI never sends alerts by itself.

## New features
1. **Nearby Volunteers**
   - Volunteer sign-up page with an availability switch. Volunteers need admin approval before they get requests.
   - When SOS starts, the request goes to approved, available volunteers within 3 km. The requester can widen this to 5 km.
   - Volunteers see only a rough distance until they accept. The first one to accept gets the request, and only then sees the exact location.
   - Volunteer status steps: Accepted, On the way, Arrived, Completed. The requester can cancel at any time.
   - If nobody accepts before the time limit (default 90 seconds), contacts and guardians are told, and the normal SOS keeps running.
2. **Live SOS Map**: the person's live GPS dot with accuracy circle, emergency status, the volunteer's position, last-updated time and movement trail. Real coordinates only.
3. **Emergency Timeline**: every step is saved with its time (SOS triggered, GPS found, SMS sent, call started, volunteers notified, volunteer accepted, help arrived, completed or cancelled).
4. **Safety Status card** on the dashboard: GPS, microphone, notifications, Voice Protection, background service, battery %, network and contacts, all read from the real device.
5. **Emergency History** upgrade: trigger type, rough location, status, volunteer result and outcome. You can delete your own history.
6. **False-trigger protection**: one shared cancel countdown screen for manual SOS, volume 3x and voice. The existing 10-second duplicate guard stays.
7. **Guardian view**: a signed-in emergency contact whose phone or email matches can see the active emergency's status, latest location, time, volunteer status and timeline. Nothing is public.
8. **Privacy page**: explains why each permission is needed, states that no audio is ever recorded, and has switches for guardian access and volunteer sharing.

## Technical details
- New tables (each with grants and row-level security):
  - `volunteers`: user, verified, available, last lat/lng, updated_at
  - `volunteer_requests`: incident, requester, radius_m, status, accepted_volunteer_id, timeout_at, timestamps
  - `volunteer_responses`: request, volunteer, response accept/reject
  - `incident_events`: incident, event_type, status, meta, created_at
  - `safe_zones`: name, type, lat, lng, radius_m, alert_guardians (only if zones currently live in local storage)
- Security-definer database functions:
  - `find_nearby_volunteers` (haversine distance, returns only distance)
  - `accept_volunteer_request` (atomic lock so only the first acceptance wins)
  - `is_guardian_of(incident)` (matches the signed-in user's phone/email to the requester's contacts)
- Live updates for requests, events and location logs.
- `sosWorkflow.ts` gets extra hooks only: after the incident is created, it logs events and creates the volunteer request. The existing SMS and call steps stay untouched. The native Android files stay untouched.
- New routes: `/volunteer`, `/sos-live/:incidentId`, `/guardian-view/:incidentId`, `/privacy`, `/timeline/:incidentId`.
- Volunteer notifications: in-app live updates plus browser/local notifications. Volunteers who have the app closed would need push notifications, which is a later step.
- Final checks: typecheck, build, Android sync, and a quick visual pass on the main pages.

## Not included
- The blank published site still needs the production setting fixed separately.
- Push notifications for closed apps.
- An outside crime-data source for danger zones (none is connected).
