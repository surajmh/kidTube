import React from 'react';
import { Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Avatar } from '../Avatar';
import { FocusablePressable } from '../tv';
import { yt } from '../youtube/theme';
import styles from './parentDashboard.style';
import { DASHBOARD_COPY, LIBRARY_TILES, MANAGE_TILES, OVERVIEW_STATS } from './parentDashboard.constant';
import type { DashboardTile } from './parentDashboard.constant';
import type { ParentDashboardProps } from './parentDashboard.type';

/** The Parent Mode home: who is being managed, a family summary, and the way into every other page. */
export function ParentDashboard({ profile, counts, onOpen }: ParentDashboardProps) {
  return (
    <View>
      {profile ? (
        <View style={styles.childCard}>
          <Avatar profile={profile} size={56} />
          <View style={styles.childInfo}>
            <Text style={styles.childName} numberOfLines={1}>{profile.name}</Text>
            <Text style={styles.childCaption}>{DASHBOARD_COPY.childCaption}</Text>
          </View>
          <FocusablePressable accessibilityLabel={DASHBOARD_COPY.manageChildren} style={styles.pill} onPress={() => onOpen('children')}>
            <Text style={styles.pillText}>{DASHBOARD_COPY.manageChildren}</Text>
            <Feather name="chevron-right" size={16} color={yt.text} />
          </FocusablePressable>
        </View>
      ) : null}

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{DASHBOARD_COPY.overviewTitle}</Text>
          <FocusablePressable accessibilityLabel={DASHBOARD_COPY.overviewAction} style={styles.link} onPress={() => onOpen('activity')}>
            <Text style={styles.linkText}>{DASHBOARD_COPY.overviewAction}</Text>
            <Feather name="chevron-right" size={16} color={yt.textDim} />
          </FocusablePressable>
        </View>
        <View style={styles.statsRow}>
          {OVERVIEW_STATS.map((stat) => (
            <View key={stat.key} style={styles.stat} accessibilityLabel={`${counts[stat.key]} ${stat.label}`}>
              <View style={[styles.statIcon, { backgroundColor: stat.wash }]}>
                <Feather name={stat.icon} size={18} color={stat.glyph} />
              </View>
              <Text style={styles.statValue}>{counts[stat.key]}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>
      </View>

      <TileSection title={DASHBOARD_COPY.manageTitle} body={DASHBOARD_COPY.manageBody} tiles={MANAGE_TILES} onOpen={onOpen} />
      <TileSection title={DASHBOARD_COPY.libraryTitle} body={DASHBOARD_COPY.libraryBody} tiles={LIBRARY_TILES} onOpen={onOpen} />
    </View>
  );
}

function TileSection({ title, body, tiles, onOpen }: { title: string; body: string; tiles: DashboardTile[]; onOpen: ParentDashboardProps['onOpen'] }) {
  return (
    <View>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionBody}>{body}</Text>
      <View style={styles.grid}>
        {tiles.map((tile) => (
          <FocusablePressable key={tile.id} accessibilityLabel={tile.label} style={styles.tile} onPress={() => onOpen(tile.id)}>
            <View style={styles.tileTop}>
              <View style={[styles.tileIcon, { backgroundColor: tile.tint }]}>
                <Feather name={tile.icon} size={22} color="#1A1A1A" />
              </View>
              <Feather name="chevron-right" size={18} color={yt.textDim} />
            </View>
            <Text style={styles.tileLabel}>{tile.label}</Text>
            <Text style={styles.tileHint}>{tile.hint}</Text>
          </FocusablePressable>
        ))}
      </View>
    </View>
  );
}
