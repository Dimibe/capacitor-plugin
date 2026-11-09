import { afterEach, expect, test } from 'vitest';
import { readCandidate } from '../src/native/components';

const mount = (rail: boolean, outside: boolean) => {
  document.body.innerHTML = `<ion-app class="${rail ? 'ios-theme-vertical-bars' : ''}"><ion-tabs><ion-tab-bar class="ios"><ion-tab-button><ion-label>Inbox</ion-label><ion-badge>3</ion-badge></ion-tab-button></ion-tab-bar></ion-tabs></ion-app>`;
  document.querySelectorAll<HTMLElement>('*').forEach((element) => {
    Object.assign(element.style, { visibility: 'visible', opacity: '1', transform: 'none' });
    element.getBoundingClientRect = () => new DOMRect(20, 20, 44, 44);
  });
  const bar = document.querySelector<HTMLElement>('ion-tab-bar')!;
  const badge = bar.querySelector<HTMLElement>('ion-badge')!;
  Object.assign(badge.style, { backgroundColor: 'rgb(220, 20, 60)', color: 'rgb(255, 255, 255)' });
  badge.getBoundingClientRect = () => new DOMRect(outside ? innerWidth + 5 : 40, 20, 16, 16);
  return { badge, read: () => readCandidate(bar, (element) => element.localName)!.control.items[0] };
};

afterEach(() => document.body.replaceChildren());

test('rail tab badges follow native placement rather than source viewport coordinates', () => {
  const { read } = mount(true, true);
  expect(read().badge).toEqual({ value: '3', color: 'rgb(220, 20, 60)', textColor: 'rgb(255, 255, 255)' });
  expect(read().label).toBe('Inbox');
});

test.each([false, true])('tab badge updates, dots and removal preserve the source DOM (rail=%s)', (rail) => {
  const { badge, read } = mount(rail, rail);
  expect(read().badge?.value).toBe('3');
  badge.textContent = '12';
  expect(read().badge?.value).toBe('12');
  badge.textContent = '';
  expect(read().badge?.value).toBe('');
  badge.style.display = 'none';
  expect(read().badge).toBeUndefined();
  badge.style.display = 'block';
  expect(read().badge?.value).toBe('');
  expect(badge.isConnected).toBe(true);
  badge.remove();
  expect(read().badge).toBeUndefined();
});

test('ordinary tab badges retain source viewport eligibility', () => {
  expect(mount(false, true).read().badge).toBeUndefined();
});
