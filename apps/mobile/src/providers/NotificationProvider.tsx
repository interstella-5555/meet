import { createContext, useCallback, useContext, useRef, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { NotificationBanner } from '../components/ui/NotificationBanner';

export interface NotificationConfig {
  id: string;
  title: string;
  subtitle?: string;
  avatarUrl?: string | null;
  avatarName: string;
  onPress: () => void;
}

interface NotificationContextValue {
  showNotification: (config: NotificationConfig) => void;
}

const NotificationContext = createContext<NotificationContextValue>({
  showNotification: () => {},
});

export function useNotification() {
  return useContext(NotificationContext);
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [current, setCurrent] = useState<NotificationConfig | null>(null);
  const queueRef = useRef<NotificationConfig[]>([]);
  const showingRef = useRef(false);

  const showNext = useCallback(() => {
    const next = queueRef.current.shift();
    if (next) {
      showingRef.current = true;
      setCurrent(next);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      showingRef.current = false;
      setCurrent(null);
    }
  }, []);

  const showNotification = useCallback(
    (config: NotificationConfig) => {
      // Dedup: skip if same id is currently showing or already in queue
      if (current?.id === config.id) return;
      if (queueRef.current.some((n) => n.id === config.id)) return;

      if (showingRef.current) {
        queueRef.current.push(config);
      } else {
        showingRef.current = true;
        setCurrent(config);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    },
    [current?.id]
  );

  const handleDismiss = useCallback(() => {
    setCurrent(null);
    setTimeout(showNext, 300);
  }, [showNext]);

  const handlePress = useCallback(() => {
    current?.onPress();
    handleDismiss();
  }, [current, handleDismiss]);

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      {children}
      {current && (
        <NotificationBanner
          visible
          title={current.title}
          subtitle={current.subtitle}
          avatarUrl={current.avatarUrl}
          avatarName={current.avatarName}
          onPress={handlePress}
          onDismiss={handleDismiss}
        />
      )}
    </NotificationContext.Provider>
  );
}
