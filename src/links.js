// Finds Markdown links outside code blocks and returns their targets:
//   inline:    [text](target) or [text](target "title")
//   reference: [text][label], [label][] or [label], resolved through a "[label]: target" definition
// A reference with no matching definition is plain text, not a link.
const TITLE = String.raw`(?:\s+(?:"[^"]*"|'[^']*'|\([^)]*\)))?`;
const DEFINITION = new RegExp(String.raw`^ {0,3}\[([^\]]+)\]:\s*(<[^>]*>|\S+)${TITLE}\s*$`);
// Group 1 is "!" for an image, which is matched whole so its [label] is not read as a link.
const LINK = new RegExp(String.raw`(!?)\[([^\]]*)\](?:\(([^)\s]+)${TITLE}\s*\)|\[([^\]]*)\])?`, 'g');

const normalize = (label) => label.trim().replace(/\s+/g, ' ').toLowerCase();

// Yields the lines that are not inside a fenced code block.
function* unfencedLines(markdown) {
  let inFence = false;
  for (const [i, raw] of markdown.split('\n').entries()) {
    if (/^\s*(```|~~~)/.test(raw)) {
      inFence = !inFence;
    } else if (!inFence) {
      yield { raw, number: i + 1 };
    }
  }
}

export function findLinks(markdown) {
  const lines = [...unfencedLines(markdown)];
  const definitions = new Map();
  for (const { raw } of lines) {
    const m = DEFINITION.exec(raw);
    const label = m && normalize(m[1]);
    if (label && !definitions.has(label)) definitions.set(label, m[2].replace(/^<|>$/g, ''));
  }

  const links = [];
  for (const { raw, number } of lines) {
    if (DEFINITION.test(raw)) continue;
    const prose = raw.replace(/`[^`]*`/g, '');
    for (const m of prose.matchAll(LINK)) {
      const [, bang, text, inline, reference] = m;
      if (bang) continue;
      const target = inline ?? definitions.get(normalize(reference || text));
      if (target !== undefined) links.push({ text, target, line: number });
    }
  }
  return links;
}

export function isExternal(target) {
  return /^[a-z][a-z0-9+.-]*:/i.test(target);
}