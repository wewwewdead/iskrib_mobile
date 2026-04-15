import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {SafeAreaView} from 'react-native-safe-area-context';
import {PrimaryButton} from '../../components/PrimaryButton';
import {ScreenEntrance} from '../../components/ScreenEntrance';
import {useAuth} from '../../features/auth/AuthProvider';
import {
  useTheme,
  FONT_SIZE_PRESETS,
  type FontSizeKey,
  type ThemeMode,
} from '../../theme/ThemeProvider';
import {fonts, typeScale} from '../../theme/typography';
import {spacing, radii} from '../../theme/spacing';
import {ChevronRightIcon} from '../../components/icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {supabase} from '../../lib/supabase';
import type {RootStackParamList} from '../../navigation/types';
import {
  CUSTOM_THEME_SWATCHES,
  darkPalette,
  universePalette,
  type CustomThemeField,
  type Palette,
  type ResolvedCustomThemeSelection,
} from '../../theme/tokens';

const ATMOSPHERE_KEY = '@iskrib:atmosphereEnabled';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

type SettingsThemeOption = {
  mode: Extract<ThemeMode, 'dark' | 'universe' | 'custom'>;
  label: string;
  description: string;
  palette: Palette;
};

function ThemePreviewStrip({palette}: {palette: Palette}) {
  const previewColors = [
    palette.bgPrimary,
    palette.bgCard,
    palette.textPrimary,
    palette.accentAmber,
  ];

  return (
    <View style={[styles.themePreviewStrip, {backgroundColor: palette.bgSecondary, borderColor: palette.borderCard}]}>
      {previewColors.map((color, index) => (
        <View
          key={`${color}-${index}`}
          style={[
            styles.themePreviewSwatch,
            {
              backgroundColor: color,
              borderColor: index === 2 ? palette.borderLight : 'transparent',
            },
          ]}
        />
      ))}
    </View>
  );
}

export function SettingsScreen({navigation}: Props) {
  const {user, signOut} = useAuth();
  const {
    colors,
    isDark,
    theme,
    setTheme,
    customTheme,
    customThemeColors,
    setCustomThemeField,
    fontSizeKey,
    setFontSize,
    scaledType,
  } = useTheme();

  const themeOptions = useMemo<SettingsThemeOption[]>(
    () => [
      {
        mode: 'dark',
        label: 'Dark Mode',
        description: 'Classic obsidian surfaces with warm gold accents.',
        palette: darkPalette,
      },
      {
        mode: 'universe',
        label: 'Universe Mode',
        description: 'Midnight indigo depth with a cosmic, premium glow.',
        palette: universePalette,
      },
      {
        mode: 'custom',
        label: 'Custom Mode',
        description: 'Curated dark swatches for a personalized atmosphere.',
        palette: customThemeColors,
      },
    ],
    [customThemeColors],
  );

  // Atmosphere toggle
  const [atmosphereEnabled, setAtmosphereEnabled] = useState(true);
  useEffect(() => {
    AsyncStorage.getItem(ATMOSPHERE_KEY).then(val => {
      if (val === 'false') setAtmosphereEnabled(false);
    });
  }, []);
  const handleAtmosphereToggle = useCallback(async (value: boolean) => {
    setAtmosphereEnabled(value);
    await AsyncStorage.setItem(ATMOSPHERE_KEY, String(value));
  }, []);

  // Email change state
  const [newEmail, setNewEmail] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailMsg, setEmailMsg] = useState<{type: 'error' | 'success'; text: string} | null>(null);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{type: 'error' | 'success'; text: string} | null>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const newPassRef = useRef<TextInput>(null);
  const confirmPassRef = useRef<TextInput>(null);

  const canSubmitPassword =
    currentPassword.length > 0 &&
    newPassword.length > 0 &&
    confirmPassword.length > 0 &&
    !passwordLoading;

  const canSubmitEmail = newEmail.trim().length > 0 && !emailLoading;

  const handleChangeEmail = async () => {
    setEmailMsg(null);

    if (!newEmail.includes('@')) {
      setEmailMsg({type: 'error', text: 'Please enter a valid email address.'});
      return;
    }
    if (newEmail.trim().toLowerCase() === user?.email?.toLowerCase()) {
      setEmailMsg({type: 'error', text: 'This is already your current email.'});
      return;
    }
    if (!supabase) {
      setEmailMsg({type: 'error', text: 'Unable to update email. Please try again.'});
      return;
    }

    try {
      setEmailLoading(true);
      const {error} = await supabase.auth.updateUser({email: newEmail.trim()});
      if (error) {
        setEmailMsg({type: 'error', text: error.message});
        return;
      }
      setEmailMsg({
        type: 'success',
        text: `Confirmation email sent to ${newEmail.trim()}. Please check your inbox.`,
      });
      setNewEmail('');
    } catch {
      setEmailMsg({type: 'error', text: 'Something went wrong. Please try again.'});
    } finally {
      setEmailLoading(false);
    }
  };

  const handleChangePassword = async () => {
    setPasswordMsg(null);

    if (newPassword.length < 6) {
      setPasswordMsg({type: 'error', text: 'New password must be at least 6 characters.'});
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({type: 'error', text: 'Passwords do not match.'});
      return;
    }
    if (!supabase || !user?.email) {
      setPasswordMsg({type: 'error', text: 'Unable to update password. Please try again.'});
      return;
    }

    try {
      setPasswordLoading(true);

      // Verify current password
      const {error: signInError} = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });
      if (signInError) {
        setPasswordMsg({type: 'error', text: 'Current password is incorrect.'});
        return;
      }

      // Update password
      const {error: updateError} = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (updateError) {
        setPasswordMsg({type: 'error', text: updateError.message});
        return;
      }

      setPasswordMsg({type: 'success', text: 'Password updated successfully.'});
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      setPasswordMsg({type: 'error', text: 'Something went wrong. Please try again.'});
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Sign out on this device only? Your account will stay signed in on web and other devices.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
            } catch (error) {
              Alert.alert(
                'Sign out failed',
                error instanceof Error ? error.message : 'Unknown error',
              );
            }
          },
        },
      ],
    );
  };

  const inputStyle = (field: string) => [
    styles.input,
    {
      backgroundColor: isDark ? colors.bgElevated : colors.bgPrimary,
      borderColor:
        focusedField === field ? colors.accentAmber : colors.borderCard,
      color: colors.textPrimary,
    },
    focusedField === field && [
      styles.inputFocused,
      {shadowColor: colors.accentAmber},
    ],
  ];

  function renderCustomThemeField<K extends CustomThemeField>(
    field: K,
    label: string,
    options: readonly {
      id: ResolvedCustomThemeSelection[K];
      label: string;
      swatch: string;
    }[],
  ) {
    return (
      <View key={field} style={styles.customThemeField}>
        <Text style={[styles.customThemeFieldLabel, {color: colors.textMuted}]}>
          {label}
        </Text>
        <View style={styles.customThemeSwatches}>
          {options.map(option => {
            const selected = customTheme[field] === option.id;

            return (
              <Pressable
                key={option.id}
                onPress={() => setCustomThemeField(field, option.id)}
                accessibilityRole="button"
                accessibilityState={{selected}}
                style={[
                  styles.customThemeChip,
                  {
                    borderColor: selected ? colors.accentAmber : colors.borderCard,
                    backgroundColor: selected ? colors.bgElevated : colors.bgSecondary,
                  },
                ]}>
                <View
                  style={[
                    styles.customThemeChipSwatch,
                    {
                      backgroundColor: option.swatch,
                      borderColor: selected ? colors.accentAmber : colors.borderLight,
                    },
                  ]}
                />
                <Text
                  style={[
                    styles.customThemeChipLabel,
                    {
                      color: selected ? colors.textPrimary : colors.textSecondary,
                    },
                  ]}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, {backgroundColor: colors.bgPrimary}]} edges={['top']}>
      <ScreenEntrance tier="feed">
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {/* Account section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, {color: colors.textMuted}]}>Account</Text>
            <View style={[styles.card, {backgroundColor: colors.bgCard, borderColor: colors.borderCard}]}>
              <View style={styles.row}>
                <Text style={[styles.rowLabel, {color: colors.textSecondary}]}>Email</Text>
                <Text style={[styles.rowValue, {color: colors.textPrimary}]}>
                  {user?.email || 'Not set'}
                </Text>
              </View>
            </View>
          </View>

          {/* Change email section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, {color: colors.textMuted}]}>
              Change Email
            </Text>
            <View style={[styles.card, {backgroundColor: colors.bgCard, borderColor: colors.borderCard}]}>
              <View style={styles.formInner}>
                <Text style={[styles.currentValue, {color: colors.textSecondary}]}>
                  Current email: <Text style={{fontFamily: fonts.ui.semiBold, color: colors.textPrimary}}>{user?.email}</Text>
                </Text>

                <View style={styles.fieldGroup}>
                  <Text style={[styles.fieldLabel, scaledType.label, {color: colors.textMuted}]}>
                    NEW EMAIL
                  </Text>
                  <TextInput
                    placeholder="you@example.com"
                    placeholderTextColor={colors.textFaint}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    autoComplete="email"
                    returnKeyType="go"
                    value={newEmail}
                    onChangeText={setNewEmail}
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField(null)}
                    onSubmitEditing={canSubmitEmail ? handleChangeEmail : undefined}
                    style={inputStyle('email')}
                  />
                </View>

                {emailMsg && (
                  <View
                    style={[
                      styles.msgBox,
                      {
                        backgroundColor:
                          emailMsg.type === 'error'
                            ? colors.danger + '14'
                            : colors.success + '14',
                      },
                    ]}>
                    <Text
                      style={[
                        styles.msgText,
                        {
                          color:
                            emailMsg.type === 'error'
                              ? colors.danger
                              : colors.success,
                        },
                      ]}>
                      {emailMsg.text}
                    </Text>
                  </View>
                )}

                <PrimaryButton
                  label="Send Confirmation Email"
                  onPress={handleChangeEmail}
                  loading={emailLoading}
                  disabled={!canSubmitEmail}
                />
              </View>
            </View>
          </View>

          {/* Change password section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, {color: colors.textMuted}]}>
              Change Password
            </Text>
            <View style={[styles.card, {backgroundColor: colors.bgCard, borderColor: colors.borderCard}]}>
              <View style={styles.formInner}>
                {/* Current password */}
                <View style={styles.fieldGroup}>
                  <Text style={[styles.fieldLabel, scaledType.label, {color: colors.textMuted}]}>
                    CURRENT PASSWORD
                  </Text>
                  <View style={styles.passwordField}>
                    <TextInput
                      placeholder="Enter current password"
                      placeholderTextColor={colors.textFaint}
                      secureTextEntry={!showCurrent}
                      autoComplete="password"
                      returnKeyType="next"
                      value={currentPassword}
                      onChangeText={setCurrentPassword}
                      onFocus={() => setFocusedField('current')}
                      onBlur={() => setFocusedField(null)}
                      onSubmitEditing={() => newPassRef.current?.focus()}
                      style={[inputStyle('current'), styles.passwordInput]}
                    />
                    <Pressable
                      style={styles.toggle}
                      hitSlop={8}
                      onPress={() => setShowCurrent(v => !v)}>
                      <Text style={[styles.toggleText, {color: colors.accentAmber}]}>
                        {showCurrent ? 'Hide' : 'Show'}
                      </Text>
                    </Pressable>
                  </View>
                </View>

                {/* New password */}
                <View style={styles.fieldGroup}>
                  <Text style={[styles.fieldLabel, scaledType.label, {color: colors.textMuted}]}>
                    NEW PASSWORD
                  </Text>
                  <View style={styles.passwordField}>
                    <TextInput
                      ref={newPassRef}
                      placeholder="At least 6 characters"
                      placeholderTextColor={colors.textFaint}
                      secureTextEntry={!showNew}
                      autoComplete="new-password"
                      returnKeyType="next"
                      value={newPassword}
                      onChangeText={setNewPassword}
                      onFocus={() => setFocusedField('new')}
                      onBlur={() => setFocusedField(null)}
                      onSubmitEditing={() => confirmPassRef.current?.focus()}
                      style={[inputStyle('new'), styles.passwordInput]}
                    />
                    <Pressable
                      style={styles.toggle}
                      hitSlop={8}
                      onPress={() => setShowNew(v => !v)}>
                      <Text style={[styles.toggleText, {color: colors.accentAmber}]}>
                        {showNew ? 'Hide' : 'Show'}
                      </Text>
                    </Pressable>
                  </View>
                </View>

                {/* Confirm password */}
                <View style={styles.fieldGroup}>
                  <Text style={[styles.fieldLabel, scaledType.label, {color: colors.textMuted}]}>
                    CONFIRM NEW PASSWORD
                  </Text>
                  <TextInput
                    ref={confirmPassRef}
                    placeholder="Re-enter new password"
                    placeholderTextColor={colors.textFaint}
                    secureTextEntry
                    returnKeyType="go"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    onFocus={() => setFocusedField('confirm')}
                    onBlur={() => setFocusedField(null)}
                    onSubmitEditing={canSubmitPassword ? handleChangePassword : undefined}
                    style={inputStyle('confirm')}
                  />
                </View>

                {/* Feedback message */}
                {passwordMsg && (
                  <View
                    style={[
                      styles.msgBox,
                      {
                        backgroundColor:
                          passwordMsg.type === 'error'
                            ? colors.danger + '14'
                            : colors.success + '14',
                      },
                    ]}>
                    <Text
                      style={[
                        styles.msgText,
                        {
                          color:
                            passwordMsg.type === 'error'
                              ? colors.danger
                              : colors.success,
                        },
                      ]}>
                      {passwordMsg.text}
                    </Text>
                  </View>
                )}

                <PrimaryButton
                  label="Update Password"
                  onPress={handleChangePassword}
                  loading={passwordLoading}
                  disabled={!canSubmitPassword}
                />
              </View>
            </View>
          </View>

          {/* Font size section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, {color: colors.textMuted}]}>Font Size</Text>
            <View style={[styles.card, {backgroundColor: colors.bgCard, borderColor: colors.borderCard}]}>
              <View style={styles.fontSizeInner}>
                <View style={styles.fontSizeOptions}>
                  {(Object.keys(FONT_SIZE_PRESETS) as FontSizeKey[]).map(key => {
                    const active = fontSizeKey === key;
                    const preset = FONT_SIZE_PRESETS[key];
                    return (
                      <Pressable
                        key={key}
                        onPress={() => setFontSize(key)}
                        style={[
                          styles.fontSizeChip,
                          {
                            borderColor: active ? colors.accentAmber : colors.borderCard,
                            backgroundColor: active ? colors.accentAmber + '18' : 'transparent',
                          },
                        ]}>
                        <Text
                          style={[
                            styles.fontSizeChipLabel,
                            {
                              color: active ? colors.accentAmber : colors.textSecondary,
                            },
                          ]}>
                          {preset.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                <Text
                  style={[
                    scaledType.body,
                    {color: colors.textPrimary, marginTop: spacing.sm},
                  ]}>
                  The quick brown fox jumps over the lazy dog.
                </Text>
              </View>
            </View>
          </View>

          {/* Writing preferences */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, {color: colors.textMuted}]}>
              Personalization
            </Text>
            <Pressable
              style={[styles.card, {backgroundColor: colors.bgCard, borderColor: colors.borderCard}]}
              onPress={() => navigation.navigate('WritingPreferences')}>
              <View style={styles.row}>
                <View style={{flex: 1}}>
                  <Text style={[styles.rowLabel, {color: colors.textPrimary}]}>
                    Writing Preferences
                  </Text>
                  <Text style={[styles.rowHint, {color: colors.textMuted}]}>
                    Topics and goals for your For You feed
                  </Text>
                </View>
                <ChevronRightIcon size={18} color={colors.textMuted} />
              </View>
            </Pressable>
          </View>

          {/* Appearance section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, {color: colors.textMuted}]}>Appearance</Text>
            <View style={[styles.card, {backgroundColor: colors.bgCard, borderColor: colors.borderCard}]}>
              <View style={styles.appearanceInner}>
                <View style={styles.appearanceIntro}>
                  <Text style={[styles.appearanceTitle, {color: colors.textPrimary}]}>
                    Theme
                  </Text>
                  <Text style={[styles.appearanceHint, {color: colors.textMuted}]}>
                    Choose the overall atmosphere for the app.
                  </Text>
                  {theme === 'light' ? (
                    <Text
                      style={[
                        styles.appearanceLegacyHint,
                        {color: colors.textMuted},
                      ]}>
                      Legacy Light Mode is still active. Select a theme below to switch.
                    </Text>
                  ) : null}
                </View>

                <View style={styles.themeOptionList}>
                  {themeOptions.map(option => {
                    const active = theme === option.mode;

                    return (
                      <Pressable
                        key={option.mode}
                        onPress={() => setTheme(option.mode)}
                        accessibilityRole="button"
                        accessibilityState={{selected: active}}
                        style={[
                          styles.themeOptionCard,
                          {
                            borderColor: active ? colors.accentAmber : colors.borderCard,
                            backgroundColor: active ? colors.bgElevated : colors.bgSecondary,
                          },
                        ]}>
                        <View style={styles.themeOptionHeader}>
                          <View style={styles.themeOptionText}>
                            <Text
                              style={[
                                styles.themeOptionTitle,
                                {color: colors.textPrimary},
                              ]}>
                              {option.label}
                            </Text>
                            <Text
                              style={[
                                styles.themeOptionDescription,
                                {color: colors.textMuted},
                              ]}>
                              {option.description}
                            </Text>
                          </View>
                          {active ? (
                            <View
                              style={[
                                styles.themeActiveBadge,
                                {
                                  borderColor: colors.accentAmber,
                                  backgroundColor: colors.accentAmber + '18',
                                },
                              ]}>
                              <Text
                                style={[
                                  styles.themeActiveBadgeText,
                                  {color: colors.accentAmber},
                                ]}>
                                Active
                              </Text>
                            </View>
                          ) : null}
                        </View>
                        <ThemePreviewStrip palette={option.palette} />
                      </Pressable>
                    );
                  })}
                </View>

                {theme === 'custom' ? (
                  <View
                    style={[
                      styles.customThemePanel,
                      {
                        backgroundColor: colors.bgSecondary,
                        borderColor: colors.borderCard,
                      },
                    ]}>
                    <View style={styles.customThemeIntro}>
                      <Text
                        style={[
                          styles.customThemeTitle,
                          {color: colors.textPrimary},
                        ]}>
                        Custom Palette
                      </Text>
                      <Text
                        style={[
                          styles.customThemeHint,
                          {color: colors.textMuted},
                        ]}>
                        Swatches apply instantly and stay within a safe dark base.
                      </Text>
                    </View>

                    {renderCustomThemeField(
                      'primaryBackground',
                      'Primary Background',
                      CUSTOM_THEME_SWATCHES.primaryBackground,
                    )}
                    {renderCustomThemeField(
                      'cardBackground',
                      'Card Surface',
                      CUSTOM_THEME_SWATCHES.cardBackground,
                    )}
                    {renderCustomThemeField(
                      'primaryText',
                      'Primary Text',
                      CUSTOM_THEME_SWATCHES.primaryText,
                    )}
                    {renderCustomThemeField(
                      'accentColor',
                      'Accent Color',
                      CUSTOM_THEME_SWATCHES.accentColor,
                    )}
                  </View>
                ) : null}
              </View>
              <View style={[styles.row, {borderTopWidth: 1, borderTopColor: colors.borderCard}]}>
                <View style={{flex: 1}}>
                  <Text style={[styles.rowLabel, {color: colors.textPrimary}]}>Writing Atmosphere</Text>
                  <Text style={[styles.rowHint, {color: colors.textMuted}]}>
                    Editor background shifts as you write
                  </Text>
                </View>
                <Switch
                  value={atmosphereEnabled}
                  onValueChange={handleAtmosphereToggle}
                  trackColor={{false: colors.borderLight, true: colors.accentAmber}}
                  thumbColor="#FFFFFF"
                  accessibilityLabel="Toggle writing atmosphere. When enabled, the editor background subtly changes as you write."
                />
              </View>
            </View>
          </View>

          {/* Sign out */}
          <View style={styles.section}>
            <Pressable
              style={[styles.signOutBtn, {borderColor: colors.danger}]}
              onPress={handleSignOut}>
              <Text style={[styles.signOutText, {color: colors.danger}]}>Sign Out</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      </ScreenEntrance>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  container: {
    padding: spacing.lg,
    gap: spacing.xl,
    paddingBottom: spacing.xxxxl,
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    fontFamily: fonts.ui.semiBold,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginLeft: spacing.xs,
  },
  card: {
    borderRadius: radii.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  rowLabel: {
    fontFamily: fonts.ui.medium,
    fontSize: 15,
  },
  rowValue: {
    fontFamily: fonts.ui.regular,
    fontSize: 14,
  },
  rowHint: {
    fontFamily: fonts.ui.regular,
    fontSize: 12,
    marginTop: 2,
  },
  formInner: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  currentValue: {
    fontFamily: fonts.ui.regular,
    fontSize: 13,
  },
  fieldGroup: {
    gap: spacing.xs,
  },
  fieldLabel: {
    ...typeScale.label,
    marginLeft: spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    fontSize: 15,
    fontFamily: fonts.ui.regular,
  },
  inputFocused: {
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  passwordField: {
    position: 'relative' as const,
  },
  passwordInput: {
    paddingRight: spacing.xxxl + spacing.md,
  },
  toggle: {
    position: 'absolute' as const,
    right: spacing.lg,
    top: 0,
    bottom: 0,
    justifyContent: 'center' as const,
  },
  toggleText: {
    fontFamily: fonts.ui.medium,
    fontSize: 13,
  },
  msgBox: {
    borderRadius: radii.md,
    padding: spacing.md,
  },
  msgText: {
    fontFamily: fonts.ui.medium,
    fontSize: 13,
  },
  fontSizeInner: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  fontSizeOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  fontSizeChip: {
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  fontSizeChipLabel: {
    fontFamily: fonts.ui.medium,
  },
  appearanceInner: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  appearanceIntro: {
    gap: spacing.xs,
  },
  appearanceTitle: {
    fontFamily: fonts.ui.semiBold,
    fontSize: 16,
  },
  appearanceHint: {
    fontFamily: fonts.ui.regular,
    fontSize: 13,
    lineHeight: 18,
  },
  appearanceLegacyHint: {
    fontFamily: fonts.ui.medium,
    fontSize: 12,
    lineHeight: 17,
  },
  themeOptionList: {
    gap: spacing.sm,
  },
  themeOptionCard: {
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  themeOptionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  themeOptionText: {
    flex: 1,
    gap: spacing.xxs,
  },
  themeOptionTitle: {
    fontFamily: fonts.ui.semiBold,
    fontSize: 15,
  },
  themeOptionDescription: {
    fontFamily: fonts.ui.regular,
    fontSize: 12,
    lineHeight: 17,
  },
  themeActiveBadge: {
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  themeActiveBadgeText: {
    fontFamily: fonts.ui.semiBold,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  themePreviewStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.sm,
  },
  themePreviewSwatch: {
    width: 28,
    height: 28,
    borderRadius: radii.sm,
    borderWidth: 1,
  },
  customThemePanel: {
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.md,
  },
  customThemeIntro: {
    gap: spacing.xxs,
  },
  customThemeTitle: {
    fontFamily: fonts.ui.semiBold,
    fontSize: 15,
  },
  customThemeHint: {
    fontFamily: fonts.ui.regular,
    fontSize: 12,
    lineHeight: 17,
  },
  customThemeField: {
    gap: spacing.sm,
  },
  customThemeFieldLabel: {
    fontFamily: fonts.ui.semiBold,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  customThemeSwatches: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  customThemeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  customThemeChipSwatch: {
    width: 16,
    height: 16,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  customThemeChipLabel: {
    fontFamily: fonts.ui.medium,
    fontSize: 12,
  },
  signOutBtn: {
    borderRadius: radii.md,
    borderWidth: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  signOutText: {
    fontFamily: fonts.ui.semiBold,
    fontSize: 15,
  },
});
