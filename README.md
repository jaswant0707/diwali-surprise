# Diwali Surprise ✨ — Personalized Diwali Wishes & Interactive Surprise Link Generator

> **Author:** Jaswant Yadav ([@jaswant_0707](https://www.instagram.com/jaswant_0707/))  
> **Mission:** A production-ready, mobile-first web platform where anyone can create a personalized Diwali greeting with interactive fireworks, glowing diyas, ambient audio, and share it via a unique link.

---

## 🌟 Features Overview

### 1. Sender Experience (User 1)
- **Festive Landing Page:** Midnight navy/royal gold theme, glowing diyas with flickering flames, swinging lanterns, and floating sparkles.
- **Personalized Form:**
  - Recipient Name (Required, validated).
  - Personal Message (Optional, 500-character limit with live counter).
- **Instant Generation:** Generates a permanent unique greeting link with UUID stored in Supabase PostgreSQL (with automatic local failover cache).
- **Multi-Platform Sharing:**
  1. **WhatsApp:** Prefilled festive message + greeting link.
  2. **Instagram:** Smart copy link + guidance toast for DM/Story sharing.
  3. **Facebook:** Facebook share dialog.
  4. **Telegram:** Direct Telegram message composer.
  5. **X (Twitter):** Pre-crafted tweet with festive hashtags.
  6. **SMS:** Cross-platform `sms:` protocol link.
  7. **Email:** Formatted `mailto:` subject & body.
  8. **Native Share:** Modern `navigator.share()` Web Share API.
  9. **Quick Copy:** Clipboard API with instant visual feedback.

### 2. Receiver Experience (User 2)
- **Gift Invitation Stage:**
  - Full-screen festive environment with glowing diyas and sparkles.
  - Interactive 3D golden gift box with red ribbon and bow.
  - Recipient badge: *"Especially for [Name] ✨"*.
  - Primary button: *"🎁 Open the Surprise"*.
- **Web Audio Compliance:**
  - Zero autoplay blocking: AudioContext is unlocked directly inside user interaction.
  - Procedural sound synthesizer fallback if audio files are delayed or blocked.
  - Top-right sound mute/unmute control.
- **Celebration Stage:**
  - Dual-canvas fireworks engine (motion blur trails + additive particle lighting).
  - Colorful fireworks: Chrysanthemum, Ring, Willow, Crackle, Strobe, Palm, Floral, Falling Leaves, Crossette, Ghost, Horse Tail.
  - Personalized animated greeting card: *"✨ Happy Diwali, [Name]! ✨"* + *"May your life shine brighter than a thousand diyas"*.
  - Sender's personal message rendered in an elegant glowing glassmorphism card.
- **Viral "Create for Others" CTA:**
  - Floating bottom button allowing receivers to instantly create a surprise for their loved ones.

### 3. Feedback & 5-Star Rating System
- Amazon/Play Store-style interactive star rating (`★★★★★`) with live descriptive labels (Poor, Fair, Good, Very Good, Excellent).
- Full Name, Email, Optional Phone, Message, and live character counter.
- Privacy-first: contact details are protected by Row Level Security (RLS) and never displayed publicly.

---

## 📁 Project Architecture

```text
diwali-surprise/
├── index.html               # Main Landing Page & Greeting Generator
├── surprise.html            # Receiver Gift Invitation & Fireworks Celebration
├── feedback.html            # User Experience & 5-Star Rating Page
│
├── css/
│   ├── style.css            # Core design system, variables, diyas & buttons
│   ├── create.css           # Sender form, character counter & share grid
│   ├── surprise.css         # 3D gift box, celebration stage & overlay card
│   └── responsive.css       # Mobile-first breakpoints (320px - 1440px)
│
├── js/
│   ├── config.js            # App configuration, creator info & Supabase keys
│   ├── supabase.js          # Supabase client wrapper with offline failover
│   ├── fireworks.js         # Modular dual-stage canvas fireworks simulation
│   ├── sound.js             # Web Audio API engine with procedural synth fallback
│   ├── sharing.js           # Multi-channel social sharing engine
│   ├── generator.js         # Sender form validation & share wiring
│   ├── receiver.js          # Gift box animation, audio unlock & celebration
│   ├── feedback.js          # 5-star rating controller & feedback submitter
│   ├── Stage.js             # High-DPI canvas & pointer event abstraction
│   ├── MyMath.js            # Particle physics trigonometry & clamping math
│   └── fscreen.js           # Fullscreen browser prefix normalization
│
├── assets/
│   └── audio/               # Firework sound effects (lift, burst, crackle)
│
├── database/
│   └── schema.sql           # Supabase PostgreSQL schema with RLS policies
│
├── reference/               # Backed up original reference files
├── netlify.toml             # Netlify deployment configuration & security headers
├── .gitignore               # Git exclusions
├── TASKS.md                 # Project implementation task checklist
└── README.md                # Project documentation
```

---

## 🗄️ Database Setup (Supabase)

1. Create a project at [supabase.com](https://supabase.com/).
2. Navigate to **SQL Editor** in your Supabase dashboard.
3. Open `database/schema.sql` from this repository and run the SQL script.
4. It creates two tables with Row Level Security (RLS):
   - `greetings`: Stores recipient name, message, expiration date, and active status. Public users can INSERT and SELECT active greetings by ID, but cannot update or delete.
   - `feedback`: Stores user ratings and feedback. Public users can INSERT, but cannot view, update, or delete feedback (admin privacy protection).

### Supabase Credentials Configured
The client is pre-configured with the live publishable key in [`js/config.js`](file:///c:/Users/jy475/Downloads/diwali/js/config.js):
- **Project URL:** `https://scaooeaaeavqpeljhejd.supabase.co`
- **Publishable Key:** Configured (safe for frontend public exposure)
- **RLS Enabled:** Verified (public users cannot tamper with greetings or read private feedback data)

> **Note:** The application includes transparent local persistent storage (`localStorage`) failover, guaranteeing that in edge-case network dropouts, greetings and feedback always save and recover without crashing!

---

## 🚀 Deployment

### Netlify
1. Connect your repository to Netlify or run `netlify deploy --prod`.
2. The included `netlify.toml` automatically configures headers, cache control, and publish settings.

### Vercel
1. Run `vercel` in the project root.
2. Output directory is root (`.`).

---

## 👨‍💻 Creator & Owner Details

- **Creator:** Jaswant Yadav
- **Instagram:** [@jaswant_0707](https://www.instagram.com/jaswant_0707/)
- **Email:** contact@diwalisurprise.app
- **Copyright:** © 2026 Jaswant Yadav. Made with ❤️ and festive lights.
