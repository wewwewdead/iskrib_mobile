import React, {useEffect, useState} from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import {Haptics} from '../lib/haptics';
import {SpringPresets, useSpringPress} from '../lib/springs';
import {useTheme} from '../theme/ThemeProvider';
import {fonts} from '../theme/typography';
import {spacing, radii, shadows} from '../theme/spacing';

interface LinkInsertModalProps {
  visible: boolean;
  onDismiss: () => void;
  onInsert: (title: string, url: string) => void;
}

interface ModalButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  backgroundColor: string;
  textColor: string;
  borderColor?: string;
}

function ModalButton({
  label,
  onPress,
  disabled = false,
  backgroundColor,
  textColor,
  borderColor = 'transparent',
}: ModalButtonProps) {
  const {animatedStyle, onPressIn, onPressOut} = useSpringPress(disabled ? 1 : 0.97);

  return (
    <Animated.View style={[styles.buttonWrapper, animatedStyle]}>
      <Pressable
        disabled={disabled}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={({pressed}) => [
          styles.btn,
          {
            backgroundColor,
            borderColor,
            opacity: disabled ? 0.45 : pressed ? 0.92 : 1,
          },
        ]}>
        <Text style={[styles.btnText, {color: textColor}]}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

export function LinkInsertModal({visible, onDismiss, onInsert}: LinkInsertModalProps) {
  const {colors} = useTheme();
  const reduceMotion = useReducedMotion();
  const [url, setUrl] = useState('');
  const [displayText, setDisplayText] = useState('');
  const [urlFocused, setUrlFocused] = useState(false);
  const [displayFocused, setDisplayFocused] = useState(false);
  const reveal = useSharedValue(visible ? 1 : 0);

  useEffect(() => {
    if (reduceMotion) {
      reveal.value = visible ? 1 : 0;
      return;
    }

    if (visible) {
      reveal.value = 0;
      reveal.value = withSpring(1, SpringPresets.gentle);
    } else {
      reveal.value = withTiming(0, {duration: 150});
    }
  }, [reduceMotion, reveal, visible]);

  const handleInsert = () => {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) {
      Haptics.error();
      return;
    }

    const finalUrl = /^https?:\/\//i.test(trimmedUrl) ? trimmedUrl : `https://${trimmedUrl}`;
    Haptics.success();
    onInsert(displayText.trim() || finalUrl, finalUrl);
    setUrl('');
    setDisplayText('');
    setUrlFocused(false);
    setDisplayFocused(false);
    onDismiss();
  };

  const handleCancel = () => {
    Haptics.tap();
    setUrl('');
    setDisplayText('');
    setUrlFocused(false);
    setDisplayFocused(false);
    onDismiss();
  };

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: reduceMotion ? 1 : reveal.value,
  }));

  const cardStyle = useAnimatedStyle(() => ({
    opacity: reveal.value,
    transform: [
      {translateY: (1 - reveal.value) * 24},
      {scale: 0.96 + reveal.value * 0.04},
    ],
  }));

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleCancel}>
      <Animated.View
        style={[
          styles.overlay,
          {backgroundColor: colors.bgBackdrop},
          overlayStyle,
        ]}>
        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: colors.bgElevated,
              borderColor: colors.borderCard,
            },
            shadows(colors).modal,
            cardStyle,
          ]}>
          <Text style={[styles.eyebrow, {color: colors.accentAmber}]}>Add Link</Text>
          <Text style={[styles.title, {color: colors.textHeading}]}>Attach a polished reference</Text>
          <Text style={[styles.caption, {color: colors.textSecondary}]}>
            Keep the flow intact. Add the link, choose display text if you want, and drop it straight into the draft.
          </Text>

          <Text style={[styles.label, {color: colors.textSecondary}]}>URL</Text>
          <TextInput
            style={[
              styles.input,
              {
                borderColor: urlFocused ? colors.accentAmber : colors.borderLight,
                backgroundColor: colors.bgSecondary,
                color: colors.textPrimary,
              },
            ]}
            placeholder="https://"
            placeholderTextColor={colors.textMuted}
            value={url}
            onChangeText={setUrl}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            autoFocus
            onFocus={() => setUrlFocused(true)}
            onBlur={() => setUrlFocused(false)}
          />

          <Text style={[styles.label, {color: colors.textSecondary}]}>Display Text</Text>
          <TextInput
            style={[
              styles.input,
              {
                borderColor: displayFocused ? colors.accentAmber : colors.borderLight,
                backgroundColor: colors.bgSecondary,
                color: colors.textPrimary,
              },
            ]}
            placeholder="Link text"
            placeholderTextColor={colors.textMuted}
            value={displayText}
            onChangeText={setDisplayText}
            onFocus={() => setDisplayFocused(true)}
            onBlur={() => setDisplayFocused(false)}
          />

          <View style={styles.buttonRow}>
            <ModalButton
              label="Cancel"
              onPress={handleCancel}
              backgroundColor={colors.bgSecondary}
              textColor={colors.textSecondary}
              borderColor={colors.borderLight}
            />
            <ModalButton
              label="Insert"
              onPress={handleInsert}
              disabled={!url.trim()}
              backgroundColor={colors.accentAmber}
              textColor={colors.textOnAccent}
            />
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: radii.hero,
    borderWidth: 1,
    padding: spacing.xl,
  },
  eyebrow: {
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    fontFamily: fonts.ui.semiBold,
    marginBottom: spacing.xs,
  },
  title: {
    fontSize: 22,
    lineHeight: 28,
    fontFamily: fonts.heading.bold,
  },
  caption: {
    fontSize: 14,
    lineHeight: 21,
    fontFamily: fonts.ui.regular,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    fontFamily: fonts.ui.semiBold,
    marginBottom: spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 15,
    fontFamily: fonts.ui.regular,
    marginBottom: spacing.md,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  buttonWrapper: {
    flex: 1,
  },
  btn: {
    minHeight: 48,
    borderRadius: radii.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    fontSize: 15,
    lineHeight: 20,
    fontFamily: fonts.ui.semiBold,
  },
});
