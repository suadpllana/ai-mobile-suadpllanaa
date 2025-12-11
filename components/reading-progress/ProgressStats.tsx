
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useThemeColor } from "../../hooks/use-theme-color";
import { supabase } from "../../supabase";
import { ThemedText } from "../themed-text";

export function ProgressStats({ refreshTrigger, stats: externalStats }: { refreshTrigger?: number; stats?: { remainingPages: number; todayProgressPercent: number; pagesReadToday: number; dailyGoal: number } }) {
  const cardBg = useThemeColor({ light: 'rgba(255, 255, 255, 0.05)', dark: 'rgba(255, 255, 255, 0.05)' }, 'background');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(() => externalStats || {
    remainingPages: 30,
    todayProgressPercent: 0,
    pagesReadToday: 0,
    dailyGoal: 30,
  });

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: progress } = await supabase
        .from("reading_progress")
        .select("manual_pages_today, daily_goal")
        .eq("id", user.id)
        .maybeSingle();

      const manualPages = progress?.manual_pages_today || 0;
      const dailyGoal = progress?.daily_goal || 30;

      const remainingPages = Math.max(dailyGoal - manualPages, 0);
      const todayProgressPercent = dailyGoal > 0 ? Math.round((manualPages / dailyGoal) * 100) : 0;

      setStats({
        remainingPages,
        todayProgressPercent,
        pagesReadToday: manualPages,
        dailyGoal,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (externalStats) {
      setStats(externalStats);
      return;
    }
    fetchStats();
  }, [fetchStats, refreshTrigger, externalStats]);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#8b5cf6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <StatCard
          title="Remaining Today"
          value={stats.remainingPages.toString()}
          color="#ec4899"
        />
        <StatCard
          title="Today's Progress"
          value={`${stats.todayProgressPercent}%`}
          color="#10b981"
        />
      </View>
      <View style={styles.row}>
        <StatCard
          title="Pages Read Today"
          value={stats.pagesReadToday.toString()}
          color="#f59e0b"
        />
        <StatCard
          title="Daily Goal"
          value={stats.dailyGoal.toString()}
          color="#8b5cf6"
        />
      </View>
    </View>
  );
}

type StatCardProps = {
  title: string;
  value: string;
  color: string;
};

function StatCard({ title, value, color }: StatCardProps) {
  const cardBg = useThemeColor({ light: 'rgba(0, 0, 0, 0.03)', dark: 'rgba(255, 255, 255, 0.05)' }, 'background');
  return (
    <View style={[styles.card, { borderColor: color, backgroundColor: cardBg }]}>
      <ThemedText style={styles.cardTitle}>{title}</ThemedText>
      <ThemedText style={[styles.cardValue, { color }]}>{value}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  card: {
    width: "48%",
    padding: 16,
    borderRadius: 16,
    borderLeftWidth: 4,
  },
  cardTitle: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 8,
  },
  cardValue: {
    fontSize: 24,
    fontWeight: "bold",
  },
});
