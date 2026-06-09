# assets

Hero background photos. The landing page (`site.js` → `initHeroScene`) picks one
**automatically based on the visitor's local time of day**, so the filenames
matter — keep these exact names:

| File | Shown around | Headline text |
|------|--------------|---------------|
| `dawn.jpg` | 05:00–06:30 | dark |
| `misty-morning.jpg` | 06:30–08:00 | dark |
| `morning.jpg` | 08:00–11:00 | dark |
| `afternoon.jpg` | 11:00–16:00 | dark |
| `golden-hour.jpg` | 16:00–18:00 | dark |
| `dusk.jpg` | 18:00–19:30 | light (`is-dark`) |
| `twilight.jpg` | 19:30–21:00 | light (`is-dark`) |
| `night.jpg` | 21:00–05:00 | light (`is-dark`) |

To swap an image, just replace the file (same name) and `git push`.

Tips: landscape, ~2000–2400px wide, compressed to a few hundred KB. Keep a
paler area near the top so the headline stays readable on the light-text scenes.
