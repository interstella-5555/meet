import { useEffect } from 'react';
import { Redirect, Tabs } from 'expo-router';
import { useAuthStore } from '../../src/stores/authStore';
import { View, ActivityIndicator, Text } from 'react-native';
import { trpc } from '../../src/lib/trpc';

export default function TabsLayout() {
  const user = useAuthStore((state) => state.user);
  const profile = useAuthStore((state) => state.profile);
  const isLoading = useAuthStore((state) => state.isLoading);
  const hasCheckedProfile = useAuthStore((state) => state.hasCheckedProfile);
  const setProfile = useAuthStore((state) => state.setProfile);
  const setHasCheckedProfile = useAuthStore(
    (state) => state.setHasCheckedProfile
  );

  const { data: profileData, isLoading: isLoadingProfile, isError, refetch } =
    trpc.profiles.me.useQuery(undefined, {
      enabled: !!user && !hasCheckedProfile,
      retry: 2, // Retry twice on failure
    });

  useEffect(() => {
    // Only set profile from query if we haven't checked yet
    // This prevents overwriting a profile that was just created in onboarding
    if (profileData !== undefined && !hasCheckedProfile) {
      setProfile(profileData);
      setHasCheckedProfile(true);
    }
  }, [profileData, hasCheckedProfile, setProfile, setHasCheckedProfile]);

  // If API error, show retry button instead of redirecting to onboarding
  if (isError && !hasCheckedProfile) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <Text style={{ fontSize: 16, color: '#666', marginBottom: 16, textAlign: 'center' }}>
          Nie udało się połączyć z serwerem
        </Text>
        <Text
          style={{ color: '#007AFF', fontSize: 16 }}
          onPress={() => refetch()}
        >
          Spróbuj ponownie
        </Text>
      </View>
    );
  }

  if (isLoading || (user && !hasCheckedProfile && isLoadingProfile)) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // If not logged in, redirect to auth
  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  // If logged in but no profile, redirect to onboarding
  // Note: Check !profile directly - if profile exists in store (e.g., just created), don't redirect
  if (!profile && hasCheckedProfile) {
    return <Redirect href="/onboarding" />;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#007AFF',
        headerShown: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'W okolicy',
          tabBarIcon: ({ color }) => <TabIcon name="📍" color={color} />,
        }}
      />
      <Tabs.Screen
        name="waves"
        options={{
          title: 'Zaczepienia',
          tabBarIcon: ({ color }) => <TabIcon name="👋" color={color} />,
        }}
      />
      <Tabs.Screen
        name="chats"
        options={{
          title: 'Czaty',
          tabBarIcon: ({ color }) => <TabIcon name="💬" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color }) => <TabIcon name="👤" color={color} />,
        }}
      />
    </Tabs>
  );
}

function TabIcon({ name, color }: { name: string; color: string }) {
  return (
    <Text style={{ fontSize: 20, opacity: color === '#007AFF' ? 1 : 0.5 }}>
      {name}
    </Text>
  );
}
