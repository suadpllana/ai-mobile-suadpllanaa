import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 16,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
  },
  settingsButton: {
    padding: 8,
  },
  chartContainer: {
    padding: 16,
    backgroundColor: "rgba(139, 92, 246, 0.1)",
    borderRadius: 16,
    margin: 16,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  quoteContainer: { paddingHorizontal: 16, marginBottom: 12 },
  quoteBackground: { height: 140, borderRadius: 16, overflow: 'hidden' },
  quoteOverlay: { flex: 1, padding: 16, justifyContent: 'center' },
  quoteIcon: { fontSize: 40, color: '#fff', marginBottom: 8 },
  quoteText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  quoteAuthor: { color: '#e6e6e6', marginTop: 6 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  sessionsContainer: {
    marginTop: 24,
    paddingBottom: 80,
  },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#8b5cf6",
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
});