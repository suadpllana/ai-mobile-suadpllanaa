import { Ionicons } from "@expo/vector-icons";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    Alert,
    Modal,
    Platform,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import { supabase } from "../../supabase";
import { logger } from "../../utils/logger";
import { ThemedText } from "../themed-text";

export function ReadingGoals({
  onPagesUpdated,
}: { onPagesUpdated?: (newPages?: number, newStreak?: number) => void }) {
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
  const lastFetchRef = useRef<string | null>(null);

  // ──────────────────────────────────────────────────────────────
  // Notification setup
  // ──────────────────────────────────────────────────────────────
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  useFocusEffect(
    useCallback(() => {
      // Only fetch if we haven't fetched today yet
      const today = new Date().toISOString().split("T")[0];
      if (lastFetchRef.current !== today) {
        fetchGoals();
      }
    }, [])
  );

  // Request permission once
  useEffect(() => {
    (async () => {
      if (Platform.OS === 'web') return;
      if (!Device.isDevice) return;

      const { status: existing } = await Notifications.getPermissionsAsync();
      let final = existing;
      if (existing !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        final = status;
      }
      if (final !== "granted") {
        Alert.alert(
          "Permission required",
          "Enable notifications to get daily goal reminders."
        );
      }
    })();
  }, []);

  // Schedule / cancel daily reminder (8 PM)
  useEffect(() => {
    let mounted = true;

    const manage = async () => {
      if (Platform.OS === 'web') return;
      if (!Device.isDevice) return;

      const needsReminder =
        (goals.completedToday || 0) < (goals.dailyPages || 30);

      if (needsReminder) {
        if (!notifIdRef.current) {
          const id = await Notifications.scheduleNotificationAsync({
            content: {
              title: "Reading goal not met",
              body: `You haven't reached ${goals.dailyPages} pages today.`,
              sound: true,
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DAILY,
              hour: 20,
              minute: 0,
            },
          });
          if (mounted) notifIdRef.current = id;
        }
      } else if (notifIdRef.current) {
        await Notifications.cancelScheduledNotificationAsync(
          notifIdRef.current
        );
        notifIdRef.current = null;
      }
    };

    manage();
    return () => {
      mounted = false;
    };
  }, [goals.completedToday, goals.dailyPages]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (notifIdRef.current) {
        Notifications.cancelScheduledNotificationAsync(
          notifIdRef.current
        ).catch(() => {});
      }
    };
  }, []);

  // ──────────────────────────────────────────────────────────────
  // Fetch current goal + today pages
  // ──────────────────────────────────────────────────────────────
  async function fetchGoals() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: progress } = await supabase
        .from("reading_progress")
        .select("manual_pages_today, daily_goal, streak, updated_at, pages_day7")
        .eq("id", user.id)
        .maybeSingle();

      const today = new Date().toISOString().split("T")[0];
      const lastUpdated = progress?.updated_at
        ? new Date(progress.updated_at).toISOString().split("T")[0]
        : null;

      let manualPages = progress?.manual_pages_today || 0;
      let streak = progress?.streak ?? 0;
      const dailyGoal = progress?.daily_goal || 30;

      // Reset pages if it's a new day
      if (lastUpdated && lastUpdated !== today) {
        const lastDate = new Date(lastUpdated + "T00:00:00");
        const todayDate = new Date(today + "T00:00:00");
        const diffDays = Math.floor(
          (todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        const previousPages = progress?.pages_day7 ?? 0;
        if (diffDays === 1) {
          if (previousPages < dailyGoal) {
            streak = 0; // Broke streak by not meeting goal yesterday
          }
        } else if (diffDays > 1) {
          streak = 0;
        }

        manualPages = 0;

        // Update database with reset values
        await supabase
          .from("reading_progress")
          .update({
            manual_pages_today: 0,
            streak: streak,
            updated_at: new Date().toISOString(),
          })
          .eq("id", user.id);
      }

      setGoals({
        dailyPages: dailyGoal,
        completedToday: manualPages,
        streak: streak,
      });
      
      // Mark that we've fetched today
      lastFetchRef.current = today;
    } catch (e) {
      logger.error("fetchGoals error:", e);
    }
  }

  // ──────────────────────────────────────────────────────────────
  // Save manual pages
  // ──────────────────────────────────────────────────────────────
  async function savePagesReadToday() {
    const pages = parseInt(pagesInput, 10);
    if (isNaN(pages) || pages < 0 || pages > 1000) {
      Alert.alert("Invalid input", "Enter a number between 0 and 1000");
      return;
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // ---- Load current row (if any) ----
      const { data: existing } = await supabase
        .from("reading_progress")
        .select(
          "pages_day1, manual_pages_today, pages_day2,pages_day3,pages_day4,pages_day5,pages_day6,pages_day7,streak,daily_goal,updated_at"
        )
        .eq("id", user.id)
        .maybeSingle();

      const today = new Date();
      const todayStr = today.toISOString().slice(0, 10);
      const lastUpdatedStr = existing?.updated_at
        ? new Date(existing.updated_at).toISOString().slice(0, 10)
        : null;

      // ---- Build 7-day array ----
      const oldDays = [
        existing?.pages_day1 ?? 0,
        existing?.pages_day2 ?? 0,
        existing?.pages_day3 ?? 0,
        existing?.pages_day4 ?? 0,
        existing?.pages_day5 ?? 0,
        existing?.pages_day6 ?? 0,
        existing?.pages_day7 ?? 0,
      ];

      let newDays = [...oldDays];
      let newStreak = existing?.streak ?? 0;

      if (lastUpdatedStr && lastUpdatedStr !== todayStr) {
        // Roll days forward
        const lastDate = new Date(lastUpdatedStr + "T00:00:00");
        const diffDays = Math.floor(
          (today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (diffDays >= 7) {
          newDays = [0, 0, 0, 0, 0, 0, pages];
        } else {
          // Shift left
          for (let i = 0; i < 7 - diffDays; i++) {
            newDays[i] = oldDays[i + diffDays];
          }
          for (let i = 7 - diffDays; i < 7; i++) {
            newDays[i] = 0;
          }
          newDays[6] = pages;
        }

        // Streak logic
        const goal = existing?.daily_goal ?? goals.dailyPages ?? 30;
        if (pages >= goal) {
          newStreak = diffDays === 1 ? (existing?.streak ?? 0) + 1 : 1;
        } else {
          newStreak = 0;
        }
      } else {
        // Same day → just overwrite today
        newDays[6] = pages;
        const goal = existing?.daily_goal ?? goals.dailyPages ?? 30;
        const previousPagesDay7 = existing?.pages_day7 ?? 0;
        
        // If user meets the goal and hasn't already been counted today
        if (pages >= goal && previousPagesDay7 < goal) {
          newStreak = (existing?.streak ?? 0) + 1;
        } else if (pages >= goal) {
          // Already met goal before, keep streak
          newStreak = existing?.streak ?? 0;
        } else {
          newStreak = 0;
        }
      }

      // ---- Payload ----
      const payload = {
        id: user.id,
        daily_goal: goals.dailyPages,
        manual_pages_today: pages,
        streak: newStreak,
        pages_day1: newDays[0],
        pages_day2: newDays[1],
        pages_day3: newDays[2],
        pages_day4: newDays[3],
        pages_day5: newDays[4],
        pages_day6: newDays[5],
        pages_day7: newDays[6],
        updated_at: new Date().toISOString(),
      };

      // ---- Upsert (safe insert-or-update) ----
      let { error } = await supabase
        .from("reading_progress")
        .upsert(payload, { onConflict: "id" });

      // Fallback if `streak` column is missing
      if (error && error.message.toLowerCase().includes("streak")) {
        logger.warn("streak column missing – retrying without it");
        const { streak, ...noStreak } = payload;
        const { error: e2 } = await supabase
          .from("reading_progress")
          .upsert(noStreak, { onConflict: "id" });
        if (e2) throw e2;
      } else if (error) {
        throw error;
      }

      // ---- Success UI ----
      setGoals((prev) => ({
        ...prev,
        completedToday: pages,
        streak: newStreak,
      }));
      setPagesModal(false);
      setPagesInput("");
      Alert.alert("Success!", `${pages} pages logged`);
      // Pass the new values to parent for immediate UI update
      onPagesUpdated?.(pages, newStreak);
    } catch (err: any) {
      logger.error("savePagesReadToday error:", err);
      Alert.alert("Error", err.message ?? "Failed to save");
    }
  }

  const progress = Math.min(
    (goals.completedToday / goals.dailyPages) * 100,
    100
  );

  // ──────────────────────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <ThemedText style={styles.title}>Today's Reading</ThemedText>
        <TouchableOpacity
          onPress={() => {
            setPagesInput(goals.completedToday.toString());
            setPagesModal(true);
          }}
        >
          <Ionicons name="pencil" size={20} color="#8b5cf6" />
        </TouchableOpacity>
      </View>

      <View style={styles.goalCard}>
        <View style={styles.progressBar}>
          <View
            style={[styles.progressFill, { width: `${progress}%` }]}
          />
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
            <ThemedText style={styles.streakText}>
              {goals.streak}
            </ThemedText>
            <ThemedText style={styles.label}>day streak</ThemedText>
          </View>
        </View>
      </View>

      {/* ---------- Modal ---------- */}
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

              <TouchableOpacity
                onPress={savePagesReadToday}
                style={styles.saveButton}
              >
                <ThemedText style={styles.saveText}>Save</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/* ────────────────────────── Styles ────────────────────────── */
const styles = StyleSheet.create({
  container: { padding: 16 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  title: { fontSize: 18, fontWeight: "600" },
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
  pagesText: { fontSize: 20, fontWeight: "bold", marginBottom: 4 },
  label: { fontSize: 14, opacity: 0.7 },
  streakContainer: { alignItems: "center" },
  streakText: { fontSize: 18, fontWeight: "bold", marginVertical: 2 },

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
  modalButtons: { flexDirection: "row", justifyContent: "space-between" },
  cancelButton: {
    flex: 1,
    padding: 12,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
  },
  cancelText: { textAlign: "center", color: "#666", fontWeight: "600" },
  saveButton: {
    flex: 1,
    padding: 12,
    marginLeft: 8,
    backgroundColor: "#8b5cf6",
    borderRadius: 8,
  },
  saveText: { color: "white", textAlign: "center", fontWeight: "600" },
});