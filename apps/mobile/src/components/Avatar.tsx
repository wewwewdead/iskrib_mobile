import React from 'react';
import {Platform, StyleSheet, Text, View} from 'react-native';
import {useTheme} from '../theme/ThemeProvider';
import {fonts} from '../theme/typography';
import {NetworkImage} from './NetworkImage';

type BadgeType = 'legend' | 'og' | null | undefined;

interface AvatarProps {
  uri?: string | null;
  name?: string;
  size?: number;
  badge?: BadgeType;
}

function getInitials(name?: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? '?';
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Avatar({uri, name, size = 40, badge}: AvatarProps) {
  const {colors} = useTheme();

  const ringSize = size + 8;
  const hasRing = badge === 'legend' || badge === 'og';
  const ringColor =
    badge === 'legend'
      ? colors.badgeLegendBorder
      : badge === 'og'
        ? colors.badgeOGBorder
        : 'transparent';
  const glowColor =
    badge === 'legend'
      ? colors.badgeLegendGlow
      : badge === 'og'
        ? colors.badgeOGGlow
        : 'transparent';

  const content = uri ? (
    <NetworkImage
      uri={uri}
      accessibilityLabel={`${name ?? 'User'} avatar`}
      style={[
        styles.image,
        {width: size, height: size, borderRadius: size / 2},
      ]}
      resizeMode="cover"
    />
  ) : (
    <View
      style={[
        styles.placeholder,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors.bgSecondary,
        },
      ]}>
      <Text
        style={[
          styles.initials,
          {color: colors.textMuted, fontSize: size * 0.38},
        ]}>
        {getInitials(name)}
      </Text>
    </View>
  );

  if (hasRing) {
    return (
      <View
        style={[
          styles.ring,
          {
            width: ringSize,
            height: ringSize,
            borderRadius: ringSize / 2,
            borderColor: ringColor,
            backgroundColor: glowColor,
            ...(Platform.OS === 'ios'
              ? {
                  shadowColor: ringColor,
                  shadowOffset: {width: 0, height: 0},
                  shadowOpacity: 0.6,
                  shadowRadius: 8,
                }
              : {
                  elevation: 8,
                  shadowColor: ringColor,
                }),
          },
        ]}>
        {content}
      </View>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  image: {
    resizeMode: 'cover',
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontFamily: fonts.ui.semiBold,
  },
  ring: {
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
