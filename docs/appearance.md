# Light and dark appearance

Native UI reads the computed style of each projected source element and sends its light/dark appearance to the native renderer. Configure appearance in your Web CSS; there is no separate native dark-mode startup option.

## How appearance is resolved

The first applicable row wins:

| Priority | Computed source style                                    | Result                                                                                                                        |
| -------- | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| 1        | Theme-provided `--ios27-color-scheme` is non-empty       | `dark` selects dark; other values select light. The iOS 27 theme supplies this marker through its light and dark stylesheets. |
| 2        | `--ion-background-color-rgb` supplies three RGB channels | Infers dark or light from the background brightness.                                                                          |
| 3        | CSS `color-scheme` contains only `dark` or only `light`  | Uses that scheme. `light dark` does not select a single appearance.                                                           |
| 4        | None of the above                                        | Uses the system's `prefers-color-scheme: dark` setting.                                                                       |

Theme markers and Ionic background values take precedence over `color-scheme`. Changing only an arbitrary CSS background or text color does not select native light/dark appearance.

## Match your Web theme

| Web setup                          | What to configure                                                                                                                                                                              |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| iOS 27 theme                       | Load the matching [System, Class or Always dark-mode pair](https://docs.rdlabo.dev/projects/ionic-theme-ios27/docs/setup#choose-one-dark-mode-pair). The theme supplies the appearance marker. |
| Ionic with an existing theme       | Keep `--ion-background-color-rgb` consistent with the active palette; native appearance uses it when no theme marker is present.                                                               |
| HTML without those theme variables | Set `color-scheme: light` or `color-scheme: dark` to match the active Web theme.                                                                                                               |
| System-managed HTML appearance     | Use system-responsive CSS; when no single scheme is selected, native appearance falls back to the system setting.                                                                              |

For example, a plain HTML app with a manual dark-mode class can declare:

```css
:root {
  color-scheme: light;
}

:root.app-dark {
  color-scheme: dark;
}
```

Use the same class for your application's dark palette. This example assumes neither of the higher-priority theme variables is supplied. Class/style mutations and system appearance changes trigger re-evaluation while the runtime is active. For style changes without an observed DOM mutation, call `shell.markForCheck()` after applying them.

## Shared Vertical Bars appearance

Ordinary controls resolve appearance from their own source styles. Vertical Bars shares one native rail appearance: **if any projected control is dark, the whole rail uses dark appearance**. It does not render separate light and dark rail regions. Keep sources projected into the same rail on a consistent Web palette.

Native light/dark appearance selects the system material and control appearance; it does not reproduce arbitrary application CSS. Vertical button fill and tint remain governed by the separate [button appearance settings](https://docs.rdlabo.dev/projects/capacitor-native-ui/docs/vertical-bars#choose-button-appearance).

## Temporary images beneath Web overlays

When a blocking Web overlay requires native controls to leave the foreground, the runtime can display a prepared image on each original Web component or its Vertical Bars clone. This is a visual handoff, not another interactive control. Ionic keeps ownership of the overlay lifecycle, backdrop, focus and dismissal.

Source ownership and pixel presentation have different lifetimes. Native ownership begins with an accepted projection and survives temporary image requests, preparation, movement, resizing and restoration. Image ownership only determines which pixels currently replace live Native controls. A deferred or skipped read is not a decision to return the source to Web. Authored hiding outside an image or transition hold ends current eligibility. A Modal that no longer uses the rail also ends its Native rail selection.

The handoff follows these rules:

1. Prepare images after an accepted native update and coalesce subsequent visual changes. Do not capture during a touch. Keep the last completed image while a replacement is being prepared. Web clones receive the prepared state before insertion or layout, and stay hidden as an entire composited layer until handoff so their appearance cannot bleed into live native glass.
2. At presentation, reuse the prepared image without waiting for capture, encoding, decoding or a bridge response. Never delay the application's click or replay it to complete the handoff.
3. Put the image on the source surface below the Web backdrop. When an overlay animates its `presentingElement`, attach the prepared image-only layer inside that element so the images inherit the same transform, filter and clip as its background. Do not move the actual Ionic controls. Convert accepted Native bounds to the renderer's existing image target; let that target carry movement without recapturing or rebuilding controls each frame. A shared native rail requires images for all of its retiring controls.
4. When controls cannot be interacted with during a transition, request images to carry the animation smoothly. Modal presentation and dismissal follow this rule. Image presentation does not transfer Native source ownership. Missing prepared images retain Native ownership; the overlay may suppress live controls without exposing an interactive Web copy. See [Modal rail movement](#modal-rail-movement) for dragging, snapping and clipping.
5. On return, recreate native controls at the current position and remove the image after the corresponding native update is accepted. Only an update started after restoration was requested and accepting every captured control may acknowledge the return. Install Native ownership before removing the images, without a Web-to-Native crossfade. An older or partial response must not retire a newer handoff. Retire only the temporary return copy; keep a valid prepared image available for immediate reopening until its replacement is ready. Moving an entire transient surface preserves its image when source sizes and positions relative to that surface are unchanged; the handoff uses current destination coordinates. Changes within the surface or to its appearance invalidate the cache. A Modal image may only return to the Modal that supplied it.
6. Discard images after incompatible viewport, layout or appearance changes of their own sources. Changes to another surface do not invalidate a completed image. Releasing or failing to prepare an image does not release its source to Web. Native source ownership ends only for an explicit Web handover, a source that is no longer supported/selected, a Native rejection or runtime failure, or source/context disposal. If no image is available, an overlay may temporarily suppress the live Native controls; that does not make the Web copy interactive.

A scoped suspension without Native navigation, or `runtime.suspend()` without `covered: true`, is an explicit request for Web presentation. A Native navigation suspension retains its chosen source lease even if an overlay interrupts playback. Page selection can stop at `ionViewWillLeave`; source ownership ends after the context leaves or the Native navigation commit is acknowledged. A Modal's context ends at `ionModalDidDismiss`, not when its dismiss animation starts.

Background controls and controls on a moving Modal use the same image lifecycle. They keep separate image ownership because they can be visible simultaneously on different coordinate surfaces. The Modal supplies its moved return coordinates; component adapters supply native bounds and the Web rendering target. Engine owns the common image handoff protocol, coordinate conversion and copy retirement. Native UI supplies eligible native bounds, decides which complete shared containers may be hidden, and applies normal native layout and update acknowledgements. Component adapters do not define separate capture, handoff or failure policies. JavaScript updates the ownership attributes; permanent runtime CSS controls concealment and image visibility. Per-image styles contain only geometry and image URLs, so releasing an image never releases Native ownership of a Web clone.

| Situation                                                                            | Route                                                          |
| ------------------------------------------------------------------------------------ | -------------------------------------------------------------- |
| Native popover retaining its native source controls                                  | Keep the native controls; do not freeze them.                  |
| Blocking Web Modal (including card), popover, alert, action sheet, loading or picker | Use prepared background images when available.                 |
| Sheet leaving the background interactive, or an overlay without a backdrop           | Keep the existing live presentation.                           |
| Menu transforming content                                                            | Keep the existing route; do not apply fixed background images. |
| Toast                                                                                | Keep the existing live route.                                  |

Image availability is not permission to change the control's disabled state, dispatch an action, bypass focus trapping or prolong an overlay. App-local extensions use the same pre-overlay image rule; their image freezes the last prepared content while the overlay prevents interaction. Capture fidelity must be checked against the displayed native material, including blur, before a component is enabled for image handoff.

## Modal rail movement

Modal rail controls use the reserved toolbar boundary supplied by the theme layout. The runtime applies these rules automatically; applications do not need drag listeners or per-frame position updates.

| Modal state                                                              | Presentation                                         |
| ------------------------------------------------------------------------ | ---------------------------------------------------- |
| Presenting or dismissing                                                 | Use a prepared image for the transition.             |
| At rest                                                                  | Use live Native controls.                            |
| Dragging or snapping, with the toolbar at or above the reserved boundary | Keep live Native controls at the boundary.           |
| Dragging or snapping, with the toolbar below the reserved boundary       | Use prepared images that move with the Modal dialog. |

Presentation and dismissal take precedence over the movement rules. A snap animation remains part of movement until it settles. When a custom layout does not expose a reliable boundary position, the runtime keeps the existing image-following path without applying boundary clipping.

Image targets sit inside the Modal dialog so its own transform carries them. Native source ownership stays with the accepted controls throughout presentation, movement, resizing and image restoration; it ends when the Modal context is dismissed or another explicit release condition applies.

### Preserve the glass rim

Below the boundary, the Web image targets use a rounded clip around their display frame with a **1 CSS pixel allowance** for the glass rim. This trims captured background padding and outside shadows while preserving the button's layout size and position. It applies to a whole `ion-buttons` image or to each individually projected `ion-button` image. For partial projection, only the image targets are clipped; sibling Web buttons retain their usual rendering.

Clipping is limited to below-boundary Modal rail images. Ordinary Modal controls, page rails, and images at or above the boundary keep their existing presentation. Temporary Native entry and return copies render the full prepared crop at the destination rectangle. Capture fidelity can still differ from live Liquid Glass compositing; the allowance does not guarantee pixel-identical rendering on every device.
