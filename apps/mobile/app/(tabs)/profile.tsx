import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useAuthStore } from '../../src/stores/authStore';
import { authClient } from '../../src/lib/auth';
import { colors, type as typ, spacing, fonts } from '../../src/theme';
import { Avatar } from '../../src/components/ui/Avatar';
import { Button } from '../../src/components/ui/Button';

export default function ProfileScreen() {
  const user = useAuthStore((state) => state.user);
  const reset = useAuthStore((state) => state.reset);

  const handleLogout = async () => {
    await authClient.signOut();
    reset();
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Avatar
          name={user?.email?.charAt(0) || '?'}
          size={100}
        />
        <Text style={styles.email}>{user?.email}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>O mnie</Text>
        <Text style={styles.placeholder}>
          Uzupełnij swój profil, aby inni mogli Cię poznać
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Kogo szukam</Text>
        <Text style={styles.placeholder}>
          Opisz, jakie osoby chciałbyś poznać
        </Text>
      </View>

      <View style={styles.logoutContainer}>
        <Button
          title="Wyloguj się"
          variant="accent"
          onPress={handleLogout}
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
  header: {
    alignItems: 'center',
    paddingVertical: spacing.block,
    borderBottomWidth: 1,
    borderBottomColor: colors.rule,
  },
  email: {
    ...typ.body,
    color: colors.muted,
    marginTop: spacing.column,
  },
  section: {
    padding: spacing.section,
    borderBottomWidth: 1,
    borderBottomColor: colors.rule,
  },
  sectionTitle: {
    ...typ.heading,
    fontSize: 18,
    marginBottom: spacing.tight,
  },
  placeholder: {
    ...typ.body,
    color: colors.muted,
  },
  logoutContainer: {
    margin: spacing.section,
  },
});
