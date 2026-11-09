import type { WebProjectionOptions } from '@webview-native-ui/engine';
import { modalToolbarAlignment } from './modal.js';
import type { Frame, NativeUIVerticalBarFrame } from '../definitions.js';

const measurements = new WeakMap<Element, { frame: NativeUIVerticalBarFrame; viewport: string }>();
const viewport = (element: Element) => {
  const win = element.ownerDocument.defaultView!;
  const classes = element.closest('ion-app')?.classList;
  return `${win.innerWidth}:${win.innerHeight}:${classes?.contains('ios-theme-vertical-bars')}:${classes?.contains('ios-theme-vertical-bars-left')}`;
};

export const validVerticalBarFrame = (frame: Frame) =>
  [frame.x, frame.y, frame.width, frame.height].every(Number.isFinite) && frame.width > 0 && frame.height > 0;

export const forgetVerticalBarFrame = (element: Element) => measurements.delete(element);

export const rememberVerticalBarFrame = (element: Element, frame: NativeUIVerticalBarFrame) => {
  if (validVerticalBarFrame(frame)) measurements.set(element, { frame, viewport: viewport(element) });
};

export const verticalBarFrame = (element: Element): NativeUIVerticalBarFrame | undefined => {
  const saved = measurements.get(element);
  return saved?.viewport === viewport(element) ? saved.frame : undefined;
};

const modalRailSlot = 'native-ui-vertical-bars';

/** Image targets share the dialog's transform; interactive Web fallback keeps its normal slot. */
export const placeModalRailTarget = (target: HTMLElement, surface: HTMLElement) => {
  if (!surface.matches('ion-modal') || !surface.shadowRoot) return;
  if (
    !target.inert ||
    !surface.ownerDocument.defaultView!.getComputedStyle(surface).getPropertyValue('--ios-theme-vertical-bars-modal-toolbar-top').trim()
  )
    return;
  const content = surface.shadowRoot.querySelector<HTMLElement>('[part~="content"]');
  if (!content) return;
  let slot = surface.shadowRoot.querySelector<HTMLSlotElement>(`slot[name="${modalRailSlot}"]`);
  if (!slot) {
    slot = surface.ownerDocument.createElement('slot');
    slot.name = modalRailSlot;
    slot.setAttribute('data-native-ui-projection-node', '');
  }
  if (slot.parentElement !== content) content.append(slot);
  target.slot = modalRailSlot;
  target.style.position = 'absolute';
  const toolbar = modalToolbarAlignment(surface);
  const first = target.matches('ion-buttons') ? target.querySelector('ion-button, ion-back-button, ion-menu-button') : target;
  const height =
    parseFloat(target.style.getPropertyValue('--native-ui-toolbar-anchor-height')) || first?.getBoundingClientRect().height || 0;
  const top =
    toolbar && height > 0
      ? `max(calc(var(--ios-theme-vertical-bars-toolbar-top) - var(--ios-theme-vertical-bars-modal-offset-top, 0px)), ${toolbar.centerY - height / 2 - content.getBoundingClientRect().y}px)`
      : 'var(--ios-theme-vertical-bars-modal-toolbar-top)';
  target.style.top = `calc(${top} + var(--ios-theme-vertical-bars-toolbar-offset, 0px))`;
  // Native bounds and theme edges are relative to the surface. Convert the
  // anchors into the dialog's padding edge without accumulating offsets on rereads.
  // Layout offsets deliberately exclude translation, scale and transform-origin.
  // Those transforms must carry the image, rather than enter this conversion.
  const style = surface.ownerDocument.defaultView!.getComputedStyle(content);
  target.style.marginTop = `${-(parseFloat(style.borderTopWidth) || 0)}px`;
  const left = content.offsetLeft + (parseFloat(style.borderLeftWidth) || 0);
  const right = content.offsetLeft + content.offsetWidth - (parseFloat(style.borderRightWidth) || 0);
  target.style.marginLeft = `${-left}px`;
  target.style.marginRight = `${right - surface.clientWidth}px`;
};

export const removeEmptyModalRailSlot = (surface: HTMLElement) => {
  const slot = surface.shadowRoot?.querySelector<HTMLSlotElement>(`slot[name="${modalRailSlot}"][data-native-ui-projection-node]`);
  if (slot && !slot.assignedElements().length) slot.remove();
};

/** Convert the native viewport rectangle into the clone's positioning container. */
export const alignVerticalBarClone = (clone: HTMLElement, source: Element, parent: HTMLElement) => {
  const frame = verticalBarFrame(source);
  if (!frame) return;
  const origin = parent.getBoundingClientRect();
  const parentStyle = parent.ownerDocument.defaultView!.getComputedStyle(parent);
  // clientLeft/clientTop round subpixel glass borders to whole CSS pixels.
  const borderLeft = parseFloat(parentStyle.borderLeftWidth) || 0;
  const borderTop = parseFloat(parentStyle.borderTopWidth) || 0;
  // Absolute children use the padding edge, not the outer edge of a glass group.
  Object.assign(clone.style, {
    position: 'absolute',
    left: `${frame.x - origin.left - borderLeft}px`,
    top: `${frame.y - origin.top - borderTop}px`,
    right: 'auto',
    bottom: 'auto',
    width: `${frame.width}px`,
    height: `${frame.height}px`,
    minWidth: `${frame.width}px`,
    maxWidth: `${frame.width}px`,
    minHeight: `${frame.height}px`,
    maxHeight: `${frame.height}px`,
    margin: '0',
    boxSizing: 'border-box',
  });
};

export const alignVerticalTabBar = (
  tabBar: HTMLElement,
  frame: NativeUIVerticalBarFrame,
  items: Map<HTMLElement, NativeUIVerticalBarFrame>,
): (() => void) => {
  const doc = tabBar.ownerDocument;
  const style = doc.createElement('style');
  const token = `rail-${Math.random().toString(36).slice(2)}`;
  const selector = `[data-native-rail-geometry="${token}"]`;
  const origin = (tabBar.offsetParent as HTMLElement | null)?.getBoundingClientRect() ?? { left: 0, top: 0 };
  tabBar.setAttribute('data-native-rail-geometry', token);
  // Preserve the measured shape. Only older binaries need the capsule fallback.
  const radius = (rect: NativeUIVerticalBarFrame) =>
    Number.isFinite(rect.cornerRadius) && rect.cornerRadius! >= 0 ? rect.cornerRadius! : Math.min(rect.width, rect.height) / 2;
  const box = (rect: NativeUIVerticalBarFrame, x: number, y: number) =>
    `position:absolute!important;left:${rect.x - x}px!important;top:${rect.y - y}px!important;right:auto!important;bottom:auto!important;width:${rect.width}px!important;min-width:${rect.width}px!important;max-width:${rect.width}px!important;height:${rect.height}px!important;min-height:${rect.height}px!important;max-height:${rect.height}px!important;margin:0!important;padding:0!important;box-sizing:border-box!important;border-radius:${radius(rect)}px!important;`;
  style.textContent =
    `${selector}{${box(frame, origin.left, origin.top)}}` +
    [...items]
      .map(([element, rect]) => {
        const index = Array.from(tabBar.children).indexOf(element) + 1;
        return `${selector}>:nth-child(${index}){${box(rect, frame.x, frame.y)}}${selector}>:nth-child(${index})::part(native){min-height:0!important}`;
      })
      .join('');
  doc.head.append(style);
  const win = doc.defaultView!;
  const measuredViewport = viewport(tabBar);
  const stop = () => {
    observer.disconnect();
    win.removeEventListener('resize', stop);
    style.remove();
    if (tabBar.getAttribute('data-native-rail-geometry') === token) tabBar.removeAttribute('data-native-rail-geometry');
  };
  const observer = new MutationObserver((records) => {
    if (viewport(tabBar) !== measuredViewport || records.some((record) => record.type === 'childList')) stop();
  });
  observer.observe(tabBar, { childList: true });
  const app = tabBar.closest('ion-app');
  if (app) observer.observe(app, { attributes: true, attributeFilter: ['class'] });
  win.addEventListener('resize', stop);
  return stop;
};

const toolbarTargets = '.ios-theme-vertical-bars-toolbar-projection, .ios-theme-vertical-bars-back-button-projection';

/** Native measurements define anchor size and spacing; the theme supplies placement. */
export const createModalRailLayout =
  (modal: HTMLElement, targetForID: (id: string) => HTMLElement | undefined): NonNullable<WebProjectionOptions['layoutFrame']> =>
  (target, part, parts) => {
    const bounds = part.anchorBounds;
    if (!bounds || !target.matches(toolbarTargets)) return;
    const toolbar = modalToolbarAlignment(modal);
    if (!toolbar) return;
    const first = parts
      .filter((item) => item.anchorBounds && item.ids.some((id) => targetForID(id)?.matches(toolbarTargets)))
      .reduce<typeof part | undefined>(
        (first, item) => (!first || item.y + item.anchorBounds!.y < first.y + first.anchorBounds!.y ? item : first),
        undefined,
      );
    if (!first?.anchorBounds) return;
    const height = first.anchorBounds.height;
    target.style.setProperty('--native-ui-toolbar-anchor-height', `${height}px`);
    placeModalRailTarget(target, modal);
    const offset = part.y + bounds.y - first.y - first.anchorBounds.y;
    const rect = target.getBoundingClientRect();
    return {
      x: rect.x + (rect.width - bounds.width) / 2,
      y: Math.max(toolbar.minimumTop, toolbar.centerY - height / 2) + offset,
      width: bounds.width,
      height: bounds.height,
    };
  };
