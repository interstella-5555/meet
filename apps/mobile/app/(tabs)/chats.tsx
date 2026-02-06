import { View, Text, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { useState } from 'react';
import { colors, type as typ, spacing } from '../../src/theme';
import { IconChat } from '../../src/components/ui/icons';

export default function ChatsScreen() {
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    // TODO: Fetch conversations
    setTimeout(() => setRefreshing(false), 1000);
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={[]}
        renderItem={() => null}
        ListEmptyComponent={
          <View style={styles.empty}>
            <IconChat size={48} color={colors.muted} />
            <Text style={styles.emptyTitle}>Brak czatów</Text>
            <Text style={styles.emptyText}>
              Zacznij rozmowę odpowiadając na zaczepienie
            </Text>
          </View>
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.ink} />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
    paddingHorizontal: spacing.section,
  },
  emptyTitle: {
    ...typ.heading,
    marginTop: spacing.column,
    marginBottom: spacing.tight,
  },
  emptyText: {
    ...typ.body,
    color: colors.muted,
    textAlign: 'center',
  },
});
