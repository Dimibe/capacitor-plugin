import { afterEach, expect, test } from 'vitest';
import { withoutPressGroupChildren } from '../src/native/components/ion-buttons';
import { readCandidate, selector } from '../src/native/components';
import { prehideVerticalBarsToolbarSources } from '../src/native/prehide';
import { verticalBarsOwned } from '../src/native/shared/dom';
import type { VerticalControlAreaOptions } from '../src/native/definitions';

afterEach(() => document.body.replaceChildren());

const mount = () => {
  document.body.innerHTML = `<ion-app><main class="ion-page"><ion-header><ion-toolbar>
    <ion-buttons class="ios" id="group">
      <ion-button class="ios button-clear" id="a">Alpha</ion-button>
      <ion-button class="ios button-clear" id="b">Beta</ion-button>
    </ion-buttons><ion-back-button class="ios" id="back"></ion-back-button>
  </ion-toolbar></ion-header></main></ion-app>`;
  document.querySelectorAll<HTMLElement>('*').forEach((element) => {
    element.style.cssText = 'display:block;visibility:visible;opacity:1;transform:none;--ios-theme-glass-background-rgb:255,255,255';
    element.getBoundingClientRect = () => ({ x: 0, y: 0, width: 44, height: 44, top: 0, left: 0, right: 44, bottom: 44 }) as DOMRect;
  });
  document.querySelectorAll<HTMLIonButtonElement>('ion-button').forEach((button) => (button.fill = 'clear'));
  const back = document.querySelector('ion-back-button')!;
  (back.shadowRoot ?? back.attachShadow({ mode: 'open' })).innerHTML = '<span part="text">Back</span>';
};
const candidates = (options: VerticalControlAreaOptions) =>
  Array.from(document.querySelectorAll<HTMLElement>(selector))
    .map((element) => readCandidate(element, (source) => source.id, options))
    .filter((candidate) => !!candidate)
    .map((candidate) => candidate!.element.id);

test.each([
  [true, true, ['group', 'back']],
  [false, true, ['a', 'b', 'back']],
  [true, false, ['back']],
  [false, false, ['back']],
] as const)('horizontal grouping=%s selection=%s', (buttons, button, expected) => {
  mount();
  expect(candidates({ controls: { buttonGroup: buttons, button, backButton: 'horizontalOnly' } })).toEqual(expected);
});

test.each([
  ['type', false],
  ['class', false],
  ['type', true],
  ['class', true],
] as const)('horizontal solid submit via %s with Ionic color=%s projects with its fill tint', (marker, colored) => {
  mount();
  const button = document.querySelector<HTMLIonButtonElement>('#a')!;
  const options = { controls: { button: true, buttonGroup: true } };
  if (colored) {
    button.setAttribute('color', 'danger');
    button.classList.add('ion-color', 'ion-color-danger');
    // Individually projected colored clear buttons remain on the Web.
    expect(candidates({ controls: { button: true, buttonGroup: false } })).toEqual(['b', 'back']);
  }
  button.fill = 'solid';
  button.classList.replace('button-clear', 'button-solid');
  const tint = colored ? 'rgb(211, 47, 47)' : 'rgb(150, 87, 0)';
  const native = button.attachShadow({ mode: 'open' });
  native.innerHTML = `<span part="native" style="color: white; background-color: ${tint}"></span>`;
  expect(candidates(options)).toEqual(['b', 'back']);

  if (marker === 'type') button.setAttribute('type', 'submit');
  else button.classList.add('button-submit');
  expect(candidates(options)).toEqual(['a', 'b', 'back']);
  expect(readCandidate(button, (source) => source.id, options)?.control.items[0]).toMatchObject({
    buttonStyle: 'prominent',
    color: tint,
  });
});

test('horizontal local selection and grouping are independent from vertical attributes', () => {
  mount();
  document.querySelector('#group')!.setAttribute('data-horizontal-bars', 'true');
  document.querySelector('#group')!.setAttribute('data-vertical-bars', 'false');
  document.querySelector('#a')!.setAttribute('data-horizontal-bars', 'true');
  document.querySelector('#b')!.setAttribute('data-vertical-bars', 'true');
  document.querySelector('#back')!.setAttribute('data-horizontal-bars', 'false');
  expect(candidates({ controls: { buttonGroup: false, button: false } })).toEqual(['a']);
  document.querySelector('#b')!.setAttribute('data-horizontal-bars', 'true');
  expect(candidates({ controls: { buttonGroup: false, button: false } })).toEqual(['group']);
});

test('vertical configuration never reads horizontal settings or attributes', () => {
  mount();
  document.querySelector('ion-app')!.classList.add('ios-theme-vertical-bars');
  document.querySelector('#group')!.setAttribute('data-horizontal-bars', 'false');
  for (const id of ['a', 'b']) document.getElementById(id)!.setAttribute('data-vertical-bars', 'true');
  const handle = prehideVerticalBarsToolbarSources(document, undefined, undefined, {
    controls: { buttonGroup: 'verticalOnly', button: false, backButton: 'horizontalOnly' },
  });
  try {
    expect(['group', 'a', 'b', 'back'].map((id) => verticalBarsOwned(document.getElementById(id)!))).toEqual([true, true, true, false]);
  } finally {
    handle.stop();
  }
});

test('horizontal back button can opt in independently inside an ungrouped container', () => {
  mount();
  const back = document.querySelector('#back')!;
  document.querySelector('#group')!.append(back);
  document.querySelector('#group')!.setAttribute('data-horizontal-bars', 'false');
  back.setAttribute('data-horizontal-bars', 'true');
  expect(candidates({ controls: false })).toEqual(['back']);
});

test.each([undefined, true, false, 'horizontalOnly', 'verticalOnly'] as const)(
  'horizontal shorthand %s controls all actions',
  (horizontal) => {
    mount();
    expect(candidates({ controls: horizontal })).toEqual(horizontal === false || horizontal === 'verticalOnly' ? [] : ['group', 'back']);
  },
);

test('horizontal false still allows local action, grouping and back overrides', () => {
  mount();
  for (const id of ['group', 'a', 'b', 'back']) document.getElementById(id)!.setAttribute('data-horizontal-bars', 'true');
  expect(candidates({ controls: false })).toEqual(['group', 'back']);
});

test.each([undefined, true, false, 'horizontalOnly', 'verticalOnly'] as const)(
  'vertical shorthand %s controls all eligible actions',
  (vertical) => {
    mount();
    document.querySelector('ion-app')!.classList.add('ios-theme-vertical-bars');
    for (const button of document.querySelectorAll('ion-button')) button.innerHTML = '<ion-icon slot="icon-only"></ion-icon>';
    const handle = prehideVerticalBarsToolbarSources(document, undefined, undefined, { controls: vertical });
    try {
      expect(['group', 'a', 'b', 'back'].map((id) => verticalBarsOwned(document.getElementById(id)!))).toEqual(
        Array(4).fill(vertical !== false && vertical !== 'horizontalOnly'),
      );
    } finally {
      handle.stop();
    }
  },
);

test('vertical false still allows local action, grouping and back overrides', () => {
  mount();
  document.querySelector('ion-app')!.classList.add('ios-theme-vertical-bars');
  for (const id of ['group', 'a', 'b', 'back']) document.getElementById(id)!.setAttribute('data-vertical-bars', 'true');
  const handle = prehideVerticalBarsToolbarSources(document, undefined, undefined, { controls: false });
  try {
    expect(['group', 'a', 'b', 'back'].map((id) => verticalBarsOwned(document.getElementById(id)!))).toEqual([true, true, true, true]);
  } finally {
    handle.stop();
  }
});

test('partial controls preserve selection and grouping for omitted kinds', () => {
  mount();
  expect(candidates({ controls: { backButton: false } })).toEqual(['group']);
  expect(candidates({ controls: { button: false } })).toEqual(['back']);
});

test.each(['ion-button', 'ion-menu-button', 'ion-back-button'])(
  'vertical exclusions never fall through to horizontal selection: %s',
  (tag) => {
    mount();
    document.querySelector('ion-app')!.classList.add('ios-theme-vertical-bars');
    const action = document.createElement(tag) as HTMLElement & { type: string };
    action.id = 'excluded';
    action.className = 'ios';
    action.type = 'button';
    action.style.cssText = 'display:block;visibility:visible;opacity:1;transform:none';
    action.getBoundingClientRect = () => ({ x: 0, y: 0, width: 44, height: 44 }) as DOMRect;
    action.attachShadow({ mode: 'open' }).innerHTML = '<span part="text">Action</span>';
    document.querySelector('#group')!.replaceChildren(action);
    const options = { controls: 'horizontalOnly' as const };
    const prehide = prehideVerticalBarsToolbarSources(document, undefined, undefined, options);
    try {
      expect(candidates(options)).toEqual([]);
    } finally {
      prehide.stop();
    }
  },
);

test('a shell opt-out in a group prevents sibling projection even with local opt-in', () => {
  mount();
  document.querySelector('#a')!.setAttribute('data-native-ui', 'disabled');
  document.querySelector('#b')!.setAttribute('data-horizontal-bars', 'true');
  expect(candidates({ controls: { buttonGroup: false } })).toEqual(['back']);
});

for (const tag of ['img', 'canvas']) {
  test(`Engine-owned ${tag} does not change toolbar discovery`, () => {
    mount();
    const options = { controls: { buttonGroup: true, button: true } };
    const expected = candidates(options);
    const image = document.createElement(tag);
    image.setAttribute('data-native-ui-projection-node', '');
    document.querySelector('#group')!.append(image);
    expect(candidates(options)).toEqual(expected);
    // Application-owned unsupported content must still reject the group.
    image.removeAttribute('data-native-ui-projection-node');
    expect(candidates(options)).not.toContain('group');
  });
}

function pressPair(first: HTMLIonButtonElement['fill'], second: HTMLIonButtonElement['fill'], rtl = false) {
  mount();
  const group = document.getElementById('group')!;
  const [a, b] = group.querySelectorAll<HTMLIonButtonElement>('ion-button');
  const rect = (x: number, width: number) => ({ x, y: 0, width, height: 44, top: 0, left: x, right: x + width, bottom: 44 }) as DOMRect;
  group.getBoundingClientRect = () => rect(0, 100);
  group.style.direction = rtl ? 'rtl' : 'ltr';
  for (const [i, button] of [a, b].entries()) {
    button.fill = i === 0 ? first : second;
    button.className = 'ios button-' + (button.fill ?? 'clear');
    button.getBoundingClientRect = () => rect(i === Number(rtl) ? 0 : 56, 44);
    button.style.border = '2px solid rgb(32, 64, 128)';
    button.style.backgroundColor = 'rgb(149, 86, 0)';
    button.style.color = 'rgb(255, 255, 255)';
  }
  return { group, a, b, read: () => readCandidate(group, (el) => el.id, { pressBlendingMaxItems: 2 }) };
}

test.each([
  ['default', 'default', false],
  ['solid', 'default', false],
  ['default', 'solid', true],
  ['solid', 'solid', false],
  ['outline', 'default', false],
  ['default', 'outline', true],
  ['outline', 'solid', true],
  ['solid', 'outline', false],
  ['outline', 'outline', false],
] as const)('a horizontal %s/%s press pair preserves both actions and their measured frames (RTL=%s)', (first, second, rtl) => {
  const { group, a, b, read } = pressPair(first, second, rtl);
  a.classList.add('ion-color', 'ion-color-primary');
  b.disabled = true;
  group.append(Object.assign(document.createElement('ion-popover'), { className: 'overlay-hidden' }));
  const pair = read()!;
  expect(pair.control.pressBlending).toBe(true);
  expect(pair.control.items.map((item) => [item.id, item.x, item.disabled])).toEqual([
    ['a', rtl ? 56 : 0, false],
    ['b', rtl ? 0 : 56, true],
  ]);
  expect([...pair.actions.values()]).toEqual([a, b]);
  for (const [index, item] of pair.control.items.entries()) {
    expect(item.backgroundColor).toBe([first, second][index] === 'solid' ? 'rgb(149, 86, 0)' : undefined);
    expect(item.color).toBe('rgb(255, 255, 255)');
    expect(item.borderWidth).toBe([first, second][index] === 'outline' ? 2 : undefined);
    expect(item.borderColor).toBe([first, second][index] === 'outline' ? 'rgb(32, 64, 128)' : undefined);
  }
  expect(readCandidate(group, (el) => el.id)?.control.pressBlending).toBeUndefined();
});

test.each([
  ['clear', 'clear'],
  ['clear', 'default'],
  ['solid', 'clear'],
  ['clear', 'outline'],
  [undefined, undefined],
  [undefined, 'default'],
] as const)('leaves %s/%s with the existing renderer', (a, b) => {
  const pair = pressPair(a, b);
  expect(pair.read()?.control.pressBlending).toBeUndefined();
});

test.each([3, 4])('one glass group owns all %i actions in a right-to-left row', (count) => {
  const { group, a, b } = pressPair('outline', 'solid', true);
  const buttons = [a, b];
  for (let i = 2; i < count; i++) {
    const button = group.appendChild(a.cloneNode(true)) as HTMLIonButtonElement;
    button.id = 'action-' + i;
    button.fill = 'default';
    buttons.push(button);
  }
  const frame = a.getBoundingClientRect();
  const positions = [0, 50, 124, 180].slice(0, count).reverse();
  group.getBoundingClientRect = () => new DOMRect(0, 0, positions[0] + frame.width, frame.height);
  buttons.forEach((button, i) => {
    button.getBoundingClientRect = () => new DOMRect(positions[i], 0, frame.width, frame.height);
  });
  const options = { pressBlendingMaxItems: 30 };
  const read = () => readCandidate(group, (el) => el.id, options);
  const projected = [group, ...buttons].flatMap((el) => readCandidate(el, (source) => source.id, options) ?? []);
  expect(withoutPressGroupChildren(projected).map((c) => c.element)).toEqual([group]);
  expect(read()?.control.items.map((item) => item.x)).toEqual(positions);
  expect([...read()!.actions.values()]).toEqual(buttons);
  expect(readCandidate(group, (el) => el.id, { pressBlendingMaxItems: 2 })).toBeUndefined();

  const last = buttons[count - 1];
  last.fill = 'clear';
  expect(read()).toBeUndefined();
  last.fill = 'default';
  last.getBoundingClientRect = () => new DOMRect(0, 5, frame.width, frame.height);
  expect(read()).toBeUndefined();
  last.getBoundingClientRect = buttons[count - 2].getBoundingClientRect;
  expect(read()).toBeUndefined();
});

test.each([
  [180, 0, true], // Widely spaced
  [60, 5, true], // Staggered
  [0, 56, true], // Wrapped below the first button
  [44, 0, true], // Shared edge
  [43, 43, false], // One square pixel of overlap
  [180, 62, false], // Extends below the group
] as const)('checks tap targets at (%i, %i) independently of the row or gap', (x, y, eligible) => {
  const { group, b, read } = pressPair('outline', 'solid');
  group.getBoundingClientRect = () => new DOMRect(0, 0, 224, 100);
  b.getBoundingClientRect = () => new DOMRect(x, y, 44, 44);
  expect(read()?.control.pressBlending === true).toBe(eligible);
});

test('a clipped button falls back to the web while its visible sibling stays eligible', () => {
  const { group, a, b } = pressPair('default', 'default');
  const projected = () =>
    withoutPressGroupChildren([group, a, b].flatMap((el) => readCandidate(el, (el) => el.id, { pressBlendingMaxItems: 2 }) ?? [])).map(
      (candidate) => candidate.element.id,
    );
  const toolbar = group.parentElement!;
  toolbar.style.overflowX = 'hidden';
  let width = 100;
  Object.defineProperty(toolbar, 'clientWidth', { get: () => width });
  expect(projected()).toEqual(['group']);
  for (width of [80, 48]) expect(projected()).toEqual(['a']);
  width = 100;
  expect(projected()).toEqual(['group']);
});

test.each(['host', 'native'])('icon-only toolbar actions resolve the %s aria-labelledby before other names', (source) => {
  const { a, b, read } = pressPair('default', 'default');
  a.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M0 0h24v24z"/></svg>';
  a.querySelector('svg')!.getBoundingClientRect = () => new DOMRect(0, 0, 24, 24);
  const label = document.createElement('span');
  label.id = 'share-label';
  label.textContent = 'Share';
  document.body.append(label);
  const native = document.createElement('button');
  native.setAttribute('part', 'native');
  (a.shadowRoot ?? a.attachShadow({ mode: 'open' })).append(native);
  const owner = source === 'host' ? a : native;
  owner.setAttribute('aria-labelledby', 'share-label missing b');
  owner.setAttribute('aria-label', 'Other name');
  expect(read()?.control.items[0]).toMatchObject({ label: '', accessibilityLabel: 'Share Beta' });
  label.textContent = 'Send';
  expect(read()?.control.items[0].accessibilityLabel).toBe('Send Beta');

  if (source === 'native') {
    const local = document.createElement('span');
    local.id = 'share-label';
    local.textContent = 'Local';
    a.shadowRoot!.append(local);
    expect(read()?.control.items[0].accessibilityLabel).toBe('Local Beta');
  }
  owner.setAttribute('aria-labelledby', 'missing');
  expect(read()?.control.items[0].accessibilityLabel).toBe('Other name');
  owner.setAttribute('aria-label', '   ');
  expect(read()).toBeUndefined();
  expect(readCandidate(a, (el) => el.id)).toBeUndefined();
  expect(readCandidate(b, (el) => el.id)?.control.items[0].accessibilityLabel).toBe('Beta');
});

test('a complete pair owns both actions; an unsupported sibling leaves the remaining button individual', () => {
  const { group, a, b } = pressPair('default', 'default');
  const projected = () =>
    withoutPressGroupChildren([group, a, b].flatMap((el) => readCandidate(el, (el) => el.id, { pressBlendingMaxItems: 2 }) ?? [])).map(
      (c) => c.element.id,
    );
  expect(projected()).toEqual(['group']);
  const spinner = b.appendChild(document.createElement('ion-spinner'));
  expect(projected()).toEqual(['a']);
  spinner.remove();
  a.setAttribute('data-transition-id', 'persistent-action');
  expect(projected()).toEqual(['a', 'b']);
  a.removeAttribute('data-transition-id');
  expect(projected()).toEqual(['group']);
});

test('blending respects scope, geometry, local selection and unsupported siblings', () => {
  const { group, a, b, read } = pressPair('default', 'default');
  for (const el of [group, a]) {
    el.setAttribute('data-horizontal-bars', 'false');
    expect(read()).toBeUndefined();
    el.removeAttribute('data-horizontal-bars');
  }
  const extra = group.appendChild(document.createElement('ion-back-button'));
  expect(read()).toBeUndefined();
  extra.remove();
  const spinner = b.appendChild(document.createElement('ion-spinner'));
  expect(read()).toBeUndefined();
  spinner.remove();
  const second = b.getBoundingClientRect;
  b.getBoundingClientRect = a.getBoundingClientRect;
  expect(read()).toBeUndefined();
  b.getBoundingClientRect = second;
  const app = document.querySelector('ion-app')!;
  app.classList.add('ios-theme-vertical-bars');
  expect(read()).toBeUndefined();
  app.classList.remove('ios-theme-vertical-bars');
  expect(read()?.control.pressBlending).toBe(true);
});
