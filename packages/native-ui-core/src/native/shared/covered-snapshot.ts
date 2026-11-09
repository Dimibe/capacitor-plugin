import { createWebProjectionSurface, type WebProjectionSource } from '@webview-native-ui/engine';
import type { NativeUIPlugin } from '../definitions.js';
import { getProjectionState } from './covered-source.js';
import { createModalRailLayout } from './vertical-bars-geometry.js';

/** Ionic supplies source ownership and proxy placement; Engine owns image handoff. */
export const createCoveredSnapshots = async (
  doc: Document,
  plugin: NativeUIPlugin,
  listen: NativeUIPlugin['addListener'],
  callbacks: { wake: () => void; blocked: () => boolean; modal?: HTMLIonModalElement; revision?: () => number },
) => {
  const state = getProjectionState(doc);
  let latestSources: WebProjectionSource[] = [];
  const { modal, wake, blocked, revision } = callbacks;
  const imageSurface = modal ? doc.createElement('div') : undefined;
  if (imageSurface) {
    imageSurface.setAttribute('data-native-ui-projection-node', '');
    imageSurface.style.cssText = 'position:fixed;inset:0;pointer-events:none';
  }
  const projection = await createWebProjectionSurface(
    {
      send: (request) => plugin.coveredSnapshot!(modal && request.action === 'prepare' ? { ...request, captureMode: 'view' } : request),
      listen: (listener) => listen('snapshotInteraction', listener),
    },
    {
      namespace: 'native-ui',
      target: ({ element: source, control }) => {
        const proxy = state.getTarget(source);
        return control.placement === 'vertical-bars' &&
          (proxy || source.matches('ion-button, ion-buttons, ion-back-button, ion-menu-button'))
          ? proxy
          : source;
      },
      canRelocate: (target) => target.matches('.ion-cloned-element, [data-native-ui-proxy]'),
      wake,
      blocked,
      revision,
      transient: !!modal,
      imageSurface,
      layoutFrame: modal
        ? createModalRailLayout(modal, (id) => {
            const source = latestSources.find((source) => source.control.id === id)?.element;
            return source && state.getTarget(source);
          })
        : undefined,
      eligible: (source) =>
        modal
          ? source.element.closest('ion-modal') === modal && source.control.placement === 'vertical-bars'
          : !source.element.closest('ion-modal'),
      current: (sources) => !modal || sources.every((source) => source.closest('ion-modal') === modal),
    },
  );
  const unregister = state.register(projection);
  const destroy = projection.destroy;
  const consider = projection.consider;

  return Object.assign(projection, {
    get webSurface() {
      return !!imageSurface;
    },
    consider(revision: number, sources: Parameters<typeof consider>[1]) {
      latestSources = sources;
      if (
        imageSurface &&
        !imageSurface.isConnected &&
        sources.some((source) => source.control.placement === 'vertical-bars' && source.element.closest('ion-modal') === modal)
      ) {
        imageSurface.style.zIndex = doc.defaultView!.getComputedStyle(modal!).zIndex;
        (modal!.parentElement ?? doc.body).append(imageSurface);
      }
      consider(
        revision,
        modal
          ? sources.map((source) => {
              const target = source.control.placement === 'vertical-bars' && state.getTarget(source.element);
              if (!target) return source;
              // Rail pixels follow their renderer-owned target, not the concealed Web source.
              // Source translation must not retire prepared pixels during a Modal gesture.
              const { x, y } = target.getBoundingClientRect();
              return { ...source, control: { ...source.control, x, y } };
            })
          : sources,
      );
    },
    async destroy() {
      try {
        await destroy();
      } finally {
        imageSurface?.remove();
        unregister();
      }
    },
  });
};
export type CoveredSnapshots = Awaited<ReturnType<typeof createCoveredSnapshots>>;
