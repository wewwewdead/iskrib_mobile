import React from 'react';
import {Modal, Pressable, StyleSheet, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {XIcon} from './icons';
import {NetworkImage} from './NetworkImage';

interface ImageViewerModalProps {
  uri: string | null;
  onClose: () => void;
}

export function ImageViewerModal({uri, onClose}: ImageViewerModalProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={!!uri}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable
          style={[styles.closeButton, {top: insets.top + 12}]}
          onPress={onClose}
          hitSlop={12}>
          <XIcon size={24} color="#fff" />
        </Pressable>
        <Pressable style={styles.imageArea} onPress={onClose}>
          {uri ? (
            <NetworkImage
              uri={uri}
              accessibilityLabel="Expanded image"
              style={styles.image}
              resizeMode="contain"
            />
          ) : null}
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
  },
  closeButton: {
    position: 'absolute',
    right: 16,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageArea: {
    flex: 1,
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '80%',
  },
});
