import {Platform} from 'react-native';

export const VERTICAL_CARD_LIST_PROPS = {
  initialNumToRender: 5,
  maxToRenderPerBatch: 5,
  windowSize: 5,
  updateCellsBatchingPeriod: 50,
  removeClippedSubviews: Platform.OS === 'android',
} as const;

export const COMPACT_VERTICAL_LIST_PROPS = {
  initialNumToRender: 8,
  maxToRenderPerBatch: 8,
  windowSize: 5,
  updateCellsBatchingPeriod: 50,
  removeClippedSubviews: Platform.OS === 'android',
} as const;

export const HORIZONTAL_CARD_LIST_PROPS = {
  initialNumToRender: 4,
  maxToRenderPerBatch: 4,
  windowSize: 3,
  updateCellsBatchingPeriod: 50,
  removeClippedSubviews: Platform.OS === 'android',
} as const;

export const IMAGE_GRID_LIST_PROPS = {
  initialNumToRender: 12,
  maxToRenderPerBatch: 6,
  windowSize: 3,
  updateCellsBatchingPeriod: 50,
  removeClippedSubviews: true,
} as const;
