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

test('resolves full, collapsed and shortcut reference links', () => {
  const md = [
    '[a]: a.md',
    'See [the text][a], [b][] and [c].',
    '',
    '[b]: b.md#top',
    '[c]: c.md',
  ].join('\n');
  assert.deepEqual(
    findLinks(md).map((l) => [l.text, l.target, l.line]),
    [['the text', 'a.md', 2], ['b', 'b.md#top', 2], ['c', 'c.md', 2]],
  );
});

test('reads reference definitions with titles, angle brackets and indentation', () => {
  const md = [
    '[double]: a.md "Title"',
    "[single]: b.md 'Title'",
    '[parens]: c.md (Title)',
    '[angle]: <my file.md>',
    ' [one]: d.md',
    '   [three]: e.md',
    '    [four]: f.md',
    '[double] [single] [parens] [angle] [one] [three] [four]',
  ].join('\n');
  assert.deepEqual(
    findLinks(md).map((l) => [l.text, l.target]),
    [['double', 'a.md'], ['single', 'b.md'], ['parens', 'c.md'], ['angle', 'my file.md'], ['one', 'd.md'], ['three', 'e.md']],
  );
});

test('matches reference labels ignoring case and spacing, and the first definition wins', () => {
  const md = ['[Foo   Bar]', '[foo bar]: first.md', '[FOO BAR]: second.md'].join('\n');
  assert.deepEqual(findLinks(md).map((l) => [l.text, l.target, l.line]), [['Foo   Bar', 'first.md', 1]]);
});

test('ignores references that are not links', () => {
  const md = [
    '[ref]: ref.md',
    '- [ ] task and [x] done and [1] and [undefined][nope]',
    '![img][ref]',
    '`[ref]` and `[text][ref]`',
    '```',
    '[hidden]: hidden.md',
    '[ref]',
    '```',
    '[hidden]',
  ].join('\n');
  assert.deepEqual(findLinks(md), []);
});

test('resolves every use of a definition, each on its own line', () => {
  const md = ['[a]: a.md', '[x][a]', '', '[y][a] and [a]'].join('\n');
  assert.deepEqual(
    findLinks(md).map((l) => [l.text, l.target, l.line]),
    [['x', 'a.md', 2], ['y', 'a.md', 4], ['a', 'a.md', 4]],
  );
});

test('finds inline and reference links on the same line, in order', () => {
  const md = ['[a](a.md) and [b][r] and ![i][r] and [c] and [d](d.md)', '[r]: r.md', '[c]: c.md'].join('\n');
  assert.deepEqual(
    findLinks(md).map((l) => [l.text, l.target]),
    [['a', 'a.md'], ['b', 'r.md'], ['c', 'c.md'], ['d', 'd.md']],
  );
});

test('reads back-to-back references separately', () => {
  const md = ['[a]: a.md', '[b]: b.md', '[a][b][a]'].join('\n');
  assert.deepEqual(findLinks(md).map((l) => [l.text, l.target]), [['a', 'b.md'], ['a', 'a.md']]);
});

test('prefers the inline target over a definition with the same label', () => {
  assert.deepEqual(findLinks('[a](x.md)\n[a]: y.md').map((l) => l.target), ['x.md']);
});

test('keeps external and fragment-only reference targets as written', () => {
  const md = ['[site][web] and [top][up]', '[web]: https://example.com', '[up]: #top'].join('\n');
  const targets = findLinks(md).map((l) => l.target);
  assert.deepEqual(targets, ['https://example.com', '#top']);
  assert.deepEqual(targets.map(isExternal), [true, false]);
});

test('matches reference labels with non-ASCII letters', () => {
  assert.deepEqual(findLinks('[ÄÖ]: u.md\n[äö]').map((l) => l.target), ['u.md']);
});

test('reads reference definitions in files with CRLF line endings', () => {
  const md = '[a]: a.md\r\n[b]: <b c.md> "Title"\r\n[a] and [b]\r\n';
  assert.deepEqual(findLinks(md).map((l) => [l.target, l.line]), [['a.md', 3], ['b c.md', 3]]);
});

test('ignores malformed definitions and empty labels', () => {
  const md = [
    '[a]: a.md extra words', // junk after the target
    '[b]: b.md "unterminated', // unterminated title
    '[c]:', // no target
    '[]: d.md', // empty label
    '[a] [b] [c] [] [][]',
  ].join('\n');
  assert.deepEqual(findLinks(md), []);
});

test('does not collect definitions from a ~~~ fence', () => {
  assert.deepEqual(findLinks('~~~\n[h]: h.md\n~~~\n[h]\n'), []);
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

test('applies the ignore list and file list to reference links', () => {
  assert.deepEqual(brokenLinks(samples, { files: ['.'], ignore: ['gone.md'] }), [
    { file: 'guide.md', line: 5, target: 'missing.md' },
  ]);
  assert.deepEqual(brokenLinks(samples, { files: ['reference.md'], ignore: [] }), [
    { file: 'reference.md', line: 3, target: 'gone.md' },
  ]);
});

test('reports only the relative links whose file is missing', () => {
  const broken = brokenLinks(samples, { files: ['.'], ignore: [] });
  assert.deepEqual(broken, [
    { file: 'guide.md', line: 5, target: 'missing.md' },
    { file: 'reference.md', line: 3, target: 'gone.md' },
  ]);
});
