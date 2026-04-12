type LexicalNode = {
  type?: string;
  text?: string;
  children?: LexicalNode[];
};

export const stripHtml = (html: string): string => {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

export const toLexicalFromPlainText = (plainText: string): string => {
  const payload = {
    root: {
      children: [
        {
          type: 'paragraph',
          children: [
            {
              type: 'text',
              text: plainText,
              detail: 0,
              format: 0,
              mode: 'normal',
              style: '',
              version: 1,
            },
          ],
          direction: null,
          format: '',
          indent: 0,
          version: 1,
        },
      ],
      direction: null,
      format: '',
      indent: 0,
      type: 'root',
      version: 1,
    },
  };

  return JSON.stringify(payload);
};

const collectText = (node: LexicalNode | null | undefined, bag: string[]) => {
  if (!node) {
    return;
  }

  if (node.type === 'text' && typeof node.text === 'string') {
    bag.push(node.text);
  }

  if (Array.isArray(node.children)) {
    node.children.forEach(child => collectText(child, bag));
  }
};

export const extractPlainTextFromLexical = (
  rawContent: string | object | null | undefined,
): string => {
  if (!rawContent) {
    return '';
  }

  try {
    const parsed =
      typeof rawContent === 'string'
        ? (JSON.parse(rawContent) as {root?: LexicalNode})
        : (rawContent as {root?: LexicalNode});

    const parts: string[] = [];
    collectText(parsed.root, parts);
    return parts.join(' ').replace(/\s+/g, ' ').trim();
  } catch {
    return typeof rawContent === 'string' ? rawContent : '';
  }
};
