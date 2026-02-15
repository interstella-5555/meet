import { useRef, useEffect, useState } from 'react';
import { View, Text, Animated, Easing, StyleSheet } from 'react-native';
import { colors, fonts } from '../../theme';

const DEFAULT_MESSAGES = [
  'Analizuje Twoja odpowiedz...',
  'Przygotowuje kolejne pytanie...',
  'Zastanawiam sie nad czyms ciekawym...',
  'Jeszcze chwilka...',
  'Szukam najlepszego pytania...',
];

interface ThinkingIndicatorProps {
  messages?: string[];
}

export function ThinkingIndicator({ messages = DEFAULT_MESSAGES }: ThinkingIndicatorProps) {
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;
  const textOpacity = useRef(new Animated.Value(1)).current;
  const [messageIndex, setMessageIndex] = useState(0);

  // Pulsing dots
  useEffect(() => {
    const pulse = (dot: Animated.Value) =>
      Animated.sequence([
        Animated.timing(dot, {
          toValue: 1,
          duration: 500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(dot, {
          toValue: 0.3,
          duration: 500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]);

    const animation = Animated.loop(
      Animated.stagger(200, [pulse(dot1), pulse(dot2), pulse(dot3)])
    );
    animation.start();
    return () => animation.stop();
  }, [dot1, dot2, dot3]);

  // Rotating messages
  useEffect(() => {
    if (messages.length <= 1) return;

    const interval = setInterval(() => {
      Animated.timing(textOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setMessageIndex((i) => (i + 1) % messages.length);
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [messages, textOpacity]);

  return (
    <View style={styles.container}>
      <View style={styles.dots}>
        {[dot1, dot2, dot3].map((dot, i) => (
          <Animated.View key={i} style={[styles.dot, { opacity: dot }]} />
        ))}
      </View>
      <Animated.Text style={[styles.message, { opacity: textOpacity }]}>
        {messages[messageIndex]}
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 16,
  },
  dots: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.muted,
  },
  message: {
    fontFamily: fonts.serifItalic,
    fontSize: 15,
    color: colors.muted,
  },
});
