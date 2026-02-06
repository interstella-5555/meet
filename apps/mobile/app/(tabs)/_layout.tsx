import { useEffect } from 'react';
import { Redirect, Tabs } from 'expo-router';
import { useAuthStore } from '../../src/stores/authStore';
import { View, ActivityIndicator, Text } from 'react-native';
import { trpc } from '../../src/lib/trpc';
import { colors, type as typ, fonts } from '../../src/theme';
import { IconPin, IconWave, IconChat, IconPerson } from '../../src/components/ui/icons';

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
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: colors.bg }}>
        <Text style={{ ...typ.body, color: colors.muted, marginBottom: 16, textAlign: 'center' }}>
          Nie udało się połączyć z serwerem
        </Text>
        <Text
          style={{ ...typ.body, color: colors.accent }}
          onPress={() => refetch()}
        >
          Spróbuj ponownie
        </Text>
      </View>
    );
  }

  if (isLoading || (user && !hasCheckedProfile && isLoadingProfile)) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator size="large" color={colors.ink} />
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
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.bg,
          borderTopWidth: 2,
          borderTopColor: colors.ink,
          height: 75,
        },
        tabBarLabelStyle: {
          fontFamily: fonts.sansMedium,
          fontSize: 8,
          letterSpacing: 1.5,
          textTransform: 'uppercase',
        },
        headerStyle: {
          backgroundColor: colors.bg,
        },
        headerTitleStyle: {
          ...typ.heading,
          fontSize: 18,
        },
        headerShadowVisible: false,
        headerShown: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'W okolicy',
          tabBarIcon: ({ color }) => <IconPin size={20} color={color} />,
          tabBarAccessibilityLabel: 'tab-nearby',
        }}
      />
      <Tabs.Screen
        name="waves"
        options={{
          title: 'Zagadaj',
          tabBarIcon: ({ color }) => <IconWave size={20} color={color} />,
          tabBarAccessibilityLabel: 'tab-waves',
        }}
      />
      <Tabs.Screen
        name="chats"
        options={{
          title: 'Czaty',
          tabBarIcon: ({ color }) => <IconChat size={20} color={color} />,
          tabBarAccessibilityLabel: 'tab-chats',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color }) => <IconPerson size={20} color={color} />,
          tabBarAccessibilityLabel: 'tab-profile',
        }}
      />
    </Tabs>
  );
}
