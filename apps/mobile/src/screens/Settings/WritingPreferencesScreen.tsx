import React, {useCallback, useEffect, useState} from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useMutation, useQuery} from '@tanstack/react-query';
import {PrimaryButton} from '../../components/PrimaryButton';
import {
  PenIcon,
  UserIcon,
  BookIcon,
  FireIcon,
  ChevronRightIcon,
} from '../../components/icons';
import {useAuth} from '../../features/auth/AuthProvider';
import {useTheme} from '../../theme/ThemeProvider';
import {fonts} from '../../theme/typography';
import {spacing, radii} from '../../theme/spacing';
import {mobileApi} from '../../lib/api/mobileApi';
import {queryClient} from '../../lib/queryClient';
import {tapHaptic, successHaptic} from '../../lib/haptics';
import type {RootStackParamList} from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'WritingPreferences'>;

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

type GoalOption = {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
};

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
        <View style={[styles.goalIconWrap, {backgroundColor: selected ? 'rgba(255,255,255,0.28)' : colors.bgSecondary}]}>
          {option.icon}
        </View>
        <Text
          style={[
            styles.goalLabel,
            {color: selected ? colors.textOnAccent : colors.textHeading},
          ]}>
          {option.label}
        </Text>
      </View>
      <Text
        style={[
          styles.goalDescription,
          {color: selected ? 'rgba(26,22,18,0.82)' : colors.textSecondary},
        ]}>
        {option.description}
      </Text>
    </Pressable>
  );
}

export function WritingPreferencesScreen({navigation}: Props) {
  const {user} = useAuth();
  const {colors, sf} = useTheme();

  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [selectedGoal, setSelectedGoal] = useState('');
  const [initialized, setInitialized] = useState(false);

  const profileQuery = useQuery({
    queryKey: ['profile-prefs', user?.id],
    queryFn: () => mobileApi.getUserData(user?.id ?? ''),
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (profileQuery.data && !initialized) {
      const userData = profileQuery.data.userData?.[0];
      if (userData?.writing_interests) {
        setSelectedTopics(userData.writing_interests);
      }
      if (userData?.writing_goal) {
        setSelectedGoal(userData.writing_goal);
      }
      setInitialized(true);
    }
  }, [profileQuery.data, initialized]);

  const toggleTopic = useCallback((topic: string) => {
    tapHaptic();
    setSelectedTopics(prev =>
      prev.includes(topic)
        ? prev.filter(t => t !== topic)
        : [...prev, topic],
    );
  }, []);

  const saveMutation = useMutation({
    mutationFn: () =>
      mobileApi.updateInterests({
        writingInterests: selectedTopics,
        writingGoal: selectedGoal,
      }),
    onSuccess: () => {
      successHaptic();
      queryClient.invalidateQueries({queryKey: ['feed-foryou']});
      queryClient.invalidateQueries({queryKey: ['profile']});
      queryClient.invalidateQueries({queryKey: ['profile-prefs']});
      navigation.goBack();
    },
  });

  const goals: GoalOption[] = [
    {
      id: 'journal',
      label: 'Keep a journal',
      description: 'Build a private writing rhythm you can return to daily.',
      icon: <PenIcon size={20} color={selectedGoal === 'journal' ? colors.textOnAccent : colors.textHeading} />,
    },
    {
      id: 'publish',
      label: 'Publish & share',
      description: 'Post reflections, essays, and notes for others to read.',
      icon: <UserIcon size={20} color={selectedGoal === 'publish' ? colors.textOnAccent : colors.textHeading} />,
    },
    {
      id: 'stories',
      label: 'Write long stories',
      description: 'Develop chapter-based work readers can follow over time.',
      icon: <BookIcon size={20} color={selectedGoal === 'stories' ? colors.textOnAccent : colors.textHeading} />,
    },
    {
      id: 'explore',
      label: 'Just explore',
      description: 'Browse first and learn the shape of the space as you go.',
      icon: <FireIcon size={20} color={selectedGoal === 'explore' ? colors.textOnAccent : colors.textHeading} />,
    },
  ];

  if (profileQuery.isLoading) {
    return (
      <SafeAreaView style={[styles.safe, {backgroundColor: colors.bgPrimary}]} edges={['top']}>
        <View style={styles.loading}>
          <ActivityIndicator color={colors.accentAmber} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, {backgroundColor: colors.bgPrimary}]} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        <Text style={[styles.description, {color: colors.textSecondary, fontSize: sf(14)}]}>
          Choose topics you enjoy and your main writing goal. This personalizes
          your For You feed and Explore sections.
        </Text>

        {/* Topics */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, {color: colors.textMuted, fontSize: sf(12)}]}>
            TOPICS
          </Text>
          <View style={styles.topicGrid}>
            {TOPICS.map(topic => {
              const selected = selectedTopics.includes(topic);
              return (
                <Pressable
                  key={topic}
                  onPress={() => toggleTopic(topic)}
                  style={[
                    styles.topicChip,
                    {
                      backgroundColor: selected
                        ? colors.accentAmber
                        : colors.bgCard,
                      borderColor: selected
                        ? colors.accentAmber
                        : colors.borderLight,
                    },
                  ]}>
                  <Text
                    style={[
                      styles.topicChipText,
                      {
                        color: selected
                          ? colors.textOnAccent
                          : colors.textSecondary,
                        fontSize: sf(13),
                      },
                    ]}>
                    {topic}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Goals */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, {color: colors.textMuted, fontSize: sf(12)}]}>
            MAIN GOAL
          </Text>
          <View style={styles.goalGrid}>
            {goals.map(option => (
              <GoalCard
                key={option.id}
                option={option}
                selected={selectedGoal === option.id}
                onPress={() => {
                  tapHaptic();
                  setSelectedGoal(option.id);
                }}
              />
            ))}
          </View>
        </View>

        <PrimaryButton
          label="Save Preferences"
          onPress={() => saveMutation.mutate()}
          loading={saveMutation.isPending}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    padding: spacing.lg,
    gap: spacing.xl,
    paddingBottom: spacing.xxxxl,
  },
  description: {
    fontFamily: fonts.serif.regular,
    lineHeight: 22,
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    fontFamily: fonts.ui.semiBold,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginLeft: spacing.xs,
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
});
