import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { trpc } from '../../src/lib/trpc';
import { useOnboardingStore } from '../../src/stores/onboardingStore';
import { useAuthStore } from '../../src/stores/authStore';
import { colors, type as typ, spacing, fonts } from '../../src/theme';
import { Button } from '../../src/components/ui/Button';

export default function ProfilingResultModal() {
  const { profilingSessionId } = useOnboardingStore();
  const profile = useAuthStore((s) => s.profile);
  const setProfile = useAuthStore((s) => s.setProfile);

  const [bio, setBio] = useState('');
  const [lookingFor, setLookingFor] = useState('');
  const [portrait, setPortrait] = useState('');
  const [portraitShared, setPortraitShared] = useState(
    profile?.portraitSharedForMatching ?? false
  );
  const [portraitExpanded, setPortraitExpanded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const utils = trpc.useUtils();
  const sessionState = trpc.profiling.getSessionState.useQuery(
    { sessionId: profilingSessionId! },
    { enabled: !!profilingSessionId }
  );

  const applyProfile = trpc.profiling.applyProfile.useMutation();

  useEffect(() => {
    if (sessionState.data?.session) {
      const s = sessionState.data.session;
      if (s.generatedBio) setBio(s.generatedBio);
      if (s.generatedLookingFor) setLookingFor(s.generatedLookingFor);
      if (s.generatedPortrait) setPortrait(s.generatedPortrait);
    }
  }, [sessionState.data]);

  const handleApply = async () => {
    if (!profilingSessionId || !profile) return;
    setIsSubmitting(true);
    setError('');

    try {
      const updated = await applyProfile.mutateAsync({
        sessionId: profilingSessionId,
        displayName: profile.displayName,
        portraitSharedForMatching: portraitShared,
        bio: bio.trim() || undefined,
        lookingFor: lookingFor.trim() || undefined,
      });
      setProfile(updated);
      utils.profiles.me.invalidate();
      router.dismiss();
    } catch (err) {
      console.error('Failed to apply profile:', err);
      setError('Nie udalo sie zapisac profilu. Sprobuj ponownie.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (sessionState.isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Nowy profil</Text>
      <Text style={styles.subtitle}>
        Mozesz edytowac tekst przed zapisaniem
      </Text>

      <Text style={styles.label}>O MNIE</Text>
      <TextInput
        style={styles.input}
        value={bio}
        onChangeText={setBio}
        multiline
        maxLength={500}
        placeholderTextColor={colors.muted}
      />
      <Text style={styles.charCount}>{bio.length} / 500</Text>

      <Text style={styles.label}>KOGO SZUKAM</Text>
      <TextInput
        style={styles.input}
        value={lookingFor}
        onChangeText={setLookingFor}
        multiline
        maxLength={500}
        placeholderTextColor={colors.muted}
      />
      <Text style={styles.charCount}>{lookingFor.length} / 500</Text>

      {portrait ? (
        <>
          <Pressable
            onPress={() => setPortraitExpanded(!portraitExpanded)}
            style={styles.portraitHeader}
          >
            <Text style={styles.label}>PORTRET OSOBOWOSCI</Text>
            <Text style={typ.caption}>
              {portraitExpanded ? 'Schowaj' : 'Pokaz'}
            </Text>
          </Pressable>
          {portraitExpanded && (
            <Text style={styles.portraitText}>{portrait}</Text>
          )}

          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>
              Udostepnij portret do lepszego dopasowywania
            </Text>
            <Switch
              value={portraitShared}
              onValueChange={setPortraitShared}
              trackColor={{ false: colors.rule, true: colors.accent }}
              thumbColor="#FFFFFF"
            />
          </View>
        </>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.buttonContainer}>
        <Button
          title="Zapisz"
          variant="accent"
          onPress={handleApply}
          disabled={isSubmitting || bio.trim().length < 10 || lookingFor.trim().length < 10}
          loading={isSubmitting}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: spacing.section,
    paddingTop: spacing.section,
    paddingBottom: spacing.block,
  },
  title: {
    ...typ.display,
    marginBottom: spacing.tight,
  },
  subtitle: {
    ...typ.body,
    color: colors.muted,
    marginBottom: spacing.section,
  },
  label: {
    ...typ.label,
    marginBottom: spacing.tight,
    marginTop: spacing.column,
  },
  input: {
    fontFamily: fonts.sans,
    fontSize: 16,
    color: colors.ink,
    borderBottomWidth: 1,
    borderBottomColor: colors.ink,
    paddingVertical: 12,
  },
  charCount: {
    ...typ.caption,
    textAlign: 'right',
    marginTop: spacing.hairline,
  },
  portraitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.column,
    marginBottom: spacing.tight,
  },
  portraitText: {
    ...typ.body,
    color: colors.muted,
    lineHeight: 22,
    marginBottom: spacing.column,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.column,
    paddingVertical: spacing.gutter,
    borderTopWidth: 1,
    borderTopColor: colors.rule,
  },
  toggleLabel: {
    ...typ.body,
    flex: 1,
    marginRight: spacing.column,
  },
  error: {
    fontFamily: fonts.sans,
    color: colors.status.error.text,
    fontSize: 14,
    marginTop: spacing.column,
    textAlign: 'center',
  },
  buttonContainer: {
    marginTop: spacing.section,
  },
});
