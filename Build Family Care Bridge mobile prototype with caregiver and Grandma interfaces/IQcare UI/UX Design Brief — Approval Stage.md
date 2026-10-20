# IQcare UI/UX Design Brief — Approval Stage

## Direction name

**Signal Yellow / Royal Blue Care Console**

The visual direction combines a premium black-and-white iQOO-inspired interface with high-energy yellow actions and royal-blue trust signals. It should feel fast and technological without becoming cold or intimidating for older adults.

## Brand expression

- **Black:** depth, focus, premium device character, caregiver dashboard chrome.
- **White:** clarity, safety, Grandma mode surfaces, readable content.
- **iQOO yellow:** decisive action, new message, send, capture, and attention states.
- **Royal blue:** trust, active connection, shared state, and verified delivery.

Suggested tokens: `#0B0D12` black, `#FFFFFF` white, `#FFD400` signal yellow, `#1746D1` royal blue, `#E9EEF8` cool surface, `#FFEEE0` warm safety surface.

## Typography

Use a high-contrast display face for product headlines and a highly readable sans-serif for body text. Caregiver labels may use a compact technical style; Grandma mode should use large, familiar sentence case and avoid all-caps paragraphs.

## Sample A — Caregiver dashboard

```text
┌────────────────────────────────────────────────────────────┐
│ IQcare / SIGNAL TO CARE                         [Grandma]  │
│                                                            │
│  GOOD EVENING, SUMANTH.                    ● MEERA ONLINE  │
│  One change worth a human look.                            │
│                                                            │
│  ┌────────────── SIGNAL REVIEW ──────────┐ ┌─────────────┐ │
│  │ Movement is different from Meera's    │ │ 76 bpm      │ │
│  │ afternoon rhythm. Not a diagnosis.    │ │ steady      │ │
│  │ [Review with care]  [Dismiss]          │ │ ● connected │ │
│  └────────────────────────────────────────┘ └─────────────┘ │
│                                                            │
│  OFFLINE CARE BRIDGE                                      │
│  [ Speak / type a message ...                         ]    │
│  [Capture photo] [Read aloud] [Save offline] [Send]       │
│  ● Photo ready   ● Voice ready   Delivery: queued         │
└────────────────────────────────────────────────────────────┘
```

The yellow action is reserved for the primary care action. Royal blue marks connection and delivery. Black is used for navigation and device identity; white carries content and readability.

## Sample B — Grandma smartphone screen

```text
┌────────────────────────────┐
│ IQcare             ● Ready │
│                            │
│ Hello, Meera.              │
│ Sumanth sent something     │
│                            │
│ ┌────────────────────────┐ │
│ │  ▶  Play message       │ │
│ └────────────────────────┘ │
│                            │
│ ┌────────────────────────┐ │
│ │  ▣  View photo         │ │
│ └────────────────────────┘ │
│                            │
│ ┌──────────────┐ ┌───────┐ │
│ │  ♥ I'm okay  │ │ HELP  │ │
│ └──────────────┘ └───────┘ │
│                            │
│        Call Sumanth        │
└────────────────────────────┘
```

Grandma mode uses white cards, black text, blue connection indicators, and a single yellow primary action. The **I need help** control should be visually distinct using a warm coral safety treatment, not the same yellow as ordinary actions.

## Sample C — Photo send flow

1. Caregiver taps **Capture photo**.
2. Camera/gallery chooser opens through a real mobile file input.
3. Photo preview appears in a white card with a clear replace/remove action.
4. Validation states explain unsupported format or oversized image.
5. The caregiver adds an optional caption.
6. **Send to Meera** becomes active only after a valid photo exists.
7. Grandma mode displays the photo with a large open/view action.

## Motion and interaction

Use short 150–220ms transitions, a subtle yellow capture confirmation, and a blue delivery-state pulse. Never animate the main Grandma controls in a way that shifts their position. Respect reduced-motion preferences.

## Accessibility

- Minimum 4.5:1 contrast for normal text.
- At least 3:1 for large text and UI boundaries.
- Minimum 44px touch targets; Grandma actions should be 64px or larger.
- Visible keyboard focus states.
- `alt` text for every photo.
- Do not rely on colour alone for delivery or emergency state.

## Approval question

**Do you approve Signal Yellow / Royal Blue Care Console, or should I adjust the theme before rebuilding the full project?**

The final rebuild will apply the supplied IQcare logo once it is uploaded as a standalone PNG, SVG, or JPG. The current ZIP did not contain the logo asset.
