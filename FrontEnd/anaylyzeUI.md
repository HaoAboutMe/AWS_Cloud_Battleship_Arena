# Cloud Battleship Arena - Home Page Visual & UX Audit

## Design Read
Reading this as: Game Landing Page & Player Dashboard for design-conscious players, with a Neo-brutalist Cyber-Navy visual language, leaning toward custom CSS, CSS Grid, motion/react, and high-contrast offset-shadow styling.

---

## 1. Visual Style & Aesthetic Profile
The visual identity of the Cloud Battleship Arena Home Page is characterized by a high-impact **Neo-brutalist Cyber-Navy** aesthetic. This direction successfully marries retro arcade vibes with modern developer-centric sci-fi motifs.

### Core Visual Tokens
*   **Palette (Dark Mode):** Deep cosmic navy backgrounds (`#020812` to `#04111f`) paired with crisp cyan/teal line-work and glowing neon status elements.
*   **Palette (Light Mode):** Sand/beige parchment colors (`#fffaf0`, `#f6f2e9`) contrasting against dark midnight-blue inks (`#10283a`), electric cobalt (`#1167d8`), and vivid coral accents (`#ff6b4a`).
*   **Borders:** Thick, solid borders (`3px solid var(--home-ink)`) framing components, giving them a structural, tangible game-console quality.
*   **Shadows:** Flat, hard-edged offset shadows (`box-shadow: 7px 7px 0 var(--home-ink)`) instead of diffuse ambient shadows, establishing an immediate neobrutalist depth.
*   **Typography:** Dual-font setup:
    *   **Display & Body:** *Space Grotesk* (sans-serif, geometric-grotesque with eccentric glyph terminals, excellent for structural, modern gaming titles).
    *   **Monospace:** *IBM Plex Mono* (clean tech/radar terminal aesthetic, used for secondary readouts, kicker text, and numeric telemetry data).

---

## 2. Layout Structure & Information Architecture
The Home page is divided into two primary vertical stages: the **Hero Command Deck** and the **Tactical Deployment & Service Records**.

```
┌────────────────────────────────────────────────────────────────────────┐
│                              STICKY HEADER                             │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│                              HERO SECTION                              │
│  ┌───────────────────────────────┐  ┌───────────────────────────────┐  │
│  │         Copy & CTAs           │  │   3D Tactical Map Board &     │  │
│  │   - Kicker Eyebrow            │  │   Floating Ship Sprites       │  │
│  │   - Main Headline             │  │   (Perspective-rotated grid)  │  │
│  │   - Paragraph description     │  │                               │  │
│  │   - Primary/Secondary CTAs    │  │   - Telemetry Panel Overlay   │  │
│  │   - Global Metrics Readout    │  │                               │  │
│  └───────────────────────────────┘  └───────────────────────────────┘  │
│                                                                        │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│                      TACTICAL DEPLOYMENT MODES                         │
│  ┌───────────────────────┐ ┌───────────────────────┐ ┌───────────────┐ │
│  │  Bot Training (Light)  │ │   PvP Matchmaking     │ │ Private Room  │ │
│  │                       │ │   (High Contrast)     │ │ (Warm Sand)   │ │
│  └───────────────────────┘ └───────────────────────┘ └───────────────┘ │
│                                                                        │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│                       RECORDS & LEADERBOARDS                           │
│  ┌───────────────────────────────────────┐ ┌─────────────────────────┐ │
│  │           Service Record              │ │    Top Commanders       │ │
│  │   - Rank Tier Banner (Glowing text)   │ │    - Podium (Top 3)    │ │
│  │   - Total Battles & Winrate Arc       │ │    - Ranking Table      │ │
│  └───────────────────────────────────────┘ └─────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
```

### A. Hero Section (The Command Deck)
*   **Grid Split:** 45% Content Column / 55% Visual Column on large viewports.
*   **Hero Stack Discipline:** Exactly 4 stacked layers (Kicker Eyebrow, Main Headline, Subtext Paragraph, CTA Action row), conforming to professional constraints.
*   **Interactive Visual Component:** Rather than using generic screenshots, the page features a custom 3D-angled tactical sea map (`home-map-board`) with floating WebP ship sprites and a live overlay telemetry widget showing active lobbies. This is an exceptional visual center-piece.

### B. Deployment Modes (Bento Grid)
*   **Structure:** 3 cards displaying bot matches, competitive PvP queue, and private lobby setup.
*   **Contrast Hierarchy:** The competitive PvP card uses a high-contrast dark gradient (`rgba(17, 103, 216, 0.96)`) to stand out between the lighter, less intense training modes.
*   **Interactive Glow:** Custom mouse-coordinate glow gradients (`--mouse-x`, `--mouse-y`) track hover positions to dynamically illuminate card backgrounds.

### C. Service Records & Leaderboards (Telemetry Room)
*   **Side-by-side Layout:** A 60% Service Record panel (showing personal ranking stats and a custom SVG winrate radial progress bar) paired with a 40% Leaderboard panel displaying the top players.
*   **Rank Tier Display:** The current rank is housed in a prominent banner (`home-rank-tier-banner`) featuring custom asset badges and text-shadow neon blooms.

---

## 3. Motion System & Micro-Interactions
The motion system operates with a calculated balance of ambient floating physics and layout state transitions:

*   **Ambient Ships:** Carrier, Destroyer, and Scout sprites float independently using offset CSS keyframes (`home-float-a`, `home-float-b`, `home-float-c`), creating a lifelike ocean parallax effect.
*   **Conic Radar:** The matchmaking/telemetry overlay contains a circular radar element sweeping 360 degrees using CSS keyframes, accentuating the military/sonar fantasy.
*   **Layout Entry:** Sections fade and tilt up on mount (`home-enter`) using smooth cubic-bezier transitions, establishing an active and dynamic layout load.
*   **Neobrutalist Button States:** CTA buttons depress into their flat shadows (`transform: translate(2px, 2px)`) when active, creating high tactile feedback.

---

## 4. Responsive Adaptability & Mobile Optimization
A common pitfall of desktop gaming layouts is vertical bloat on small screens. The Home page circumvents this through several layout adaptations:

*   **Tab-Based Collapsing:** Instead of rendering all 3 deployment cards and 2 record/leaderboard panels in a massive vertical list:
    *   **Deployment Cards:** Collapsed into a 3-tab layout (`Bot / PvP / Room`), rendering only the active mode.
    *   **Records/Leaderboard:** Swapped via toggle tabs (`My Record / Top Commanders`), reducing page height by 50%.
*   **Scale Reduction:** 3D boards and floating ships scale down gracefully or transition to center-stacked layouts on mobile viewports.
*   **Header Compression:** Action options, sign-in controls, and settings menus fold into a responsive mobile trigger dropdown.

---

## 5. Design Taste Skill Compliance Matrix

| Criterion | Evaluation | Notes |
|:---|:---|:---|
| **Design Read Declaration** | ✅ Passed | Explicitly declared at start of file. |
| **No Em-Dash Rule** | ✅ Passed | No unicode em-dashes or en-dashes are used in user-facing copy or design sheets. |
| **Eyebrow Restraint** | ✅ Passed | Capped at 1 kicker eyebrow per major view segment. |
| **Hero Stack Limit** | ✅ Passed | Exactly 4 layers (Eyebrow + Title + Subtext + CTA group) are used in the hero copy column. |
| **No Duplicate CTA Intent** | ✅ Passed | Buttons are unique and route to distinct modes (PVE vs PvP vs Lobby). |
| **Aesthetic Authenticity** | ✅ Passed | Uses local WebP custom art assets, custom-rendered 3D grid, and SVG graphics instead of default generic stock files. |
| **Motion Restraint** | ✅ Passed | Animated objects use low-CPU translate/rotate transforms with hardware acceleration. Reduced-motion fallbacks are respected. |
| **Typography Discipline** | ✅ Passed | Limited to 2 font families (Space Grotesk + IBM Plex Mono) with locked font-weights and strict letter-spacing. |

---

## 6. Recommendations for Future Improvements
While the Home page design is highly polished, the following refinements can elevate the experience:

1.  **Light/Dark Transition Smoothing:** Ensure that switching themes with `document.startViewTransition` has a CSS fallback for browsers that do not support the API.
2.  **Telemetry Data Density:** The telemetry panel overlay on the hero section currently displays a single number. Adding a subtle multi-line text ticker (e.g. "Active battles", "Average queue time") would match the cockpit theme better.
3.  **Monospace Font Standardization:** Verify that all numeric displays in tables and statistics lists use tabular numbers (`font-variant-numeric: tabular-nums`) to prevent text jitter during matchmaking counts.
