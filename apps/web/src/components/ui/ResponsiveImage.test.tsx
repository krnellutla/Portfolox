// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { MediaAssetWithVariants } from '@blueflutes/shared';
import { ResponsiveImage } from './ResponsiveImage.js';

afterEach(cleanup);

const baseAsset: MediaAssetWithVariants = {
  id: '00000000-0000-0000-0000-000000000001',
  tenantId: '00000000-0000-0000-0000-000000000002',
  nodeId: '00000000-0000-0000-0000-000000000003',
  objectKey: 'tenants/t/nodes/n/a/original.jpg',
  url: 'https://cdn.example.com/original.jpg',
  mimeType: 'image/jpeg',
  status: 'ready',
  position: 0,
  originalFilename: 'photo.jpg',
  byteSize: 1024,
  checksum: null,
  width: 2400,
  height: 1600,
  createdAt: new Date('2025-01-01'),
  variants: [],
};

const withVariants: MediaAssetWithVariants = {
  ...baseAsset,
  variants: [
    {
      id: '00000000-0000-0000-0000-000000000010',
      tenantId: baseAsset.tenantId,
      assetId: baseAsset.id,
      variant: 'thumb',
      objectKey: 'tenants/t/nodes/n/a/thumb.webp',
      url: 'https://cdn.example.com/thumb.webp',
      width: 256,
      height: 171,
      byteSize: 200,
      createdAt: new Date('2025-01-01'),
    },
    {
      id: '00000000-0000-0000-0000-000000000011',
      tenantId: baseAsset.tenantId,
      assetId: baseAsset.id,
      variant: 'large',
      objectKey: 'tenants/t/nodes/n/a/large.webp',
      url: 'https://cdn.example.com/large.webp',
      width: 2048,
      height: 1365,
      byteSize: 8000,
      createdAt: new Date('2025-01-01'),
    },
  ],
};

function img() {
  return document.querySelector('img')!;
}

describe('ResponsiveImage', () => {
  it('falls back to asset.url as src when no variants', () => {
    render(<ResponsiveImage asset={baseAsset} />);
    expect(img().getAttribute('src')).toBe('https://cdn.example.com/original.jpg');
    expect(img().getAttribute('srcset')).toBeNull();
  });

  it('builds srcSet from all variants, ordered by width', () => {
    render(<ResponsiveImage asset={withVariants} />);
    expect(img().getAttribute('srcset')).toBe(
      'https://cdn.example.com/thumb.webp 256w, https://cdn.example.com/large.webp 2048w',
    );
  });

  it('sets src to the largest variant url', () => {
    render(<ResponsiveImage asset={withVariants} />);
    expect(img().getAttribute('src')).toBe('https://cdn.example.com/large.webp');
  });

  it('passes width and height from asset', () => {
    render(<ResponsiveImage asset={withVariants} />);
    expect(img().getAttribute('width')).toBe('2400');
    expect(img().getAttribute('height')).toBe('1600');
  });

  it('applies className and custom sizes', () => {
    render(<ResponsiveImage asset={baseAsset} sizes="50vw" className="rounded" />);
    expect(img().getAttribute('sizes')).toBe('50vw');
    expect(img().classList.contains('rounded')).toBe(true);
  });

  it('is lazy-loaded', () => {
    render(<ResponsiveImage asset={baseAsset} />);
    expect(img().getAttribute('loading')).toBe('lazy');
  });
});
