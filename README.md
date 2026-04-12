# Celestial Tracker Plugin

A plugin for [Home Screens](https://homescreens.dev) — the open-source smart display system for Raspberry Pi — that displays a beautiful astronomical dashboard with real-time sun and moon tracking.

## Features

- **Dynamic sky arc** with smooth Catmull-Rom bezier paths showing sun and moon trajectories over 24 hours
- **NASA LRO moon photograph** with accurate phase shadow, parallactic angle rotation, and earthshine effect
- **Procedural SVG sun** with radial gradients, granulation texture, and sunspot simulation
- **Dawn/dusk sky tints** that shift through 6 gradient states based on solar altitude
- **Detailed data sections** for both sun and moon: altitude, azimuth, distance, phase, illumination
- **Compact view** option to hide the sky arc for smaller module sizes
- **Configurable units** — miles or kilometers

No API key required — all astronomical calculations are performed client-side using a bundled SunCalc-equivalent engine.

## Installation

Install this plugin from the Plugin Store inside the Home Screens editor, or download a release tarball from the [Releases](https://github.com/home-screens/home-screens-plugin-celestial/releases) page and side-load it.

For general Home Screens setup, see the [documentation](https://homescreens.dev/docs).

## Configuration

| Setting | Default | Description |
|---|---|---|
| Show Sky Arc | `true` | Toggle the sky arc visualization on/off |
| Show Moon Details | `true` | Toggle the moon data section |
| Show Sun Details | `true` | Toggle the sun data section |
| Distance Units | `imperial` | Miles or Kilometers |

## Building

```bash
npm install
npm run build   # Produces dist/bundle.js
npm run dev     # Watch + serve on localhost:5173 for dev-mode loading
```

See the [plugin template README](https://github.com/home-screens/home-screens-plugin-template) for details on the plugin SDK, manifest format, and development workflow.

## License

MIT
