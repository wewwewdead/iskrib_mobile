import React, {useCallback, useState} from 'react';
import {
  Image,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useTheme} from '../../theme/ThemeProvider';
import {fonts, typeScale} from '../../theme/typography';
import {spacing, radii} from '../../theme/spacing';
import {ImageIcon} from '../../components/icons';
import type {Palette} from '../../theme/tokens';

// Lexical format flags
const FORMAT_BOLD = 1;
const FORMAT_ITALIC = 2;
const FORMAT_UNDERLINE = 8;
const FORMAT_STRIKETHROUGH = 4;

interface LexicalNode {
  type?: string;
  tag?: string;
  text?: string;
  format?: number;
  children?: LexicalNode[];
  src?: string;
  altText?: string;
  width?: number;
  height?: number;
  explicitDimensions?: boolean;
  rotation?: number;
  url?: string;
  direction?: string | null;
  mentionName?: string;
  mentionUserId?: string;
  mentionUsername?: string;
}

export interface ParagraphPressInfo {
  paragraphIndex: number;
  fingerprint: string;
}

interface LexicalRendererProps {
  content: string | object | null | undefined;
  maxImages?: number;
  onImagePress?: (uri: string) => void;
  onParagraphPress?: (info: ParagraphPressInfo) => void;
  paragraphCommentCounts?: Record<number, number>;
}

function parseContent(raw: string | object | null | undefined): LexicalNode | null {
  if (!raw) return null;
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return parsed?.root ?? parsed;
  } catch {
    return null;
  }
}

function TextSpan({node, colors, readingFont}: {node: LexicalNode; colors: Palette; readingFont: {fontSize: number; lineHeight: number}}) {
  if (node.type === 'linebreak') {
    return <Text>{'\n'}</Text>;
  }

  if (node.type !== 'text' || !node.text) return null;

  const fmt = node.format ?? 0;
  const style: any = {
    color: colors.textPrimary,
    fontFamily: fonts.serif.regular,
    fontSize: readingFont.fontSize,
    lineHeight: readingFont.lineHeight,
  };

  if (fmt & FORMAT_BOLD) {
    style.fontFamily = fonts.serif.bold;
    style.fontWeight = '700';
  }
  if (fmt & FORMAT_ITALIC) {
    style.fontFamily = fonts.serif.italic;
    style.fontStyle = 'italic';
  }
  if (fmt & FORMAT_UNDERLINE) {
    style.textDecorationLine = 'underline';
  }
  if (fmt & FORMAT_STRIKETHROUGH) {
    style.textDecorationLine = style.textDecorationLine
      ? 'underline line-through'
      : 'line-through';
  }

  return <Text style={style}>{node.text}</Text>;
}

function collectPlainText(node: LexicalNode): string {
  if (node.type === 'text' && node.text) return node.text;
  if (node.type === 'linebreak') return '\n';
  if (!node.children) return '';
  return node.children.map(collectPlainText).join('');
}

const MIN_ASPECT_RATIO = 0.3;
const MAX_ASPECT_RATIO = 3.0;

function getImageAspectRatio(node: LexicalNode): number | null {
  if (!node.explicitDimensions) return null;
  if (typeof node.width !== 'number' || typeof node.height !== 'number') return null;
  if (node.width <= 0 || node.height <= 0) return null;
  const raw = node.width / node.height;
  return Math.min(MAX_ASPECT_RATIO, Math.max(MIN_ASPECT_RATIO, raw));
}

function ContentImage({node, colors}: {node: LexicalNode; colors: Palette}) {
  const [errored, setErrored] = useState(false);
  const handleError = useCallback(() => setErrored(true), []);

  if (!node.src) return null;

  const aspectRatio = getImageAspectRatio(node);
  const containerStyle = aspectRatio
    ? [styles.imageWrapper, {aspectRatio, backgroundColor: colors.bgSecondary}]
    : [styles.imageWrapper, styles.imageLegacy, {backgroundColor: colors.bgSecondary}];

  if (errored) {
    return (
      <View style={containerStyle}>
        <View style={[StyleSheet.absoluteFill, styles.imagePlaceholder]}>
          <ImageIcon size={24} color={colors.iconDefault} />
        </View>
      </View>
    );
  }

  return (
    <View style={containerStyle}>
      <Image
        source={{uri: node.src}}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
        onError={handleError}
        accessibilityLabel={node.altText}
      />
    </View>
  );
}

type ReadingFont = {fontSize: number; lineHeight: number};

type RenderNodeProps = {
  node: LexicalNode;
  colors: Palette;
  readingFont: ReadingFont;
  onImagePress?: (uri: string) => void;
  paragraphIndex?: number;
  onParagraphPress?: (info: ParagraphPressInfo) => void;
  paragraphCommentCounts?: Record<number, number>;
};

function RenderNode({node, colors, readingFont, onImagePress, paragraphIndex, onParagraphPress, paragraphCommentCounts}: RenderNodeProps) {
  if (!node || !node.type) return null;

  switch (node.type) {
    case 'paragraph': {
      if (!node.children || node.children.length === 0) {
        return <View style={styles.paragraphGap} />;
      }

      const commentCount = (paragraphIndex != null && paragraphCommentCounts)
        ? (paragraphCommentCounts[paragraphIndex] ?? 0)
        : 0;

      // Split children into runs: consecutive inline nodes go in <Text>,
      // images get rendered as block-level elements between text runs.
      const hasBlockChild = node.children.some(c => c.type === 'image');

      const dynamicParagraph = {fontFamily: fonts.serif.regular, fontSize: readingFont.fontSize, lineHeight: readingFont.lineHeight};

      const paragraphContent = hasBlockChild ? (
        <View>
          {(() => {
            const elements: React.ReactNode[] = [];
            let inlineBuf: LexicalNode[] = [];

            const flushInline = () => {
              if (inlineBuf.length === 0) return;
              elements.push(
                <Text key={`t${elements.length}`} style={[dynamicParagraph, {color: colors.textPrimary}]}>
                  {inlineBuf.map((child, i) => (
                    <RenderInline key={i} node={child} colors={colors} readingFont={readingFont} onImagePress={onImagePress} />
                  ))}
                </Text>,
              );
              inlineBuf = [];
            };

            for (const child of node.children!) {
              if (child.type === 'image') {
                flushInline();
                const imgEl = <ContentImage node={child} colors={colors} />;
                elements.push(
                  onImagePress && child.src ? (
                    <Pressable key={`i${elements.length}`} onPress={() => onImagePress(child.src!)}>
                      {imgEl}
                    </Pressable>
                  ) : (
                    <View key={`i${elements.length}`}>{imgEl}</View>
                  ),
                );
              } else {
                inlineBuf.push(child);
              }
            }
            flushInline();
            return elements;
          })()}
          {commentCount > 0 && (
            <View style={[styles.commentBadge, {backgroundColor: colors.bgSelection}]}>
              <Text style={[styles.commentBadgeText, {color: colors.accentAmber}]}>
                {commentCount}
              </Text>
            </View>
          )}
        </View>
      ) : (
        <View style={styles.paragraphRow}>
          <Text style={[dynamicParagraph, {color: colors.textPrimary, flex: 1}]}>
            {node.children.map((child, i) => (
              <RenderInline key={i} node={child} colors={colors} readingFont={readingFont} onImagePress={onImagePress} />
            ))}
          </Text>
          {commentCount > 0 && (
            <View style={[styles.commentBadge, {backgroundColor: colors.bgSelection}]}>
              <Text style={[styles.commentBadgeText, {color: colors.accentAmber}]}>
                {commentCount}
              </Text>
            </View>
          )}
        </View>
      );

      if (onParagraphPress && paragraphIndex != null) {
        const fingerprint = collectPlainText(node).substring(0, 100);
        const idx = paragraphIndex;
        return (
          <Pressable onPress={() => onParagraphPress({paragraphIndex: idx, fingerprint})}>
            {paragraphContent}
          </Pressable>
        );
      }

      return paragraphContent;
    }

    case 'heading': {
      const headingStyle =
        node.tag === 'h1'
          ? styles.h1
          : node.tag === 'h2'
            ? styles.h2
            : styles.h3;
      return (
        <Text style={[headingStyle, {color: colors.textHeading}]}>
          {node.children?.map((child, i) => (
            <RenderInline key={i} node={child} colors={colors} readingFont={readingFont} />
          ))}
        </Text>
      );
    }

    case 'quote': {
      return (
        <View
          style={[
            styles.blockquote,
            {borderLeftColor: colors.accentAmber},
          ]}>
          <Text style={[{fontFamily: fonts.serif.italic, fontSize: readingFont.fontSize, lineHeight: readingFont.lineHeight, fontStyle: 'italic' as const}, {color: colors.textSecondary}]}>
            {node.children?.map((child, i) => (
              <RenderInline key={i} node={child} colors={colors} readingFont={readingFont} />
            ))}
          </Text>
        </View>
      );
    }

    case 'image': {
      if (!node.src) return null;
      const imageEl = <ContentImage node={node} colors={colors} />;
      if (onImagePress) {
        const src = node.src;
        return <Pressable onPress={() => onImagePress(src)}>{imageEl}</Pressable>;
      }
      return imageEl;
    }

    case 'link': {
      return (
        <Pressable
          onPress={() => node.url && Linking.openURL(node.url)}>
          <Text style={[styles.link, {color: colors.accentAmber}]}>
            {node.children?.map((child, i) => (
              <RenderInline key={i} node={child} colors={colors} readingFont={readingFont} />
            ))}
          </Text>
        </Pressable>
      );
    }

    case 'list': {
      return (
        <View style={styles.list}>
          {node.children?.map((child, i) => (
            <RenderNode key={i} node={child} colors={colors} readingFont={readingFont} onImagePress={onImagePress} onParagraphPress={onParagraphPress} paragraphCommentCounts={paragraphCommentCounts} />
          ))}
        </View>
      );
    }

    case 'listitem': {
      return (
        <View style={styles.listItem}>
          <Text style={[{fontSize: readingFont.fontSize, lineHeight: readingFont.lineHeight}, {color: colors.textMuted}]}>
            {'\u2022'}
          </Text>
          <Text style={[{fontFamily: fonts.serif.regular, fontSize: readingFont.fontSize, lineHeight: readingFont.lineHeight}, {color: colors.textPrimary, flex: 1}]}>
            {node.children?.map((child, i) => (
              <RenderInline key={i} node={child} colors={colors} readingFont={readingFont} />
            ))}
          </Text>
        </View>
      );
    }

    default: {
      // Recurse into unknown container nodes
      if (node.children) {
        return (
          <View>
            {node.children.map((child, i) => (
              <RenderNode key={i} node={child} colors={colors} readingFont={readingFont} onImagePress={onImagePress} onParagraphPress={onParagraphPress} paragraphCommentCounts={paragraphCommentCounts} />
            ))}
          </View>
        );
      }
      return null;
    }
  }
}

function MentionInline({node, colors}: {node: LexicalNode; colors: Palette}) {
  const navigation = useNavigation<any>();

  const handlePress = () => {
    if (node.mentionUserId) {
      navigation.navigate('VisitProfile', {userId: node.mentionUserId});
    }
  };

  return (
    <Text
      style={{color: colors.accentAmber, fontFamily: fonts.ui.semiBold}}
      onPress={handlePress}>
      @{node.mentionName || node.mentionUsername}
    </Text>
  );
}

function RenderInline({node, colors, readingFont, onImagePress}: {node: LexicalNode; colors: Palette; readingFont: ReadingFont; onImagePress?: (uri: string) => void}) {
  if (!node) return null;
  if (node.type === 'text' || node.type === 'linebreak') {
    return <TextSpan node={node} colors={colors} readingFont={readingFont} />;
  }
  if (node.type === 'image' && node.src) {
    const imgEl = <ContentImage node={node} colors={colors} />;
    if (onImagePress) {
      const src = node.src;
      return <Pressable onPress={() => onImagePress(src)}>{imgEl}</Pressable>;
    }
    return imgEl;
  }
  if (node.type === 'mention') {
    return <MentionInline node={node} colors={colors} />;
  }
  if (node.type === 'link') {
    return (
      <Text
        style={{color: colors.accentAmber, textDecorationLine: 'underline'}}
        onPress={() => node.url && Linking.openURL(node.url)}>
        {node.children?.map((child, i) => (
          <RenderInline key={i} node={child} colors={colors} readingFont={readingFont} onImagePress={onImagePress} />
        ))}
      </Text>
    );
  }
  // Fallback: render children as inline
  if (node.children) {
    return (
      <>
        {node.children.map((child, i) => (
          <RenderInline key={i} node={child} colors={colors} readingFont={readingFont} onImagePress={onImagePress} />
        ))}
      </>
    );
  }
  return null;
}

function LexicalRendererComponent({content, onImagePress, onParagraphPress, paragraphCommentCounts}: LexicalRendererProps) {
  const {colors, readingFont} = useTheme();
  const root = React.useMemo(() => parseContent(content), [content]);

  if (!root || !root.children || root.children.length === 0) {
    return (
      <Text style={[styles.paragraph, {color: colors.textMuted}]}>
        No content available.
      </Text>
    );
  }

  // Track paragraph index — only non-empty paragraph nodes get an index
  // (matches web's collectParagraphAnchors logic)
  let paragraphCounter = 0;

  return (
    <View style={styles.container}>
      {root.children.map((node, i) => {
        const isParagraph = node.type === 'paragraph';
        const isNonEmpty = isParagraph && node.children && node.children.length > 0;
        const currentIndex = isNonEmpty ? paragraphCounter : undefined;
        if (isNonEmpty) {
          paragraphCounter++;
        }
        return (
          <RenderNode
            key={i}
            node={node}
            colors={colors}
            readingFont={readingFont}
            onImagePress={onImagePress}
            paragraphIndex={currentIndex}
            onParagraphPress={onParagraphPress}
            paragraphCommentCounts={paragraphCommentCounts}
          />
        );
      })}
    </View>
  );
}

export const LexicalRenderer = React.memo(LexicalRendererComponent);

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  paragraph: {
    ...typeScale.body,
  },
  paragraphGap: {
    height: spacing.md,
  },
  h1: {
    ...typeScale.h1,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  h2: {
    ...typeScale.h2,
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
  },
  h3: {
    ...typeScale.h3,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  blockquote: {
    borderLeftWidth: 3,
    paddingLeft: spacing.lg,
    paddingVertical: spacing.sm,
    marginVertical: spacing.sm,
  },
  quoteText: {
    fontFamily: fonts.serif.italic,
    fontSize: 16,
    lineHeight: 26,
    fontStyle: 'italic',
  },
  imageWrapper: {
    width: '100%',
    marginVertical: spacing.md,
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
  imageLegacy: {
    height: 240,
  },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  link: {
    textDecorationLine: 'underline',
  },
  list: {
    marginVertical: spacing.sm,
    gap: spacing.xs,
  },
  listItem: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingLeft: spacing.sm,
  },
  listBullet: {
    fontSize: 16,
    lineHeight: 26,
  },
  paragraphRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  commentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: radii.pill,
    marginLeft: spacing.xs,
    marginTop: 2,
    gap: 2,
  },
  commentBadgeText: {
    fontSize: 11,
    fontFamily: fonts.ui.semiBold,
  },
});
