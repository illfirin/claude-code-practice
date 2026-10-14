import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { findLinks, isExternal } from '../src/links.js';
import { brokenLinks } from '../src/check-links.js';

const samples = join(dirname(fileURLToPath(import.meta.url)), '..', 'samples');

test('finds inline links with their line numbers', () => {
  const links = findLinks('# Title\n\nSee [setup](setup.md) and [docs](https://example.com).\n');
  assert.deepEqual(links.map((l) => [l.target, l.line]), [['setup.md', 3], ['https://example.com', 3]]);
});

test('finds links that have a title', () => {
  const md = [
    '[double](a.md "Title")',
    "[single](b.md 'Title')",
    '[parens](c.md (Title))',
    '[tricky](d.md#top "see (this) one")',
  ].join('\n');
  assert.deepEqual(
    findLinks(md).map((l) => [l.text, l.target, l.line]),
    [['double', 'a.md', 1], ['single', 'b.md', 2], ['parens', 'c.md', 3], ['tricky', 'd.md#top', 4]],
  );
});

test('finds links whose title contains quotes, brackets or parentheses', () => {
  const md = [
    '[apostrophe](e.md "Don\'t")',
    "[inner-dq](f.md 'say \"hi\"')",
    "[close-sq](g.md 'a) b')",
    "[parens-sq](h.md 'see (this) one')",
    '[brackets](i.md "has [brackets] in it")',
    '[first](j.md "x)") then [second](k.md \'y)\') and [plain](l.md)',
  ].join('\n');
  assert.deepEqual(
    findLinks(md).map((l) => [l.text, l.target, l.line]),
    [
      ['apostrophe', 'e.md', 1],
      ['inner-dq', 'f.md', 2],
      ['close-sq', 'g.md', 3],
      ['parens-sq', 'h.md', 4],
      ['brackets', 'i.md', 5],
      ['first', 'j.md', 6],
      ['second', 'k.md', 6],
      ['plain', 'l.md', 6],
    ],
  );
});

test('ignores links with a malformed title', () => {
  for (const md of [
    '[a](a.md "Title\')', // mismatched quotes
    '[a](a.md "oops)', // unterminated title
    '[a](a.md "one" "two")', // two titles
    '[a](a.md "T" junk)', // junk after the title
  ]) {
    assert.deepEqual(findLinks(md), [], md);
  }
});

test('skips images and links inside code', () => {
  const md = '![logo](logo.png)\n`[not](a-link.md)`\n```\n[also not](code.md)\n```\n';
  assert.deepEqual(findLinks(md), []);
});

test('tells external links from relative ones', () => {
  assert.equal(isExternal('https://example.com'), true);
  assert.equal(isExternal('mailto:me@example.com'), true);
  assert.equal(isExternal('docs/setup.md'), false);
});

test('reports only the relative links whose file is missing', () => {
  const broken = brokenLinks(samples, { files: ['.'], ignore: [] });
  assert.deepEqual(broken, [{ file: 'guide.md', line: 5, target: 'missing.md' }]);
});
