import { useEffect, useRef } from 'react';
import {
  Animated,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from './Avatar';
import { colors, fonts, spacing } from '../../theme';

interface NotificationBannerProps {
  visible: boolean;
  title: string;
  subtitle?: string;
  avatarUrl?: string | null;
  avatarName: string;
  onPress: () => void;
  onDismiss: () => void;
}

const AUTO_DISMISS_MS = 4000;

export function NotificationBanner({
  visible,
  title,
  subtitle,
  avatarUrl,
  avatarName,
  onPress,
  onDismiss,
}: NotificationBannerProps) {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-200)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const touchActiveRef = useRef(false);

  const startAutoHide = () => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (!touchActiveRef.current) {
        slideOut();
      }
    }, AUTO_DISMISS_MS);
  };

  const slideOut = () => {
    clearTimeout(timerRef.current);
    Animated.timing(translateY, {
      toValue: -200,
      duration: 200,
      useNativeDriver: true,
    }).start(() => onDismiss());
  };

  useEffect(() => {
    if (visible) {
      Animated.spring(translateY, {
        toValue: 0,
        damping: 20,
        stiffness: 300,
        useNativeDriver: true,
      }).start();
      startAutoHide();
    } else {
      slideOut();
    }
    return () => clearTimeout(timerRef.current);
  }, [visible]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dy) > 5,
      onPanResponderGrant: () => {
        touchActiveRef.current = true;
        clearTimeout(timerRef.current);
      },
      onPanResponderMove: (_, gs) => {
        if (gs.dy < 0) {
          translateY.setValue(gs.dy);
        }
      },
      onPanResponderRelease: (_, gs) => {
        touchActiveRef.current = false;
        if (gs.dy < -20) {
          slideOut();
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            damping: 20,
            stiffness: 300,
            useNativeDriver: true,
          }).start();
          startAutoHide();
        }
      },
    })
  ).current;

  return (
    <Animated.View
      style={[
        styles.wrapper,
        { paddingTop: insets.top + spacing.hairline, transform: [{ translateY }] },
      ]}
      {...panResponder.panHandlers}
    >
      <Pressable onPress={onPress} style={styles.container}>
        <Avatar uri={avatarUrl} name={avatarName} size={36} />
        <View style={styles.textContainer}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    paddingHorizontal: spacing.column,
    paddingBottom: spacing.tight,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.gutter,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.rule,
    paddingHorizontal: spacing.column,
    paddingVertical: spacing.gutter,
  },
  textContainer: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontFamily: fonts.serif,
    fontSize: 15,
    color: colors.ink,
  },
  subtitle: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.muted,
  },
});
