# PRD — Sasta Safar (Travel Ride Booking)

## Original Problem Statement
Based on the features and workings mentioned in the pdf create a website for travelling booking that has gps feature where a customer enters his route where they are going and a price and the number of available seats they have. And another customer also enters a route and can book the ride if anyone is going on the same route for the price they like.

## Confirmed User Choices
- Flow: Post ride + request + driver approval
- Accounts: Both riders and drivers need accounts
- Maps: OpenStreetMap
- Pricing: Rider can offer lower price; driver accepts/rejects
- Payments: Real Stripe integration

## Architecture Decisions
- Frontend: React + React Router + Tailwind + Shadcn UI + Framer Motion + Sonner
- Backend: FastAPI + Motor (MongoDB) + JWT auth + passlib hashing
- Database: MongoDB collections for users, rides, booking_requests, payment_transactions
- Maps/GPS: OpenStreetMap via React Leaflet + Nominatim geocoding
- Payments: Stripe Checkout via emergentintegrations StripeCheckout helper
- Security: JWT-protected APIs; backend-controlled checkout amount; payment idempotency guard

## User Personas
1. Driver/Car Owner: Posts route, seats, and base seat price to recover costs.
2. Rider/Passenger: Searches route, offers negotiable price, books seat and pays after approval.
3. Platform Operator: Tracks payment transaction records and booking lifecycle.

## Core Requirements (Static)
- Route posting with from/to/date/time/seats/price
- Route search and matching
- Offer-based booking request flow
- Driver accept/reject decision flow
- Stripe checkout after accepted requests
- Payment status polling and transaction persistence
- GPS map visibility with route markers

## What’s Implemented
### 2026-03-26
- Built complete auth system (register/login/me) with JWT and hashed passwords.
- Implemented ride posting/search/mine APIs and UI pages.
- Implemented booking request APIs and UI for sending requests with offered price.
- Implemented driver incoming requests management (accept/reject).
- Implemented Stripe checkout session creation, status polling, webhook endpoint.
- Added `payment_transactions` collection writes and status updates with idempotency guard.
- Added payment result routes (success/cancel) and frontend polling flow.
- Designed multi-page responsive UI with navigation, dashboard, and OpenStreetMap map panel.
- Added data-testid attributes across interactive and user-critical UI elements.
- Fixed booking visibility sync issue by redirecting to My Bookings after request and adding periodic refresh on request pages.

### 2026-03-29
- Switched payment currency from USD to INR in checkout and payment status reporting.
- Added landing-page hamburger menu with links to dedicated About Us and Contact Us pages.
- Added About Us vision/scope copy focused on affordable travel and efficient fuel utilization.
- Added Contact Us page with requested support phone numbers.
- Added Safety Assurance page to capture GPS, find nearest police station, and share/copy emergency location.
- Added India city autocomplete dataset endpoint and UI datalist suggestions for ride post/search city inputs.
- Enforced valid Indian city selection on ride posting to avoid partial city persistence.
- Updated ride posting workflow to require driving licence confirmation and vehicle number.
- Persisted driver profile and last ride preferences for one-click auto-fill in future ride posts.
- Fixed safety share fallback runtime crash by handling clipboard permission denial gracefully.
- Added mobile-first responsive navigation with compact menu panel and improved header behavior on small screens.
- Replaced licence yes/no with mandatory driving licence number input and strict backend format validation.
- Added `/api/safety/eligibility` and gated safety GPS actions until ride-start eligibility conditions are met.
- Added safety countdown/lock UI with refresh status behavior.

## Prioritized Backlog
### P0 (Critical Remaining)
- Implement auth refresh token lifecycle and explicit token expiry handling in UI.
- Add server-side validation for travel date/time format consistency.

### P1 (Important)
- Add notifications (in-app/real-time) when requests are accepted/rejected.
- Add ratings/reviews after completed rides.
- Add Aadhaar/ID verification workflow and profile completion checks.

### P2 (Enhancements)
- Expand safety flow with emergency escalation logs and authority acknowledgement.
- Add fare breakdown with platform fee display.
- Add ride history analytics and driver earnings insights.

## Next Tasks List
1. Add real-time request updates (websocket or polling service abstraction).
2. Add stronger profile and safety verification flows.
3. Add post-ride completion review/rating experience.
4. Expand route matching with waypoint/partial-route compatibility.
