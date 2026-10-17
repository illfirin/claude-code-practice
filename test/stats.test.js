// Part of linkcheck.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { countLinks } from '../src/stats.js';

test('counts inline and reference links', () => {
  const md = ['[a](a.md) and [b][r] and [c]', '[r]: r.md', '[c]: c.md'].join('\n');
  assert.equal(countLinks(md), 3);
});

test('does not count images, code or unresolved references', () => {
  const md = '![logo](logo.png)\n`[not](a-link.md)`\n```\n[also not](code.md)\n```\n[nope][missing]\n';
  assert.equal(countLinks(md), 0);
});

test('returns 0 for Markdown without links', () => {
  assert.equal(countLinks(''), 0);
  assert.equal(countLinks('# Title\n\nJust text.\n'), 0);
});
