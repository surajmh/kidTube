import React from 'react';
import { Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { FocusablePressable } from '../tv';
import { ICON, KID_DESTINATIONS } from './kidHome.constant';
import { KidTab } from './kidHome.type';
import styles from './kidHome.style';

export function BottomNav({
  tab,
  pendingRequestCount,
  downloadsEnabled = true,
  onChangeTab,
}: {
  tab: KidTab;
  downloadsEnabled?: boolean;
  pendingRequestCount: number;
  onChangeTab: (tab: KidTab) => void;
}) {
  return (
    <View style={styles.bottomNav}>
      {KID_DESTINATIONS.filter((item) => downloadsEnabled || item.id !== 'downloads').map((item) => {
        const active = item.id === tab || (item.id === 'home' && tab === 'categories');
        return (
          <FocusablePressable
            key={item.id}
            accessibilityLabel={item.label}
            style={styles.navItem}
            onPress={() => onChangeTab(item.id)}
          >
            <View>
              <Feather
                name={item.icon as keyof typeof Feather.glyphMap}
                size={22}
                color={active ? ICON.ink : ICON.inkDim}
              />
              {item.id === 'requests' && pendingRequestCount > 0 ? (
                <View style={styles.navBadge}>
                  <Text style={styles.navBadgeText}>{pendingRequestCount}</Text>
                </View>
              ) : null}
            </View>
            <Text style={[styles.navLabel, active && styles.navLabelActive]}>{item.label}</Text>
          </FocusablePressable>
        );
      })}
    </View>
  );
}
