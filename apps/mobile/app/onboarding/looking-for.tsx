import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useOnboardingStore } from '../../src/stores/onboardingStore';
import { useAuthStore } from '../../src/stores/authStore';
import { trpc } from '../../src/lib/trpc';
import { colors, type as typ, spacing, fonts } from '../../src/theme';
import { Button } from '../../src/components/ui/Button';
import { IconArrowLeft } from '../../src/components/ui/icons';

export default function OnboardingLookingForScreen() {
  const { displayName, bio, lookingFor, setLookingFor, complete } = useOnboardingStore();
  const setProfile = useAuthStore((state) => state.setProfile);
  const setHasCheckedProfile = useAuthStore((state) => state.setHasCheckedProfile);
  const [text, setText] = useState(lookingFor);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const createProfile = trpc.profiles.create.useMutation();

  const handleSubmit = async () => {
    if (text.trim().length < 10) return;

    setLookingFor(text.trim());
    setIsSubmitting(true);
    setError('');

    try {
      const newProfile = await createProfile.mutateAsync({
        displayName,
        bio,
        lookingFor: text.trim(),
      });
      // Save profile to auth store so tabs layout knows we have a profile
      setProfile(newProfile);
      setHasCheckedProfile(true);
      complete();
      // Small delay to ensure state is propagated before navigation
      setTimeout(() => {
        router.replace('/(tabs)');
      }, 100);
    } catch (err) {
      console.error('Failed to create profile:', err);
      setError('Nie udalo sie utworzyc profilu. Sprobuj ponownie.');
    } finally {
      setIsSubmitting(false);
    }
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

        <Text style={styles.step}>3 / 3</Text>
        <Text style={styles.title}>Kogo szukasz?</Text>
        <Text style={styles.subtitle}>
          Opisz jakiej osoby szukasz. Co was mogloby polaczyc?
        </Text>

        <TextInput
          testID="looking-for-input"
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Szukam kogos kto..."
          placeholderTextColor={colors.muted}
          multiline
          numberOfLines={5}
          textAlignVertical="top"
          maxLength={500}
        />
        <Text style={styles.charCount}>{text.length} / 500</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button
          title="Rozpocznij"
          variant="accent"
          onPress={handleSubmit}
          disabled={text.trim().length < 10 || isSubmitting}
          loading={isSubmitting}
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
    paddingBottom: spacing.block,
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
    marginBottom: spacing.tight,
  },
  charCount: {
    ...typ.caption,
    textAlign: 'right',
    marginBottom: spacing.column,
  },
  error: {
    fontFamily: fonts.sans,
    color: colors.status.error.text,
    fontSize: 14,
    marginBottom: spacing.column,
    textAlign: 'center',
  },
});
