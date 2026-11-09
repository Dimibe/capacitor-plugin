import { horizontalSelected, horizontalToolbarGroup, inVerticalToolbarLayout } from '../shared/toolbar-options.js';
import type { VerticalControlAreaOptions } from '../definitions.js';
import { createCandidate, appendItem, isSolidSubmit } from '../shared/candidate.js';
import type { Candidate, Identify } from '../shared/candidate.js';
import { fitsClip } from '../shared/clipping.js';
import { inFixedToolbar, isVerticalBarsToolbarAction, isVerticalBarsToolbarGroup } from '../shared/dom.js';

export const tag = 'ion-button';

export const appendHorizontal = (candidate: Candidate, button: HTMLElement, id: Identify) => {
  if (!fitsClip(button)) return;
  const item = appendItem(candidate, button, id);
  return item?.accessibilityLabel ? item : undefined;
};

export const read = (element: HTMLElement, id: Identify, options: VerticalControlAreaOptions = {}): Candidate | undefined => {
  const button = element as HTMLIonButtonElement;
  const verticalBars = inVerticalToolbarLayout(element);
  if (verticalBars && element.parentElement && isVerticalBarsToolbarGroup(element.parentElement)) return;
  const fill = button.fill ?? 'default';
  const group = element.parentElement?.matches('ion-buttons') ? element.parentElement : undefined;
  if (!verticalBars && (!horizontalSelected(element, options) || (group && horizontalToolbarGroup(group, options)))) return;
  if (
    !inFixedToolbar(element) ||
    (verticalBars && !isVerticalBarsToolbarAction(element)) ||
    (!verticalBars && fill !== 'default' && !(group && fill === 'clear') && !isSolidSubmit(button, fill)) ||
    (!verticalBars && button.classList.contains('ion-color') && !isSolidSubmit(button, fill))
  )
    return;
  const candidate = createCandidate(element, tag, id, options);
  const item = verticalBars ? appendItem(candidate, element, id) : appendHorizontal(candidate, element, id);
  if (!item) return;
  if (!verticalBars && (fill === 'clear' || (group && button.fill === undefined))) item.buttonFill = 'clear';
  return candidate;
};
