import {
  CHAT_MARKDOWN_REHYPE_PLUGINS,
  CHAT_MARKDOWN_REMARK_PLUGINS,
} from "@t3tools/shared/markdownPipeline";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vite-plus/test";

import { createMarkdownRenderer } from "../chat/markdownRenderer";
import { parseMatterCitationHref, rehypeMatterCitations } from "./matterCitations";

describe("rehypeMatterCitations", () => {
  const render = createMarkdownRenderer({
    remarkPlugins: CHAT_MARKDOWN_REMARK_PLUGINS,
    rehypePlugins: [...CHAT_MARKDOWN_REHYPE_PLUGINS, rehypeMatterCitations],
    components: {
      a: ({ href }) => {
        const citeId = href ? parseMatterCitationHref(href) : null;
        return citeId === null ? <a href={href}>link</a> : <cite>{citeId}</cite>;
      },
    },
    urlTransform: (url) => url,
  });
  const markup = (source: string) => renderToStaticMarkup(render(source, false));

  it.each([
    [
      "Limits are 25/50 [[cite:9001:section:policy-limits]]. Adjuster set [[cite:9001:note:n_2]].",
      "<p>Limits are 25/50 <cite>9001:section:policy-limits</cite>. Adjuster set <cite>9001:note:n_2</cite>.</p>",
    ],
    [
      "- **Bold [[cite:9001:task:t1]]** item",
      "<ul>\n<li><strong>Bold <cite>9001:task:t1</cite></strong> item</li>\n</ul>",
    ],
    [
      "Code `[[cite:9001:note:n1]]` stays literal",
      '<p>Code <code data-inline-code="">[[cite:9001:note:n1]]</code> stays literal</p>',
    ],
    ["Not a marker [[cite:]] or [[other:x]]", "<p>Not a marker [[cite:]] or [[other:x]]</p>"],
  ])("renders %j", (source, expected) => {
    expect(markup(source)).toBe(expected);
  });
});
