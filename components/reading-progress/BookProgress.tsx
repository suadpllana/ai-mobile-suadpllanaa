import React, { useEffect, useState } from "react";
import {
  Image,
  Keyboard,
  Modal,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../supabase";
import { ThemedText } from "../themed-text";

type Book = {
  id: string;
  book_id?: string;
  title: string;
  author: string;
  cover_image: string;
  current_page: number;
  total_pages: number;
  progress_percentage: number;
};

const styles = StyleSheet.create({
  container: { marginTop: 8 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  title: { fontSize: 18, fontWeight: "600" },
  seeAll: { color: "#8b5cf6", fontSize: 14 },
  scrollView: { flexGrow: 0 },
  booksContainer: { paddingHorizontal: 12, flexDirection: "row" },
  bookCard: {
    width: 160,
    backgroundColor: "rgba(139, 92, 246, 0.1)",
    borderRadius: 12,
    overflow: "hidden",
    marginRight: 16,
  },
  coverImage: { width: "100%", height: 200, resizeMode: "cover" },
  bookInfo: { padding: 12 },
  bookTitle: { fontSize: 14, fontWeight: "600", marginBottom: 4 },
  bookAuthor: { fontSize: 12, opacity: 0.7, marginBottom: 8 },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: "rgba(139, 92, 246, 0.2)",
    borderRadius: 2,
    overflow: "hidden",
    marginRight: 8,
  },
  progressFill: { height: "100%", backgroundColor: "#8b5cf6", borderRadius: 2 },
  progressText: { fontSize: 12, fontWeight: "500" },
  pageCount: { fontSize: 12, opacity: 0.7 },
  editButton: {
    marginTop: 8,
    backgroundColor: "#8b5cf6",
    borderRadius: 8,
    padding: 8,
    alignItems: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(30,30,46,0.85)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    width: 320,
  },
  modalTitle: { fontSize: 18, fontWeight: "700", marginBottom: 12 },
  modalText: { marginBottom: 8 },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  input: {
    width: 80,
    fontSize: 16,
    padding: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#f3f4f6",
    textAlign: "center",
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  cancelBtn: { padding: 10 },
  cancelText: { color: "#8b5cf6", fontWeight: "600" },
  saveBtn: {
    backgroundColor: "#8b5cf6",
    borderRadius: 8,
    padding: 10,
    minWidth: 80,
    alignItems: "center",
  },
  saveText: { color: "#fff", fontWeight: "700" },
});

export function BookProgress({ onProgressUpdated }: { onProgressUpdated?: () => void }) {
  const [books, setBooks] = useState<Book[]>([]);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [newPage, setNewPage] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    fetchBooksInProgress();
  }, []);

  async function fetchBooksInProgress() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("reading_progress")
        .select(`
          id,
          book_id,
          current_page,
          total_pages,
          progress_percentage,
          books (
            id,
            title,
            author,
            cover_image
          )
        `)
        .eq("reading_status", "in_progress")
        .eq("user_id", user.id)
        .limit(5);

      if (error) throw error;

      const formattedBooks: Book[] = (data || []).map((item: any) => ({
        id: item.id,
        book_id: item.book_id,
        title: item.books?.title || "Unknown Title",
        author: item.books?.author || "Unknown Author",
        cover_image: item.books?.cover_image || "",
        current_page: item.current_page || 0,
        total_pages: item.total_pages || 1,
        progress_percentage: item.progress_percentage || 0,
      }));

      setBooks(formattedBooks);
    } catch (error) {
      console.error("Error fetching books:", error);
    }
  }

  const openEditModal = (book: Book) => {
    setSelectedBook(book);
    setNewPage(book.current_page);
    setModalVisible(true);
  };

  const closeEditModal = () => {
    setModalVisible(false);
    setSelectedBook(null);
    setNewPage(0);
    Keyboard.dismiss();
  };

  const handleUpdatePages = async () => {
    if (!selectedBook || newPage < 0 || newPage > selectedBook.total_pages) return;

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No authenticated user");

      const progress_percentage = Number(
        ((newPage / selectedBook.total_pages) * 100).toFixed(2)
      );

      await supabase
        .from("reading_progress")
        .update({
          current_page: newPage,
          progress_percentage,
          last_read_date: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedBook.id)
        .eq("user_id", user.id);

      const pagesReadToday = newPage - selectedBook.current_page;
      if (pagesReadToday !== 0) {
        await supabase.from("reading_sessions").insert({
          progress_id: selectedBook.id,
          start_time: new Date().toISOString(),
          pages_read: pagesReadToday,
          mood: "neutral",
          location: "",
        });

        try {
          const { data: agg } = await supabase
            .from('reading_progress')
            .select('pages_day1,pages_day2,pages_day3,pages_day4,pages_day5,pages_day6,pages_day7,manual_pages_today,updated_at,daily_goal,streak')
            .eq('id', user.id)
            .maybeSingle();

          const today = new Date();
          const todayStr = today.toISOString().slice(0,10);
          const lastUpdatedStr = agg?.updated_at ? new Date(agg.updated_at).toISOString().slice(0,10) : null;

          const oldDays = [
            agg?.pages_day1 || 0,
            agg?.pages_day2 || 0,
            agg?.pages_day3 || 0,
            agg?.pages_day4 || 0,
            agg?.pages_day5 || 0,
            agg?.pages_day6 || 0,
            agg?.pages_day7 || 0,
          ];

          if (lastUpdatedStr && lastUpdatedStr !== todayStr) {
            const lastDate = new Date(lastUpdatedStr + 'T00:00:00');
            const diffMs = today.getTime() - lastDate.getTime();
            const diffDays = Math.floor(diffMs / (1000*60*60*24));

            let newDays = [0,0,0,0,0,0,0];
            if (diffDays >= 7) {
              newDays = [0,0,0,0,0,0,pagesReadToday];
            } else {
              for (let i = 0; i <= 6 - diffDays; i++) newDays[i] = oldDays[i + diffDays];
              newDays[6] = pagesReadToday;
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
              manual_pages_today: pagesReadToday,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'id' });
          } else {
            const newManual = (agg?.manual_pages_today || 0) + pagesReadToday;
            await supabase.from('reading_progress').upsert({
              id: user.id,
              user_id: user.id,
              manual_pages_today: newManual,
              pages_day7: newManual,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'id' });
          }
        } catch (err) {
          console.warn('Failed to update aggregate reading_progress:', err);
        }
      }

      await fetchBooksInProgress();
      closeEditModal();
      if (onProgressUpdated) {
        onProgressUpdated();
      }
    } catch (error) {
      console.error("Error updating pages:", error);
    } finally {
      setLoading(false);
    }
  };

  if (books.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <ThemedText style={styles.title}>Currently Reading</ThemedText>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.booksContainer}
      >
        {books.map((book) => (
          <TouchableOpacity
            key={book.id}
            style={styles.bookCard}
            activeOpacity={0.8}
          >
            <Image source={{ uri: book.cover_image }} style={styles.coverImage} />
            <View style={styles.bookInfo}>
              <ThemedText numberOfLines={2} style={styles.bookTitle}>
                {book.title}
              </ThemedText>
              <ThemedText numberOfLines={1} style={styles.bookAuthor}>
                {book.author}
              </ThemedText>

              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${book.progress_percentage}%` },
                    ]}
                  />
                </View>
                <ThemedText style={styles.progressText}>
                  {Math.round(book.progress_percentage)}%
                </ThemedText>
              </View>

              <ThemedText style={styles.pageCount}>
                {book.current_page} / {book.total_pages} pages
              </ThemedText>

              <TouchableOpacity
                style={styles.editButton}
                onPress={() => openEditModal(book)}
              >
                <ThemedText style={{ color: "#fff", fontWeight: "600" }}>
                  Edit pages read today
                </ThemedText>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeEditModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ThemedText style={styles.modalTitle}>Edit Pages Read</ThemedText>
            <ThemedText style={styles.modalText}>
              Book: {selectedBook?.title}
            </ThemedText>
            <ThemedText style={styles.modalText}>
              Total Pages: {selectedBook?.total_pages}
            </ThemedText>

            <View style={styles.inputRow}>
              <ThemedText style={{ marginRight: 8 }}>Current Page:</ThemedText>
              <TextInput
                keyboardType="numeric"
                value={String(newPage)}
                onChangeText={(text) => {
                  const val = parseInt(text.replace(/[^0-9]/g, "")) || 0;
                  if (val >= 0 && val <= (selectedBook?.total_pages || 0)) {
                    setNewPage(val);
                  }
                }}
                style={styles.input}
                maxLength={String(selectedBook?.total_pages || 0).length + 1}
              />
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity onPress={closeEditModal} style={styles.cancelBtn}>
                <ThemedText style={styles.cancelText}>Cancel</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleUpdatePages}
                style={styles.saveBtn}
                disabled={loading || newPage === selectedBook?.current_page}
              >
                <ThemedText style={styles.saveText}>
                  {loading ? "Saving..." : "Save"}
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}