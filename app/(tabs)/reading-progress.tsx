import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  ImageBackground,
  ScrollView,
  Text,
  View,
} from "react-native";
import { LineChart } from "react-native-chart-kit";
import { styles } from "../(tabs)/reading-progress/styles";
import { ProgressStats } from "../../components/reading-progress/ProgressStats";
import { ReadingGoals } from "../../components/reading-progress/ReadingGoals";
import { ThemedText } from "../../components/themed-text";
import { ThemedView } from "../../components/themed-view";
import { supabase } from "../../supabase";

const { width } = Dimensions.get("window");

const fallbackQuotes = [
  { text: "A reader lives a thousand lives before he dies. The man who never reads lives only one.", author: "George R.R. Martin" },
  { text: "The more that you read, the more things you will know. The more that you learn, the more places you'll go.", author: "Dr. Seuss" },
  { text: "There is no friend as loyal as a book.", author: "Ernest Hemingway" },
  { text: "Reading is to the mind what exercise is to the body.", author: "Joseph Addison" },
  { text: "Today a reader, tomorrow a leader.", author: "Margaret Fuller" },
];

export default function ReadingProgressScreen() {
  const [loading, setLoading] = useState(true);
  const [quote, setQuote] = useState<{ text: string; author:  string } | null>(null);

  const [readingStats, setReadingStats] = useState({
    totalBooks: 0,
    booksInProgress: 0,
    averageProgress: 0,
    totalPagesRead: 0,
  });

  const [refreshKey, setRefreshKey] = useState(0);

  const handlePagesUpdated = () => {
    setRefreshKey(prev => prev + 1); 
  };
  type Session = {
    id: string;
    pages_read: number;
    reading_duration: string;
    mood: string;
    location: string;
    created_at: string;
  };
  const [readingSessions, setReadingSessions] = useState<Session[]>([]);
  const [progressData, setProgressData] = useState<{
    labels: string[];
    datasets: { data: number[] }[];
  }>({
    labels: [],
    datasets: [{ data: [] }],
  });
  const router = useRouter();

  const fetchQuoteOfTheDay = async () => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from("daily_quotes")
        .select("quote, author")
        .eq("date", today)
        .single();

      if (!error && data) {
        setQuote({ text: data.quote, author: data.author });
      } else {
        const randomQuote = fallbackQuotes[Math.floor(Math.random() * fallbackQuotes.length)];
        setQuote(randomQuote);
      }
    } catch (err) {
      const randomQuote = fallbackQuotes[Math.floor(Math.random() * fallbackQuotes.length)];
      setQuote(randomQuote);
    }
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
      .select("pages_day1, pages_day2, pages_day3, pages_day4, pages_day5, pages_day6, pages_day7, manual_pages_today, daily_goal, streak, updated_at")
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

    const labels: string[] = [];
    const data: number[] = [];
    const coercedDays = days.map((d) => {
      const n = typeof d === "string" ? parseInt(d, 10) : Number(d);
      return Number.isFinite(n) ? n : 0;
    });

    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(today.getDate() - (6 - i));
      labels.push(date.getDate().toString());
      data.push(coercedDays[i] || 0);
    }

    setProgressData({
      labels,
      datasets: [{ data }],
    });

    const todayPages = progress?.manual_pages_today || 0;
    const totalPagesRead = data.reduce((a, b) => a + b, 0);

    await supabase
      .from("reading_progress")
      .upsert({
        id: user.id,
        user_id: user.id,
        total_pages_read: totalPagesRead,
        updated_at: new Date().toISOString(),
      }, { onConflict: "id" });

    setLoading(false);
  } catch (error) {
    console.error("Error:", error);
    setLoading(false);
  }
}


  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8b5cf6" />
      </View>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView style={styles.scrollView}>
      

        {quote && (
          <View style={styles.quoteContainer}>
            <ImageBackground
              source={{ uri: "https://images.unsplash.com/photo-1491841573634-28140e0d8e5d?w=800" }}
              resizeMode="cover"
              style={styles.quoteBackground}
              imageStyle={{ borderRadius: 16 }}
            >
              <View style={styles.quoteOverlay}>
                <Text style={styles.quoteIcon}>“</Text>
                <ThemedText style={styles.quoteText}>{quote.text}</ThemedText>
                <ThemedText style={styles.quoteAuthor}>— {quote.author}</ThemedText>
              </View>
            </ImageBackground>
          </View>
        )}

  <ProgressStats refreshTrigger={refreshKey} />

        <View style={styles.chartContainer}>
          <ThemedText style={styles.chartTitle}>Pages Read Last 7 Days</ThemedText>
         <LineChart
  data={progressData}
  width={width - 32}
  height={240}
  chartConfig={{
    backgroundColor: "#8b5cf6",
    backgroundGradientFrom: "#8b5cf6",
    backgroundGradientTo: "#a78bfa",
    decimalPlaces: 0,
    color: () => `rgba(255, 255, 255, 1)`,
    labelColor: () => `rgba(255, 255, 255, 0.8)`,
    propsForDots: { r: "6", strokeWidth: "3", stroke: "#ddd" },
  }}
  bezier
  style={{ marginVertical: 16, borderRadius: 16 }}
/>
        </View>

        <ReadingGoals onPagesUpdated={handlePagesUpdated} />


       
      </ScrollView>
    </ThemedView>
  );
}