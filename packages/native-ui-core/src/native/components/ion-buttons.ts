import { horizontalSelected, horizontalToolbarGroup, inVerticalToolbarLayout } from '../shared/toolbar-options.js';
import type { NativeUIRuntimeOptions } from '../definitions.js';
import { createCandidate, appendItem } from '../shared/candidate.js';
import type { Candidate, Identify } from '../shared/candidate.js';
import {
  childElements,
  verticalBarsToolbarActions,
  inFixedToolbar,
  isExcluded,
  isNativeUIDisabled,
  isVerticalBarsToolbarGroup,
} from '../shared/dom.js';
import { controlSelected } from '../shared/control-options.js';
import { appendHorizontal } from './ion-button.js';
import * as menuButton from './ion-menu-button.js';

export const tag = 'ion-buttons';
export const tracksMotion = true;

function readPressGroup(element: HTMLElement, id: Identify, options: NativeUIRuntimeOptions): Candidate | undefined {
  if (
    !options.pressBlendingMaxItems ||
    !element.matches('ion-header ion-toolbar > ion-buttons.ios') ||
    !controlSelected(element, options, 'buttonGroup', false) ||
    isNativeUIDisabled(element)
  )
    return;
  const children = childElements(element).filter(
    (child) =>
      !child.matches('ion-popover.overlay-hidden, ion-modal.overlay-hidden') &&
      !(child.tagName === 'DIV' && child.style.display === 'none'),
  );
  if (
    children.length < 2 ||
    children.length > (options.pressBlendingMaxItems ?? 0) ||
    !children.every((child) => child.matches('ion-button.ios') && horizontalSelected(child, options) && !isExcluded(child))
  )
    return;
  const buttons = children as HTMLIonButtonElement[];
  if (buttons.some((button) => (button.fill ?? 'clear') === 'clear')) return;
  if (element.hasAttribute('data-transition-id') || buttons.some((button) => button.hasAttribute('data-transition-id'))) return;
  if (options.extensions?.some((extension) => element.querySelector(extension.selector))) return;
  const candidate = createCandidate(element, tag, id, options);
  for (const button of buttons) {
    const item = appendHorizontal(candidate, button, id);
    if (!item) return;
    if (button.fill === 'solid') {
      const style = getComputedStyle(button.shadowRoot?.querySelector('[part="native"]') ?? button);
      item.backgroundColor = style.backgroundColor;
      item.color = style.color;
      delete item.buttonStyle;
    } else if (button.fill === 'outline') {
      const style = getComputedStyle(button.shadowRoot?.querySelector('[part="native"]') ?? button);
      item.borderWidth = parseFloat(style.borderTopWidth) || 0;
      item.borderColor = style.borderTopColor;
    }
  }
  const { items, width, height } = candidate.control;
  for (const [index, item] of items.entries()) {
    if (item.x < -1 || item.y < -1 || item.x + item.width > width + 1 || item.y + item.height > height + 1) return;
    for (let i = 0; i < index; i++) {
      const other = items[i];
      if (
        item.x < other.x + other.width &&
        other.x < item.x + item.width &&
        item.y < other.y + other.height &&
        other.y < item.y + item.height
      )
        return;
    }
  }
  candidate.control.pressBlending = true;
  return candidate;
}

export function withoutPressGroupChildren(candidates: Candidate[]): Candidate[] {
  const children = new Set(
    candidates.filter((candidate) => candidate.control.pressBlending).flatMap((pair) => Array.from(pair.actions.values())),
  );
  return children.size ? candidates.filter((candidate) => !children.has(candidate.element)) : candidates;
}

export const read = (element: HTMLElement, id: Identify, options: NativeUIRuntimeOptions = {}): Candidate | undefined => {
  if (!inFixedToolbar(element)) return;
  let children = childElements(element);
  const verticalBars = inVerticalToolbarLayout(element);
  if (!verticalBars && !horizontalToolbarGroup(element, options)) {
    return readPressGroup(element, id, options);
  }
  if (verticalBars && !isVerticalBarsToolbarGroup(element)) return;
  if (children.length === 1 && (!verticalBars || children[0].matches(menuButton.tag))) return menuButton.read(element, id, options);
  if (verticalBars) children = verticalBarsToolbarActions(element);
  if (
    !children.length ||
    children.some(
      (child) =>
        !child.matches(`${menuButton.tag}${verticalBars ? '' : '.ios'}`) &&
        (!child.matches(`ion-button${verticalBars ? '' : '.ios.button-clear'}`) ||
          (!verticalBars && ((child as HTMLIonButtonElement).fill ?? 'clear') !== 'clear')),
    )
  )
    return;
  const candidate = createCandidate(element, tag, id, options);
  if (verticalBars && children.length !== childElements(element).length) candidate.sources = children;
  for (const child of children) {
    const supported = child.matches(menuButton.tag)
      ? menuButton.append(candidate, child as HTMLIonMenuButtonElement, id)
      : appendItem(candidate, child, id);
    if (!supported) return;
  }
  return candidate;
};
