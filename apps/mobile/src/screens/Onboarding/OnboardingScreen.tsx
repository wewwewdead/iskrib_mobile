import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Alert,
  Animated,
  BackHandler,
  Image,
  InteractionManager,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {useMutation} from '@tanstack/react-query';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {SafeAreaView} from 'react-native-safe-area-context';
import {
  launchImageLibrary,
  type Asset,
} from 'react-native-image-picker';
import {PrimaryButton} from '../../components/PrimaryButton';
import {
  ArrowLeftIcon,
  BookIcon,
  CheckIcon,
  FireIcon,
  ImageIcon,
  PenIcon,
  UserIcon,
} from '../../components/icons';

import {mobileApi} from '../../lib/api/mobileApi';
import {queryClient} from '../../lib/queryClient';
import type {RootStackParamList} from '../../navigation/types';
import {useTheme} from '../../theme/ThemeProvider';
import {fonts, typeScale} from '../../theme/typography';
import {radii, shadows, spacing} from '../../theme/spacing';

type ScreenProps = NativeStackScreenProps<RootStackParamList, 'Onboarding'>;

export type OnboardingAction = 'write' | 'story' | 'explore';

type OnboardingExperienceProps = {
  userExists: boolean;
  onComplete: (action: OnboardingAction) => void;
};

type UsernameStatus = 'idle' | 'checking' | 'available' | 'taken';

type GoalOption = {
  id: string;
  label: string;
  description: string;
  icon: 'pen' | 'user' | 'book' | 'fire';
};

type FeatureOption = {
  title: string;
  description: string;
  icon: 'pen' | 'user' | 'book' | 'fire';
};

const TOTAL_STEPS = 5;

const TOPICS = [
  'Poetry',
  'Fiction',
  'Journals',
  'Essays',
  'Philosophy',
  'Self-Reflection',
  'Creative Nonfiction',
  'Short Stories',
  'Science',
  'Nature',
  'Music',
  'Art',
  'Travel',
  'Technology',
  'Mental Health',
  'Spirituality',
] as const;

const GOALS: GoalOption[] = [
  {
    id: 'journal',
    label: 'Keep a journal',
    description: 'Build a private writing rhythm you can return to daily.',
    icon: 'pen',
  },
  {
    id: 'publish',
    label: 'Publish & share',
    description: 'Post reflections, essays, and notes for others to read.',
    icon: 'user',
  },
  {
    id: 'stories',
    label: 'Write long stories',
    description: 'Develop chapter-based work readers can follow over time.',
    icon: 'book',
  },
  {
    id: 'explore',
    label: 'Just explore',
    description: 'Browse first and learn the shape of the space as you go.',
    icon: 'fire',
  },
];

const FEATURES: FeatureOption[] = [
  {
    title: 'Rich Editor',
    description: 'A calm drafting space that keeps the focus on the writing.',
    icon: 'pen',
  },
  {
    title: 'Writing Streaks',
    description: 'Small daily momentum adds up. Your streak keeps score.',
    icon: 'fire',
  },
  {
    title: 'Stories',
    description: 'Turn long-form work into chapters readers can keep following.',
    icon: 'book',
  },
  {
    title: 'Community',
    description: 'Find writers you admire and build your own corner of the app.',
    icon: 'user',
  },
];

function slugifyForUsername(value: string): string {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);
}

function normalizeUsernameInput(value: string): string {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);
}

function getPrimaryAction(goalId: string): {label: string; action: OnboardingAction} {
  switch (goalId) {
    case 'journal':
    case 'publish':
      return {label: 'Write your first post', action: 'write'};
    case 'stories':
      return {label: 'Start a story', action: 'story'};
    default:
      return {label: 'Explore Iskrib', action: 'explore'};
  }
}

function getSecondaryAction(goalId: string): {label: string; action: OnboardingAction} {
  switch (goalId) {
    case 'journal':
    case 'publish':
      return {label: 'Explore first', action: 'explore'};
    case 'stories':
      return {label: 'Write a post instead', action: 'write'};
    default:
      return {label: 'Write your first post', action: 'write'};
  }
}

function renderOnboardingIcon(
  icon: GoalOption['icon'] | FeatureOption['icon'],
  color: string,
  size: number,
) {
  switch (icon) {
    case 'book':
      return <BookIcon size={size} color={color} />;
    case 'fire':
      return <FireIcon size={size} color={color} />;
    case 'user':
      return <UserIcon size={size} color={color} />;
    default:
      return <PenIcon size={size} color={color} />;
  }
}

function ProgressBar({step}: {step: number}) {
  const {colors} = useTheme();

  return (
    <View style={styles.progressBar}>
      {Array.from({length: TOTAL_STEPS}).map((_, index) => {
        const active = index <= step;
        return (
          <React.Fragment key={index}>
            <View
              style={[
                styles.progressDot,
                {
                  backgroundColor: active
                    ? colors.accentAmber
                    : colors.borderLight,
                },
              ]}
            />
            {index < TOTAL_STEPS - 1 ? (
              <View
                style={[
                  styles.progressLine,
                  {
                    backgroundColor:
                      index < step ? colors.accentAmber : colors.borderLight,
                  },
                ]}
              />
            ) : null}
          </React.Fragment>
        );
      })}
    </View>
  );
}

function SecondaryAction({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const {colors} = useTheme();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({pressed}) => [
        styles.secondaryAction,
        disabled && styles.secondaryActionDisabled,
        pressed && !disabled && styles.secondaryActionPressed,
      ]}>
      <Text style={[styles.secondaryActionText, {color: colors.textSecondary}]}>
        {label}
      </Text>
    </Pressable>
  );
}

function StepShell({
  title,
  subtitle,
  showBack,
  onBack,
  children,
}: {
  title: string;
  subtitle: string;
  showBack?: boolean;
  onBack?: () => void;
  children: React.ReactNode;
}) {
  const {colors, scaledType} = useTheme();

  return (
    <View style={styles.stepShell}>
      {showBack ? (
        <Pressable
          style={[styles.backButton, {borderColor: colors.borderLight}]}
          onPress={onBack}>
          <ArrowLeftIcon size={18} color={colors.textPrimary} />
        </Pressable>
      ) : (
        <View style={styles.backButtonSpacer} />
      )}

      <Text style={[styles.stepTitle, scaledType.h1, {color: colors.textHeading}]}>
        {title}
      </Text>
      <Text style={[styles.stepSubtitle, scaledType.ui, {color: colors.textSecondary}]}>
        {subtitle}
      </Text>
      {children}
    </View>
  );
}

function GoalCard({
  option,
  selected,
  onPress,
}: {
  option: GoalOption;
  selected: boolean;
  onPress: () => void;
}) {
  const {colors} = useTheme();
  const goalTitleStyle = {
    color: selected ? colors.textOnAccent : colors.textHeading,
  };
  const goalDescriptionStyle = {
    color: selected ? 'rgba(26,22,18,0.82)' : colors.textSecondary,
  };
  const iconColor = selected ? colors.textOnAccent : colors.textHeading;

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.goalCard,
        {
          backgroundColor: selected ? colors.accentAmber : colors.bgCard,
          borderColor: selected ? colors.accentAmber : colors.borderLight,
        },
      ]}>
      <View style={styles.goalCardHeader}>
        <View style={styles.goalIconWrap}>
          {renderOnboardingIcon(option.icon, iconColor, 20)}
        </View>
        <Text style={[styles.goalLabel, goalTitleStyle]}>
          {option.label}
        </Text>
      </View>
      <Text style={[styles.goalDescription, goalDescriptionStyle]}>
        {option.description}
      </Text>
    </Pressable>
  );
}

function FeatureCard({feature}: {feature: FeatureOption}) {
  const {colors} = useTheme();

  return (
    <View
      style={[
        styles.featureCard,
        {
          backgroundColor: colors.bgCard,
          borderColor: colors.borderCard,
          ...shadows(colors).card,
        },
      ]}>
      <View style={styles.featureIconWrap}>
        {renderOnboardingIcon(feature.icon, colors.textHeading, 22)}
      </View>
      <View style={styles.featureTextWrap}>
        <Text style={[styles.featureTitle, {color: colors.textHeading}]}>
          {feature.title}
        </Text>
        <Text style={[styles.featureDescription, {color: colors.textSecondary}]}>
          {feature.description}
        </Text>
      </View>
    </View>
  );
}

export function OnboardingExperience({
  userExists,
  onComplete,
}: OnboardingExperienceProps) {
  const {colors, isDark, scaledType} = useTheme();
  const [currentStep, setCurrentStep] = useState(userExists ? 2 : 0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [setupUsername, setSetupUsername] = useState('');
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>('idle');
  const [avatarAsset, setAvatarAsset] = useState<Asset | null>(null);
  const [writingInterests, setWritingInterests] = useState<string[]>([]);
  const [writingGoal, setWritingGoal] = useState('');

  const usernameCheckTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stepOpacity = useRef(new Animated.Value(0)).current;
  const stepTranslateX = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    stepOpacity.setValue(0);
    stepTranslateX.setValue(direction * 24);
    Animated.parallel([
      Animated.timing(stepOpacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.spring(stepTranslateX, {
        toValue: 0,
        friction: 9,
        tension: 70,
        useNativeDriver: true,
      }),
    ]).start();
  }, [currentStep, direction, stepOpacity, stepTranslateX]);

  useEffect(
    () => () => {
      if (usernameCheckTimer.current) {
        clearTimeout(usernameCheckTimer.current);
      }
    },
    [],
  );

  const checkUsernameDebounced = useCallback((value: string) => {
    if (usernameCheckTimer.current) {
      clearTimeout(usernameCheckTimer.current);
    }

    if (!value || value.length < 3) {
      setUsernameStatus('idle');
      return;
    }

    setUsernameStatus('checking');
    usernameCheckTimer.current = setTimeout(async () => {
      try {
        const result = await mobileApi.checkUsernameAvailability(value);
        setUsernameStatus(result.available ? 'available' : 'taken');
      } catch {
        setUsernameStatus('idle');
      }
    }, 400);
  }, []);

  const goNext = useCallback(() => {
    setDirection(1);
    setCurrentStep(prev => Math.min(prev + 1, TOTAL_STEPS - 1));
  }, []);

  const goBack = useCallback(() => {
    setDirection(-1);
    setCurrentStep(prev => Math.max(prev - 1, 0));
  }, []);

  const toggleTopic = useCallback((topic: string) => {
    setWritingInterests(prev =>
      prev.includes(topic)
        ? prev.filter(item => item !== topic)
        : [...prev, topic],
    );
  }, []);

  const handlePickAvatar = useCallback(async () => {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      quality: 0.8,
      selectionLimit: 1,
    });

    if (!result.didCancel && result.assets?.[0]) {
      setAvatarAsset(result.assets[0]);
    }
  }, []);

  const handleNameChange = useCallback(
    (nextName: string) => {
      if (!setupUsername || setupUsername === slugifyForUsername(name)) {
        const suggested = slugifyForUsername(nextName);
        setSetupUsername(suggested);
        checkUsernameDebounced(suggested);
      }

      setName(nextName);
    },
    [checkUsernameDebounced, name, setupUsername],
  );

  const handleUsernameChange = useCallback(
    (value: string) => {
      const normalized = normalizeUsernameInput(value);
      setSetupUsername(normalized);
      checkUsernameDebounced(normalized);
    },
    [checkUsernameDebounced],
  );

  const profileValid = name.trim().length > 0 && bio.trim().length > 0;

  const usernameStatusColor =
    usernameStatus === 'available'
      ? colors.success
      : usernameStatus === 'taken'
        ? colors.danger
        : colors.textMuted;

  const usernameStatusLabel =
    usernameStatus === 'checking'
      ? 'Checking...'
      : usernameStatus === 'available'
        ? 'Available'
        : usernameStatus === 'taken'
          ? 'Taken'
          : setupUsername.length > 0 && setupUsername.length < 3
            ? 'At least 3 characters'
            : '';

  const profileMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      formData.append('name', name.trim());
      formData.append('bio', bio.trim());

      if (avatarAsset?.uri) {
        formData.append(
          'image',
          {
            uri: avatarAsset.uri,
            type: avatarAsset.type || 'image/jpeg',
            name: avatarAsset.fileName || 'avatar.jpg',
          } as any,
        );
      }

      if (setupUsername.length >= 3 && usernameStatus !== 'taken') {
        formData.append('username', setupUsername);
      }

      return mobileApi.uploadUserData(formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['profile']});
      queryClient.invalidateQueries({queryKey: ['check-user']});
      goNext();
    },
    onError: error => {
      Alert.alert(
        'Profile setup failed',
        error instanceof Error ? error.message : 'Please try again.',
      );
    },
  });

  const completeMutation = useMutation({
    mutationFn: async (action: OnboardingAction) => {
      await mobileApi.completeOnboarding({
        writingInterests,
        writingGoal,
      });
      return action;
    },
    onSuccess: action => {
      queryClient.invalidateQueries({queryKey: ['profile']});
      queryClient.invalidateQueries({queryKey: ['check-user']});
      onComplete(action);
    },
    onError: error => {
      Alert.alert(
        'Onboarding failed',
        error instanceof Error ? error.message : 'Please try again.',
      );
    },
  });

  const welcomeBlobLargeStyle = {
    backgroundColor: isDark
      ? 'rgba(224,186,106,0.18)'
      : 'rgba(212,168,83,0.14)',
  };
  const welcomeBlobSmallStyle = {
    backgroundColor: isDark
      ? 'rgba(154,176,138,0.12)'
      : 'rgba(138,158,122,0.12)',
  };

  const welcomeStep = (
    <View style={styles.welcomeWrap}>
      <View style={[styles.welcomeBlobLarge, welcomeBlobLargeStyle]} />
      <View style={[styles.welcomeBlobSmall, welcomeBlobSmallStyle]} />
      <Text style={[styles.brandMark, {color: colors.textHeading}]}>ISKRIB</Text>
      <Text style={[styles.welcomeTitle, {color: colors.textHeading}]}>
        Welcome to Iskrib
      </Text>
      <Text style={[styles.welcomeSubtitle, {color: colors.textSecondary}]}>
        A quiet place for your thoughts, stories, and reflections.
      </Text>
      <View style={styles.welcomeCtaWrap}>
        <PrimaryButton
          label="Let's set up your space"
          onPress={goNext}
        />
      </View>
    </View>
  );

  const profileStep = (
    <StepShell
      title="Set up your profile"
      subtitle="Tell the world who you are."
      showBack
      onBack={goBack}>
      <View style={styles.profileAvatarSection}>
        <Pressable
          onPress={handlePickAvatar}
          style={[
            styles.avatarPicker,
            {
              backgroundColor: colors.bgCard,
              borderColor: colors.borderLight,
            },
          ]}>
          {avatarAsset?.uri ? (
            <Image
              source={{uri: avatarAsset.uri}}
              style={styles.avatarImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <ImageIcon size={26} color={colors.textMuted} />
              <Text style={[styles.avatarPlaceholderText, {color: colors.textSecondary}]}>
                Add photo
              </Text>
            </View>
          )}
        </Pressable>
      </View>

      <View style={styles.fieldGroup}>
        <View style={styles.fieldHeader}>
          <Text style={[styles.fieldLabel, scaledType.label, {color: colors.textMuted}]}>NAME</Text>
          <Text style={[styles.fieldMeta, {color: colors.textMuted}]}>
            {name.length}/20
          </Text>
        </View>
        <TextInput
          value={name}
          onChangeText={handleNameChange}
          placeholder="Your name"
          placeholderTextColor={colors.textFaint}
          maxLength={20}
          autoCapitalize="words"
          style={[
            styles.input,
            {
              backgroundColor: colors.bgCard,
              borderColor: colors.borderLight,
              color: colors.textPrimary,
            },
          ]}
        />
      </View>

      <View style={styles.fieldGroup}>
        <View style={styles.fieldHeader}>
          <Text style={[styles.fieldLabel, scaledType.label, {color: colors.textMuted}]}>BIO</Text>
          <Text style={[styles.fieldMeta, {color: colors.textMuted}]}>
            {bio.length}/150
          </Text>
        </View>
        <TextInput
          value={bio}
          onChangeText={setBio}
          placeholder="A few words about you..."
          placeholderTextColor={colors.textFaint}
          maxLength={150}
          multiline
          textAlignVertical="top"
          style={[
            styles.textArea,
            {
              backgroundColor: colors.bgCard,
              borderColor: colors.borderLight,
              color: colors.textPrimary,
            },
          ]}
        />
      </View>

      <View style={styles.fieldGroup}>
        <View style={styles.fieldHeader}>
          <Text style={[styles.fieldLabel, scaledType.label, {color: colors.textMuted}]}>USERNAME</Text>
          <Text style={[styles.fieldMeta, {color: usernameStatusColor}]}>
            {usernameStatusLabel}
          </Text>
        </View>
        <TextInput
          value={setupUsername}
          onChangeText={handleUsernameChange}
          placeholder="e.g. john-doe"
          placeholderTextColor={colors.textFaint}
          maxLength={50}
          autoCapitalize="none"
          autoCorrect={false}
          style={[
            styles.input,
            {
              backgroundColor: colors.bgCard,
              borderColor: colors.borderLight,
              color: colors.textPrimary,
            },
          ]}
        />
      </View>

      <PrimaryButton
        label="Continue"
        onPress={() => profileMutation.mutate()}
        loading={profileMutation.isPending}
        disabled={!profileValid}
      />
    </StepShell>
  );

  const interestsStep = (
    <StepShell
      title="What draws you to write?"
      subtitle="Pick as many as you like. This helps us personalize your experience."
      showBack={!userExists}
      onBack={!userExists ? goBack : undefined}>
      <View style={styles.topicGrid}>
        {TOPICS.map(topic => {
          const selected = writingInterests.includes(topic);
          const topicTextStyle = {
            color: selected ? colors.textOnAccent : colors.textSecondary,
          };
          return (
            <Pressable
              key={topic}
              onPress={() => toggleTopic(topic)}
              style={[
                styles.topicChip,
                {
                  backgroundColor: selected ? colors.accentAmber : colors.bgCard,
                  borderColor: selected ? colors.accentAmber : colors.borderLight,
                },
              ]}>
              <Text style={[styles.topicChipText, topicTextStyle]}>
                {topic}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={[styles.goalHeading, scaledType.h3, {color: colors.textHeading}]}>
        What's your main goal?
      </Text>

      <View style={styles.goalGrid}>
        {GOALS.map(option => (
          <GoalCard
            key={option.id}
            option={option}
            selected={writingGoal === option.id}
            onPress={() => setWritingGoal(option.id)}
          />
        ))}
      </View>

      <View style={styles.ctaColumn}>
        <PrimaryButton label="Continue" onPress={goNext} />
        <SecondaryAction label="Skip for now" onPress={goNext} />
      </View>
    </StepShell>
  );

  const featureStep = (
    <StepShell
      title="Your writing toolkit"
      subtitle="Everything you need to create, share, and grow."
      showBack
      onBack={goBack}>
      <View style={styles.featureGrid}>
        {FEATURES.map(feature => (
          <FeatureCard key={feature.title} feature={feature} />
        ))}
      </View>

      <View style={styles.ctaColumn}>
        <PrimaryButton label="Continue" onPress={goNext} />
        <SecondaryAction label="Skip for now" onPress={goNext} />
      </View>
    </StepShell>
  );

  const primaryAction = useMemo(() => getPrimaryAction(writingGoal), [writingGoal]);
  const secondaryAction = useMemo(
    () => getSecondaryAction(writingGoal),
    [writingGoal],
  );

  const finalStep = (
    <StepShell
      title="You're ready"
      subtitle="Your quiet writing space awaits."
      showBack
      onBack={goBack}>
      <View style={[styles.readyBadge, {backgroundColor: colors.accentAmber}]}>
        <CheckIcon size={26} color={colors.textOnAccent} />
      </View>

      <View style={styles.readyCard}>
        <Text style={[styles.readyCardTitle, {color: colors.textHeading}]}>
          Start where your goal points you
        </Text>
        <Text style={[styles.readyCardBody, {color: colors.textSecondary}]}>
          Your preferences are ready to shape the experience from here.
        </Text>
      </View>

      <View style={styles.ctaColumn}>
        <PrimaryButton
          label={primaryAction.label}
          onPress={() => completeMutation.mutate(primaryAction.action)}
          loading={completeMutation.isPending}
        />
        <PrimaryButton
          label={secondaryAction.label}
          onPress={() => completeMutation.mutate(secondaryAction.action)}
          kind="secondary"
          disabled={completeMutation.isPending}
        />
      </View>
    </StepShell>
  );

  const renderedStep =
    currentStep === 0
      ? welcomeStep
      : currentStep === 1
        ? profileStep
        : currentStep === 2
          ? interestsStep
          : currentStep === 3
            ? featureStep
            : finalStep;

  return (
    <SafeAreaView
      style={[styles.safe, {backgroundColor: colors.bgPrimary}]}
      edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <ProgressBar step={currentStep} />

          <Animated.View
            style={[
              styles.stepCard,
              {
                backgroundColor: colors.bgElevated,
                borderColor: colors.borderCard,
                opacity: stepOpacity,
                transform: [{translateX: stepTranslateX}],
                ...shadows(colors).modal,
              },
            ]}>
            {renderedStep}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function OnboardingScreen({navigation, route}: ScreenProps) {
  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => true,
    );

    return () => subscription.remove();
  }, []);

  const handleComplete = useCallback(
    (action: OnboardingAction) => {
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.navigate('Main');
      }

      if (action === 'explore') {
        return;
      }

      InteractionManager.runAfterInteractions(() => {
        if (action === 'write') {
          navigation.navigate('JournalEditor', {mode: 'create'});
          return;
        }

        navigation.navigate('StoryEditor', {});
      });
    },
    [navigation],
  );

  return (
    <OnboardingExperience
      userExists={route.params.userExists}
      onComplete={handleComplete}
    />
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxxxl,
    gap: spacing.xl,
  },
  progressBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  progressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  progressLine: {
    width: 28,
    height: 2,
    marginHorizontal: spacing.xs,
    borderRadius: radii.pill,
  },
  stepCard: {
    borderWidth: 1,
    borderRadius: radii.hero,
    overflow: 'hidden',
  },
  stepShell: {
    gap: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xxl,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonSpacer: {
    height: 38,
  },
  stepTitle: {
    ...typeScale.h1,
  },
  stepSubtitle: {
    ...typeScale.ui,
    marginTop: -spacing.sm,
  },
  welcomeWrap: {
    alignItems: 'center',
    gap: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xxxxl,
    overflow: 'hidden',
  },
  welcomeBlobLarge: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    top: -70,
    right: -20,
  },
  welcomeBlobSmall: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    bottom: 40,
    left: -20,
  },
  brandMark: {
    fontFamily: fonts.brand.semiBold,
    fontSize: 13,
    letterSpacing: 3,
    marginTop: spacing.xl,
  },
  welcomeTitle: {
    fontFamily: fonts.heading.bold,
    fontSize: 34,
    lineHeight: 40,
    textAlign: 'center',
  },
  welcomeSubtitle: {
    fontFamily: fonts.serif.italic,
    fontSize: 16,
    lineHeight: 26,
    textAlign: 'center',
    maxWidth: 280,
  },
  welcomeCtaWrap: {
    width: '100%',
    marginTop: spacing.md,
  },
  profileAvatarSection: {
    alignItems: 'center',
  },
  avatarPicker: {
    width: 112,
    height: 112,
    borderRadius: 56,
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  avatarPlaceholderText: {
    fontFamily: fonts.ui.medium,
    fontSize: 13,
  },
  fieldGroup: {
    gap: spacing.xs,
  },
  fieldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fieldLabel: {
    ...typeScale.label,
  },
  fieldMeta: {
    fontFamily: fonts.ui.medium,
    fontSize: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: radii.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    fontFamily: fonts.ui.regular,
    fontSize: 15,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: radii.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 120,
    fontFamily: fonts.ui.regular,
    fontSize: 15,
  },
  topicGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  topicChip: {
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  topicChipText: {
    fontFamily: fonts.ui.medium,
    fontSize: 13,
  },
  goalHeading: {
    ...typeScale.h3,
    marginTop: spacing.sm,
  },
  goalGrid: {
    gap: spacing.sm,
  },
  goalCard: {
    borderWidth: 1,
    borderRadius: radii.hero,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  goalCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  goalIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalLabel: {
    fontFamily: fonts.heading.semiBold,
    fontSize: 17,
    flex: 1,
  },
  goalDescription: {
    fontFamily: fonts.ui.regular,
    fontSize: 14,
    lineHeight: 21,
  },
  featureGrid: {
    gap: spacing.md,
  },
  featureCard: {
    borderWidth: 1,
    borderRadius: radii.hero,
    padding: spacing.lg,
    flexDirection: 'row',
    gap: spacing.md,
  },
  featureIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(212,168,83,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureTextWrap: {
    flex: 1,
    gap: spacing.xs,
  },
  featureTitle: {
    fontFamily: fonts.heading.semiBold,
    fontSize: 17,
  },
  featureDescription: {
    fontFamily: fonts.ui.regular,
    fontSize: 14,
    lineHeight: 21,
  },
  ctaColumn: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  secondaryAction: {
    alignSelf: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  secondaryActionPressed: {
    opacity: 0.75,
  },
  secondaryActionDisabled: {
    opacity: 0.5,
  },
  secondaryActionText: {
    fontFamily: fonts.ui.medium,
    fontSize: 14,
  },
  readyBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: spacing.sm,
  },
  readyCard: {
    gap: spacing.sm,
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  readyCardTitle: {
    fontFamily: fonts.heading.semiBold,
    fontSize: 20,
    textAlign: 'center',
  },
  readyCardBody: {
    fontFamily: fonts.ui.regular,
    fontSize: 15,
    lineHeight: 24,
    textAlign: 'center',
  },
});
