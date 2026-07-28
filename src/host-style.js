// The host's module frame, implemented plugin-side.
//
// Why this file exists: the host does NOT wrap plugin modules in its
// `ModuleWrapper` the way it wraps built-in ones. A plugin renders its own
// root element, so every field of `ModuleStyle` — every slider in the
// editor's Style panel — only takes effect if the plugin implements it. A
// field we don't read is a control that silently does nothing for the user.
//
// Three of those were being dropped here before this file existed:
//
//   Border and shadow. `borderWidth` / `borderColor` / `shadowSize` were
//   added to the host after this plugin shipped, so the hand-written root
//   frame never knew about them.
//
//   Padding. The root box simply never set it, so the Padding slider moved
//   nothing at all.
//
//   Opacity under backdrop blur. Setting `opacity` on the element while
//   `backdrop-filter` is active makes the blur invisible: an opaque
//   background covers the blurred backdrop completely and Chrome renders
//   nothing. The host bakes the opacity into the background's alpha channel
//   instead, and so does `hostFrameStyle`.
//
// This is the JavaScript twin of the TypeScript `host-style.ts` carried by
// the other Home Screens plugins; keep the behavior in step with it.

/** The host's default border color, matching its `ModuleWrapper`. */
var DEFAULT_BORDER_COLOR = 'rgba(255, 255, 255, 0.15)';

/** Parse `#rgb`, `#rrggbb`, `rgb()`, or `rgba()` into an [r, g, b] triple.
 *  Null for anything else, so callers can fall back rather than emit a
 *  broken color string. */
export function parseColor(input) {
  var value = String(input).trim();

  var short = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(value);
  if (short) {
    return [
      parseInt(short[1] + short[1], 16),
      parseInt(short[2] + short[2], 16),
      parseInt(short[3] + short[3], 16),
    ];
  }

  var hex = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(value);
  if (hex) {
    return [parseInt(hex[1], 16), parseInt(hex[2], 16), parseInt(hex[3], 16)];
  }

  var fn = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i.exec(value);
  if (fn) {
    var rgb = [
      Math.round(Number(fn[1])), Math.round(Number(fn[2])), Math.round(Number(fn[3])),
    ];
    var ok = rgb.every(function (c) { return isFinite(c) && c >= 0 && c <= 255; });
    if (ok) return rgb;
  }

  return null;
}

/** The alpha of a legacy `rgba(r, g, b, a)` string — the form
 *  `getComputedStyle` hands back — or null when there is none to read. */
function alphaOf(color) {
  var m = /^rgba\(\s*[\d.]+[\s,]+[\d.]+[\s,]+[\d.]+[\s,/]+([\d.]+)\s*\)$/i
    .exec(String(color).trim());
  return m ? Number(m[1]) : null;
}

/** True for an `rgb()`/`rgba()` string carrying an alpha `alphaOf` can't read
 *  — percentage alpha, or the space-separated syntax. Those have to go
 *  through the DOM probe to be normalized. */
function hasUnreadableAlpha(input) {
  var value = String(input).trim();
  if (!/^rgba?\(/i.test(value)) return false;
  var opaque = /^rgba?\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*\)$/i.test(value);
  return !opaque && alphaOf(value) === null;
}

/** One DOM probe per distinct string — the host re-renders the module on
 *  every tick and the answer never changes. */
var resolvedCache = new Map();

/** The same color in a form `parseColor` can read, or null if it isn't a
 *  color at all. The host's color picker accepts anything the browser calls
 *  valid and stores the string verbatim, so `black`, `hsl(0 0% 10%)`, and
 *  `rgb(0 0 0 / 50%)` all reach plugin code; the browser is the only thing
 *  that knows what `rebeccapurple` is. */
export function resolveColor(input) {
  // Only skip the probe for forms whose alpha `colorWithAlpha` can read back.
  // `parseColor` also matches the space-separated syntax — `rgb(0 0 0 / 50%)`
  // — after reading three numbers, and returning that verbatim would strip
  // the alpha on the way through. The probe normalizes it to `rgba(…)`.
  if (parseColor(input) && !hasUnreadableAlpha(input)) return input;

  if (resolvedCache.has(input)) return resolvedCache.get(input);

  var out = null;
  if (typeof document !== 'undefined' && document.body) {
    var probe = document.createElement('div');
    probe.style.color = input;
    // An invalid value leaves the property untouched; without this check the
    // computed style below would hand back the inherited color and turn
    // gibberish into whatever the page happens to be using.
    if (probe.style.color !== '') {
      // A detached element has no computed style, so the probe has to be in
      // the document. `display: none` keeps it out of layout.
      probe.style.display = 'none';
      document.body.appendChild(probe);
      try {
        var computed = getComputedStyle(probe).color;
        out = parseColor(computed) ? computed : null;
      } finally {
        probe.remove();
      }
    }
  }
  resolvedCache.set(input, out);
  return out;
}

/** Bake an alpha into a color so a blurred module can carry its opacity in
 *  the background rather than on the element. Null when the color can't be
 *  read at all, so the caller can fall back to element opacity — a slightly
 *  weaker blur beats an opacity setting that does nothing. */
export function colorWithAlpha(color, alpha) {
  // Anything that isn't a real fraction — missing, NaN, or 1 and up — means
  // no dimming. Without this the multiply below would emit `rgba(r, g, b,
  // NaN)`, which the browser throws away, leaving no background at all.
  if (!(alpha >= 0 && alpha < 1)) return color;
  var resolved = resolveColor(color);
  var rgb = resolved ? parseColor(resolved) : null;
  if (!resolved || !rgb) return null;
  // A background that is already translucent keeps its own alpha, scaled, so
  // a default like rgba(0, 0, 0, 0.35) doesn't jump to opaque.
  var existing = alphaOf(resolved);
  var base = existing == null ? 1 : existing;
  return 'rgba(' + rgb[0] + ', ' + rgb[1] + ', ' + rgb[2] + ', ' + (base * alpha) + ')';
}

/** The host's module shadow, matched to what its `buildModuleShadow` gives
 *  every built-in: a hairline top highlight, a cast shadow, and a faint
 *  ambient ring. */
export function moduleShadow(size) {
  if (!(size > 0)) return undefined;
  var offset = Math.round(size / 2);
  var ambient = Math.round(size / 2);
  return 'inset 0 1px 0 rgba(255, 255, 255, 0.12), '
    + '0 ' + offset + 'px ' + size + 'px rgba(0, 0, 0, 0.8), '
    + '0 0 ' + ambient + 'px rgba(255, 255, 255, 0.04)';
}

/** The font size this plugin's pixel dimensions are authored against — the
 *  manifest's `defaultStyle.fontSize`. */
export var BASE_FONT_SIZE = 16;

/** Scale an authored pixel dimension by the host's Text size.
 *
 *  The host's Text size reaches the root as a font size, so `em` values
 *  follow it and pixel values do not. `em` isn't always usable though: it
 *  resolves against the element's OWN font size, and several of the values
 *  here live in plain constant style objects shared between elements with
 *  different type. `--u` is published once on the root by `hostFrameStyle`,
 *  so every `calc(Npx * var(--u))` lands on the same number wherever it sits.
 *
 *  Falls back to 1 so styles still resolve outside a host frame. */
export function px(n) {
  return 'calc(' + n + 'px * var(--u, 1))';
}

/** Every `ModuleStyle` field, applied the way the host applies it to
 *  built-in modules. Spread onto the root element, then add layout. */
export function hostFrameStyle(style) {
  // Guard the zero/NaN case: a bad font size would otherwise multiply every
  // scaled dimension by zero and render the module as a sliver.
  var fontSize = isFinite(style.fontSize) && style.fontSize > 0
    ? style.fontSize
    : BASE_FONT_SIZE;
  var blur = style.backdropBlur || 0;
  var hasBlur = blur > 0;
  var borderWidth = style.borderWidth || 0;
  var shadowSize = style.shadowSize || 0;
  // See the header note: with blur on, the opacity has to live in the
  // background's alpha or the blur renders invisible.
  var bakedBackground = hasBlur
    ? colorWithAlpha(style.backgroundColor, style.opacity)
    : null;

  return {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    boxSizing: 'border-box',
    // Published for `px()`, so pixel dimensions can follow the Text size
    // slider the same way `em` type does.
    '--u': fontSize / BASE_FONT_SIZE,
    fontFamily: style.fontFamily,
    fontSize: fontSize,
    color: style.textColor,
    backgroundColor: bakedBackground || style.backgroundColor,
    opacity: bakedBackground ? undefined : style.opacity,
    borderRadius: style.borderRadius,
    padding: style.padding,
    border: borderWidth > 0
      ? borderWidth + 'px solid ' + (style.borderColor || DEFAULT_BORDER_COLOR)
      : undefined,
    boxShadow: moduleShadow(shadowSize),
    backdropFilter: hasBlur ? 'blur(' + blur + 'px)' : undefined,
    WebkitBackdropFilter: hasBlur ? 'blur(' + blur + 'px)' : undefined,
  };
}
