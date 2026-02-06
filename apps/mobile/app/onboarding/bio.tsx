import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useOnboardingStore } from '../../src/stores/onboardingStore';
import { colors, type as typ, spacing, fonts } from '../../src/theme';
import { Button } from '../../src/components/ui/Button';
import { IconArrowLeft } from '../../src/components/ui/icons';

export default function OnboardingBioScreen() {
  const { bio, setBio } = useOnboardingStore();
  const [text, setText] = useState(bio);

  const handleNext = () => {
    if (text.trim().length < 10) return;
    setBio(text.trim());
    router.push('/onboarding/looking-for');
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <Button
          variant="ghost"
          onPress={handleBack}
        >
          <IconArrowLeft size={20} color={colors.accent} />
        </Button>

        <Text style={styles.step}>2 / 3</Text>
        <Text style={styles.title}>Opowiedz o sobie</Text>
        <Text style={styles.subtitle}>
          Kim jestes? Czym sie interesujesz? Co lubisz robic?
        </Text>

        <TextInput
          testID="bio-input"
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Napisz kilka slow o sobie..."
          placeholderTextColor={colors.muted}
          multiline
          numberOfLines={5}
          textAlignVertical="top"
          maxLength={500}
        />
        <Text style={styles.charCount}>{text.length} / 500</Text>

        <Button
          title="Dalej"
          variant="accent"
          onPress={handleNext}
          disabled={text.trim().length < 10}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.section,
    paddingTop: 60,
  },
  step: {
    ...typ.caption,
    marginBottom: spacing.tight,
    marginTop: spacing.section,
  },
  title: {
    ...typ.display,
    marginBottom: spacing.tight,
  },
  subtitle: {
    ...typ.body,
    color: colors.muted,
    marginBottom: spacing.block,
  },
  input: {
    fontFamily: fonts.sans,
    fontSize: 16,
    color: colors.ink,
    borderBottomWidth: 1,
    borderBottomColor: colors.ink,
    paddingVertical: 12,
    minHeight: 150,
    marginBottom: spacing.tight,
  },
  charCount: {
    ...typ.caption,
    textAlign: 'right',
    marginBottom: spacing.section,
  },
});
