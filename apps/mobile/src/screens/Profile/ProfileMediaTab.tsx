import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Modal,
  Platform,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  type SharedValue,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import {useInfiniteQuery, useMutation} from '@tanstack/react-query';
import {EmptyState} from '../../components/EmptyState';
import {NetworkImage} from '../../components/NetworkImage';
import {XIcon, MoreDotsIcon, TrashIcon} from '../../components/icons';
import {IMAGE_GRID_LIST_PROPS} from '../../lib/listPerformance';
import {mobileApi} from '../../lib/api/mobileApi';
import {queryClient} from '../../lib/queryClient';
import {Haptics} from '../../lib/haptics';
import {SpringPresets, useSpringPress} from '../../lib/springs';
import {useTheme} from '../../theme/ThemeProvider';
import {fonts} from '../../theme/typography';
import {radii, spacing} from '../../theme/spacing';

const {width: SCREEN_WIDTH, height: SCREEN_HEIGHT} = Dimensions.get('window');
const NUM_COLUMNS = 3;
const GAP = 2;
const TILE_SIZE = (SCREEN_WIDTH - spacing.lg * 2 - GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS;
const MEDIA_VIEWER_LIST_PROPS = {
  initialNumToRender: 2,
  maxToRenderPerBatch: 2,
  windowSize: 3,
  updateCellsBatchingPeriod: 50,
  removeClippedSubviews: Platform.OS === 'android',
} as const;

// Lift gesture tuning constants.
const BACKDROP_OPACITY = 0.95;
const LIFT_SCALE = 0.4;
const LIFT_SCALE_MIN = 0.28;
const DELETE_ZONE_SIZE = 88;
const DELETE_ZONE_HIT_RADIUS = 92;
const DELETE_ZONE_BOTTOM_OFFSET = 100;
const DELETE_ZONE_CENTER_X = SCREEN_WIDTH / 2;
const DELETE_ZONE_CENTER_Y =
  SCREEN_HEIGHT - DELETE_ZONE_BOTTOM_OFFSET - DELETE_ZONE_SIZE / 2;
const BURST_DOT_COUNT = 5;
const BURST_DOT_DISTANCE = 72;
const BURST_DOT_ANGLES = Array.from(
  {length: BURST_DOT_COUNT},
  (_, i) => (i * 2 * Math.PI) / BURST_DOT_COUNT - Math.PI / 2,
);

interface ProfileMediaTabProps {
  userId: string;
  headerComponent?: React.ReactElement;
  isOwnProfile?: boolean;
}

type MediaItem = {id: string; url: string; bucket?: string; path?: string; thumbnailUrl?: string; detailUrl?: string};

type TileRect = {x: number; y: number; width: number; height: number};

type ViewerState = {initialIndex: number; initialRect: TileRect};

/**
 * Grid tile that captures its own screen position on tap so the modal viewer
 * can fly the lifted image back to "where it belongs" on release.
 *
 * Wrapped in React.memo so the visible grid doesn't re-render on every parent
 * state change (modal open/close, swipe, lift gesture, react-query updates).
 * Default shallow comparison is sufficient because all props are stable:
 *  - `item` is stable per id across pagination updates
 *  - `index` and `isOwnProfile` are stable values
 *  - `onSelect` and `onDelete` are useCallback'd in the parent
 */
const MediaGridTile = React.memo(function MediaGridTile({
  item,
  index,
  isOwnProfile,
  onSelect,
  onDelete,
}: {
  item: MediaItem;
  index: number;
  isOwnProfile?: boolean;
  onSelect: (index: number, rect: TileRect) => void;
  onDelete: (item: MediaItem) => void;
}) {
  const tileRef = useRef<View>(null);

  const handlePress = useCallback(() => {
    const node = tileRef.current;
    if (!node) {
      onSelect(index, {x: 0, y: 0, width: TILE_SIZE, height: TILE_SIZE});
      return;
    }
    node.measureInWindow((x, y, width, height) => {
      onSelect(index, {x, y, width, height});
    });
  }, [index, onSelect]);

  const handleDeletePress = useCallback(() => {
    onDelete(item);
  }, [item, onDelete]);

  return (
    <View ref={tileRef}>
      <Pressable onPress={handlePress}>
        <Image
          source={{uri: item.thumbnailUrl || item.url, cache: 'force-cache'}}
          style={styles.tile}
          accessibilityLabel="Profile media image"
        />
      </Pressable>
      {isOwnProfile && (
        <Pressable
          style={styles.tileMenuBtn}
          onPress={handleDeletePress}
          hitSlop={6}>
          <MoreDotsIcon size={14} color="#FFFFFF" />
        </Pressable>
      )}
    </View>
  );
});

const MediaViewerPage = React.memo(
  function MediaViewerPage({
    item,
    isActive,
    liftStyle,
  }: {
    item: MediaItem;
    isActive: boolean;
    liftStyle: any;
  }) {
    return (
      <Animated.View
        style={[styles.swiperPage, isActive && liftStyle]}>
        <NetworkImage
          uri={item.detailUrl || item.url}
          style={styles.fullImage}
          resizeMode="contain"
          accessibilityLabel="Selected profile media image"
        />
      </Animated.View>
    );
  },
  (prevProps, nextProps) =>
    prevProps.item.id === nextProps.item.id &&
    prevProps.isActive === nextProps.isActive,
);

function BurstDot({
  angle,
  progress,
}: {
  angle: number;
  progress: SharedValue<number>;
}) {
  const style = useAnimatedStyle(() => {
    const p = progress.value;
    const radius = BURST_DOT_DISTANCE * p;
    return {
      transform: [
        {translateX: Math.cos(angle) * radius},
        {translateY: Math.sin(angle) * radius},
        {scale: 1 - p * 0.4},
      ],
      opacity: p === 0 ? 0 : Math.max(0, 1 - p),
    };
  });
  return <Animated.View pointerEvents="none" style={[styles.burstDot, style]} />;
}

const ProfileMediaViewer = React.memo(function ProfileMediaViewer({
  media,
  initialIndex,
  initialRect,
  isOwnProfile,
  deletePending,
  onDelete,
  onDragDelete,
  onClose,
}: {
  media: MediaItem[];
  initialIndex: number;
  initialRect: TileRect;
  isOwnProfile?: boolean;
  deletePending: boolean;
  onDelete: (item: MediaItem) => void;
  onDragDelete: (item: MediaItem) => void;
  onClose: () => void;
}) {
  const {colors} = useTheme();
  const reducedMotion = useReducedMotion();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isLifted, setIsLifted] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const swiperRef = useRef<FlatList<MediaItem>>(null);
  const anchorRef = useRef<{rect: TileRect; index: number}>({
    rect: initialRect,
    index: initialIndex,
  });
  const deletePress = useSpringPress(0.96);
  const closePress = useSpringPress(0.92);

  const liftScale = useSharedValue(1);
  const liftTx = useSharedValue(0);
  const liftTy = useSharedValue(0);
  const isLiftedShared = useSharedValue(false);
  const isDeletingShared = useSharedValue(false);
  const backdropOpacity = useSharedValue(BACKDROP_OPACITY);
  const sourceRectX = useSharedValue(initialRect.x);
  const sourceRectY = useSharedValue(initialRect.y);
  const sourceRectW = useSharedValue(initialRect.width);
  const dropZoneOpacity = useSharedValue(0);
  const dropZoneScale = useSharedValue(1);
  const dropZoneGlow = useSharedValue(0);
  const isOverDeleteShared = useSharedValue(false);
  const burstProgress = useSharedValue(0);
  const canDeleteShared = useSharedValue(false);
  const reducedMotionShared = useSharedValue(false);

  const selectedMedia =
    currentIndex >= 0 && currentIndex < media.length
      ? media[currentIndex] ?? null
      : null;

  const liftStyle = useAnimatedStyle(() => ({
    transform: [
      {translateX: liftTx.value},
      {translateY: liftTy.value},
      {scale: liftScale.value},
    ],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const dropZoneStyle = useAnimatedStyle(() => ({
    opacity: dropZoneOpacity.value,
    transform: [{scale: dropZoneScale.value}],
  }));

  const dropZoneRingStyle = useAnimatedStyle(() => {
    const g = dropZoneGlow.value;
    return {
      opacity: dropZoneOpacity.value * (0.45 * (1 - g) + 0.15),
      transform: [{scale: 1 + g * 1.1}],
    };
  });

  const canDelete =
    !!isOwnProfile &&
    currentIndex >= 0 &&
    currentIndex < media.length &&
    !!media[currentIndex]?.bucket &&
    !!media[currentIndex]?.path;

  useEffect(() => {
    canDeleteShared.value = canDelete;
  }, [canDelete, canDeleteShared]);

  useEffect(() => {
    reducedMotionShared.value = !!reducedMotion;
  }, [reducedMotion, reducedMotionShared]);

  useEffect(() => {
    dropZoneOpacity.value = withSpring(
      isLifted && canDelete ? 1 : 0,
      SpringPresets.snappy,
    );
    if (!isLifted) {
      dropZoneScale.value = withSpring(1, SpringPresets.snappy);
      dropZoneGlow.value = withTiming(0, {duration: 160});
      isOverDeleteShared.value = false;
    }
  }, [
    canDelete,
    dropZoneGlow,
    dropZoneOpacity,
    dropZoneScale,
    isLifted,
    isOverDeleteShared,
  ]);

  useEffect(() => {
    // When user swipes to a different image in the viewer, reset burst/hover
    // state so the next drag starts clean.
    burstProgress.value = 0;
    isOverDeleteShared.value = false;
    dropZoneGlow.value = 0;
    dropZoneScale.value = 1;
  }, [burstProgress, currentIndex, dropZoneGlow, dropZoneScale, isOverDeleteShared]);

  const getSwiperItemLayout = useCallback(
    (_: ArrayLike<MediaItem> | null | undefined, index: number) => ({
      length: SCREEN_WIDTH,
      offset: SCREEN_WIDTH * index,
      index,
    }),
    [],
  );

  const closeViewer = useCallback(() => {
    setIsLifted(false);
    onClose();
  }, [onClose]);

  const activateLift = useCallback(() => {
    setIsLifted(true);
    Haptics.milestone();
  }, []);

  const selectedMediaRef = useRef<MediaItem | null>(null);
  useEffect(() => {
    selectedMediaRef.current = selectedMedia;
  }, [selectedMedia]);

  const handleAbsorbedDelete = useCallback(() => {
    const item = selectedMediaRef.current;
    if (!item) return;
    backdropOpacity.value = withTiming(0, {duration: 220});
    dropZoneOpacity.value = withTiming(0, {duration: 220});
    onDragDelete(item);
    // Small delay so the burst finishes on screen before the modal unmounts.
    setTimeout(() => {
      setIsDeleting(false);
      isDeletingShared.value = false;
      closeViewer();
    }, 260);
  }, [
    backdropOpacity,
    closeViewer,
    dropZoneOpacity,
    isDeletingShared,
    onDragDelete,
  ]);

  const handleSwipeEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const newIndex = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
      setCurrentIndex(prev => {
        if (prev === newIndex) return prev;
        Haptics.selection();
        const anchor = anchorRef.current;
        const newCol = newIndex % NUM_COLUMNS;
        const newRow = Math.floor(newIndex / NUM_COLUMNS);
        const anchorCol = anchor.index % NUM_COLUMNS;
        const anchorRow = Math.floor(anchor.index / NUM_COLUMNS);
        const deltaCol = newCol - anchorCol;
        const deltaRow = newRow - anchorRow;
        sourceRectX.value = anchor.rect.x + deltaCol * (TILE_SIZE + GAP);
        sourceRectY.value = anchor.rect.y + deltaRow * (TILE_SIZE + GAP);
        sourceRectW.value = anchor.rect.width;
        return newIndex;
      });
    },
    [sourceRectW, sourceRectX, sourceRectY],
  );

  const handleScrollToIndexFailed = useCallback((info: {index: number}) => {
    setTimeout(() => {
      swiperRef.current?.scrollToIndex({
        index: info.index,
        animated: false,
      });
    }, 80);
  }, []);

  const handleDeletePress = useCallback(() => {
    if (selectedMedia) {
      Haptics.tap();
      onDelete(selectedMedia);
    }
  }, [onDelete, selectedMedia]);

  const handleClosePress = useCallback(() => {
    Haptics.tap();
    closeViewer();
  }, [closeViewer]);

  const renderViewerItem = useCallback(
    ({item, index}: {item: MediaItem; index: number}) => (
      <MediaViewerPage
        item={item}
        isActive={index === currentIndex}
        liftStyle={liftStyle}
      />
    ),
    [currentIndex, liftStyle],
  );

  const triggerHoverHaptic = useCallback(() => {
    Haptics.selection();
  }, []);

  const triggerSuccessHaptic = useCallback(() => {
    Haptics.success();
  }, []);

  const startDeleteFromWorklet = useCallback(() => {
    setIsDeleting(true);
  }, []);

  // Long-press to lift (image shrinks + backdrop fades). Pan to drag.
  // Release into the bottom drop zone → delete with celebratory animation.
  // Release anywhere else → flies back to its source tile in the grid.
  const liftGesture = useMemo(() => {
    const longPress = Gesture.LongPress()
      .minDuration(280)
      .maxDistance(100000)
      .onStart(() => {
        'worklet';
        if (isDeletingShared.value) return;
        isLiftedShared.value = true;
        liftScale.value = withSpring(LIFT_SCALE, SpringPresets.snappy);
        backdropOpacity.value = withSpring(0, SpringPresets.snappy);
        runOnJS(activateLift)();
      });

    const pan = Gesture.Pan()
      .manualActivation(true)
      .onTouchesMove((_, manager) => {
        'worklet';
        if (isLiftedShared.value && !isDeletingShared.value) {
          manager.activate();
        }
      })
      .onUpdate(e => {
        'worklet';
        if (!isLiftedShared.value || isDeletingShared.value) return;
        liftTx.value = e.translationX;
        liftTy.value = e.translationY;

        if (!canDeleteShared.value) return;

        const imgCenterX = SCREEN_WIDTH / 2 + e.translationX;
        const imgCenterY = SCREEN_HEIGHT / 2 + e.translationY;
        const dx = imgCenterX - DELETE_ZONE_CENTER_X;
        const dy = imgCenterY - DELETE_ZONE_CENTER_Y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Proximity-based image shrink: closer → smaller (but never below min).
        const proximity = Math.min(1, Math.max(0, 1 - dist / 360));
        liftScale.value =
          LIFT_SCALE - (LIFT_SCALE - LIFT_SCALE_MIN) * proximity;

        const nowOver = dist < DELETE_ZONE_HIT_RADIUS;
        if (nowOver !== isOverDeleteShared.value) {
          isOverDeleteShared.value = nowOver;
          dropZoneScale.value = withSpring(
            nowOver ? 1.18 : 1,
            SpringPresets.bouncy,
          );
          dropZoneGlow.value = withTiming(nowOver ? 1 : 0, {duration: 220});
          runOnJS(triggerHoverHaptic)();
        }
      })
      .onTouchesUp(() => {
        'worklet';
        if (!isLiftedShared.value || isDeletingShared.value) return;
        isLiftedShared.value = false;

        if (isOverDeleteShared.value && canDeleteShared.value) {
          isDeletingShared.value = true;
          isOverDeleteShared.value = false;
          runOnJS(startDeleteFromWorklet)();

          // Absorb: pull image into the trash center and scale to 0.
          const absorbTx = DELETE_ZONE_CENTER_X - SCREEN_WIDTH / 2;
          const absorbTy = DELETE_ZONE_CENTER_Y - SCREEN_HEIGHT / 2;
          liftTx.value = withSpring(absorbTx, SpringPresets.snappy);
          liftTy.value = withSpring(absorbTy, SpringPresets.snappy);
          liftScale.value = withTiming(
            0,
            {duration: 240, easing: Easing.out(Easing.cubic)},
            finished => {
              'worklet';
              if (!finished) return;
              if (reducedMotionShared.value) {
                runOnJS(triggerSuccessHaptic)();
                runOnJS(handleAbsorbedDelete)();
                return;
              }
              // Trash bite bounce + radial burst + success haptic + commit.
              dropZoneScale.value = withSequence(
                withTiming(1.35, {duration: 120}),
                withSpring(1, SpringPresets.bouncy),
              );
              burstProgress.value = withTiming(1, {
                duration: 420,
                easing: Easing.out(Easing.cubic),
              });
              runOnJS(triggerSuccessHaptic)();
              runOnJS(handleAbsorbedDelete)();
            },
          );
          return;
        }

        // Fly-back-to-tile path (original behavior, unchanged).
        const tileCenterX = sourceRectX.value + sourceRectW.value / 2;
        const tileCenterY = sourceRectY.value + sourceRectW.value / 2;
        const targetTx = tileCenterX - SCREEN_WIDTH / 2;
        const targetTy = tileCenterY - SCREEN_HEIGHT / 2;
        const targetScale = sourceRectW.value / SCREEN_WIDTH;

        liftTx.value = withSpring(targetTx, SpringPresets.snappy);
        liftTy.value = withSpring(targetTy, SpringPresets.snappy);
        liftScale.value = withSpring(
          targetScale,
          SpringPresets.snappy,
          finished => {
            'worklet';
            if (finished) {
              runOnJS(closeViewer)();
            }
          },
        );
      });

    return Gesture.Simultaneous(longPress, pan);
  }, [
    activateLift,
    backdropOpacity,
    burstProgress,
    canDeleteShared,
    closeViewer,
    dropZoneGlow,
    dropZoneScale,
    handleAbsorbedDelete,
    isDeletingShared,
    isLiftedShared,
    isOverDeleteShared,
    liftScale,
    liftTx,
    liftTy,
    reducedMotionShared,
    sourceRectW,
    sourceRectX,
    sourceRectY,
    startDeleteFromWorklet,
    triggerHoverHaptic,
    triggerSuccessHaptic,
  ]);

  return (
    <Modal visible transparent animationType="fade">
      <GestureHandlerRootView style={styles.modalRoot}>
        <View style={styles.modalContainer}>
          <Animated.View
            style={[styles.modalBackdrop, backdropStyle]}
            pointerEvents="none"
          />
          <GestureDetector gesture={liftGesture}>
            <FlatList
              ref={swiperRef}
              data={media}
              extraData={currentIndex}
              scrollEnabled={!isLifted}
              keyExtractor={item => item.id}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              decelerationRate="fast"
              initialScrollIndex={initialIndex}
              getItemLayout={getSwiperItemLayout}
              onMomentumScrollEnd={handleSwipeEnd}
              onScrollToIndexFailed={handleScrollToIndexFailed}
              renderItem={renderViewerItem}
              {...MEDIA_VIEWER_LIST_PROPS}
            />
          </GestureDetector>

          {canDelete ? (
            <View style={styles.dropZoneLayer} pointerEvents="none">
              <Animated.View
                style={[styles.dropZoneRing, dropZoneRingStyle]}
              />
              <Animated.View style={[styles.dropZone, dropZoneStyle]}>
                <TrashIcon size={32} color="#FFFFFF" />
              </Animated.View>
              {BURST_DOT_ANGLES.map((angle, i) => (
                <View
                  key={i}
                  pointerEvents="none"
                  style={styles.burstAnchor}>
                  <BurstDot angle={angle} progress={burstProgress} />
                </View>
              ))}
            </View>
          ) : null}

          <View style={styles.modalTopBar} pointerEvents="box-none">
            {isOwnProfile &&
            selectedMedia?.bucket &&
            selectedMedia?.path &&
            !isLifted ? (
              <Animated.View style={deletePress.animatedStyle}>
                <Pressable
                  style={[
                    styles.deletePill,
                    deletePending && styles.deletePillBusy,
                  ]}
                  onPress={handleDeletePress}
                  onPressIn={deletePress.onPressIn}
                  onPressOut={deletePress.onPressOut}
                  disabled={deletePending}
                  accessibilityRole="button"
                  accessibilityLabel="Delete this image"
                  accessibilityState={{
                    busy: deletePending,
                    disabled: deletePending,
                  }}>
                  <View style={styles.deletePillIcon}>
                    {deletePending ? (
                      <ActivityIndicator size="small" color={colors.danger} />
                    ) : (
                      <TrashIcon size={14} color={colors.danger} />
                    )}
                  </View>
                  <Text
                    style={[styles.deletePillText, {color: colors.danger}]}>
                    {deletePending ? 'Deleting' : 'Delete'}
                  </Text>
                </Pressable>
              </Animated.View>
            ) : (
              <View style={styles.topBarSpacer} />
            )}

            {media.length > 1 && selectedMedia ? (
              <View style={styles.counterChip}>
                <Text style={styles.counterText}>
                  {currentIndex + 1} / {media.length}
                </Text>
              </View>
            ) : null}

            <Animated.View style={closePress.animatedStyle}>
              <Pressable
                style={styles.closeChip}
                onPress={handleClosePress}
                onPressIn={closePress.onPressIn}
                onPressOut={closePress.onPressOut}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Close image viewer">
                <XIcon size={18} color="#FFFFFF" />
              </Pressable>
            </Animated.View>
          </View>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
});

type PendingDelete = {
  item: MediaItem;
  position: {pageIndex: number; itemIndex: number};
};

export function ProfileMediaTab({userId, headerComponent, isOwnProfile}: ProfileMediaTabProps) {
  const [viewerState, setViewerState] = useState<ViewerState | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const undoButtonPress = useSpringPress(0.94);
  const profileMediaQueryKey = useMemo(() => ['profileMedia', userId] as const, [userId]);

  const query = useInfiniteQuery({
    queryKey: profileMediaQueryKey,
    queryFn: ({pageParam}) =>
      isOwnProfile
        ? mobileApi.getProfileMedia(pageParam ?? null)
        : mobileApi.getVisitedProfileMedia(userId, pageParam ?? null),
    initialPageParam: null as string | null,
    getNextPageParam: lastPage => lastPage.nextCursor ?? undefined,
    maxPages: 5,
  });

  useEffect(() => {
    return () => {
      queryClient.removeQueries({queryKey: profileMediaQueryKey, exact: true});
    };
  }, [profileMediaQueryKey]);

  const media = useMemo(
    () => query.data?.pages.flatMap(p => p.data ?? []) ?? [],
    [query.data?.pages],
  );

  const deleteMutation = useMutation({
    mutationFn: (item: MediaItem) => {
      if (!item.bucket || !item.path) throw new Error('Missing media info');
      return mobileApi.deleteProfileMediaImage({bucket: item.bucket, path: item.path, url: item.url});
    },
    onSuccess: (response, deletedItem) => {
      setViewerState(null);
      queryClient.setQueryData(profileMediaQueryKey, (oldData: any) => {
        if (!oldData?.pages) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map((page: any) => ({
            ...page,
            data: Array.isArray(page?.data) ? page.data.filter((m: MediaItem) => m.id !== deletedItem.id) : page?.data,
          })),
        };
      });
      if (response?.clearedAvatar || response?.clearedBackground) {
        queryClient.invalidateQueries({queryKey: ['profile', userId]});
      }
    },
    onError: e => Alert.alert('Error', e instanceof Error ? e.message : 'Failed to delete'),
  });

  const removeItemFromCache = useCallback(
    (item: MediaItem): PendingDelete['position'] | null => {
      const cached = queryClient.getQueryData<any>(profileMediaQueryKey);
      if (!cached?.pages) return null;
      let foundPageIndex = -1;
      let foundItemIndex = -1;
      const newPages = cached.pages.map((page: any, pageIdx: number) => {
        if (!Array.isArray(page?.data)) return page;
        const idx = page.data.findIndex((m: MediaItem) => m.id === item.id);
        if (idx < 0 || foundPageIndex >= 0) return page;
        foundPageIndex = pageIdx;
        foundItemIndex = idx;
        return {
          ...page,
          data: page.data.filter((_: any, i: number) => i !== idx),
        };
      });
      if (foundPageIndex < 0) return null;
      queryClient.setQueryData(profileMediaQueryKey, {
        ...cached,
        pages: newPages,
      });
      return {pageIndex: foundPageIndex, itemIndex: foundItemIndex};
    },
    [profileMediaQueryKey],
  );

  const restoreItemToCache = useCallback(
    (item: MediaItem, position: PendingDelete['position']) => {
      const cached = queryClient.getQueryData<any>(profileMediaQueryKey);
      if (!cached?.pages) return;
      const newPages = cached.pages.map((page: any, pageIdx: number) => {
        if (pageIdx !== position.pageIndex || !Array.isArray(page?.data)) {
          return page;
        }
        if (page.data.some((m: MediaItem) => m.id === item.id)) return page;
        const next = [...page.data];
        const insertAt = Math.min(position.itemIndex, next.length);
        next.splice(insertAt, 0, item);
        return {...page, data: next};
      });
      queryClient.setQueryData(profileMediaQueryKey, {
        ...cached,
        pages: newPages,
      });
    },
    [profileMediaQueryKey],
  );

  const handleDelete = useCallback(
    (item: MediaItem) => {
      Alert.alert(
        'Delete image?',
        'This image will be deleted permanently. This action can\u2019t be undone.',
        [
          {text: 'Cancel', style: 'cancel'},
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => deleteMutation.mutate(item),
          },
        ],
      );
    },
    [deleteMutation],
  );

  const handleDragDelete = useCallback(
    (item: MediaItem) => {
      if (undoTimerRef.current) {
        clearTimeout(undoTimerRef.current);
        undoTimerRef.current = null;
      }
      const position = removeItemFromCache(item);
      if (!position) return;
      setPendingDelete({item, position});
      undoTimerRef.current = setTimeout(() => {
        undoTimerRef.current = null;
        setPendingDelete(null);
        deleteMutation.mutate(item, {
          onError: () => {
            restoreItemToCache(item, position);
          },
        });
      }, 4000);
    },
    [deleteMutation, removeItemFromCache, restoreItemToCache],
  );

  const handleUndo = useCallback(() => {
    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current);
      undoTimerRef.current = null;
    }
    setPendingDelete(current => {
      if (current) {
        restoreItemToCache(current.item, current.position);
        Haptics.tap();
      }
      return null;
    });
  }, [restoreItemToCache]);

  useEffect(() => {
    return () => {
      if (undoTimerRef.current) {
        clearTimeout(undoTimerRef.current);
        undoTimerRef.current = null;
      }
    };
  }, []);

  const closeViewer = useCallback(() => {
    setViewerState(null);
  }, []);

  // Capture the tapped tile's screen rect, reset lift state, then open viewer.
  // The tapped tile becomes the "anchor" used to compute fly-back targets
  // for any sibling images the user later swipes to.
  const onSelectTile = useCallback(
    (index: number, rect: TileRect) => {
      setViewerState({initialIndex: index, initialRect: rect});
    },
    [],
  );

  const renderGridItem = useCallback(
    ({item, index}: {item: MediaItem; index: number}) => (
      <MediaGridTile
        item={item}
        index={index}
        isOwnProfile={isOwnProfile}
        onSelect={onSelectTile}
        onDelete={handleDelete}
      />
    ),
    [handleDelete, isOwnProfile, onSelectTile],
  );

  return (
    <>
      <FlatList
        data={media}
        {...IMAGE_GRID_LIST_PROPS}
        keyExtractor={item => item.id}
        numColumns={NUM_COLUMNS}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        columnWrapperStyle={styles.row}
        ListHeaderComponent={headerComponent}
        onEndReachedThreshold={0.3}
        onEndReached={() => {
          if (query.hasNextPage && !query.isFetchingNextPage) query.fetchNextPage();
        }}
        ListEmptyComponent={
          query.isLoading ? null : (
            <EmptyState title="No media yet" subtitle="Images from posts will appear here." />
          )
        }
        renderItem={renderGridItem}
      />
      {viewerState ? (
        <ProfileMediaViewer
          media={media}
          initialIndex={viewerState.initialIndex}
          initialRect={viewerState.initialRect}
          isOwnProfile={isOwnProfile}
          deletePending={deleteMutation.isPending}
          onDelete={handleDelete}
          onDragDelete={handleDragDelete}
          onClose={closeViewer}
        />
      ) : null}
      {pendingDelete ? (
        <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
          <View style={styles.undoToast}>
            <Text style={styles.undoToastText}>Image deleted</Text>
            <Animated.View style={undoButtonPress.animatedStyle}>
              <Pressable
                onPress={handleUndo}
                onPressIn={undoButtonPress.onPressIn}
                onPressOut={undoButtonPress.onPressOut}
                style={styles.undoButton}
                accessibilityRole="button"
                accessibilityLabel="Undo delete">
                <Text style={styles.undoButtonText}>Undo</Text>
              </Pressable>
            </Animated.View>
          </View>
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  list: {paddingHorizontal: spacing.lg, paddingBottom: 100},
  row: {gap: GAP, marginBottom: GAP},
  tile: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    borderRadius: 4,
    backgroundColor: '#1a1a1a',
  },
  tileMenuBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 10,
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalRoot: {
    flex: 1,
  },
  modalContainer: {
    flex: 1,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
  modalTopBar: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topBarSpacer: {
    width: 36,
    height: 36,
  },
  counterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.18)',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  counterText: {
    color: '#FFFFFF',
    fontFamily: fonts.ui.semiBold,
    fontSize: 12,
    letterSpacing: 0.4,
    fontVariant: ['tabular-nums'],
  },
  swiperPage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeChip: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.18)',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  deletePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingLeft: 12,
    paddingRight: 16,
    paddingVertical: 9,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(239,68,68,0.45)',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  deletePillBusy: {
    opacity: 0.7,
  },
  deletePillIcon: {
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deletePillText: {
    fontFamily: fonts.ui.semiBold,
    fontSize: 13,
    letterSpacing: 0.2,
  },
  fullImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.78,
  },
  dropZoneLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 5,
  },
  dropZone: {
    position: 'absolute',
    left: DELETE_ZONE_CENTER_X - DELETE_ZONE_SIZE / 2,
    top: DELETE_ZONE_CENTER_Y - DELETE_ZONE_SIZE / 2,
    width: DELETE_ZONE_SIZE,
    height: DELETE_ZONE_SIZE,
    borderRadius: DELETE_ZONE_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239,68,68,0.92)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
    shadowColor: '#EF4444',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.55,
    shadowRadius: 24,
    elevation: 14,
  },
  dropZoneRing: {
    position: 'absolute',
    left: DELETE_ZONE_CENTER_X - DELETE_ZONE_SIZE / 2,
    top: DELETE_ZONE_CENTER_Y - DELETE_ZONE_SIZE / 2,
    width: DELETE_ZONE_SIZE,
    height: DELETE_ZONE_SIZE,
    borderRadius: DELETE_ZONE_SIZE / 2,
    borderWidth: 2,
    borderColor: 'rgba(239,68,68,0.9)',
  },
  burstAnchor: {
    position: 'absolute',
    left: DELETE_ZONE_CENTER_X - 5,
    top: DELETE_ZONE_CENTER_Y - 5,
    width: 10,
    height: 10,
  },
  burstDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
    shadowColor: '#EF4444',
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 4,
  },
  undoToast: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 18,
    paddingRight: 8,
    paddingVertical: 10,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(20,16,14,0.96)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.14)',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 6},
    shadowOpacity: 0.5,
    shadowRadius: 14,
    elevation: 12,
  },
  undoToastText: {
    color: '#FFFFFF',
    fontFamily: fonts.ui.semiBold,
    fontSize: 14,
    letterSpacing: 0.2,
  },
  undoButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(196,148,62,0.55)',
  },
  undoButtonText: {
    color: '#E8C581',
    fontFamily: fonts.ui.semiBold,
    fontSize: 13,
    letterSpacing: 0.4,
  },
});
