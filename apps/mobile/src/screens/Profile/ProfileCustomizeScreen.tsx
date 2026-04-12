import React, {useState} from 'react';
import {Alert, Image, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {useMutation, useQuery} from '@tanstack/react-query';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {SafeAreaView} from 'react-native-safe-area-context';
import {launchImageLibrary} from 'react-native-image-picker';
import LinearGradient from 'react-native-linear-gradient';
import {Avatar} from '../../components/Avatar';
import {PrimaryButton} from '../../components/PrimaryButton';
import {CheckIcon} from '../../components/icons';
import {safeGradientProps, parseProfileBackground, cssAngleToGradientPoints} from '../../lib/utils/profileBackground';
import {useAuth} from '../../features/auth/AuthProvider';
import {useTheme} from '../../theme/ThemeProvider';
import {mobileApi} from '../../lib/api/mobileApi';
import {queryClient} from '../../lib/queryClient';
import {fonts} from '../../theme/typography';
import {spacing, radii} from '../../theme/spacing';
import type {RootStackParamList} from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'ProfileCustomize'>;

const COLOR_PALETTE = [
  '#FFFFFF', '#1A1612', '#C4943E', '#8A9E7A', '#A08060',
  '#7A8A9E', '#C47A6A', '#B87A4A',
];

type GradientPreset = {
  label: string;
  colors: string[];
  css: {background: string; backgroundImage: string};
};

const GRADIENT_PRESETS: GradientPreset[] = [
  {
    label: 'Manuscript',
    colors: ['#FAF9F6', '#FFFFFF'],
    css: {background: '#FAF9F6', backgroundImage: 'linear-gradient(90deg, rgba(250,249,246,1) 0%, rgba(255,255,255,1) 100%)'},
  },
  {
    label: 'Parchment',
    colors: ['#D4C4A8', '#FAF9F6'],
    css: {background: '#D4C4A8', backgroundImage: 'linear-gradient(90deg, rgba(212,196,168,1) 0%, rgba(250,249,246,1) 100%)'},
  },
  {
    label: 'Inkwell',
    colors: ['#2A2520', '#1A1612'],
    css: {background: '#2A2520', backgroundImage: 'linear-gradient(90deg, rgba(42,37,32,1) 0%, rgba(26,22,18,1) 100%)'},
  },
  {
    label: 'Golden Hour',
    colors: ['#C4943E', '#D4A853'],
    css: {background: '#C4943E', backgroundImage: 'linear-gradient(90deg, rgba(196,148,62,1) 0%, rgba(212,168,83,1) 100%)'},
  },
  {
    label: 'Garden',
    colors: ['#8A9E7A', '#E8EDE4'],
    css: {background: '#8A9E7A', backgroundImage: 'linear-gradient(90deg, rgba(138,158,122,1) 0%, rgba(232,237,228,1) 100%)'},
  },
];



export function ProfileCustomizeScreen({navigation}: Props) {
  const {session} = useAuth();
  const {colors, scaledType} = useTheme();
  const userId = session?.user.id ?? '';
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedGradient, setSelectedGradient] = useState<number | null>(null);

  const profileQuery = useQuery({
    queryKey: ['profile', userId],
    enabled: Boolean(userId),
    queryFn: () => mobileApi.getUserData(userId),
    staleTime: 5 * 60 * 1000,
  });
  const profile = profileQuery.data?.userData?.[0];

  const fontColorMutation = useMutation({
    mutationFn: () => {
      if (!selectedColor) throw new Error('Select a color');
      return mobileApi.updateFontColor(selectedColor);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['profile']});
      Alert.alert('Saved', 'Font color updated.');
    },
    onError: e => Alert.alert('Error', e instanceof Error ? e.message : 'Failed'),
  });

  const gradientMutation = useMutation({
    mutationFn: (preset: GradientPreset) =>
      mobileApi.updateUserData({
        name: profile?.name || 'User',
        bio: profile?.bio || ' ',
        profileBg: preset.css,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['profile']});
      Alert.alert('Saved', 'Background updated.');
    },
    onError: e => Alert.alert('Error', e instanceof Error ? e.message : 'Failed'),
  });

  const clearBgMutation = useMutation({
    mutationFn: () =>
      mobileApi.updateUserData({name: profile?.name || 'User', bio: profile?.bio || ' ', profileBg: {}}),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['profile']});
      Alert.alert('Saved', 'Background cleared.');
    },
    onError: e => Alert.alert('Error', e instanceof Error ? e.message : 'Failed'),
  });

  const backgroundMutation = useMutation({
    mutationFn: async () => {
      const result = await launchImageLibrary({mediaType: 'photo', quality: 0.8});
      if (result.didCancel || !result.assets?.[0]) throw new Error('Cancelled');
      const asset = result.assets[0];
      const formData = new FormData();
      formData.append('image', {
        uri: asset.uri,
        type: asset.type || 'image/jpeg',
        name: asset.fileName || 'background.jpg',
      } as any);
      const uploadResult = await mobileApi.uploadBackground(formData);
      const imageUrl = uploadResult.data;
      if (!imageUrl) throw new Error('Upload failed — no URL returned');
      await mobileApi.updateUserData({
        name: profile?.name || 'User',
        bio: profile?.bio || ' ',
        profileBg: {
          backgroundImage: `url(${imageUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        },
      });
    },
    onSuccess: () => {
      setSelectedGradient(null);
      queryClient.invalidateQueries({queryKey: ['profile']});
      Alert.alert('Saved', 'Background image uploaded.');
    },
    onError: e => {
      if (e instanceof Error && e.message === 'Cancelled') return;
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed');
    },
  });

  const handleGradientSelect = (index: number) => {
    setSelectedGradient(index);
    gradientMutation.mutate(GRADIENT_PRESETS[index]);
  };

  return (
    <SafeAreaView style={[styles.safe, {backgroundColor: colors.bgPrimary}]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[scaledType.h1, {color: colors.textHeading}]}>Customize Profile</Text>

        {/* Live preview card */}
        {(() => {
          const previewFontColor = selectedColor || profile?.profile_font_color || colors.textHeading;
          const previewFontMuted = selectedColor ? `${selectedColor}99` : (profile?.profile_font_color ? `${profile.profile_font_color}99` : colors.textMuted);

          // Determine background: new selection > saved background > solid fallback
          const newGradient = selectedGradient != null
            ? safeGradientProps(GRADIENT_PRESETS[selectedGradient].colors)
            : null;
          const savedBg = parseProfileBackground(profile?.background);
          const savedGradient = !newGradient && savedBg.type === 'gradient'
            ? safeGradientProps(savedBg.colors, savedBg.locations)
            : null;
          const savedImageUri = !newGradient && savedBg.type === 'image' ? savedBg.uri : null;

          return (
            <View style={[styles.previewCard, {borderColor: colors.borderCard}]}>
              {newGradient ? (
                <LinearGradient
                  colors={newGradient.colors}
                  start={{x: 0, y: 0.5}}
                  end={{x: 1, y: 0.5}}
                  style={StyleSheet.absoluteFill}
                />
              ) : savedGradient ? (
                <LinearGradient
                  colors={savedGradient.colors}
                  locations={savedGradient.locations}
                  {...cssAngleToGradientPoints(savedBg.type === 'gradient' ? savedBg.angle : 180)}
                  style={StyleSheet.absoluteFill}
                />
              ) : savedImageUri ? (
                <Image
                  source={{uri: savedImageUri}}
                  style={[StyleSheet.absoluteFill, {opacity: 0.6}]}
                  resizeMode="cover"
                />
              ) : (
                <View style={[StyleSheet.absoluteFill, {backgroundColor: colors.bgCard}]} />
              )}
              <View style={styles.previewContent}>
                <Avatar uri={profile?.image_url} name={profile?.name} size={52} />
                <Text style={[styles.previewName, {color: previewFontColor}]}>
                  {profile?.name || 'Your Name'}
                </Text>
                <Text style={[styles.previewBio, {color: previewFontMuted}]} numberOfLines={2}>
                  {profile?.bio || 'Your bio will appear here'}
                </Text>
              </View>
            </View>
          );
        })()}

        {/* Background Gradients */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, {color: colors.textHeading}]}>Background</Text>
          <Text style={[styles.sectionSubtitle, {color: colors.textMuted}]}>
            Choose a gradient or upload a custom image
          </Text>
          <View style={styles.gradientRow}>
            {GRADIENT_PRESETS.map((preset, i) => (
              <Pressable
                key={preset.label}
                style={[
                  styles.gradientSwatch,
                  selectedGradient === i && {borderColor: colors.accentAmber, borderWidth: 3},
                ]}
                onPress={() => handleGradientSelect(i)}>
                <LinearGradient
                  colors={preset.colors}
                  start={{x: 0, y: 0.5}}
                  end={{x: 1, y: 0.5}}
                  style={styles.gradientFill}
                />
                {selectedGradient === i && (
                  <View style={styles.gradientCheck}>
                    <CheckIcon size={14} color="#fff" />
                  </View>
                )}
              </Pressable>
            ))}
            {/* Clear option */}
            <Pressable
              style={[styles.gradientSwatch, {backgroundColor: colors.bgSecondary, borderColor: colors.borderCard, borderWidth: 1}]}
              onPress={() => clearBgMutation.mutate()}>
              <Text style={[styles.clearLabel, {color: colors.textMuted}]}>None</Text>
            </Pressable>
          </View>
          <PrimaryButton
            label="Upload Custom Image"
            onPress={() => backgroundMutation.mutate()}
            loading={backgroundMutation.isPending}
            kind="secondary"
          />
        </View>

        {/* Font Color */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, {color: colors.textHeading}]}>Font Color</Text>
          <Text style={[styles.sectionSubtitle, {color: colors.textMuted}]}>
            Choose a color from the curated palette
          </Text>
          <View style={styles.colorGrid}>
            {COLOR_PALETTE.map(color => (
              <Pressable
                key={color}
                style={[
                  styles.colorSwatch,
                  {backgroundColor: color},
                  selectedColor === color && styles.colorSwatchSelected,
                ]}
                onPress={() => setSelectedColor(color)}
              />
            ))}
          </View>

          <PrimaryButton
            label="Save Font Color"
            onPress={() => fontColorMutation.mutate()}
            loading={fontColorMutation.isPending}
            disabled={!selectedColor}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1},
  content: {padding: spacing.lg, gap: spacing.xxl, paddingBottom: 100},
  previewCard: {
    borderRadius: radii.xl,
    borderWidth: 1,
    overflow: 'hidden',
    minHeight: 140,
  },
  previewContent: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    gap: spacing.xs,
  },
  previewName: {
    fontFamily: fonts.heading.bold,
    fontSize: 18,
    marginTop: spacing.sm,
  },
  previewBio: {
    fontFamily: fonts.ui.regular,
    fontSize: 13,
    textAlign: 'center',
  },
  section: {gap: spacing.md},
  sectionTitle: {fontFamily: fonts.heading.semiBold, fontSize: 18},
  sectionSubtitle: {fontFamily: fonts.ui.regular, fontSize: 13},
  gradientRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  gradientSwatch: {
    width: 60,
    height: 60,
    borderRadius: radii.lg,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradientFill: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radii.lg,
  },
  gradientCheck: {
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearLabel: {fontFamily: fonts.ui.medium, fontSize: 11},
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  colorSwatch: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorSwatchSelected: {
    borderColor: '#C4943E',
    borderWidth: 3,
  },
});
