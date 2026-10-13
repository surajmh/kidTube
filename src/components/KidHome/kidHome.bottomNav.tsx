import { useTheme } from '../theme';
import React from 'react';
import { Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { FocusablePressable } from '../tv';
import { KID_DESTINATIONS } from './kidHome.constant';
import { KidTab } from './kidHome.type';
import useStyles from './kidHome.style';

export function BottomNav({
  tab,
  pendingRequestCount,
  downloadsEnabled = true,
  onChangeTab,
  onLayout,
}: {
  tab: KidTab;
  downloadsEnabled?: boolean;
  pendingRequestCount: number;
  onChangeTab: (tab: KidTab) => void;
  onLayout?: (height: number) => void;
}) {
  const styles = useStyles();
  const { ICON } = useTheme();
  return (
    <View style={styles.bottomNav} onLayout={({ nativeEvent }) => onLayout?.(nativeEvent.layout.height)}>
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
