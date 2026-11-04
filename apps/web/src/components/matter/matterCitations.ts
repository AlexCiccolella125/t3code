import { CITATION_MARKER_PATTERN } from "@t3tools/contracts";
import type { ElementContent, Root, RootContent } from "hast";

const MATTER_CITATION_PREFIX = "t3-matter-cite:";
const SKIPPED_TAGS = new Set(["code", "pre", "a"]);

export function formatMatterCitationHref(citeId: string): string {
  return `${MATTER_CITATION_PREFIX}${encodeURIComponent(citeId)}`;
}

export function parseMatterCitationHref(href: string): string | null {
  if (!href.startsWith(MATTER_CITATION_PREFIX)) return null;
  try {
    const citeId = decodeURIComponent(href.slice(MATTER_CITATION_PREFIX.length));
    return citeId === "" ? null : citeId;
  } catch {
    return null;
  }
}

function splitCitations(value: string): ElementContent[] | null {
  const pattern = new RegExp(CITATION_MARKER_PATTERN.source, "g");
  const parts: ElementContent[] = [];
  let last = 0;
  for (const match of value.matchAll(pattern)) {
    if (match.index > last) parts.push({ type: "text", value: value.slice(last, match.index) });
    parts.push({
      type: "element",
      tagName: "a",
      properties: { href: formatMatterCitationHref(match[1]!) },
      children: [{ type: "text", value: match[1]! }],
    });
    last = match.index + match[0].length;
  }
  if (parts.length === 0) return null;
  if (last < value.length) parts.push({ type: "text", value: value.slice(last) });
  return parts;
}

/** Turns `[[cite:ID]]` markers into links the markdown anchor renders as Citation chips. */
export function rehypeMatterCitations() {
  const visit = (node: Root | RootContent): void => {
    if (node.type !== "root" && node.type !== "element") return;
    if (node.type === "element" && SKIPPED_TAGS.has(node.tagName)) return;
    if (!node.children.some((child) => child.type === "text" && child.value.includes("[[cite:"))) {
      for (const child of node.children) visit(child);
      return;
    }
    const children: Array<RootContent> = [];
    for (const child of node.children) {
      const split = child.type === "text" ? splitCitations(child.value) : null;
      if (split === null) {
        visit(child);
        children.push(child);
      } else {
        children.push(...split);
      }
    }
    node.children = children as typeof node.children;
  };
  return visit;
}
