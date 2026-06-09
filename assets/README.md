# assets

Hero background photos. The landing page (`site.js` → `initHeroScene`) picks one
**automatically from the real position of the sun** for the visitor's date, time
and approximate location (computed from their time zone — no prompts, no
network). So in British summer 6pm shows `afternoon`, but in winter the same
clock time would show `dusk`/`night`. Keep these exact filenames:

| File | Shown when (relative to the sun) | Headline text |
|------|----------------------------------|---------------|
| `dawn.jpg` | civil dawn → sunrise | dark |
| `misty-morning.jpg` | sunrise → end of morning golden hour | dark |
| `morning.jpg` | morning golden hour → solar noon | dark |
| `afternoon.jpg` | solar noon → evening golden hour | dark |
| `golden-hour.jpg` | evening golden hour → sunset | dark |
| `dusk.jpg` | sunset → end of civil twilight | light (`is-dark`) |
| `twilight.jpg` | civil twilight → astronomical night | light (`is-dark`) |
| `night.jpg` | astronomical night (deep night) | light (`is-dark`) |

To swap an image, just replace the file (same name) and `git push`.

Tips: landscape, ~2000–2400px wide, compressed to a few hundred KB. Keep a
paler area near the top so the headline stays readable on the light-text scenes.
