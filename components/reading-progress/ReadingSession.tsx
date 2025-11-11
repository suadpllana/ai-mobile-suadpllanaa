import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, View } from "react-native";
import { ThemedText } from "../themed-text";

type ReadingSessionProps = {
  session: {
    pages_read: number;
    reading_duration: string;
    mood: string;
    location: string;
    created_at: string;
  };
};

export function ReadingSession({ session }: ReadingSessionProps) {
  const getMoodIcon = (mood: string) => {
    switch (mood) {
      case "focused":
        return "checkmark-circle";
      case "distracted":
        return "alert-circle";
      case "tired":
        return "bed";
      case "energetic":
        return "flash";
      default:
        return "radio-button-on";
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const formatDuration = (duration: string) => {
    const hours = duration.match(/(\d+) hours?/)?.[1] || "0";
    const minutes = duration.match(/(\d+) minutes?/)?.[1] || "0";
    return `${hours}h ${minutes}m`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.leftContent}>
          <ThemedText style={styles.pages}>
            {session.pages_read} pages
          </ThemedText>
          <ThemedText style={styles.duration}>
            {formatDuration(session.reading_duration)}
          </ThemedText>
        </View>
        <ThemedText style={styles.date}>
          {formatDate(session.created_at)}
        </ThemedText>
      </View>
      
      <View style={styles.details}>
        <View style={styles.detail}>
          <Ionicons
            name={getMoodIcon(session.mood)}
            size={16}
            color="#8b5cf6"
          />
          <ThemedText style={styles.detailText}>
            {session.mood.charAt(0).toUpperCase() + session.mood.slice(1)}
          </ThemedText>
        </View>
        {session.location && (
          <View style={styles.detail}>
            <Ionicons name="location" size={16} color="#8b5cf6" />
            <ThemedText style={styles.detailText}>
              {session.location}
            </ThemedText>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: "rgba(139, 92, 246, 0.1)",
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  leftContent: {
    flex: 1,
  },
  pages: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  duration: {
    fontSize: 14,
    opacity: 0.7,
  },
  date: {
    fontSize: 14,
    opacity: 0.7,
  },
  details: {
    flexDirection: "row",
    gap: 16,
  },
  detail: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  detailText: {
    fontSize: 14,
    opacity: 0.8,
  },
});