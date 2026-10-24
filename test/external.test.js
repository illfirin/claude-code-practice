// linkcheck source.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { countExternal } from '../src/external.js';

test('counts only external links', () => {
  const md = '[a](https://example.com) and [b](docs/setup.md) and [c](mailto:me@example.com)';
  assert.equal(countExternal(md), 2);
});

test('counts external reference-style links', () => {
  const md = ['[a][r] and [b]', '[r]: https://example.com', '[b]: b.md'].join('\n');
  assert.equal(countExternal(md), 1);
});

test('does not count #fragment-only or relative links', () => {
  assert.equal(countExternal('[top](#top) [up](../README.md)'), 0);
});

test('does not count external images, code or unresolved references', () => {
  const md = '![logo](https://example.com/logo.png)\n`[x](https://example.com)`\n```\n[y](https://example.com)\n```\n[nope][missing]\n';
  assert.equal(countExternal(md), 0);
});

test('returns 0 for Markdown without links', () => {
  assert.equal(countExternal(''), 0);
});
