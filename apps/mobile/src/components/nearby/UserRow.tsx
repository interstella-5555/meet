import {
  View,
  Text,
  Animated,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useRef, useEffect } from 'react';
import { colors, fonts, spacing } from '../../theme';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { IconWave, IconCheck } from '../ui/icons';

interface UserRowProps {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  distance: number;
  hasWaved: boolean;
  isWaving: boolean;
  onWave: () => void;
}

const formatDistance = (meters: number): string => {
  const rounded = Math.round(meters / 100) * 100;
  if (rounded < 1000) {
    return `~${rounded} m`;
  }
  return `~${(rounded / 1000).toFixed(1)} km`;
};

export function UserRow({
  displayName,
  avatarUrl,
  distance,
  hasWaved,
  isWaving,
  onWave,
}: UserRowProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const prevHasWaved = useRef(hasWaved);

  useEffect(() => {
    if (hasWaved && !prevHasWaved.current) {
      Animated.sequence([
        Animated.spring(scale, {
          toValue: 1.4,
          useNativeDriver: true,
          speed: 50,
          bounciness: 12,
        }),
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
          speed: 30,
          bounciness: 8,
        }),
      ]).start();
    }
    prevHasWaved.current = hasWaved;
  }, [hasWaved]);

  return (
    <View style={styles.row}>
      <Avatar uri={avatarUrl} name={displayName} size={40} />
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {displayName}
        </Text>
        <Text style={styles.distance}>{formatDistance(distance)}</Text>
      </View>
      <Animated.View style={{ transform: [{ scale }] }}>
        <Button
          variant="wave"
          onPress={onWave}
          disabled={hasWaved || isWaving}
        >
          {isWaving ? (
            <ActivityIndicator size="small" color={colors.ink} />
          ) : hasWaved ? (
            <IconCheck size={16} color={colors.ink} />
          ) : (
            <IconWave size={16} color={colors.ink} />
          )}
        </Button>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.compact,
    paddingHorizontal: spacing.column,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.rule,
  },
  info: {
    flex: 1,
    marginLeft: spacing.gutter,
  },
  name: {
    fontFamily: fonts.serif,
    fontSize: 15,
    color: colors.ink,
  },
  distance: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.muted,
    marginTop: 1,
  },
});
