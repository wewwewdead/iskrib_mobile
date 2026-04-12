import {htmlToLexicalJson, lexicalToHtml} from '../src/lib/content/htmlToLexical';

describe('journal image content conversion', () => {
  it('preserves explicit image dimensions through HTML to Lexical to HTML', () => {
    const inputHtml = '<p>Intro</p><img src="https://cdn.example.com/journal.jpg" alt="" width="1600" height="900" data-explicit-dimensions="true" style="width: 100%; max-width: 100%; height: auto; border-radius: 8px; margin: 8px 0; display: block;" /><br/>';

    const lexical = JSON.parse(htmlToLexicalJson(inputHtml));
    const imageNode = lexical.root.children.find((node: any) => node.type === 'image');

    expect(imageNode).toMatchObject({
      type: 'image',
      src: 'https://cdn.example.com/journal.jpg',
      width: 1600,
      height: 900,
      explicitDimensions: true,
    });

    const outputHtml = lexicalToHtml(lexical);
    expect(outputHtml).toContain('width="1600"');
    expect(outputHtml).toContain('height="900"');
    expect(outputHtml).toContain('data-explicit-dimensions="true"');
  });

  it('does not invent explicit dimensions for legacy image nodes', () => {
    const legacyContent = {
      root: {
        type: 'root',
        children: [
          {
            type: 'image',
            src: 'https://cdn.example.com/legacy.jpg',
            altText: '',
            width: 500,
            height: 500,
            rotation: 90,
            version: 1,
          },
        ],
        direction: null,
        format: '',
        indent: 0,
        version: 1,
      },
    };

    const outputHtml = lexicalToHtml(legacyContent);

    expect(outputHtml).not.toContain('data-explicit-dimensions="true"');
    expect(outputHtml).not.toContain('width="500"');
    expect(outputHtml).not.toContain('height="500"');
    expect(outputHtml).toContain('data-rotation="90"');
  });
});
