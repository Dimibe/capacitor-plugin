import { afterEach, expect, test, vi } from 'vitest';
import { readCandidate } from '../src/native/components';

const photo = '<img src="/profile.jpg" alt="">';
const label = '<ion-label>Profile</ion-label>';
const identify = (element: HTMLElement) => element.id || element.localName;

function mount(content: string, rail = false) {
  document.body.innerHTML = `<ion-app class="${rail ? 'ios-theme-vertical-bars' : ''}"><ion-tabs>
    <ion-tab-bar class="ios"><ion-tab-button id="home"><ion-label>Home</ion-label></ion-tab-button>
    <ion-tab-button id="profile">${content}</ion-tab-button></ion-tab-bar></ion-tabs></ion-app>`;
  document.querySelectorAll<HTMLElement>('*').forEach((element) => {
    Object.assign(element.style, { visibility: 'visible', opacity: '1', transform: 'none' });
    const size = element.matches('img, ion-avatar') ? 24 : 44;
    element.getBoundingClientRect = () => new DOMRect(20, 20, size, size);
  });
  const image = document.querySelector('img')!;
  Object.defineProperty(image, 'currentSrc', { get: () => image.src });
  const setLoaded = (complete: boolean, naturalWidth: number) =>
    Object.defineProperties(image, {
      complete: { configurable: true, value: complete },
      naturalWidth: { configurable: true, value: naturalWidth },
      naturalHeight: { configurable: true, value: naturalWidth / 2 },
    });
  setLoaded(true, 200);
  const bar = document.querySelector<HTMLElement>('ion-tab-bar')!;
  return { image, setLoaded, read: () => readCandidate(bar, identify) };
}

function mockCanvas() {
  const drawImage = vi.fn();
  const ellipse = vi.fn();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    drawImage,
    beginPath() {},
    ellipse,
    clip() {},
  } as unknown as CanvasRenderingContext2D);
  const encode = vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,first');
  return { drawImage, ellipse, encode };
}

afterEach(() => {
  vi.restoreAllMocks();
  document.body.replaceChildren();
});

test.each([
  [false, photo],
  [true, `<ion-avatar>${photo}</ion-avatar>`],
] as const)('horizontal and rail tabs keep original-color photos and the same action on replacement (rail=%s)', (rail, artwork) => {
  const { image, read } = mount(artwork + label, rail);
  const { drawImage, encode } = mockCanvas();
  const first = read()!;
  expect(first.control.items[1]).toMatchObject({
    id: 'profile',
    label: 'Profile',
    icon: 'first',
    iconWidth: 24,
    iconHeight: 24,
    iconPosition: 'top',
  });
  expect(first.control.items[1].iconTemplate).not.toBe(true);
  const profile = document.getElementById('profile')!;
  expect(first.actions.get('profile')).toBe(profile);
  Object.assign(profile, { selected: true });
  expect(read()?.control.items[1]).toMatchObject({ selected: true, icon: 'first' });
  expect(drawImage).toHaveBeenCalledTimes(1);

  image.src = '/replacement.jpg';
  encode.mockReturnValue('data:image/png;base64,second');
  const updated = read()!;
  expect(updated.control.items[1]).toMatchObject({ selected: true, icon: 'second' });
  expect(updated.actions.get('profile')).toBe(profile);
  expect(drawImage).toHaveBeenCalledTimes(2);
});

test('cropping and clipping use the displayed avatar box and cap the thumbnail pixel dimensions', () => {
  const { image, read } = mount(`<ion-avatar>${photo}</ion-avatar>` + label);
  image.style.objectFit = 'cover';
  Object.assign(image.parentElement!.style, { borderRadius: '50%', overflow: 'hidden' });
  image.getBoundingClientRect = () => new DOMRect(0, 0, 160, 160);
  const { drawImage, ellipse } = mockCanvas();
  expect(read()?.control.items[1].iconWidth).toBe(160);
  expect(drawImage).toHaveBeenCalledWith(image, -64, 0, 256, 128);
  expect(ellipse).toHaveBeenCalledWith(64, 64, 64, 64, 0, 0, 2 * Math.PI);
});

test('missing image bytes leave a labeled tab usable while loading, after failure, and on a tainted canvas', () => {
  const { setLoaded, read } = mount(photo + label);
  const { encode } = mockCanvas();
  for (const complete of [false, true]) {
    setLoaded(complete, 0);
    const item = read()?.control.items[1];
    expect(item?.label).toBe('Profile');
    expect(item?.icon).toBeUndefined();
  }
  expect(encode).not.toHaveBeenCalled();
  setLoaded(true, 200);
  encode.mockImplementation(() => {
    throw new DOMException('Tainted canvas', 'SecurityError');
  });
  const fallback = read()!;
  expect(fallback.actions.get('profile')).toBe(document.getElementById('profile'));
  expect(fallback.control.items[1].icon).toBeUndefined();
});

test('an image-only tab requires an accessible name', () => {
  const { image, read } = mount(photo);
  mockCanvas();
  expect(read()).toBeUndefined();
  image.alt = 'My account';
  expect(read()?.control.items[1]).toMatchObject({ label: '', accessibilityLabel: 'My account', icon: 'first' });
  image.setAttribute('aria-hidden', 'true');
  expect(read()).toBeUndefined();
});

test.each([photo, '<ion-icon></ion-icon>', '<svg><circle r="4"/></svg>', '<button>More</button>'])(
  'tabs reject a photo mixed with a second artwork or interactive control: %s',
  (other) => {
    const { read } = mount(photo + other + label);
    mockCanvas();
    expect(read()).toBeUndefined();
  },
);

test('the tab image allowance does not change fixed segment eligibility', () => {
  document.body.innerHTML =
    '<ion-header><ion-toolbar><ion-segment class="ios"><ion-segment-button>Library</ion-segment-button></ion-segment></ion-toolbar></ion-header>';
  document.querySelectorAll<HTMLElement>('*').forEach((element) => {
    Object.assign(element.style, { visibility: 'visible', opacity: '1', transform: 'none' });
    element.getBoundingClientRect = () => new DOMRect(20, 20, 44, 44);
  });
  const segment = document.querySelector<HTMLElement>('ion-segment')!;
  expect(readCandidate(segment, identify)?.control.items[0].label).toBe('Library');
  segment.firstElementChild!.insertAdjacentHTML('afterbegin', photo);
  expect(readCandidate(segment, identify)).toBeUndefined();
});
