import React, {useCallback, useEffect, useState} from 'react';
import {Keyboard, Pressable, ScrollView, StyleSheet, View} from 'react-native';
import {actions, RichEditor} from 'react-native-pell-rich-editor';
import Animated from 'react-native-reanimated';
import {Haptics} from '../lib/haptics';
import {useSpringPress} from '../lib/springs';
import {useTheme} from '../theme/ThemeProvider';
import {radii, shadows, spacing} from '../theme/spacing';
import {
  UndoIcon,
  RedoIcon,
  BoldIcon,
  ItalicIcon,
  UnderlineIcon,
  StrikethroughIcon,
  Heading1Icon,
  Heading2Icon,
  Heading3Icon,
  QuoteIcon,
  BulletListIcon,
  NumberedListIcon,
  HorizontalRuleIcon,
  LinkIcon,
  AlignLeftIcon,
  AlignCenterIcon,
  AlignRightIcon,
  ImageUploadIcon,
  KeyboardHideIcon,
} from './icons/EditorIcons';

interface EditorToolbarProps {
  editorRef: React.RefObject<RichEditor | null>;
  onPressImage: () => void;
  onPressLink: () => void;
  docked?: boolean;
  visible?: boolean;
}

interface ToolbarButtonProps {
  icon: React.ReactNode;
  active?: boolean;
  onPress: () => void;
  activeBgColor: string;
  inactiveBgColor: string;
  activeBorderColor: string;
}

function ToolbarButton({
  icon,
  active = false,
  onPress,
  activeBgColor,
  inactiveBgColor,
  activeBorderColor,
}: ToolbarButtonProps) {
  const {animatedStyle, onPressIn, onPressOut} = useSpringPress(active ? 0.95 : 0.97);

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={() => {
          Haptics.selection();
          onPress();
        }}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={({pressed}) => [
          styles.btn,
          {
            backgroundColor: active ? activeBgColor : pressed ? inactiveBgColor : 'transparent',
            borderColor: active ? activeBorderColor : 'transparent',
          },
        ]}>
        {icon}
      </Pressable>
    </Animated.View>
  );
}

function Divider({color}: {color: string}) {
  return <View style={[styles.divider, {backgroundColor: color}]} />;
}

export function EditorToolbar({
  editorRef,
  onPressImage,
  onPressLink,
  docked,
  visible = true,
}: EditorToolbarProps) {
  const {colors} = useTheme();
  const [activeItems, setActiveItems] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const register = () => {
      const editor = editorRef.current;
      if (!editor) return false;

      editor.registerToolbar((items: (string | {type: string; value: string})[]) => {
        if (cancelled) return;
        const names = items.map(item => typeof item === 'string' ? item : item.type);
        setActiveItems(names);
      });
      return true;
    };

    if (!register()) {
      intervalId = setInterval(() => {
        if (register() && intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
      }, 250);
    }

    return () => {
      cancelled = true;
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [editorRef]);

  const isActive = useCallback(
    (action: string) => activeItems.includes(action),
    [activeItems],
  );

  const handleAction = useCallback(
    (action: string) => {
      editorRef.current?.sendAction(action, 'result');
    },
    [editorRef],
  );

  const handleInsertHR = useCallback(() => {
    editorRef.current?.insertHTML('<hr/>');
  }, [editorRef]);

  const activeColor = colors.accentAmber;
  const inactiveColor = colors.textMuted;
  const activeBgColor = colors.bgSelection;
  const inactiveBgColor = colors.bgSecondary;
  const iconSize = 18;

  if (!visible) {
    return null;
  }

  return (
    <View
      collapsable={false}
      style={[styles.animatedShell, docked && styles.animatedShellDocked]}>
      <View
        style={[
          styles.container,
          {
            borderColor: colors.borderLight,
            backgroundColor: colors.bgCard,
          },
          shadows(colors).cardSm,
          docked && styles.containerDocked,
        ]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="always"
          contentContainerStyle={styles.scrollContent}>
          <ToolbarButton
            icon={<UndoIcon size={iconSize} color={inactiveColor} />}
            onPress={() => handleAction(actions.undo)}
            activeBgColor={activeBgColor}
            inactiveBgColor={inactiveBgColor}
            activeBorderColor={colors.accentAmber}
          />
          <ToolbarButton
            icon={<RedoIcon size={iconSize} color={inactiveColor} />}
            onPress={() => handleAction(actions.redo)}
            activeBgColor={activeBgColor}
            inactiveBgColor={inactiveBgColor}
            activeBorderColor={colors.accentAmber}
          />

          <Divider color={colors.borderLight} />

          <ToolbarButton
            icon={<ImageUploadIcon size={iconSize} color={inactiveColor} />}
            onPress={onPressImage}
            activeBgColor={activeBgColor}
            inactiveBgColor={inactiveBgColor}
            activeBorderColor={colors.accentAmber}
          />

          <Divider color={colors.borderLight} />

          <ToolbarButton
            active={isActive(actions.setBold)}
            icon={<BoldIcon size={iconSize} color={isActive(actions.setBold) ? activeColor : inactiveColor} />}
            onPress={() => handleAction(actions.setBold)}
            activeBgColor={activeBgColor}
            inactiveBgColor={inactiveBgColor}
            activeBorderColor={colors.accentAmber}
          />
          <ToolbarButton
            active={isActive(actions.setItalic)}
            icon={<ItalicIcon size={iconSize} color={isActive(actions.setItalic) ? activeColor : inactiveColor} />}
            onPress={() => handleAction(actions.setItalic)}
            activeBgColor={activeBgColor}
            inactiveBgColor={inactiveBgColor}
            activeBorderColor={colors.accentAmber}
          />
          <ToolbarButton
            active={isActive(actions.setUnderline)}
            icon={<UnderlineIcon size={iconSize} color={isActive(actions.setUnderline) ? activeColor : inactiveColor} />}
            onPress={() => handleAction(actions.setUnderline)}
            activeBgColor={activeBgColor}
            inactiveBgColor={inactiveBgColor}
            activeBorderColor={colors.accentAmber}
          />
          <ToolbarButton
            active={isActive(actions.setStrikethrough)}
            icon={<StrikethroughIcon size={iconSize} color={isActive(actions.setStrikethrough) ? activeColor : inactiveColor} />}
            onPress={() => handleAction(actions.setStrikethrough)}
            activeBgColor={activeBgColor}
            inactiveBgColor={inactiveBgColor}
            activeBorderColor={colors.accentAmber}
          />

          <Divider color={colors.borderLight} />

          <ToolbarButton
            active={isActive(actions.heading1)}
            icon={<Heading1Icon size={iconSize} color={isActive(actions.heading1) ? activeColor : inactiveColor} />}
            onPress={() => handleAction(actions.heading1)}
            activeBgColor={activeBgColor}
            inactiveBgColor={inactiveBgColor}
            activeBorderColor={colors.accentAmber}
          />
          <ToolbarButton
            active={isActive(actions.heading2)}
            icon={<Heading2Icon size={iconSize} color={isActive(actions.heading2) ? activeColor : inactiveColor} />}
            onPress={() => handleAction(actions.heading2)}
            activeBgColor={activeBgColor}
            inactiveBgColor={inactiveBgColor}
            activeBorderColor={colors.accentAmber}
          />
          <ToolbarButton
            active={isActive(actions.heading3)}
            icon={<Heading3Icon size={iconSize} color={isActive(actions.heading3) ? activeColor : inactiveColor} />}
            onPress={() => handleAction(actions.heading3)}
            activeBgColor={activeBgColor}
            inactiveBgColor={inactiveBgColor}
            activeBorderColor={colors.accentAmber}
          />
          <ToolbarButton
            active={isActive(actions.blockquote)}
            icon={<QuoteIcon size={iconSize} color={isActive(actions.blockquote) ? activeColor : inactiveColor} />}
            onPress={() => handleAction(actions.blockquote)}
            activeBgColor={activeBgColor}
            inactiveBgColor={inactiveBgColor}
            activeBorderColor={colors.accentAmber}
          />

          <Divider color={colors.borderLight} />

          <ToolbarButton
            active={isActive(actions.insertBulletsList)}
            icon={<BulletListIcon size={iconSize} color={isActive(actions.insertBulletsList) ? activeColor : inactiveColor} />}
            onPress={() => handleAction(actions.insertBulletsList)}
            activeBgColor={activeBgColor}
            inactiveBgColor={inactiveBgColor}
            activeBorderColor={colors.accentAmber}
          />
          <ToolbarButton
            active={isActive(actions.insertOrderedList)}
            icon={<NumberedListIcon size={iconSize} color={isActive(actions.insertOrderedList) ? activeColor : inactiveColor} />}
            onPress={() => handleAction(actions.insertOrderedList)}
            activeBgColor={activeBgColor}
            inactiveBgColor={inactiveBgColor}
            activeBorderColor={colors.accentAmber}
          />

          <Divider color={colors.borderLight} />

          <ToolbarButton
            icon={<HorizontalRuleIcon size={iconSize} color={inactiveColor} />}
            onPress={handleInsertHR}
            activeBgColor={activeBgColor}
            inactiveBgColor={inactiveBgColor}
            activeBorderColor={colors.accentAmber}
          />
          <ToolbarButton
            icon={<LinkIcon size={iconSize} color={inactiveColor} />}
            onPress={onPressLink}
            activeBgColor={activeBgColor}
            inactiveBgColor={inactiveBgColor}
            activeBorderColor={colors.accentAmber}
          />

          <Divider color={colors.borderLight} />

          <ToolbarButton
            active={isActive(actions.alignLeft)}
            icon={<AlignLeftIcon size={iconSize} color={isActive(actions.alignLeft) ? activeColor : inactiveColor} />}
            onPress={() => handleAction(actions.alignLeft)}
            activeBgColor={activeBgColor}
            inactiveBgColor={inactiveBgColor}
            activeBorderColor={colors.accentAmber}
          />
          <ToolbarButton
            active={isActive(actions.alignCenter)}
            icon={<AlignCenterIcon size={iconSize} color={isActive(actions.alignCenter) ? activeColor : inactiveColor} />}
            onPress={() => handleAction(actions.alignCenter)}
            activeBgColor={activeBgColor}
            inactiveBgColor={inactiveBgColor}
            activeBorderColor={colors.accentAmber}
          />
          <ToolbarButton
            active={isActive(actions.alignRight)}
            icon={<AlignRightIcon size={iconSize} color={isActive(actions.alignRight) ? activeColor : inactiveColor} />}
            onPress={() => handleAction(actions.alignRight)}
            activeBgColor={activeBgColor}
            inactiveBgColor={inactiveBgColor}
            activeBorderColor={colors.accentAmber}
          />

          <Divider color={colors.borderLight} />

          <ToolbarButton
            icon={<KeyboardHideIcon size={iconSize} color={inactiveColor} />}
            onPress={() => {
              editorRef.current?.blurContentEditor();
              Keyboard.dismiss();
            }}
            activeBgColor={activeBgColor}
            inactiveBgColor={inactiveBgColor}
            activeBorderColor={colors.accentAmber}
          />
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  animatedShell: {},
  animatedShellDocked: {
    marginTop: 0,
  },
  container: {
    borderWidth: 1,
    borderRadius: radii.hero,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  containerDocked: {
    borderRadius: 0,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    marginHorizontal: 0,
    marginBottom: 0,
  },
  scrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
  },
  btn: {
    minWidth: 40,
    minHeight: 40,
    borderRadius: radii.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 1,
  },
  divider: {
    width: 1,
    height: 24,
    marginHorizontal: spacing.xs,
  },
});
