// HTML-to-Lexical JSON converter
// Converts pell rich editor HTML output to Lexical editor state JSON

const FORMAT_BOLD = 1;
const FORMAT_ITALIC = 2;
const FORMAT_STRIKETHROUGH = 4;
const FORMAT_UNDERLINE = 8;
const FORMAT_CODE = 16;

interface LexicalTextNode {
  type: 'text';
  text: string;
  detail: number;
  format: number;
  mode: string;
  style: string;
  version: number;
}

interface LexicalLinebreakNode {
  type: 'linebreak';
  version: number;
}

interface LexicalBlockNode {
  type: string;
  tag?: string;
  children: LexicalNode[];
  direction: null;
  format: string;
  indent: number;
  version: number;
  listType?: string;
  start?: number;
  value?: number;
  url?: string;
  rel?: string;
  target?: string | null;
  title?: string;
}

interface LexicalImageNode {
  type: 'image';
  src: string;
  altText: string;
  width?: number;
  height?: number;
  explicitDimensions?: boolean;
  rotation?: number;
  version: number;
}

interface LexicalHRNode {
  type: 'horizontalrule';
  version: number;
}

type LexicalNode =
  | LexicalTextNode
  | LexicalLinebreakNode
  | LexicalBlockNode
  | LexicalImageNode
  | LexicalHRNode;

// Inline tags that affect text format flags
const INLINE_FORMAT_TAGS: Record<string, number> = {
  b: FORMAT_BOLD,
  strong: FORMAT_BOLD,
  i: FORMAT_ITALIC,
  em: FORMAT_ITALIC,
  s: FORMAT_STRIKETHROUGH,
  strike: FORMAT_STRIKETHROUGH,
  del: FORMAT_STRIKETHROUGH,
  u: FORMAT_UNDERLINE,
  code: FORMAT_CODE,
};

// Block-level tags
const BLOCK_TAGS = new Set([
  'p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'blockquote', 'ul', 'ol', 'li', 'hr', 'pre',
]);

// Decode HTML entities
function decodeEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, code) => String.fromCharCode(parseInt(code, 16)));
}

// Extract attribute value from a tag string
function getAttr(tag: string, attr: string): string {
  // Try double quotes
  const dq = new RegExp(`${attr}\\s*=\\s*"([^"]*)"`, 'i');
  const dm = tag.match(dq);
  if (dm) return dm[1];
  // Try single quotes
  const sq = new RegExp(`${attr}\\s*=\\s*'([^']*)'`, 'i');
  const sm = tag.match(sq);
  if (sm) return sm[1];
  // Try no quotes
  const nq = new RegExp(`${attr}\\s*=\\s*([^\\s>]+)`, 'i');
  const nm = tag.match(nq);
  if (nm) return nm[1];
  return '';
}

// Extract text-align from style attribute
function getTextAlign(tag: string): string {
  const style = getAttr(tag, 'style');
  const m = style.match(/text-align\s*:\s*(left|center|right|justify)/i);
  return m ? m[1].toLowerCase() : '';
}

// Extract inline color styles
function getInlineStyle(tag: string): string {
  const style = getAttr(tag, 'style');
  const parts: string[] = [];

  const colorMatch = style.match(/(?:^|;)\s*color\s*:\s*([^;]+)/i);
  if (colorMatch) parts.push(`color: ${colorMatch[1].trim()}`);

  const bgMatch = style.match(/background-color\s*:\s*([^;]+)/i);
  if (bgMatch) parts.push(`background-color: ${bgMatch[1].trim()}`);

  return parts.join('; ');
}

function parsePositiveInt(value: string): number | undefined {
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

// Token types from the HTML tokenizer
interface TagToken {
  kind: 'open' | 'close' | 'selfclose';
  tagName: string;
  raw: string;
}

interface TextToken {
  kind: 'text';
  text: string;
}

type Token = TagToken | TextToken;

// Tokenize HTML into a stream of tags and text
function tokenize(html: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < html.length) {
    if (html[i] === '<') {
      const end = html.indexOf('>', i);
      if (end === -1) {
        // Malformed: treat rest as text
        tokens.push({kind: 'text', text: decodeEntities(html.slice(i))});
        break;
      }

      const raw = html.slice(i, end + 1);
      const inner = raw.slice(1, -1).trim();

      if (inner.startsWith('/')) {
        // Close tag
        const tagName = inner.slice(1).trim().split(/[\s/]/)[0].toLowerCase();
        tokens.push({kind: 'close', tagName, raw});
      } else if (inner.endsWith('/') || /^(br|hr|img|input)\b/i.test(inner)) {
        // Self-closing tag
        const tagName = inner.split(/[\s/]/)[0].toLowerCase();
        tokens.push({kind: 'selfclose', tagName, raw});
      } else if (inner.startsWith('!')) {
        // Comment or doctype — skip
      } else {
        // Open tag
        const tagName = inner.split(/[\s/]/)[0].toLowerCase();
        tokens.push({kind: 'open', tagName, raw});
      }

      i = end + 1;
    } else {
      // Text content
      const nextTag = html.indexOf('<', i);
      const text = nextTag === -1 ? html.slice(i) : html.slice(i, nextTag);
      if (text) {
        tokens.push({kind: 'text', text: decodeEntities(text)});
      }
      i = nextTag === -1 ? html.length : nextTag;
    }
  }

  return tokens;
}

function makeTextNode(text: string, format: number, style: string): LexicalTextNode {
  return {
    type: 'text',
    text,
    detail: 0,
    format,
    mode: 'normal',
    style,
    version: 1,
  };
}

function makeBlockNode(
  type: string,
  children: LexicalNode[],
  extra: Partial<LexicalBlockNode> = {},
): LexicalBlockNode {
  return {
    type,
    children,
    direction: null,
    format: '',
    indent: 0,
    version: 1,
    ...extra,
  };
}

// Main conversion
function convertHtmlToLexical(html: string): LexicalBlockNode {
  const tokens = tokenize(html.trim());

  // Stack of block contexts
  // Each entry: { node, formatStack (inherited inline format) }
  interface BlockContext {
    node: LexicalBlockNode;
    listItemIndex: number;
  }

  const rootNode = makeBlockNode('root', []);
  const blockStack: BlockContext[] = [{node: rootNode, listItemIndex: 0}];

  // Current inline format flags (accumulated from nested inline tags)
  let formatFlags = 0;
  const formatStack: number[] = [];

  // Current inline style
  let currentStyle = '';
  const styleStack: string[] = [];

  function currentBlock(): BlockContext {
    return blockStack[blockStack.length - 1];
  }

  function addToCurrentBlock(node: LexicalNode) {
    currentBlock().node.children.push(node);
  }

  // Ensure we have an implicit paragraph if text appears at root level
  function ensureInlineContext() {
    const ctx = currentBlock();
    if (ctx.node.type === 'root' || ctx.node.type === 'list') {
      const para = makeBlockNode('paragraph', []);
      ctx.node.children.push(para);
      blockStack.push({node: para, listItemIndex: 0});
    }
  }

  for (const token of tokens) {
    if (token.kind === 'text') {
      const text = token.text;
      if (!text || text === '') continue;
      // If only whitespace between blocks, skip
      if (/^\s+$/.test(text) && (currentBlock().node.type === 'root' || currentBlock().node.type === 'list')) {
        continue;
      }
      ensureInlineContext();
      addToCurrentBlock(makeTextNode(text, formatFlags, currentStyle));
      continue;
    }

    if (token.kind === 'selfclose') {
      if (token.tagName === 'br') {
        ensureInlineContext();
        addToCurrentBlock({type: 'linebreak', version: 1});
      } else if (token.tagName === 'hr') {
        addToCurrentBlock({type: 'horizontalrule', version: 1});
      } else if (token.tagName === 'img') {
        const src = getAttr(token.raw, 'src');
        if (src) {
          const styleAttr = getAttr(token.raw, 'style') || '';
          const rotMatch = styleAttr.match(/rotate\((\d+)deg\)/);
          const rotation = rotMatch ? parseInt(rotMatch[1], 10) : (parseInt(getAttr(token.raw, 'data-rotation') || '0', 10) || 0);
          const width = parsePositiveInt(getAttr(token.raw, 'width'));
          const height = parsePositiveInt(getAttr(token.raw, 'height'));
          const explicitDimensions = /true/i.test(getAttr(token.raw, 'data-explicit-dimensions'))
            || (!!width && !!height);
          // Images must be top-level (children of root), not inside paragraphs.
          // Pop back to root if we're inside a paragraph so the image is a sibling.
          while (blockStack.length > 1 && currentBlock().node.type === 'paragraph') {
            blockStack.pop();
          }
          addToCurrentBlock({
            type: 'image',
            src,
            altText: getAttr(token.raw, 'alt') || '',
            width,
            height,
            explicitDimensions,
            rotation,
            version: 1,
          });
        }
      }
      continue;
    }

    if (token.kind === 'open') {
      const tag = token.tagName;

      // Inline format tags
      if (tag in INLINE_FORMAT_TAGS) {
        formatStack.push(formatFlags);
        formatFlags |= INLINE_FORMAT_TAGS[tag];
        continue;
      }

      // Inline style containers (span, font)
      if (tag === 'span' || tag === 'font') {
        formatStack.push(formatFlags);
        styleStack.push(currentStyle);

        const inlineStyle = getInlineStyle(token.raw);
        if (inlineStyle) {
          currentStyle = currentStyle ? `${currentStyle}; ${inlineStyle}` : inlineStyle;
        }

        // font tag with color attribute
        if (tag === 'font') {
          const fontColor = getAttr(token.raw, 'color');
          if (fontColor) {
            const colorStyle = `color: ${fontColor}`;
            currentStyle = currentStyle ? `${currentStyle}; ${colorStyle}` : colorStyle;
          }
        }
        continue;
      }

      // Link
      if (tag === 'a') {
        const url = getAttr(token.raw, 'href');
        const linkNode = makeBlockNode('link', [], {
          url,
          rel: 'noreferrer',
          target: null,
          title: '',
        });
        ensureInlineContext();
        addToCurrentBlock(linkNode as any);
        blockStack.push({node: linkNode, listItemIndex: 0});
        continue;
      }

      // Block-level tags
      if (BLOCK_TAGS.has(tag)) {
        const align = getTextAlign(token.raw);

        if (tag === 'p' || tag === 'div') {
          const para = makeBlockNode('paragraph', []);
          if (align) para.format = align;
          addToCurrentBlock(para);
          blockStack.push({node: para, listItemIndex: 0});
        } else if (tag === 'h1' || tag === 'h2' || tag === 'h3' || tag === 'h4' || tag === 'h5' || tag === 'h6') {
          const heading = makeBlockNode('heading', [], {tag});
          if (align) heading.format = align;
          addToCurrentBlock(heading);
          blockStack.push({node: heading, listItemIndex: 0});
        } else if (tag === 'blockquote') {
          const quote = makeBlockNode('quote', []);
          addToCurrentBlock(quote);
          blockStack.push({node: quote, listItemIndex: 0});
        } else if (tag === 'ul') {
          const list = makeBlockNode('list', [], {
            listType: 'bullet',
            start: 1,
            tag: 'ul',
          });
          addToCurrentBlock(list);
          blockStack.push({node: list, listItemIndex: 0});
        } else if (tag === 'ol') {
          const list = makeBlockNode('list', [], {
            listType: 'number',
            start: 1,
            tag: 'ol',
          });
          addToCurrentBlock(list);
          blockStack.push({node: list, listItemIndex: 0});
        } else if (tag === 'li') {
          const ctx = currentBlock();
          ctx.listItemIndex += 1;
          const item = makeBlockNode('listitem', [], {
            value: ctx.listItemIndex,
          });
          addToCurrentBlock(item);
          blockStack.push({node: item, listItemIndex: 0});
        } else if (tag === 'hr') {
          addToCurrentBlock({type: 'horizontalrule', version: 1});
        } else if (tag === 'pre') {
          const code = makeBlockNode('code', []);
          addToCurrentBlock(code);
          blockStack.push({node: code, listItemIndex: 0});
        }
        continue;
      }

      // Unknown open tags — ignore the tag itself
      continue;
    }

    if (token.kind === 'close') {
      const tag = token.tagName;

      // Inline format tags
      if (tag in INLINE_FORMAT_TAGS) {
        formatFlags = formatStack.pop() ?? 0;
        continue;
      }

      // Inline style containers
      if (tag === 'span' || tag === 'font') {
        formatFlags = formatStack.pop() ?? formatFlags;
        currentStyle = styleStack.pop() ?? '';
        continue;
      }

      // Link
      if (tag === 'a') {
        if (blockStack.length > 1 && currentBlock().node.type === 'link') {
          blockStack.pop();
        }
        continue;
      }

      // Block-level close tags
      if (BLOCK_TAGS.has(tag) && tag !== 'hr') {
        if (blockStack.length > 1) {
          // Pop until we find a matching block (handles implicit paragraphs)
          const ctx = currentBlock();
          const nodeType = ctx.node.type;
          const nodeTag = ctx.node.tag;

          const matchesTag =
            (tag === 'p' && nodeType === 'paragraph') ||
            (tag === 'div' && nodeType === 'paragraph') ||
            ((tag === 'h1' || tag === 'h2' || tag === 'h3' || tag === 'h4' || tag === 'h5' || tag === 'h6') && nodeType === 'heading' && nodeTag === tag) ||
            (tag === 'blockquote' && nodeType === 'quote') ||
            (tag === 'ul' && nodeType === 'list' && nodeTag === 'ul') ||
            (tag === 'ol' && nodeType === 'list' && nodeTag === 'ol') ||
            (tag === 'li' && nodeType === 'listitem') ||
            (tag === 'pre' && nodeType === 'code');

          if (matchesTag) {
            blockStack.pop();
          } else {
            // Try popping implicit paragraphs first
            if (nodeType === 'paragraph' && (tag !== 'p' && tag !== 'div')) {
              blockStack.pop();
              // Try again
              if (blockStack.length > 1) {
                blockStack.pop();
              }
            } else {
              blockStack.pop();
            }
          }
        }
        continue;
      }
    }
  }

  // If root has no children, add an empty paragraph
  if (rootNode.children.length === 0) {
    rootNode.children.push(makeBlockNode('paragraph', []));
  }

  return rootNode;
}

/**
 * Convert HTML from the pell rich editor into a Lexical JSON string
 * ready to be sent to the server as the `content` field.
 */
export function htmlToLexicalJson(html: string): string {
  if (!html || !html.trim()) {
    return JSON.stringify({
      root: makeBlockNode('root', [makeBlockNode('paragraph', [])]),
    });
  }

  const root = convertHtmlToLexical(html);

  return JSON.stringify({root});
}

/**
 * Convert Lexical JSON content back to HTML for loading into the pell editor.
 */
export function lexicalToHtml(content: string | object | null | undefined): string {
  if (!content) return '';

  try {
    const parsed = typeof content === 'string' ? JSON.parse(content) : content;
    const root = parsed?.root;
    if (!root?.children) return '';
    return root.children.map(nodeToHtml).join('');
  } catch {
    return typeof content === 'string' ? content : '';
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function textNodeToHtml(node: any): string {
  if (node.type === 'linebreak') return '<br>';
  if (node.type !== 'text' || !node.text) return '';

  let text = escapeHtml(node.text);
  const fmt = node.format ?? 0;

  if (fmt & FORMAT_CODE) text = `<code>${text}</code>`;
  if (fmt & FORMAT_BOLD) text = `<b>${text}</b>`;
  if (fmt & FORMAT_ITALIC) text = `<i>${text}</i>`;
  if (fmt & FORMAT_UNDERLINE) text = `<u>${text}</u>`;
  if (fmt & FORMAT_STRIKETHROUGH) text = `<s>${text}</s>`;

  if (node.style) {
    text = `<span style="${node.style}">${text}</span>`;
  }

  return text;
}

function inlineChildrenToHtml(children: any[]): string {
  if (!children) return '';
  return children.map((child: any) => {
    if (child.type === 'text' || child.type === 'linebreak') return textNodeToHtml(child);
    if (child.type === 'link') {
      const inner = inlineChildrenToHtml(child.children || []);
      return `<a href="${child.url || ''}">${inner}</a>`;
    }
    if (child.children) return inlineChildrenToHtml(child.children);
    return '';
  }).join('');
}

function nodeToHtml(node: any): string {
  if (!node || !node.type) return '';

  const align = node.format && typeof node.format === 'string' && node.format !== ''
    ? ` style="text-align: ${node.format};"` : '';

  switch (node.type) {
    case 'paragraph': {
      const inner = inlineChildrenToHtml(node.children || []);
      return `<p${align}>${inner}</p>`;
    }
    case 'heading': {
      const tag = node.tag || 'h1';
      const inner = inlineChildrenToHtml(node.children || []);
      return `<${tag}${align}>${inner}</${tag}>`;
    }
    case 'quote': {
      const inner = inlineChildrenToHtml(node.children || []);
      return `<blockquote>${inner}</blockquote>`;
    }
    case 'list': {
      const tag = node.listType === 'number' ? 'ol' : 'ul';
      const inner = (node.children || []).map(nodeToHtml).join('');
      return `<${tag}>${inner}</${tag}>`;
    }
    case 'listitem': {
      const inner = inlineChildrenToHtml(node.children || []);
      return `<li>${inner}</li>`;
    }
    case 'image': {
      const hasExplicitDimensions = node.explicitDimensions
        && typeof node.width === 'number'
        && node.width > 0
        && typeof node.height === 'number'
        && node.height > 0;
      const rot = node.rotation || 0;
      const rotCss = rot ? ` transform: rotate(${rot}deg);` : '';
      const imgStyle = `width: 100%; max-width: 100%; height: auto; border-radius: 8px; margin: 8px 0;${rotCss}`;
      const rotAttr = rot ? ` data-rotation="${rot}"` : '';
      const sizeAttrs = hasExplicitDimensions
        ? ` width="${Math.round(node.width)}" height="${Math.round(node.height)}" data-explicit-dimensions="true"`
        : '';
      return `<img src="${node.src || ''}" alt="${node.altText || ''}" style="${imgStyle}"${sizeAttrs}${rotAttr} />`;
    }
    case 'horizontalrule':
      return '<hr />';
    case 'link': {
      const inner = inlineChildrenToHtml(node.children || []);
      return `<a href="${node.url || ''}">${inner}</a>`;
    }
    default: {
      if (node.children) return node.children.map(nodeToHtml).join('');
      return '';
    }
  }
}

/**
 * Strip HTML tags and return plain text (for word count, validation, etc.)
 */
export function stripHtmlToPlainText(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
}
