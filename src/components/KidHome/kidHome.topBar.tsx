import React from 'react';
import { Image, ScrollView, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ChildProfile } from '../../types';
import { FocusablePressable } from '../tv';
import { ChannelAvatar } from '../youtube/VideoCard';
import { ICON, KID_COPY } from './kidHome.constant';
import styles from './kidHome.style';

export function TopBar({
  searching,
  query,
  setQuery,
  activeProfile,
  closeSearch,
  openSearch,
  toggleSwitcher,
  onParentPress,
}: {
  searching: boolean;
  query: string;
  setQuery: (query: string) => void;
  activeProfile?: ChildProfile;
  closeSearch: () => void;
  openSearch: () => void;
  toggleSwitcher: () => void;
  onParentPress: () => void;
}) {
  return (
    <View style={styles.topBar}>
      {searching ? (
        <>
          <FocusablePressable
            accessibilityLabel="Close search"
            style={styles.iconButton}
            onPress={closeSearch}
          >
            <Feather name="arrow-left" size={22} color={ICON.ink} />
          </FocusablePressable>
          <TextInput
            value={query}
            onChangeText={setQuery}
            autoFocus
            placeholder={KID_COPY.searchPlaceholder}
            placeholderTextColor={ICON.inkDim}
            style={styles.searchField}
            accessibilityLabel={KID_COPY.searchPlaceholder}
          />
        </>
      ) : (
        <>
          <View style={styles.brand}>
            <Image source={require('../../../assets/icon.png')} style={styles.brandMark} resizeMode="contain" />
            <Text style={styles.brandText}>kidTube</Text>
          </View>
          <View style={styles.topActions}>
            <FocusablePressable
              accessibilityLabel="Search"
              style={styles.iconButton}
              onPress={openSearch}
            >
              <Feather name="search" size={21} color={ICON.ink} />
            </FocusablePressable>
            <FocusablePressable
              accessibilityLabel={`Signed in as ${activeProfile?.name ?? 'explorer'}`}
              style={styles.iconButton}
              onPress={toggleSwitcher}
            >
              <ChannelAvatar name={activeProfile?.name ?? '?'} size={28} />
            </FocusablePressable>
            <FocusablePressable
              accessibilityLabel="Open parent mode"
              style={styles.iconButton}
              onPress={onParentPress}
            >
              <Feather name="lock" size={19} color={ICON.inkDim} />
            </FocusablePressable>
          </View>
        </>
      )}
    </View>
  );
}

export function ProfileSwitcher({
  profiles,
  activeProfile,
  onSelectProfile,
  closeSwitcher,
}: {
  profiles: ChildProfile[];
  activeProfile?: ChildProfile;
  onSelectProfile: (profileId: string) => void;
  closeSwitcher: () => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.switcher}>
      {profiles.map((profile) => (
        <FocusablePressable
          key={profile.id}
          accessibilityLabel={`Switch to ${profile.name}`}
          style={[styles.switcherItem, activeProfile?.id === profile.id && styles.switcherItemActive]}
          onPress={() => {
            onSelectProfile(profile.id);
            closeSwitcher();
          }}
        >
          <ChannelAvatar name={profile.name} size={24} />
          <Text
            style={[styles.switcherText, activeProfile?.id === profile.id && styles.switcherTextActive]}
          >
            {profile.name}
          </Text>
        </FocusablePressable>
      ))}
    </ScrollView>
  );
}
