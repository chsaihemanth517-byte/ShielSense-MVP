# Visual Verification Notes

| Viewport | Finding | Status |
|---|---|---|
| Desktop, 1280 × 720 | The nine-scene story maintains a clear sequence, with the two-channel scan split and product cards visually legible. Persistent controls remain present without obstructing content. | Pass |
| Mobile, 375 × 812 | The page collapses to a single-column narrative, keeps the floating navigation usable, and converts the waitlist capture control into a touch-friendly stacked layout when needed. | Pass |

The visual system maintains its near-black field, technical green, restrained human-signal coral, monospace evidence labels, and light FAQ recovery moment at both inspected sizes. The page deliberately uses DOM and CSS visuals rather than a WebGL dependency, so it has no WebGL failure mode. In reduced-motion mode, particle positions, the scan beam, scan-lock rings, and scene content remain as explicit static compositions while all nonessential animation is suppressed.

| Motion refinement check | Finding | Status |
|---|---|---|
| Desktop visual depth | The hero separates atmospheric haze, particle signal field, orbital rings, and near annotation layers. Scroll scenes retain visual hierarchy while moving through their bounded state range. | Pass |
| Pointer behavior | The hero runs an inertial, request-animation-frame loop only for fine pointers without reduced-motion preference. Values are capped to shallow translations and a 1.35° maximum tilt. | Pass by implementation review |
| Mobile and touch behavior | Coarse-pointer media rules pin pointer and scroll variables to their static values while preserving the content and stage compositions. The 375 px verification displays a stable, single-column scene sequence. | Pass |
| Accessibility | Reduced-motion rules suppress the nonessential interpolation while maintaining particle, scan beam, scan-lock, and evidence states as static visual information. | Pass |
