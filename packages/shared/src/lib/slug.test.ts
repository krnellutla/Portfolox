import { describe, expect, it } from 'vitest';
import { slugify, slugSchema } from './slug.js';

describe('slugify', () => {
  it('lowercases and trims', () => {
    expect(slugify('  Hello World  ')).toBe('hello-world');
  });

  it('replaces spaces with hyphens', () => {
    expect(slugify('My Gallery')).toBe('my-gallery');
  });

  it('collapses multiple non-alphanumeric chars to a single hyphen', () => {
    expect(slugify('cats & dogs --- photos!')).toBe('cats-dogs-photos');
  });

  it('handles punctuation', () => {
    expect(slugify("John's Portfolio — 2024")).toBe('john-s-portfolio-2024');
  });

  it('strips leading and trailing hyphens', () => {
    expect(slugify('---hello---')).toBe('hello');
  });

  it('falls back to "untitled" for whitespace-only or empty input', () => {
    expect(slugify('')).toBe('untitled');
    expect(slugify('   ')).toBe('untitled');
    expect(slugify('!!!???')).toBe('untitled');
  });

  it('preserves numbers', () => {
    expect(slugify('2024 Summer')).toBe('2024-summer');
  });

  it('handles already-valid slug unchanged', () => {
    expect(slugify('my-gallery')).toBe('my-gallery');
  });
});

describe('slugSchema', () => {
  it('accepts a valid slug', () => {
    expect(slugSchema.safeParse('my-gallery').success).toBe(true);
    expect(slugSchema.safeParse('abc123').success).toBe(true);
  });

  it('rejects uppercase', () => {
    expect(slugSchema.safeParse('MyGallery').success).toBe(false);
  });

  it('rejects leading/trailing hyphens', () => {
    expect(slugSchema.safeParse('-hello').success).toBe(false);
    expect(slugSchema.safeParse('hello-').success).toBe(false);
  });

  it('rejects consecutive hyphens', () => {
    expect(slugSchema.safeParse('hello--world').success).toBe(false);
  });

  it('rejects empty string', () => {
    expect(slugSchema.safeParse('').success).toBe(false);
  });

  it('rejects strings over 120 chars', () => {
    expect(slugSchema.safeParse('a'.repeat(121)).success).toBe(false);
  });
});
