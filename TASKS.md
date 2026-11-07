# Diwali Surprise — Development Task Checklist

## Phase 1: Project Inspection and Planning
- [x] Inspect reference files (`index.html`, `style.css`, `script.js`)
- [x] Map fireworks engine architecture and lifecycle flow
- [x] Identify external dependencies (`fscreen.js`, `Stage.js`, `MyMath.js`, audio files)
- [x] Inspect audio loading, mobile autoplay restrictions, and synthesize fallbacks
- [x] Design clean modular project architecture
- [x] Prepare Supabase database schema (`greetings`, `feedback`) and RLS policies
- [x] Verify reference fireworks run independently in `reference/`

## Phase 2: Project Foundation
- [x] Create directory structure (`css/`, `js/`, `assets/`, `reference/`)
- [x] Add local standalone dependencies (`Stage.js`, `MyMath.js`, `fscreen.js`)
- [x] Create modular CSS files (`style.css`, `create.css`, `surprise.css`, `responsive.css`)
- [x] Create modular JS files (`config.js`, `supabase.js`, `fireworks.js`, `sound.js`, `sharing.js`)
- [x] Create deployment and environment files (`netlify.toml`, `.gitignore`, `README.md`)
- [x] Test modular fireworks engine initialization

## Phase 3: Main Landing Page (Sender Experience)
- [x] Implement midnight navy & gold festive theme with glowing diyas and floating sparkles
- [x] Create hero section with festive typography and animated Diwali illustrations
- [x] Build sender form with Recipient Name (required) and Personal Message (optional, 500 char counter)
- [x] Implement client-side validation and sanitization
- [x] Add attractive festive loading state and success feedback

## Phase 4: Supabase Integration & Database Setup
- [x] Write SQL migrations with UUID generation, constraints, indexes, and RLS policies (`database/schema.sql`)
- [x] Implement Supabase client with anon key and error handling (`js/supabase.js`)
- [x] Implement greeting record insertion (`saveGreeting`)
- [x] Implement greeting retrieval by ID (`getGreetingById`) with expiration/active checks
- [x] Implement local persistent failover mode in case of offline/network issues

## Phase 5: Link Generator & Multi-Platform Sharing
- [x] Generate unique, permanent shareable URL (`surprise.html?id=UUID`)
- [x] Display result card with generated link and quick copy button
- [x] Implement WhatsApp sharing with prefilled Diwali message
- [x] Implement Facebook share dialog
- [x] Implement Telegram share link
- [x] Implement X (Twitter) intent share
- [x] Implement SMS `sms:` link
- [x] Implement Email `mailto:` link with prefilled subject/body
- [x] Implement Native Web Share API (`navigator.share`) with fallback
- [x] Implement Instagram copy link helper with toast notification
- [x] Test all 9 sharing actions on desktop and mobile

## Phase 6: Receiver Experience — Surprise Landing Screen
- [x] Parse URL search parameters to retrieve greeting ID
- [x] Display festive Diwali invitation screen with glowing diyas and sparkles
- [x] Render interactive 3D golden gift box with glowing ribbon
- [x] Implement prominent "🎁 Open the Surprise" primary interaction button
- [x] Handle invalid / expired greeting IDs with friendly Diwali error view

## Phase 7: Fireworks & Celebration Experience
- [x] Trigger gift-opening animation and golden particle burst
- [x] Initialize/resume Web Audio API on user interaction (zero autoplay errors)
- [x] Transition smoothly to full celebration view with dual-canvas fireworks
- [x] Display animated personalized greeting ("✨ Happy Diwali, [RECIPIENT_NAME]! ✨")
- [x] Render sender's personal message in an elegant festive card (omitted if blank)
- [x] Optimize fireworks engine for mobile devices (particle throttling, high-DPI scaling)
- [x] Provide unobtrusive sound mute/unmute control
- [x] Respect `prefers-reduced-motion`

## Phase 8: "Create for Others" Viral Flow
- [x] Add prominent "💝 Create for Others" button at celebration bottom
- [x] Connect seamlessly back to generator with a fresh state
- [x] Ensure multiple greetings have completely independent UUIDs

## Phase 9: Feedback & Rating System
- [x] Create feedback page and modal (`feedback.html`)
- [x] Build interactive 5-star rating component with real-time descriptive labels
- [x] Add fields: Full Name (required), Email (required), Phone (optional), Message (required)
- [x] Connect feedback submissions to Supabase `feedback` table with RLS
- [x] Implement anti-spam throttle and submission confirmation
- [x] Add privacy statement regarding contact details

## Phase 10: Creator Details, Legal & Final UI Polish
- [x] Add creator attribution: Jaswant Yadav (@jaswant_0707)
- [x] Add Instagram profile link and configurable contact email
- [x] Add About This Celebration section
- [x] Add Privacy Policy and Terms of Service modals/pages
- [x] Perform responsive layout testing across 320px, 375px, 430px, 768px, 1024px, 1440px
- [x] Test touch targets and remove any horizontal scroll

## Phase 11: End-to-End QA & Production Readiness
- [x] Test complete Sender workflow (Create -> Generate -> Share)
- [x] Test complete Receiver workflow (Open link -> Gift box -> Fireworks -> Personal Message)
- [x] Test complete Feedback workflow (Rate -> Submit -> Supabase confirmation)
- [x] Verify link persistence across browser refreshes and private sessions
- [x] Verify zero console errors, zero layout shifts, and high performance
- [x] Complete `README.md` with setup, architecture, and Supabase SQL instructions
