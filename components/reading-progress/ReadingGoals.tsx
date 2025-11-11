import { Ionicons } from "@expo/vector-icons";
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Modal,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../supabase";
import { ThemedText } from "../themed-text";


export function ReadingGoals({ onPagesUpdated }: { onPagesUpdated?: () => void }) {
    const [goals, setGoals] = useState<{
    dailyPages: number;
    completedToday: number;
    streak: number;
  }>({
    dailyPages: 30,
    completedToday: 0,
    streak: 0,
  });
  const [pagesModal, setPagesModal] = useState(false);
  const [pagesInput, setPagesInput] = useState("");
  const notifIdRef = useRef<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<string>('unknown');

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  useEffect(() => {
    fetchGoals();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        if (!Device.isDevice) {
          console.log('Notifications require a physical device');
          return;
        }

        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }

        if (finalStatus !== 'granted') {
          Alert.alert('Permission required', 'Enable notifications to receive goal reminders.');
        }
        setPermissionStatus(finalStatus ?? 'unknown');
      } catch (err) {
        console.warn('Notification permission error', err);
      }
    })();
  }, []);

  useEffect(() => {
    let mounted = true;

    const manageNotifications = async () => {
      try {
        if (!Device.isDevice) return;

        const shouldNotify = (goals.completedToday || 0) < (goals.dailyPages || 30);

        if (shouldNotify) {
          if (!notifIdRef.current) {
            const id = await Notifications.scheduleNotificationAsync({
              content: {
                title: 'Reading goal not met',
                body: `You haven't reached ${goals.dailyPages} pages today.`,
                sound: true,
              },
              trigger: { hours: 20, minutes: 0, repeats: true },
            });
            if (mounted) notifIdRef.current = id;
          }
        } else {
          if (notifIdRef.current) {
            await Notifications.cancelScheduledNotificationAsync(notifIdRef.current);
            notifIdRef.current = null;
          }
        }
      } catch (err) {
        console.warn('Notification scheduling error', err);
      }
    };

    manageNotifications();

    return () => {
      mounted = false;
    };
  }, [goals.completedToday, goals.dailyPages]);

  useEffect(() => {
    return () => {
      if (notifIdRef.current) {
        Notifications.cancelScheduledNotificationAsync(notifIdRef.current).catch(() => {});
        notifIdRef.current = null;
      }
    };
  }, []);

 

 

  async function fetchGoals() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: progress } = await supabase
        .from("reading_progress")
        .select("daily_goal, manual_pages_today")
        .eq("id", user.id)
        .maybeSingle();

      const savedDailyGoal = progress?.daily_goal || 30;
      const manualToday = progress?.manual_pages_today || 0;

      const today = new Date().toISOString().split("T")[0];
      const { data: sessions } = await supabase
        .from("reading_sessions")
        .select("pages_read")
        .gte("created_at", `${today}T00:00:00`)
        .lte("created_at", `${today}T23:59:59`);

      const autoPagesToday = sessions?.reduce((acc, s) => acc + (s.pages_read || 0), 0) || 0;
      const finalPagesToday = manualToday > 0 ? manualToday : autoPagesToday;

      setGoals({
        dailyPages: savedDailyGoal,
        completedToday: finalPagesToday,
        streak: goals.streak,
      });
    } catch (error) {
      console.error("Error fetching goals:", error);
    }
  }

  async function savePagesReadToday() {
    const pages = parseInt(pagesInput);
    if (isNaN(pages) || pages < 0 || pages > 1000) {
      Alert.alert("Invalid input", "Enter 0–1000");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: existing } = await supabase
        .from('reading_progress')
        .select('pages_day1,pages_day2,pages_day3,pages_day4,pages_day5,pages_day6,pages_day7,manual_pages_today,daily_goal,streak,updated_at')
        .eq('id', user.id)
        .maybeSingle();

      const today = new Date();
      const todayStr = today.toISOString().slice(0,10);
      const lastUpdatedStr = existing?.updated_at ? new Date(existing.updated_at).toISOString().slice(0,10) : null;

      const oldDays = [
        existing?.pages_day1 || 0,
        existing?.pages_day2 || 0,
        existing?.pages_day3 || 0,
        existing?.pages_day4 || 0,
        existing?.pages_day5 || 0,
        existing?.pages_day6 || 0,
        existing?.pages_day7 || 0,
      ];

      let newDays = [...oldDays];
      let newStreak = existing?.streak || 0;

      if (lastUpdatedStr && lastUpdatedStr !== todayStr) {
        const lastDate = new Date(lastUpdatedStr + 'T00:00:00');
        const diffMs = today.getTime() - lastDate.getTime();
        const diffDays = Math.floor(diffMs / (1000*60*60*24));

        if (diffDays >= 7) {
          newDays = [0,0,0,0,0,0, pages];
        } else {
          for (let i = 0; i <= 6 - diffDays; i++) {
            newDays[i] = oldDays[i + diffDays];
          }
          for (let i = 7 - diffDays; i <= 5; i++) {
            newDays[i] = 0;
          }
          newDays[6] = pages;
        }

        const prevStreak = existing?.streak || 0;
        const goal = existing?.daily_goal || goals.dailyPages || 30;
        if (pages >= goal) {
          if (diffDays === 1) newStreak = prevStreak + 1;
          else newStreak = 1;
        } else {
          newStreak = 0;
        }
      } else {
        newDays[6] = pages;
        const goal = existing?.daily_goal || goals.dailyPages || 30;
        if (pages >= goal) {
          newStreak = existing?.streak || 0;
        }
      }

      const payload: any = {
        id: user.id,
        user_id: user.id,
        pages_day1: newDays[0],
        pages_day2: newDays[1],
        pages_day3: newDays[2],
        pages_day4: newDays[3],
        pages_day5: newDays[4],
        pages_day6: newDays[5],
        pages_day7: newDays[6],
        manual_pages_today: pages,
        daily_goal: goals.dailyPages,
        streak: newStreak,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from('reading_progress').upsert(payload, { onConflict: 'id' });
      if (error) throw error;

      setGoals(prev => ({ ...prev, completedToday: pages, streak: newStreak }));
      setPagesModal(false);
      setPagesInput("");

      Alert.alert("Success!", `${pages} pages logged`);
      onPagesUpdated && onPagesUpdated();
    } catch (error: any) {
      Alert.alert("Error", error.message || "Save failed");
    }
  }

  const progress = Math.min((goals.completedToday / goals.dailyPages) * 100, 100);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <ThemedText style={styles.title}>Today's Reading</ThemedText>
        <TouchableOpacity onPress={() => {
          setPagesInput(goals.completedToday.toString());
          setPagesModal(true);
        }}>
          <Ionicons name="pencil" size={20} color="#8b5cf6" />
        </TouchableOpacity>
      </View>

   

      <View style={styles.goalCard}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>

        <View style={styles.goalStats}>
          <View>
            <ThemedText style={styles.pagesText}>
              {goals.completedToday} / {goals.dailyPages}
            </ThemedText>
            <ThemedText style={styles.label}>pages today</ThemedText>
          </View>

          <View style={styles.streakContainer}>
            <Ionicons name="flame" size={20} color="#f59e0b" />
            <ThemedText style={styles.streakText}>{goals.streak}</ThemedText>
            <ThemedText style={styles.label}>day streak</ThemedText>
          </View>
        </View>
      </View>

      <Modal visible={pagesModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ThemedText style={styles.modalTitle}>
              Log Pages Read Today
            </ThemedText>

            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              placeholder="e.g. 45"
              value={pagesInput}
              onChangeText={setPagesInput}
              autoFocus
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                onPress={() => {
                  setPagesModal(false);
                  setPagesInput("");
                }}
                style={styles.cancelButton}
              >
                <ThemedText style={styles.cancelText}>Cancel</ThemedText>
              </TouchableOpacity>

              <TouchableOpacity onPress={savePagesReadToday} style={styles.saveButton}>
                <ThemedText style={styles.saveText}>Save</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
  },
  goalCard: {
    backgroundColor: "rgba(139, 92, 246, 0.1)",
    borderRadius: 16,
    padding: 16,
  },
  progressBar: {
    height: 8,
    backgroundColor: "rgba(139, 92, 246, 0.2)",
    borderRadius: 4,
    marginBottom: 16,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#8b5cf6",
    borderRadius: 4,
  },
  goalStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  pagesText: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 4,
  },
  label: {
    fontSize: 14,
    opacity: 0.7,
  },
  streakContainer: {
    alignItems: "center",
  },
  streakText: {
    fontSize: 18,
    fontWeight: "bold",
    marginVertical: 2,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "white",
    padding: 24,
    borderRadius: 16,
    width: "85%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
    color: "#333",
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
    textAlign: "center",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  cancelButton: {
    flex: 1,
    padding: 12,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
  },
  cancelText: {
    textAlign: "center",
    color: "#666",
    fontWeight: "600",
  },
  saveButton: {
    flex: 1,
    padding: 12,
    marginLeft: 8,
    backgroundColor: "#8b5cf6",
    borderRadius: 8,
  },
  saveText: {
    color: "white",
    textAlign: "center",
    fontWeight: "600",
  },
  debugContainer: {
    marginTop: 12,
    padding: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.03)'
  },
  debugStatus: {
    fontSize: 13,
    color: '#e6e6e6',
    marginBottom: 8,
  },
  debugRow: { flexDirection: 'row', justifyContent: 'space-between' },
  debugButton: { flex: 1, padding: 10, backgroundColor: '#6b21a8', marginHorizontal: 6, borderRadius: 8, alignItems: 'center' },
  debugButtonText: { color: '#fff', fontWeight: '600' },
});