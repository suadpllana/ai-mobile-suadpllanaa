import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "react-native-toast-message";
import BookCard from "../../components/BookCard";
import BookModal from "../../components/BookModal";
import { supabase } from "../../supabase";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback } from "react";
type Favorite = {
  id: string;
  book_id: string;
  user_id: string;
  title: string;
  author: string;
  image_url?: string;
  description?: string | null;
  category_id?: string | null;
  categoryName?: string | null;
  created_at: string;
};

export default function FavoritesScreen() {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [selectedBook, setSelectedBook] = useState<any | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const [refreshKey, setRefreshKey] = useState(0);

useFocusEffect(
    useCallback(() => {
      if (userId) {
        console.log("Favorites tab focused → refetching...");
        fetchFavorites();
      }
    }, [userId])
  );

  useEffect(() => {
    checkSession();
    fetchFavorites();
  }, []);



  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`favorites-user-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "favorites",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          fetchFavorites();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const checkSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUserId(session.user.id);
      }
    } catch (error) {
      console.error("Error checking session:", error);
    }
  };

  const fetchFavorites = async () => {
    if (!userId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("favorites")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const favoritesData = data || [];
      const bookIds = favoritesData
        .map((f: any) => f.book_id)
        .filter((id: string) => typeof id === "string" && !id.includes("::"));

      let booksMap: Record<string, any> = {};
      let categoriesMap: Record<string, string> = {};

      if (bookIds.length > 0) {
        const { data: books } = await supabase
          .from("books")
          .select("id, description, category_id")
          .in("id", bookIds);

        (books || []).forEach((b: any) => {
          booksMap[b.id] = b;
        });

        const categoryIds = Array.from(
          new Set((books || []).map((b: any) => b.category_id).filter(Boolean))
        );
        if (categoryIds.length > 0) {
          const { data: categories } = await supabase
            .from("categories")
            .select("id, name")
            .in("id", categoryIds);

          (categories || []).forEach((c: any) => {
            categoriesMap[c.id] = c.name;
          });
        }
      }

      const enriched = favoritesData.map((f: any) => {
        const book = booksMap[f.book_id];
        const description = f.description ?? book?.description ?? null;
        const category_id = f.category_id ?? book?.category_id ?? null;
        const categoryName =
          f.categoryName ?? (category_id ? categoriesMap[category_id] : null) ?? null;

        return {
          ...f,
          description,
          category_id,
          categoryName,
        };
      });

      setFavorites(enriched.map(item => ({ ...item })));
      setRefreshKey(k => k + 1); 
    } catch (error) {
      console.error("Error fetching favorites:", error);
      Toast.show({ type: "error", text1: "Failed to load favorites" });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFavorite = async (bookId: string) => {
    try {
      const { error } = await supabase
        .from("favorites")
        .delete()
        .eq("book_id", bookId)
        .eq("user_id", userId);

      if (error) throw error;

      Toast.show({
        type: "info",
        text1: "Removed from favorites",
      });

      fetchFavorites(); 
    } catch (error) {
      console.error("Error removing favorite:", error);
      Toast.show({
        type: "error",
        text1: "Failed to remove",
      });
    }
  };

  const renderStars = () => null;

  const openDetails = (b: any) => {
    setSelectedBook(b);
    setDetailsVisible(true);
  };

  const closeDetails = () => {
    setSelectedBook(null);
    setDetailsVisible(false);
  };

  const filteredFavorites = useMemo(() => {
    if (!searchQuery.trim()) return favorites;

    const query = searchQuery.toLowerCase().trim();
    return favorites.filter(
      (book) =>
        book.title.toLowerCase().includes(query) ||
        book.author.toLowerCase().includes(query)
    );
  }, [favorites, searchQuery]);

  if (loading) {
    return (
      <LinearGradient
        colors={["#0f0f23", "#1a1a2e", "#16213e"]}
        style={styles.loadingContainer}
      >
        <ActivityIndicator size="large" color="#8b5cf6" />
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={["#0f0f23", "#1a1a2e", "#16213e"]}
      style={styles.container}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Favorites</Text>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#aaa" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by title or author..."
          placeholderTextColor="#888"
          value={searchQuery}
          onChangeText={(text) => {
            setSearchQuery(text);
            setIsSearching(text.length > 0);
          }}
          autoCorrect={false}
        />
        {isSearching && (
          <TouchableOpacity
            onPress={() => {
              setSearchQuery("");
              setIsSearching(false);
            }}
            style={styles.clearButton}
          >
            <Ionicons name="close-circle" size={20} color="#aaa" />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={filteredFavorites}
        keyExtractor={(item) => item.id}
        extraData={refreshKey} 
        contentContainerStyle={[
          styles.listContent,
          filteredFavorites.length === 0 && { flexGrow: 1 },
        ]}
        ListEmptyComponent={
          <BlurView intensity={80} tint="dark" style={styles.emptyContainer}>
            <Ionicons
              name={searchQuery ? "search-outline" : "heart-outline"}
              size={48}
              color="#8b5cf6"
            />
            <Text style={styles.emptyText}>
              {searchQuery
                ? `No favorites found for "${searchQuery}"`
                : "No favorite books yet"}
            </Text>
            <Text style={styles.emptySubtext}>
              {searchQuery
                ? "Try searching for a different title or author"
                : "Tap the heart icon on any book to add it here"}
            </Text>
          </BlurView>
        }
        renderItem={({ item }) => (
          <BookCard
            key={`${item.id}-${refreshKey}`}
            book={{
              id: item.book_id,
              title: item.title,
              author: item.author,
              image: item.image_url,
              description: item.description,
            }}
            onPress={() => openDetails(item)}
            onDelete={() => handleRemoveFavorite(item.book_id)}
            renderStars={renderStars}
            imageUrl={item.image_url}
            categoryName={item.categoryName || "Uncategorized"}
            fetchFavorites={fetchFavorites}
          />
        )}
      />

      <BookModal
        visible={detailsVisible}
        onClose={closeDetails}
        book={selectedBook}
        showAddToLibrary={false}
        addToLibrary={() => {}}
      />
      <Toast />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 10 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 0.5,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 50,
  },
  searchIcon: { marginRight: 12 },
  searchInput: { flex: 1, color: "#fff", fontSize: 16 },
  clearButton: { padding: 4 },
  listContent: { paddingHorizontal: 20, paddingBottom: 100 },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
    borderRadius: 20,
    backgroundColor: "rgba(30,30,46,0.5)",
    marginTop: 50,
  },
  emptyText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
    textAlign: "center",
  },
  emptySubtext: {
    color: "#94a3b8",
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },
});