import React, {useMemo, useRef, useState} from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {SafeAreaView} from 'react-native-safe-area-context';
import {PrimaryButton} from '../../components/PrimaryButton';
import {useAuth} from '../../features/auth/AuthProvider';
import {useTheme} from '../../theme/ThemeProvider';
import {fonts, typeScale} from '../../theme/typography';
import {spacing, radii} from '../../theme/spacing';
import type {AuthStackParamList} from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'SignUp'>;

export function SignUpScreen({navigation}: Props) {
  const {signUp, authError} = useAuth();
  const {colors, isDark, scaledType} = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const passwordRef = useRef<TextInput>(null);

  const canSubmit = useMemo(
    () =>
      email.trim().length > 4 &&
      password.length > 7,
    [email, password],
  );

  const onSubmit = async () => {
    try {
      setLoading(true);
      await signUp({email: email.trim(), password});
      Alert.alert(
        'Check your inbox',
        'Account created. Confirm your email, then sign in.',
      );
      navigation.navigate('Login');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Sign up failed';
      Alert.alert('Sign up failed', message);
    } finally {
      setLoading(false);
    }
  };

  const inputShellStyle = (field: string) => [
    styles.input,
    {
      backgroundColor: isDark ? colors.bgElevated : colors.bgPrimary,
      borderColor:
        focusedField === field ? colors.accentAmber : colors.borderCard,
    },
    focusedField === field && {
      shadowColor: colors.accentAmber,
      shadowOffset: {width: 0, height: 0},
      shadowOpacity: 0.15,
      shadowRadius: 6,
    },
  ];

  const inputStyle = (field: string) => [
    inputShellStyle(field),
    {color: colors.textPrimary},
  ];

  return (
    <SafeAreaView style={[styles.safe, {backgroundColor: colors.bgPrimary}]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.container}>
          {/* Brand header — unified with LoginScreen */}
          <View style={styles.brandSection}>
            <Text style={[styles.brandText, {color: colors.textHeading}]}>
              ISKRIB
            </Text>
            <View
              style={[styles.brandUnderline, {backgroundColor: colors.accentAmber}]}
            />
            <Text style={[styles.tagline, {color: colors.textSecondary}]}>
              Start writing your story
            </Text>
          </View>

          {!!authError && (
            <Text style={[styles.error, {color: colors.danger}]}>
              {authError}
            </Text>
          )}

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, scaledType.label, {color: colors.textMuted}]}>
                EMAIL
              </Text>
              <TextInput
                placeholder="Enter your email"
                placeholderTextColor={colors.textFaint}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                returnKeyType="next"
                value={email}
                onChangeText={setEmail}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                onSubmitEditing={() => passwordRef.current?.focus()}
                style={inputStyle('email')}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.label, scaledType.label, {color: colors.textMuted}]}>
                PASSWORD
              </Text>
              <View style={styles.passwordField}>
                <TextInput
                  ref={passwordRef}
                  placeholder="Password (8+ characters)"
                  placeholderTextColor={colors.textFaint}
                  secureTextEntry={!passwordVisible}
                  autoComplete="password-new"
                  returnKeyType="go"
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  onSubmitEditing={canSubmit ? onSubmit : undefined}
                  style={[inputStyle('password'), styles.passwordInput]}
                />
                <Pressable
                  accessibilityRole="button"
                  style={styles.passwordToggle}
                  hitSlop={8}
                  onPress={() => setPasswordVisible(current => !current)}>
                  <Text
                    style={[
                      styles.passwordToggleText,
                      {color: colors.accentAmber},
                    ]}>
                    {passwordVisible ? 'Hide' : 'Show'}
                  </Text>
                </Pressable>
              </View>
            </View>

            <PrimaryButton
              label="Create Account"
              onPress={onSubmit}
              loading={loading}
              disabled={!canSubmit}
            />

            <PrimaryButton
              label="Back to Login"
              onPress={() => navigation.goBack()}
              kind="secondary"
            />
          </View>
        </View>
      </KeyboardAvoidingView>
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
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
  },
  brandSection: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  brandText: {
    fontFamily: fonts.brand.semiBold,
    fontSize: 36,
    letterSpacing: 3,
  },
  brandUnderline: {
    width: 48,
    height: 3,
    borderRadius: 2,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  tagline: {
    fontFamily: fonts.serif.italic,
    fontSize: 15,
    lineHeight: 22,
  },
  error: {
    fontSize: 13,
    fontFamily: fonts.ui.medium,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  form: {
    gap: spacing.lg,
  },
  fieldGroup: {
    gap: spacing.xs,
  },
  label: {
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
  passwordField: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: spacing.xxxl + spacing.md,
  },
  passwordToggle: {
    position: 'absolute',
    right: spacing.lg,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  passwordToggleText: {
    fontFamily: fonts.ui.medium,
    fontSize: 13,
  },
});
