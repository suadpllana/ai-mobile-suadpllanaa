import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  ImageBackground,
  Modal,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  Vibration,
  View,
} from "react-native";
import Animated, { FadeInDown, ZoomIn } from "react-native-reanimated";
import { ProgressStats } from "../../components/reading-progress/ProgressStats";
import { ReadingGoals } from "../../components/reading-progress/ReadingGoals";
import { supabase } from "../../supabase";

const { width } = Dimensions.get("window");

const fallbackQuotes = [
  { text: "A reader lives a thousand lives before he dies. The man who never reads lives only one.", author: "George R.R. Martin", emoji: "📚" },
  { text: "The more that you read, the more things you will know. The more that you learn, the more places you'll go.", author: "Dr. Seuss", emoji: "🌟" },
  { text: "There is no friend as loyal as a book.", author: "Ernest Hemingway", emoji: "❤️" },
  { text: "Reading is to the mind what exercise is to the body.", author: "Joseph Addison", emoji: "🧠" },
  { text: "Today a reader, tomorrow a leader.", author: "Margaret Fuller", emoji: "👑" },
  { text: "Books are a uniquely portable magic.", author: "Stephen King", emoji: "✨" },
  { text: "A room without books is like a body without a soul.", author: "Cicero", emoji: "🏠" },
];

const ACHIEVEMENTS = [
  { id: 'first_page', title: 'First Page', desc: 'Read your first page', icon: '📖', threshold: 1 },
  { id: 'bookworm', title: 'Bookworm', desc: 'Read 100 pages', icon: '🐛', threshold: 100 },
  { id: 'scholar', title: 'Scholar', desc: 'Read 500 pages', icon: '🎓', threshold: 500 },
  { id: 'librarian', title: 'Librarian', desc: 'Read 1000 pages', icon: '📚', threshold: 1000 },
  { id: 'streak_3', title: 'On Fire', desc: '3 day streak', icon: '🔥', streakThreshold: 3 },
  { id: 'streak_7', title: 'Week Warrior', desc: '7 day streak', icon: '⚔️', streakThreshold: 7 },
  { id: 'streak_30', title: 'Monthly Master', desc: '30 day streak', icon: '👑', streakThreshold: 30 },
  { id: 'goal_crusher', title: 'Goal Crusher', desc: 'Beat daily goal by 50%', icon: '💪', special: 'goal_crusher' },
];

const READING_TIPS = [
  { tip: "Set a specific reading time each day", icon: "⏰" },
  { tip: "Create a cozy reading environment", icon: "🛋️" },
  { tip: "Start with just 10 pages a day", icon: "📄" },
  { tip: "Keep a book by your bed", icon: "🛏️" },
  { tip: "Join a book club for motivation", icon: "👥" },
  { tip: "Mix genres to stay interested", icon: "🎭" },
];

export default function ReadingProgressScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [quote, setQuote] = useState<{ text: string; author: string; emoji?: string } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showAchievementsModal, setShowAchievementsModal] = useState(false);
  const [showTipsModal, setShowTipsModal] = useState(false);
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [weeklyData, setWeeklyData] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);
  const [totalPagesRead, setTotalPagesRead] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [dailyGoal, setDailyGoal] = useState(30);
  const [pagesReadToday, setPagesReadToday] = useState(0);

  const router = useRouter();

  const handlePagesUpdated = (newPages?: number, newStreak?: number) => {
    // Update state immediately if values provided
    if (typeof newPages === 'number') {
      setPagesReadToday(newPages);
      // Update weekly data - last day (today)
      setWeeklyData(prev => {
        const updated = [...prev];
        updated[6] = newPages;
        return updated;
      });
      // Update total pages
      setTotalPagesRead(prev => {
        const oldToday = weeklyData[6] || 0;
        return prev - oldToday + newPages;
      });
    }
    if (typeof newStreak === 'number') {
      setCurrentStreak(newStreak);
    }
    
    setRefreshKey(prev => prev + 1);
    // Delay fetch to ensure database is updated
    setTimeout(() => {
      fetchReadingProgress();
    }, 500);
  };

  // Calculate stats
  const stats = useMemo(() => {
    const weekTotal = weeklyData.reduce((a, b) => a + b, 0);
    const avgPerDay = Math.round(weekTotal / 7);
    const bestDay = Math.max(...weeklyData);
    const daysActive = weeklyData.filter(d => d > 0).length;
    const progressPercent = dailyGoal > 0 ? Math.round((pagesReadToday / dailyGoal) * 100) : 0;
    const remainingToday = Math.max(0, dailyGoal - pagesReadToday);
    
    return { weekTotal, avgPerDay, bestDay, daysActive, progressPercent, remainingToday };
  }, [weeklyData, dailyGoal, pagesReadToday]);

  // Calculate unlocked achievements
  const unlockedAchievements = useMemo(() => {
    return ACHIEVEMENTS.filter(a => {
      if (a.threshold) return totalPagesRead >= a.threshold;
      if (a.streakThreshold) return currentStreak >= a.streakThreshold;
      if (a.special === 'goal_crusher') return pagesReadToday >= dailyGoal * 1.5;
      return false;
    });
  }, [totalPagesRead, currentStreak, pagesReadToday, dailyGoal]);

  const onRefresh = async () => {
    Vibration.vibrate(30);
    setRefreshing(true);
    await fetchReadingProgress();
    await fetchQuoteOfTheDay();
    setRefreshing(false);
  };

  const shareProgress = async () => {
    Vibration.vibrate(30);
    try {
      await Share.share({
        message: `📚 My Reading Progress!\n\n` +
          `📖 ${pagesReadToday}/${dailyGoal} pages today (${stats.progressPercent}%)\n` +
          `🔥 ${currentStreak} day streak\n` +
          `📊 ${stats.weekTotal} pages this week\n` +
          `🏆 ${unlockedAchievements.length} achievements unlocked\n\n` +
          `Keep reading! 📚✨`,
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const nextTip = () => {
    Vibration.vibrate(30);
    setCurrentTipIndex((prev) => (prev + 1) % READING_TIPS.length);
  };

  const fetchQuoteOfTheDay = async () => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from("daily_quotes")
        .select("quote, author")
        .eq("date", today)
        .single();

      if (!error && data) {
        const randomEmoji = fallbackQuotes[Math.floor(Math.random() * fallbackQuotes.length)].emoji;
        setQuote({ text: data.quote, author: data.author, emoji: randomEmoji });
      } else {
        const randomQuote = fallbackQuotes[Math.floor(Math.random() * fallbackQuotes.length)];
        setQuote(randomQuote);
      }
    } catch (err) {
      const randomQuote = fallbackQuotes[Math.floor(Math.random() * fallbackQuotes.length)];
      setQuote(randomQuote);
    }
  };

  // Day labels for the chart
  const getDayLabels = () => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const labels = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      labels.push(days[date.getDay()]);
    }
    return labels;
  };

  useEffect(() => {
    fetchReadingProgress();
    fetchQuoteOfTheDay();
  }, []);

  async function fetchReadingProgress() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: progress, error } = await supabase
        .from("reading_progress")
        .select("pages_day1, pages_day2, pages_day3, pages_day4, pages_day5, pages_day6, pages_day7, manual_pages_today, daily_goal, streak, total_pages_read, updated_at")
        .eq("id", user.id)
        .maybeSingle();

      if (error) throw error;
      const today = new Date();
      const todayStr = today.toISOString().slice(0, 10);
      const lastUpdatedStr = progress?.updated_at ? new Date(progress.updated_at).toISOString().slice(0, 10) : null;

      let days: number[] = [
        progress?.pages_day1 || 0,
        progress?.pages_day2 || 0,
        progress?.pages_day3 || 0,
        progress?.pages_day4 || 0,
        progress?.pages_day5 || 0,
        progress?.pages_day6 || 0,
        progress?.pages_day7 || 0,
      ];

      if (lastUpdatedStr && lastUpdatedStr !== todayStr) {
        const lastDate = new Date(lastUpdatedStr + 'T00:00:00');
        const diffMs = today.getTime() - lastDate.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const pagesFromLastSave = progress?.manual_pages_today || 0;

        let newDays = [0, 0, 0, 0, 0, 0, 0];
        if (diffDays >= 7) {
          newDays = [0, 0, 0, 0, 0, 0, pagesFromLastSave];
        } else {
          for (let i = 0; i <= 6 - diffDays; i++) {
            newDays[i] = days[i + diffDays];
          }
          newDays[6] = pagesFromLastSave;
        }

        const prevStreak = progress?.streak || 0;
        const goal = progress?.daily_goal || 30;
        let newStreak = 0;
        if (pagesFromLastSave >= goal) {
          if (diffDays === 1) newStreak = prevStreak + 1;
          else newStreak = 1;
        } else {
          newStreak = 0;
        }

        await supabase.from('reading_progress').upsert({
          id: user.id,
          user_id: user.id,
          pages_day1: newDays[0],
          pages_day2: newDays[1],
          pages_day3: newDays[2],
          pages_day4: newDays[3],
          pages_day5: newDays[4],
          pages_day6: newDays[5],
          pages_day7: newDays[6],
          manual_pages_today: 0,
          streak: newStreak,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });

        days = newDays;
      }

      const data: number[] = [];
      const coercedDays = days.map((d) => {
        const n = typeof d === "string" ? parseInt(d, 10) : Number(d);
        return Number.isFinite(n) ? n : 0;
      });

      for (let i = 0; i < 7; i++) {
        data.push(coercedDays[i] || 0);
      }

      // Update state
      setWeeklyData(data);
      setPagesReadToday(progress?.manual_pages_today || 0);
      setDailyGoal(progress?.daily_goal || 30);
      setCurrentStreak(progress?.streak || 0);
      setTotalPagesRead(progress?.total_pages_read || data.reduce((a, b) => a + b, 0));

      const weekTotal = data.reduce((a, b) => a + b, 0);

      await supabase
        .from("reading_progress")
        .upsert({
          id: user.id,
          user_id: user.id,
          total_pages_read: progress?.total_pages_read || weekTotal,
          updated_at: new Date().toISOString(),
        }, { onConflict: "id" });

      setLoading(false);
    } catch (error) {
      setLoading(false);
    }
  }

  // Render weekly chart bar
  const renderChartBar = (value: number, index: number) => {
    const maxValue = Math.max(...weeklyData, dailyGoal);
    const height = maxValue > 0 ? (value / maxValue) * 100 : 0;
    const isToday = index === 6;
    const metGoal = value >= dailyGoal;
    const dayLabels = getDayLabels();

    return (
      <View key={index} style={styles.chartBarContainer}>
        <Text style={styles.chartValue}>{value}</Text>
        <View style={styles.chartBarWrapper}>
          <LinearGradient
            colors={metGoal ? ['#10b981', '#059669'] : isToday ? ['#8b5cf6', '#7c3aed'] : ['#6366f1', '#4f46e5']}
            style={[styles.chartBar, { height: `${Math.max(height, 5)}%` }]}
          />
          {value >= dailyGoal && (
            <View style={styles.goalReachedBadge}>
              <Text style={{ fontSize: 10 }}>✓</Text>
            </View>
          )}
        </View>
        <Text style={[styles.chartLabel, isToday && styles.chartLabelToday]}>{dayLabels[index]}</Text>
      </View>
    );
  };

  if (loading) {
    return (
      <LinearGradient colors={['#0f0f23', '#1a1a2e', '#16213e']} style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8b5cf6" />
        <Text style={styles.loadingText}>Loading your progress...</Text>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#0f0f23', '#1a1a2e', '#16213e']} style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8b5cf6" />
        }
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.delay(100)} style={styles.header}>
          <View>
            <Text style={styles.title}>Reading Progress</Text>
            <Text style={styles.subtitle}>Track your reading journey 📚</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.headerBtn} onPress={() => { Vibration.vibrate(30); setShowTipsModal(true); }}>
              <Ionicons name="bulb-outline" size={20} color="#f59e0b" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerBtn} onPress={shareProgress}>
              <Ionicons name="share-outline" size={20} color="#a78bfa" />
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Quick Stats Row */}
        <Animated.View entering={FadeInDown.delay(150)}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickStatsRow}>
            <TouchableOpacity onPress={() => { Vibration.vibrate(30); setShowStatsModal(true); }}>
              <LinearGradient colors={['#8b5cf6', '#7c3aed']} style={styles.quickStatCard}>
                <Text style={styles.quickStatNumber}>{stats.progressPercent}%</Text>
                <Text style={styles.quickStatLabel}>Today</Text>
              </LinearGradient>
            </TouchableOpacity>
            <LinearGradient colors={['#f59e0b', '#d97706']} style={styles.quickStatCard}>
              <Text style={styles.quickStatNumber}>{currentStreak}</Text>
              <Text style={styles.quickStatLabel}>🔥 Streak</Text>
            </LinearGradient>
            <LinearGradient colors={['#10b981', '#059669']} style={styles.quickStatCard}>
              <Text style={styles.quickStatNumber}>{stats.weekTotal}</Text>
              <Text style={styles.quickStatLabel}>This Week</Text>
            </LinearGradient>
            <TouchableOpacity onPress={() => { Vibration.vibrate(30); setShowAchievementsModal(true); }}>
              <LinearGradient colors={['#ec4899', '#db2777']} style={styles.quickStatCard}>
                <Text style={styles.quickStatNumber}>{unlockedAchievements.length}</Text>
                <Text style={styles.quickStatLabel}>🏆 Badges</Text>
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </Animated.View>

        {/* Daily Quote */}
        {quote && (
          <Animated.View entering={FadeInDown.delay(200)} style={styles.quoteContainer}>
            <ImageBackground
              source={{ uri: "https://images.unsplash.com/photo-1491841573634-28140e0d8e5d?w=800" }}
              resizeMode="cover"
              style={styles.quoteBackground}
              imageStyle={{ borderRadius: 16 }}
            >
              <LinearGradient colors={['rgba(0,0,0,0.4)', 'rgba(0,0,0,0.7)']} style={styles.quoteOverlay}>
                <Text style={styles.quoteEmoji}>{quote.emoji || '📚'}</Text>
                <Text style={styles.quoteText}>"{quote.text}"</Text>
                <Text style={styles.quoteAuthor}>— {quote.author}</Text>
              </LinearGradient>
            </ImageBackground>
          </Animated.View>
        )}

        {/* Weekly Chart */}
        <Animated.View entering={FadeInDown.delay(250)} style={styles.chartSection}>
          <View style={styles.chartHeader}>
            <Text style={styles.sectionTitle}>📊 Weekly Overview</Text>
            <View style={styles.goalIndicator}>
              <View style={[styles.goalDot, { backgroundColor: '#10b981' }]} />
              <Text style={styles.goalIndicatorText}>Goal: {dailyGoal}</Text>
            </View>
          </View>
          <View style={styles.chartContainer}>
            {weeklyData.map((value, index) => renderChartBar(value, index))}
          </View>
          <View style={styles.chartSummary}>
            <View style={styles.chartSummaryItem}>
              <Text style={styles.chartSummaryValue}>{stats.avgPerDay}</Text>
              <Text style={styles.chartSummaryLabel}>Avg/Day</Text>
            </View>
            <View style={styles.chartSummaryItem}>
              <Text style={styles.chartSummaryValue}>{stats.bestDay}</Text>
              <Text style={styles.chartSummaryLabel}>Best Day</Text>
            </View>
            <View style={styles.chartSummaryItem}>
              <Text style={styles.chartSummaryValue}>{stats.daysActive}/7</Text>
              <Text style={styles.chartSummaryLabel}>Active Days</Text>
            </View>
          </View>
        </Animated.View>

        {/* Progress Stats Component */}
        <Animated.View entering={FadeInDown.delay(300)}>
          <ProgressStats refreshTrigger={refreshKey} />
        </Animated.View>

        {/* Reading Goals Component */}
        <Animated.View entering={FadeInDown.delay(350)}>
          <ReadingGoals onPagesUpdated={handlePagesUpdated} />
        </Animated.View>

        {/* Achievements Preview */}
        <Animated.View entering={FadeInDown.delay(400)} style={styles.achievementsPreview}>
          <TouchableOpacity style={styles.achievementsHeader} onPress={() => { Vibration.vibrate(30); setShowAchievementsModal(true); }}>
            <Text style={styles.sectionTitle}>🏆 Achievements</Text>
            <View style={styles.viewAllBtn}>
              <Text style={styles.viewAllText}>View All</Text>
              <Ionicons name="chevron-forward" size={16} color="#a78bfa" />
            </View>
          </TouchableOpacity>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {ACHIEVEMENTS.slice(0, 5).map((achievement) => {
              const unlocked = unlockedAchievements.some(a => a.id === achievement.id);
              return (
                <View key={achievement.id} style={[styles.achievementChip, unlocked && styles.achievementChipUnlocked]}>
                  <Text style={styles.achievementIcon}>{achievement.icon}</Text>
                  <Text style={[styles.achievementTitle, !unlocked && styles.achievementLocked]}>{achievement.title}</Text>
                </View>
              );
            })}
          </ScrollView>
        </Animated.View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Stats Modal */}
      <Modal visible={showStatsModal} transparent animationType="fade">
        <BlurView intensity={80} tint="dark" style={styles.modalOverlay}>
          <Animated.View entering={ZoomIn} style={styles.statsModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📊 Detailed Stats</Text>
              <TouchableOpacity onPress={() => setShowStatsModal(false)}>
                <Ionicons name="close" size={24} color="#888" />
              </TouchableOpacity>
            </View>

            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <Text style={styles.statBoxNumber}>{pagesReadToday}</Text>
                <Text style={styles.statBoxLabel}>Pages Today</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statBoxNumber}>{stats.remainingToday}</Text>
                <Text style={styles.statBoxLabel}>Remaining</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statBoxNumber}>{stats.weekTotal}</Text>
                <Text style={styles.statBoxLabel}>This Week</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statBoxNumber}>{totalPagesRead}</Text>
                <Text style={styles.statBoxLabel}>All Time</Text>
              </View>
            </View>

            <View style={styles.streakBox}>
              <Text style={styles.streakIcon}>🔥</Text>
              <View>
                <Text style={styles.streakValue}>{currentStreak} Day Streak</Text>
                <Text style={styles.streakDesc}>
                  {currentStreak > 0 ? "Keep it going!" : "Start your streak today!"}
                </Text>
              </View>
            </View>

            <View style={styles.progressCircleContainer}>
              <View style={styles.progressCircle}>
                <Text style={styles.progressCirclePercent}>{stats.progressPercent}%</Text>
                <Text style={styles.progressCircleLabel}>Today's Goal</Text>
              </View>
            </View>
          </Animated.View>
        </BlurView>
      </Modal>

      {/* Achievements Modal */}
      <Modal visible={showAchievementsModal} transparent animationType="fade">
        <BlurView intensity={80} tint="dark" style={styles.modalOverlay}>
          <Animated.View entering={ZoomIn} style={styles.achievementsModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🏆 All Achievements</Text>
              <TouchableOpacity onPress={() => setShowAchievementsModal(false)}>
                <Ionicons name="close" size={24} color="#888" />
              </TouchableOpacity>
            </View>

            <Text style={styles.achievementsCount}>
              {unlockedAchievements.length}/{ACHIEVEMENTS.length} Unlocked
            </Text>

            <FlatList
              data={ACHIEVEMENTS}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => {
                const unlocked = unlockedAchievements.some(a => a.id === item.id);
                return (
                  <View style={[styles.achievementRow, unlocked && styles.achievementRowUnlocked]}>
                    <Text style={styles.achievementRowIcon}>{item.icon}</Text>
                    <View style={styles.achievementRowInfo}>
                      <Text style={[styles.achievementRowTitle, !unlocked && styles.achievementRowLocked]}>{item.title}</Text>
                      <Text style={styles.achievementRowDesc}>{item.desc}</Text>
                    </View>
                    {unlocked && <Ionicons name="checkmark-circle" size={24} color="#10b981" />}
                  </View>
                );
              }}
            />
          </Animated.View>
        </BlurView>
      </Modal>

      {/* Tips Modal */}
      <Modal visible={showTipsModal} transparent animationType="fade">
        <BlurView intensity={80} tint="dark" style={styles.modalOverlay}>
          <Animated.View entering={ZoomIn} style={styles.tipsModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>💡 Reading Tips</Text>
              <TouchableOpacity onPress={() => setShowTipsModal(false)}>
                <Ionicons name="close" size={24} color="#888" />
              </TouchableOpacity>
            </View>

            <View style={styles.tipCard}>
              <Text style={styles.tipEmoji}>{READING_TIPS[currentTipIndex].icon}</Text>
              <Text style={styles.tipText}>{READING_TIPS[currentTipIndex].tip}</Text>
            </View>

            <View style={styles.tipNavigation}>
              <View style={styles.tipDots}>
                {READING_TIPS.map((_, index) => (
                  <View key={index} style={[styles.tipDot, index === currentTipIndex && styles.tipDotActive]} />
                ))}
              </View>
              <TouchableOpacity style={styles.nextTipBtn} onPress={nextTip}>
                <Text style={styles.nextTipText}>Next Tip</Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          </Animated.View>
        </BlurView>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#a78bfa', marginTop: 12, fontSize: 14 },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 16,
    marginBottom: 16,
  },
  title: { fontSize: 28, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  subtitle: { fontSize: 13, color: '#a78bfa', marginTop: 2 },
  headerActions: { flexDirection: 'row', gap: 8 },
  headerBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center', alignItems: 'center',
  },

  // Quick Stats Row
  quickStatsRow: { marginBottom: 16, paddingLeft: 16 },
  quickStatCard: {
    width: 85, height: 75, borderRadius: 16,
    padding: 10, marginRight: 10, alignItems: 'center', justifyContent: 'center',
  },
  quickStatNumber: { fontSize: 22, fontWeight: '800', color: '#fff' },
  quickStatLabel: { fontSize: 10, color: 'rgba(255,255,255,0.8)', marginTop: 2, fontWeight: '600' },

  // Quote
  quoteContainer: { paddingHorizontal: 16, marginBottom: 16 },
  quoteBackground: { height: 160, borderRadius: 16, overflow: 'hidden' },
  quoteOverlay: { flex: 1, padding: 16, justifyContent: 'center', borderRadius: 16 },
  quoteEmoji: { fontSize: 28, marginBottom: 8 },
  quoteText: { color: '#fff', fontSize: 15, fontWeight: '600', fontStyle: 'italic', lineHeight: 22 },
  quoteAuthor: { color: '#e6e6e6', marginTop: 10, fontSize: 13 },

  // Chart Section
  chartSection: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 16,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#fff' },
  goalIndicator: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  goalDot: { width: 8, height: 8, borderRadius: 4 },
  goalIndicatorText: { fontSize: 12, color: '#888' },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 120,
    marginBottom: 12,
  },
  chartBarContainer: { alignItems: 'center', flex: 1 },
  chartValue: { fontSize: 10, color: '#888', marginBottom: 4 },
  chartBarWrapper: { width: 28, height: 100, justifyContent: 'flex-end', alignItems: 'center' },
  chartBar: { width: '100%', borderRadius: 6, minHeight: 4 },
  goalReachedBadge: {
    position: 'absolute', top: -8,
    backgroundColor: '#10b981', borderRadius: 8,
    width: 16, height: 16, justifyContent: 'center', alignItems: 'center',
  },
  chartLabel: { fontSize: 11, color: '#666', marginTop: 6 },
  chartLabelToday: { color: '#a78bfa', fontWeight: '700' },
  chartSummary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingTop: 12,
  },
  chartSummaryItem: { alignItems: 'center' },
  chartSummaryValue: { fontSize: 18, fontWeight: '700', color: '#fff' },
  chartSummaryLabel: { fontSize: 11, color: '#888', marginTop: 2 },

  // Achievements Preview
  achievementsPreview: { paddingHorizontal: 16, marginBottom: 16 },
  achievementsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  viewAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  viewAllText: { fontSize: 13, color: '#a78bfa', fontWeight: '600' },
  achievementChip: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 12,
    marginRight: 10,
    alignItems: 'center',
    minWidth: 80,
  },
  achievementChipUnlocked: { backgroundColor: 'rgba(139,92,246,0.2)' },
  achievementIcon: { fontSize: 24, marginBottom: 4 },
  achievementTitle: { fontSize: 11, color: '#fff', fontWeight: '600' },
  achievementLocked: { color: '#666' },

  // Modal Common
  modalOverlay: { flex: 1, justifyContent: 'center', padding: 20 },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },

  // Stats Modal
  statsModal: {
    backgroundColor: 'rgba(26, 26, 46, 0.98)',
    borderRadius: 20,
    padding: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  statBox: {
    width: (width - 80) / 2 - 5,
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  statBoxNumber: { fontSize: 28, fontWeight: '800', color: '#a78bfa' },
  statBoxLabel: { fontSize: 12, color: '#888', marginTop: 4 },
  streakBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(245,158,11,0.15)',
    padding: 16,
    borderRadius: 14,
    marginBottom: 16,
  },
  streakIcon: { fontSize: 32 },
  streakValue: { fontSize: 18, fontWeight: '700', color: '#f59e0b' },
  streakDesc: { fontSize: 12, color: '#888', marginTop: 2 },
  progressCircleContainer: { alignItems: 'center' },
  progressCircle: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: 'rgba(139,92,246,0.2)',
    borderWidth: 4, borderColor: '#8b5cf6',
    justifyContent: 'center', alignItems: 'center',
  },
  progressCirclePercent: { fontSize: 24, fontWeight: '800', color: '#fff' },
  progressCircleLabel: { fontSize: 10, color: '#888' },

  // Achievements Modal
  achievementsModal: {
    backgroundColor: 'rgba(26, 26, 46, 0.98)',
    borderRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  achievementsCount: { fontSize: 14, color: '#a78bfa', fontWeight: '600', marginBottom: 16 },
  achievementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
  },
  achievementRowUnlocked: { backgroundColor: 'rgba(16,185,129,0.1)' },
  achievementRowIcon: { fontSize: 28 },
  achievementRowInfo: { flex: 1 },
  achievementRowTitle: { fontSize: 15, fontWeight: '700', color: '#fff' },
  achievementRowLocked: { color: '#666' },
  achievementRowDesc: { fontSize: 12, color: '#888', marginTop: 2 },

  // Tips Modal
  tipsModal: {
    backgroundColor: 'rgba(26, 26, 46, 0.98)',
    borderRadius: 20,
    padding: 20,
  },
  tipCard: {
    backgroundColor: 'rgba(245,158,11,0.1)',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
  },
  tipEmoji: { fontSize: 48, marginBottom: 12 },
  tipText: { fontSize: 16, color: '#fff', fontWeight: '600', textAlign: 'center', lineHeight: 24 },
  tipNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tipDots: { flexDirection: 'row', gap: 6 },
  tipDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.2)' },
  tipDotActive: { backgroundColor: '#f59e0b' },
  nextTipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  nextTipText: { color: '#fff', fontWeight: '600' },
});
