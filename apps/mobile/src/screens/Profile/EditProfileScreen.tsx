import React, {useEffect, useState} from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {useMutation, useQuery} from '@tanstack/react-query';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {SafeAreaView} from 'react-native-safe-area-context';
import {launchImageLibrary} from 'react-native-image-picker';
import {Avatar} from '../../components/Avatar';
import {PrimaryButton} from '../../components/PrimaryButton';
import {ChevronRightIcon} from '../../components/icons';
import {useAuth} from '../../features/auth/AuthProvider';
import {useTheme} from '../../theme/ThemeProvider';
import {mobileApi} from '../../lib/api/mobileApi';
import {queryClient} from '../../lib/queryClient';
import {fonts, typeScale} from '../../theme/typography';
import {spacing, radii} from '../../theme/spacing';
import type {RootStackParamList} from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'EditProfile'>;

const NAME_MAX = 20;
const BIO_MAX = 150;

export function EditProfileScreen({navigation}: Props) {
  const {session} = useAuth();
  const {colors, isDark, scaledType} = useTheme();
  const userId = session?.user.id ?? '';

  const profileQuery = useQuery({
    queryKey: ['profile', userId],
    enabled: Boolean(userId),
    queryFn: () => mobileApi.getUserData(userId),
    staleTime: 5 * 60 * 1000,
  });
  const profile = profileQuery.data?.userData?.[0];

  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [pickedImage, setPickedImage] = useState<{uri: string; type: string; name: string} | null>(null);

  useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      setBio(profile.bio || '');
      setAvatarUri(profile.image_url || null);
    }
  }, [profile]);

  const saveMutation = useMutation({
    mutationFn: () =>
      mobileApi.updateUserData({
        name: name.trim(),
        bio: bio.trim(),
        image: pickedImage ?? undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['profile', userId]});
      Alert.alert('Saved', 'Profile updated.');
      navigation.goBack();
    },
    onError: e => Alert.alert('Error', e instanceof Error ? e.message : 'Failed to save'),
  });

  const pickAvatar = async () => {
    const result = await launchImageLibrary({mediaType: 'photo', quality: 0.8});
    if (result.didCancel || !result.assets?.[0]) return;
    const asset = result.assets[0];
    if (asset.uri) {
      setAvatarUri(asset.uri);
      setPickedImage({
        uri: asset.uri,
        type: asset.type || 'image/jpeg',
        name: asset.fileName || 'avatar.jpg',
      });
    }
  };

  const deleteAvatarMutation = useMutation({
    mutationFn: () => {
      const imageUrl = profile?.image_url;
      if (!imageUrl) throw new Error('No image to delete');
      // Extract the storage path from the Supabase public URL
      // URL format: .../storage/v1/object/public/avatars/user_id_<id>/filename
      const bucketSegment = '/avatars/';
      const idx = imageUrl.indexOf(bucketSegment);
      const path = idx !== -1 ? imageUrl.substring(idx + bucketSegment.length) : '';
      return mobileApi.deleteProfileMediaImage({bucket: 'avatars', path, url: imageUrl});
    },
    onSuccess: () => {
      setAvatarUri(null);
      setPickedImage(null);
      queryClient.invalidateQueries({queryKey: ['profile', userId]});
      Alert.alert('Deleted', 'Profile photo removed.');
    },
    onError: e => Alert.alert('Error', e instanceof Error ? e.message : 'Failed to delete'),
  });

  const handleRemoveAvatar = () => {
    Alert.alert('Delete photo?', 'This will permanently remove your profile photo.', [
      {text: 'Cancel', style: 'cancel'},
      {text: 'Delete', style: 'destructive', onPress: () => deleteAvatarMutation.mutate()},
    ]);
  };

  const canSave = name.trim().length > 0 && name.trim().length <= NAME_MAX && bio.trim().length <= BIO_MAX;

  const inputBg = isDark ? colors.bgElevated : colors.bgPrimary;

  return (
    <SafeAreaView style={[styles.safe, {backgroundColor: colors.bgPrimary}]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <Pressable onPress={pickAvatar}>
            <Avatar uri={avatarUri} name={name} size={90} />
          </Pressable>
          <Pressable onPress={pickAvatar}>
            <Text style={[styles.changePhotoText, {color: colors.accentAmber}]}>
              Change Photo
            </Text>
          </Pressable>
          {(avatarUri || profile?.image_url) && (
            <Pressable onPress={handleRemoveAvatar} disabled={deleteAvatarMutation.isPending}>
              <Text style={[styles.removePhotoText, {color: colors.danger}]}>
                {deleteAvatarMutation.isPending ? 'Removing...' : 'Remove Photo'}
              </Text>
            </Pressable>
          )}
        </View>

        {/* Name */}
        <View style={styles.field}>
          <View style={styles.labelRow}>
            <Text style={[styles.label, scaledType.label, {color: colors.textMuted}]}>NAME</Text>
            <Text style={[styles.counter, {color: name.length > NAME_MAX ? colors.danger : colors.textFaint}]}>
              {name.length}/{NAME_MAX}
            </Text>
          </View>
          <TextInput
            value={name}
            onChangeText={setName}
            maxLength={NAME_MAX}
            placeholder="Your display name"
            placeholderTextColor={colors.textFaint}
            style={[styles.input, {backgroundColor: inputBg, borderColor: colors.borderCard, color: colors.textPrimary}]}
          />
        </View>

        {/* Bio */}
        <View style={styles.field}>
          <View style={styles.labelRow}>
            <Text style={[styles.label, scaledType.label, {color: colors.textMuted}]}>BIO</Text>
            <Text style={[styles.counter, {color: bio.length > BIO_MAX ? colors.danger : colors.textFaint}]}>
              {bio.length}/{BIO_MAX}
            </Text>
          </View>
          <TextInput
            value={bio}
            onChangeText={setBio}
            maxLength={BIO_MAX}
            placeholder="Tell others about yourself"
            placeholderTextColor={colors.textFaint}
            multiline
            textAlignVertical="top"
            style={[styles.input, styles.bioInput, {backgroundColor: inputBg, borderColor: colors.borderCard, color: colors.textPrimary}]}
          />
        </View>

        {/* Save */}
        <PrimaryButton
          label="Save"
          onPress={() => saveMutation.mutate()}
          loading={saveMutation.isPending}
          disabled={!canSave || saveMutation.isPending}
        />

        {/* Customize link */}
        <Pressable
          style={[styles.customizeRow, {backgroundColor: colors.bgCard, borderColor: colors.borderCard}]}
          onPress={() => navigation.navigate('ProfileCustomize')}>
          <Text style={[styles.customizeText, {color: colors.textPrimary}]}>
            Customize Font & Background
          </Text>
          <ChevronRightIcon size={18} color={colors.textMuted} />
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1},
  content: {padding: spacing.lg, gap: spacing.xl, paddingBottom: 100},
  avatarSection: {alignItems: 'center', gap: spacing.sm},
  changePhotoText: {fontFamily: fonts.ui.semiBold, fontSize: 14},
  removePhotoText: {fontFamily: fonts.ui.regular, fontSize: 13},
  field: {gap: spacing.xs},
  labelRow: {flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.xs},
  label: {...typeScale.label, marginLeft: spacing.xs},
  counter: {fontFamily: fonts.ui.regular, fontSize: 12},
  input: {
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    fontSize: 15,
    fontFamily: fonts.ui.regular,
  },
  bioInput: {minHeight: 100},
  customizeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderRadius: radii.xl,
    borderWidth: 1,
  },
  customizeText: {fontFamily: fonts.ui.semiBold, fontSize: 15},
});
