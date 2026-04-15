import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {ActivityIndicator, Animated, Easing, StyleSheet, Text, View} from 'react-native';
import {enableFreeze, enableScreens} from 'react-native-screens';
import {
  NavigationContainer,
  DarkTheme,
  DefaultTheme,
  useNavigation,
} from '@react-navigation/native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {
  createNativeStackNavigator,
  type NativeStackNavigationProp,
} from '@react-navigation/native-stack';
import {
  SCREEN_ANIMATIONS,
  SCREEN_ANIMATION_DURATION,
} from '../lib/navigationAnimation';

enableScreens();
enableFreeze();
import {useQuery} from '@tanstack/react-query';
import {PrimaryButton} from '../components/PrimaryButton';
import {useAuth} from '../features/auth/AuthProvider';
import {useTheme} from '../theme/ThemeProvider';
import {useRealtimeNotifications} from '../hooks/useRealtimeNotifications';
import {useAppStateRecovery} from '../hooks/useAppStateRecovery';
import {MOBILE_ENV} from '../config/env';
import {mobileApi} from '../lib/api/mobileApi';
import {socialApi} from '../lib/api/socialApi';
import {Toast} from '../components/Toast';
import {subscribeGlobalToast} from '../lib/globalToast';
import {LoginScreen} from '../screens/Auth/LoginScreen';
import {SignUpScreen} from '../screens/Auth/SignUpScreen';
import {ForgotPasswordScreen} from '../screens/Auth/ForgotPasswordScreen';
import {HomeFeedScreen} from '../screens/Home/HomeFeedScreen';
import {ExploreScreen} from '../screens/Home/ExploreScreen';
import {PromptResponsesScreen} from '../screens/Home/PromptResponsesScreen';
import {NotificationsScreen} from '../screens/Notifications/NotificationsScreen';
import {ProfileScreen} from '../screens/Profile/ProfileScreen';
import {VisitProfileScreen} from '../screens/Profile/VisitProfileScreen';
import {EditProfileScreen} from '../screens/Profile/EditProfileScreen';
import {ProfileCustomizeScreen} from '../screens/Profile/ProfileCustomizeScreen';
import {WritingPreferencesScreen} from '../screens/Settings/WritingPreferencesScreen';
import {PostDetailScreen} from '../screens/Home/PostDetailScreen';
import {JournalEditorScreen} from '../screens/Editor/JournalEditorScreen';
import {EchoBloomScreen} from '../screens/EchoBloom/EchoBloomScreen';
import {ThreadScreen} from '../screens/EchoBloom/ThreadScreen';
import {DraftsScreen} from '../screens/Editor/DraftsScreen';
import {BookmarksScreen} from '../screens/Profile/BookmarksScreen';
import {StoryBrowserScreen} from '../screens/Stories/StoryBrowserScreen';
import {StoryDetailScreen} from '../screens/Stories/StoryDetailScreen';
import {StoryEditorScreen} from '../screens/Stories/StoryEditorScreen';
import {StoryDashboardScreen} from '../screens/Stories/StoryDashboardScreen';
import {StoryLibraryScreen} from '../screens/Stories/StoryLibraryScreen';
import {StoryChapterManagerScreen} from '../screens/Stories/StoryChapterManagerScreen';
import {StoryChapterEditorScreen} from '../screens/Stories/StoryChapterEditorScreen';
import {StoryChapterReaderScreen} from '../screens/Stories/StoryChapterReaderScreen';
import {FollowListScreen} from '../screens/Social/FollowListScreen';
import {SettingsScreen} from '../screens/Settings/SettingsScreen';
import {OpinionsFeedScreen} from '../screens/Opinions/OpinionsFeedScreen';
import {OpinionDetailScreen} from '../screens/Opinions/OpinionDetailScreen';
import {OpinionEditorScreen} from '../screens/Opinions/OpinionEditorScreen';
import {AnalyticsDashboardScreen} from '../screens/Analytics/AnalyticsDashboardScreen';
import {OnboardingScreen} from '../screens/Onboarding/OnboardingScreen';
import {
  HomeIcon,
  CompassIcon,
  BookIcon,
  BellIcon,
  UserIcon,
} from '../components/icons';
import {radii, spacing, shadows} from '../theme/spacing';
import {fonts, typeScale} from '../theme/typography';
import type {
  AuthStackParamList,
  MainTabParamList,
  RootStackParamList,
} from './types';

const RootStack = createNativeStackNavigator<RootStackParamList>();
const AuthStackNav = createNativeStackNavigator<AuthStackParamList>();
const MainTabs = createBottomTabNavigator<MainTabParamList>();

function HomeTabIcon({color, size}: {color: string; size: number}) {
  return <HomeIcon size={size} color={color} />;
}

function ExploreTabIcon({color, size}: {color: string; size: number}) {
  return <CompassIcon size={size} color={color} />;
}

function StoriesTabIcon({color, size}: {color: string; size: number}) {
  return <BookIcon size={size} color={color} />;
}

function NotificationsTabIcon({color, size}: {color: string; size: number}) {
  return <BellIcon size={size} color={color} />;
}

function ProfileTabIcon({color, size}: {color: string; size: number}) {
  return <UserIcon size={size} color={color} />;
}

function BrandLoadingScreen({subtitle}: {subtitle?: string}) {
  const {colors} = useTheme();
  const pulseAnim = React.useRef(new Animated.Value(0.4)).current;

  React.useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {toValue: 1, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true}),
        Animated.timing(pulseAnim, {toValue: 0.4, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true}),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  return (
    <View style={[styles.brandLoadingContainer, {backgroundColor: colors.bgPrimary}]}>
      <Animated.View style={{opacity: pulseAnim}}>
        <Text style={[styles.brandLoadingLogo, {color: colors.textHeading}]}>ISKRIB</Text>
        <View style={[styles.brandLoadingUnderline, {backgroundColor: colors.accentAmber}]} />
      </Animated.View>
      {subtitle ? (
        <Text style={[styles.brandLoadingSubtitle, {color: colors.textMuted}]}>{subtitle}</Text>
      ) : null}
    </View>
  );
}

function BootstrapBlockingState({
  title,
  message,
  detail,
  loading,
  actionLabel,
  actionLoading,
  onAction,
}: {
  title: string;
  message: string;
  detail?: string;
  loading?: boolean;
  actionLabel?: string;
  actionLoading?: boolean;
  onAction?: () => void;
}) {
  const {colors, scaledType} = useTheme();

  // Use branded loading screen for loading states (no error/action)
  if (loading && !detail && !onAction) {
    return <BrandLoadingScreen subtitle={message} />;
  }

  return (
    <View style={[styles.bootstrapContainer, {backgroundColor: colors.bgPrimary}]}>
      <View
        style={[
          styles.bootstrapCard,
          {
            backgroundColor: colors.bgElevated,
            borderColor: colors.borderCard,
            ...shadows(colors).modal,
          },
        ]}>
        {loading ? (
          <ActivityIndicator color={colors.loaderColor} style={styles.bootstrapSpinner} />
        ) : null}
        <Text style={[styles.bootstrapTitle, scaledType.h2, {color: colors.textHeading}]}>
          {title}
        </Text>
        <Text style={[styles.bootstrapMessage, scaledType.ui, {color: colors.textSecondary}]}>
          {message}
        </Text>
        {detail ? (
          <Text style={[styles.bootstrapDetail, {color: colors.danger}]}>
            {detail}
          </Text>
        ) : null}
        {onAction && actionLabel ? (
          <View style={styles.bootstrapAction}>
            <PrimaryButton
              label={actionLabel}
              onPress={onAction}
              loading={actionLoading}
            />
          </View>
        ) : null}
        {__DEV__ ? (
          <Text style={[styles.bootstrapMeta, {color: colors.textMuted}]}>
            API: {MOBILE_ENV.API_BASE_URL}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function AuthNavigator() {
  const {colors} = useTheme();
  return (
    <AuthStackNav.Navigator
      screenOptions={{
        headerStyle: {backgroundColor: colors.bgElevated},
        headerTintColor: colors.textPrimary,
        headerShadowVisible: false,
        animation: SCREEN_ANIMATIONS.push,
        animationDuration: SCREEN_ANIMATION_DURATION,
      }}>
      <AuthStackNav.Screen
        name="Login"
        component={LoginScreen}
        options={{headerShown: false}}
      />
      <AuthStackNav.Screen
        name="SignUp"
        component={SignUpScreen}
        options={{headerShown: false}}
      />
      <AuthStackNav.Screen
        name="ForgotPassword"
        component={ForgotPasswordScreen}
        options={{headerShown: false}}
      />
    </AuthStackNav.Navigator>
  );
}

function MainTabNavigator() {
  const {colors} = useTheme();
  const {session} = useAuth();
  const userId = session?.user.id ?? '';

  const {data: countData} = useQuery({
    queryKey: ['notification-count', userId],
    enabled: Boolean(userId),
    queryFn: () => socialApi.getNotificationsCount(userId),
    staleTime: 60 * 1000,
    refetchOnMount: false,
  });
  const unreadCount = countData?.count ?? 0;

  return (
    <MainTabs.Navigator
      detachInactiveScreens={false}
      screenOptions={{
        headerStyle: {backgroundColor: colors.bgPrimary},
        headerTintColor: colors.textPrimary,
        headerShadowVisible: false,
        tabBarStyle: {
          backgroundColor: colors.bgCard,
          borderTopColor: colors.borderCard,
          borderTopWidth: 1,
          elevation: 0,
        },
        tabBarActiveTintColor: colors.accentAmber,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontFamily: fonts.ui.semiBold,
        },
        animation: 'none',
        freezeOnBlur: true,
      }}>
      <MainTabs.Screen
        name="Home"
        component={HomeFeedScreen}
        options={{
          headerShown: false,
          tabBarIcon: HomeTabIcon,
        }}
      />
      <MainTabs.Screen
        name="Explore"
        component={ExploreScreen}
        options={{
          tabBarIcon: ExploreTabIcon,
        }}
      />
      <MainTabs.Screen
        name="Stories"
        component={StoryBrowserScreen}
        options={{
          tabBarIcon: StoriesTabIcon,
        }}
      />
      <MainTabs.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{
          tabBarIcon: NotificationsTabIcon,
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: colors.accentAmber,
            color: colors.textOnAccent,
            fontSize: 11,
            fontFamily: fonts.ui.bold,
          },
        }}
      />
      <MainTabs.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ProfileTabIcon,
        }}
      />
    </MainTabs.Navigator>
  );
}

function LoggedInShell({children}: {children: React.ReactNode}) {
  const {session} = useAuth();
  const {colors: shellColors} = useTheme();
  const userId = session?.user.id;
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [toast, setToast] = useState<{message: string; visible: boolean; type: 'success' | 'error' | 'info'}>({
    message: '',
    visible: false,
    type: 'info',
  });
  const [toastKey, setToastKey] = useState(0);
  const [onboardingGateUserId, setOnboardingGateUserId] = useState<string | null>(null);

  const handleNewNotification = useCallback((payload: Record<string, unknown>) => {
    const message =
      (payload.message as string) || 'You have a new notification';
    setToast({message, visible: true, type: 'info'});
    setToastKey(k => k + 1);
  }, []);

  const handleDismissToast = useCallback(() => {
    setToast(prev => ({...prev, visible: false}));
  }, []);

  useEffect(() => {
    return subscribeGlobalToast(event => {
      setToast({message: event.message, visible: true, type: event.type});
      setToastKey(k => k + 1);
    });
  }, []);

  useRealtimeNotifications(userId, {
    onNewNotification: handleNewNotification,
  });

  const {isCatchingUp} = useAppStateRecovery();

  const onboardingCheckQuery = useQuery({
    queryKey: ['check-user', userId],
    enabled: Boolean(userId),
    queryFn: () => mobileApi.checkUser(userId ?? ''),
    retry: 1,
    retryDelay: 750,
    staleTime: 10 * 60 * 1000,
    refetchOnMount: false,
  });

  const needsOnboarding =
    onboardingCheckQuery.data != null &&
    (!onboardingCheckQuery.data.exist ||
      !onboardingCheckQuery.data.onboardingCompleted);

  useEffect(() => {
    setOnboardingGateUserId(null);
  }, [userId]);

  useEffect(() => {
    if (!__DEV__ || !onboardingCheckQuery.error) {
      return;
    }

    const message =
      onboardingCheckQuery.error instanceof Error
        ? onboardingCheckQuery.error.message
        : 'Unknown onboarding bootstrap error';

    console.warn(
      `[onboarding-bootstrap] /check-user failed against ${MOBILE_ENV.API_BASE_URL}: ${message}`,
    );
  }, [onboardingCheckQuery.error]);

  useEffect(() => {
    if (!userId || !onboardingCheckQuery.data) {
      return;
    }

    const state = navigation.getState();
    const activeRoute = state.routes[state.index]?.name;

    if (
      needsOnboarding &&
      onboardingGateUserId !== userId &&
      activeRoute !== 'Onboarding'
    ) {
      setOnboardingGateUserId(userId);
      navigation.navigate('Onboarding', {
        userExists: onboardingCheckQuery.data.exist,
      });
    }
  }, [
    navigation,
    needsOnboarding,
    onboardingCheckQuery.data,
    onboardingGateUserId,
    userId,
  ]);

  if (!userId || onboardingCheckQuery.isPending) {
    return (
      <BootstrapBlockingState
        title="Checking your account"
        message="Verifying your profile and onboarding status before loading the app."
        loading
      />
    );
  }

  if (onboardingCheckQuery.isError) {
    const errorMessage =
      onboardingCheckQuery.error instanceof Error
        ? onboardingCheckQuery.error.message
        : 'We could not reach the app backend.';

    return (
      <BootstrapBlockingState
        title="Can't reach the server"
        message={
          __DEV__
            ? `Make sure your Express server is running on ${MOBILE_ENV.API_BASE_URL} before using the app.`
            : 'We couldn\u2019t verify your account status. Please check your connection and try again.'
        }
        detail={errorMessage}
        actionLabel="Retry"
        actionLoading={onboardingCheckQuery.isFetching}
        onAction={() => {
          onboardingCheckQuery.refetch();
        }}
      />
    );
  }

  if (needsOnboarding && onboardingGateUserId !== userId) {
    return (
      <BootstrapBlockingState
        title="Opening onboarding"
        message="Preparing your writing space before you enter the app."
        loading
      />
    );
  }

  return (
    <View style={styles.shellContainer}>
      {children}
      {isCatchingUp && (
        <View
          style={[styles.catchingUpOverlay, {backgroundColor: shellColors.bgBackdrop}]}
          pointerEvents="none"
          accessibilityElementsHidden>
          <ActivityIndicator color={shellColors.loaderColor} />
          <Text style={[styles.catchingUpText, {color: shellColors.textMuted}]}>
            Catching up…
          </Text>
        </View>
      )}
      <Toast
        key={toastKey}
        message={toast.message}
        visible={toast.visible}
        onDismiss={handleDismissToast}
        type={toast.type}
      />
    </View>
  );
}

export function RootNavigator() {
  const {loading, session} = useAuth();
  const {colors, isDark} = useTheme();

  const navTheme = useMemo(
    () => ({
      ...(isDark ? DarkTheme : DefaultTheme),
      colors: {
        ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
        background: colors.bgPrimary,
        card: colors.bgElevated,
        border: colors.borderLight,
        text: colors.textPrimary,
        primary: colors.accentAmber,
        notification: colors.accentAmber,
      },
    }),
    [colors, isDark],
  );

  if (loading) {
    return <BrandLoadingScreen />;
  }

  return (
    <NavigationContainer theme={navTheme}>
      <RootStack.Navigator
        screenOptions={{
          headerStyle: {backgroundColor: colors.bgElevated},
          headerTintColor: colors.textPrimary,
          headerShadowVisible: false,
          contentStyle: {backgroundColor: colors.bgPrimary},
          animation: SCREEN_ANIMATIONS.push,
          animationDuration: SCREEN_ANIMATION_DURATION,
        }}>
        {!session ? (
          <RootStack.Screen
            name="Auth"
            component={AuthNavigator}
            options={{headerShown: false}}
          />
        ) : (
          <>
            <RootStack.Screen
              name="Main"
              options={{headerShown: false}}>
              {() => (
                <LoggedInShell>
                  <MainTabNavigator />
                </LoggedInShell>
              )}
            </RootStack.Screen>
            <RootStack.Screen
              name="PostDetail"
              component={PostDetailScreen}
              options={{title: 'Post'}}
            />
            <RootStack.Screen
              name="JournalEditor"
              component={JournalEditorScreen}
              options={{title: 'Journal Editor'}}
            />
            <RootStack.Screen
              name="EchoBloom"
              component={EchoBloomScreen}
              options={{
                title: 'Echo Bloom',
                headerShown: false,
                presentation: 'fullScreenModal',
                animation: 'fade',
              }}
            />
            <RootStack.Screen
              name="Thread"
              component={ThreadScreen}
              options={{title: 'Thread'}}
            />
            <RootStack.Screen
              name="StoryDetail"
              component={StoryDetailScreen}
              options={{title: 'Story'}}
            />
            <RootStack.Screen
              name="StoryEditor"
              component={StoryEditorScreen}
              options={{title: 'Story Editor'}}
            />
            <RootStack.Screen
              name="StoryDashboard"
              component={StoryDashboardScreen}
              options={{title: 'My Stories'}}
            />
            <RootStack.Screen
              name="StoryLibrary"
              component={StoryLibraryScreen}
              options={{title: 'Story Library'}}
            />
            <RootStack.Screen
              name="StoryChapterManager"
              component={StoryChapterManagerScreen}
              options={{title: 'Chapter Manager'}}
            />
            <RootStack.Screen
              name="StoryChapterEditor"
              component={StoryChapterEditorScreen}
              options={{title: 'Chapter Editor'}}
            />
            <RootStack.Screen
              name="StoryChapterReader"
              component={StoryChapterReaderScreen}
              options={{title: 'Chapter'}}
            />
            <RootStack.Screen
              name="VisitProfile"
              component={VisitProfileScreen}
              options={{title: 'Profile'}}
            />
            <RootStack.Screen
              name="EditProfile"
              component={EditProfileScreen}
              options={{title: 'Edit Profile'}}
            />
            <RootStack.Screen
              name="Settings"
              component={SettingsScreen}
              options={{title: 'Settings'}}
            />
            <RootStack.Screen
              name="FollowList"
              component={FollowListScreen}
              options={{title: 'Connections'}}
            />
            <RootStack.Screen
              name="Bookmarks"
              component={BookmarksScreen}
              options={{title: 'Bookmarks'}}
            />
            <RootStack.Screen
              name="Drafts"
              component={DraftsScreen}
              options={{title: 'Drafts'}}
            />
            <RootStack.Screen
              name="PromptResponses"
              component={PromptResponsesScreen}
              options={{title: 'Prompt Responses'}}
            />
            <RootStack.Screen
              name="OpinionsFeed"
              component={OpinionsFeedScreen}
              options={{title: 'Opinions'}}
            />
            <RootStack.Screen
              name="OpinionDetail"
              component={OpinionDetailScreen}
              options={{title: 'Opinion'}}
            />
            <RootStack.Screen
              name="OpinionEditor"
              component={OpinionEditorScreen}
              options={{title: 'New Opinion'}}
            />
            <RootStack.Screen
              name="Analytics"
              component={AnalyticsDashboardScreen}
              options={{title: 'Analytics'}}
            />
            <RootStack.Screen
              name="ProfileCustomize"
              component={ProfileCustomizeScreen}
              options={{title: 'Customize'}}
            />
            <RootStack.Screen
              name="WritingPreferences"
              component={WritingPreferencesScreen}
              options={{title: 'Writing Preferences'}}
            />
            <RootStack.Screen
              name="Onboarding"
              component={OnboardingScreen}
              options={{
                headerShown: false,
                gestureEnabled: false,
                presentation: 'fullScreenModal',
                animation: SCREEN_ANIMATIONS.fadeFromBottom,
              }}
            />
          </>
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  shellContainer: {
    flex: 1,
  },
  bootstrapContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
  },
  bootstrapCard: {
    borderWidth: 1,
    borderRadius: radii.hero,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.xxxl,
    alignItems: 'center',
  },
  bootstrapSpinner: {
    marginBottom: spacing.lg,
  },
  bootstrapTitle: {
    ...typeScale.h2,
    textAlign: 'center',
  },
  bootstrapMessage: {
    ...typeScale.ui,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  bootstrapDetail: {
    fontFamily: fonts.ui.medium,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  bootstrapAction: {
    alignSelf: 'stretch',
    marginTop: spacing.xl,
  },
  bootstrapMeta: {
    fontFamily: fonts.ui.regular,
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  brandLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.lg,
  },
  brandLoadingLogo: {
    fontFamily: fonts.brand.semiBold,
    fontSize: 42,
    letterSpacing: 4,
    textAlign: 'center',
  },
  brandLoadingUnderline: {
    width: 48,
    height: 3,
    borderRadius: 2,
    marginTop: spacing.sm,
    alignSelf: 'center',
  },
  brandLoadingSubtitle: {
    fontFamily: fonts.ui.regular,
    fontSize: 13,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  catchingUpOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  catchingUpText: {
    fontSize: 13,
    fontFamily: fonts.ui.medium,
  },
});
