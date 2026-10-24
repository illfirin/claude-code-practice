// linkcheck source.
import { findLinks, isExternal } from './links.js';

export function countExternal(markdown) {
  return findLinks(markdown).filter((link) => isExternal(link.target)).length;
}
