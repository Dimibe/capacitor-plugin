import type { NativeUIItem } from '../definitions.js';

const cache = new WeakMap<HTMLImageElement, { src: string; key: string; icon?: string }>();
const maxThumbnailPixels = 128;
const authorImage = 'img:not([data-native-ui-projection-node])';
export const tabImageSelector = `:scope > ${authorImage}, :scope > ion-avatar > ${authorImage}`;

export function invalidateTabImage(event: Event): boolean {
  const image = event.target as HTMLImageElement | null;
  if (!image?.matches?.(`ion-tab-button > ${authorImage}, ion-tab-button > ion-avatar > ${authorImage}`)) return false;
  cache.delete(image);
  return true;
}

// Capture the image already loaded by the WebView. Exporting the canvas enforces the browser's origin policy.
export function readTabImage(image: HTMLImageElement, item: NativeUIItem): void {
  if (!image.complete || !image.naturalWidth || !image.naturalHeight) return;
  const { width, height } = image.getBoundingClientRect();
  if (!(width > 0 && height > 0)) return;
  const style = getComputedStyle(image);
  const avatar = image.parentElement?.matches('ion-avatar') ? getComputedStyle(image.parentElement) : undefined;
  const round = style.borderRadius === '50%' || (avatar?.borderRadius === '50%' && ['hidden', 'clip'].includes(avatar.overflow));
  const fit = style.objectFit || 'fill';
  const scale = Math.min(image.ownerDocument.defaultView?.devicePixelRatio || 1, maxThumbnailPixels / Math.max(width, height));
  const src = image.currentSrc || image.src;
  const key = [width, height, scale, fit, round].join(':');
  let cached = cache.get(image);
  if (!cached || cached.src !== src || cached.key !== key) {
    cached = { src, key };
    cache.set(image, cached);
    try {
      const canvas = image.ownerDocument.createElement('canvas');
      canvas.width = Math.max(1, Math.round(width * scale));
      canvas.height = Math.max(1, Math.round(height * scale));
      const context = canvas.getContext('2d');
      if (!context) return;
      if (round) {
        context.beginPath();
        context.ellipse(canvas.width / 2, canvas.height / 2, canvas.width / 2, canvas.height / 2, 0, 0, 2 * Math.PI);
        context.clip();
      }
      let drawWidth = canvas.width;
      let drawHeight = canvas.height;
      if (fit === 'cover' || fit === 'contain') {
        const factor = (fit === 'cover' ? Math.max : Math.min)(canvas.width / image.naturalWidth, canvas.height / image.naturalHeight);
        drawWidth = image.naturalWidth * factor;
        drawHeight = image.naturalHeight * factor;
      }
      context.drawImage(image, (canvas.width - drawWidth) / 2, (canvas.height - drawHeight) / 2, drawWidth, drawHeight);
      cached.icon = canvas.toDataURL('image/png').split(',')[1];
    } catch {
      // A cross-origin photo may display on the Web but disallow reading its pixels.
    }
  }
  if (cached.icon)
    Object.assign(item, { icon: cached.icon, iconWidth: width, iconHeight: height, iconPosition: 'top', iconTemplate: false });
}
