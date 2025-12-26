import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  Vibration,
  View,
} from "react-native";
import Animated, { FadeIn, FadeInDown, FadeInUp, ZoomIn, SlideInRight } from "react-native-reanimated";
import Toast from "react-native-toast-message";
import BookCard from "../../components/BookCard";
import BookModal from "../../components/BookModal";
import { supabase } from "../../supabase";

const { width } = Dimensions.get('window');
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

// Sort options
const SORT_OPTIONS = [
  { id: 'newest', label: 'Newest First', icon: 'time-outline' },
  { id: 'oldest', label: 'Oldest First', icon: 'time' },
  { id: 'title', label: 'Title A-Z', icon: 'text-outline' },
  { id: 'author', label: 'Author A-Z', icon: 'person-outline' },
];

export default function FavoritesScreen() {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [selectedBook, setSelectedBook] = useState<any | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const [refreshKey, setRefreshKey] = useState(0);
  
  // New state for enhanced features
  const [viewMode, setViewMode] = useState<'cards' | 'grid' | 'list'>('cards');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'title' | 'author'>('newest');
  const [showSortModal, setShowSortModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [selectedForBulk, setSelectedForBulk] = useState<Set<string>>(new Set());
  const [bulkMode, setBulkMode] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [filterByCategory, setFilterByCategory] = useState<string | null>(null);
  const [showCategoryFilter, setShowCategoryFilter] = useState(false);

useFocusEffect(
    useCallback(() => {
      if (userId) {
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
      console.error('Session error:', error);
    }
  };

  // Pull to refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Vibration.vibrate(50);
    await fetchFavorites();
    setRefreshing(false);
  }, [userId]);

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

      Vibration.vibrate(50);
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

  // Bulk remove favorites
  const handleBulkRemove = async () => {
    if (selectedForBulk.size === 0) return;
    
    try {
      const bookIds = Array.from(selectedForBulk);
      const { error } = await supabase
        .from("favorites")
        .delete()
        .in("book_id", bookIds)
        .eq("user_id", userId);

      if (error) throw error;

      Vibration.vibrate([0, 50, 50, 50]);
      Toast.show({
        type: "success",
        text1: `Removed ${bookIds.length} favorites`,
      });

      setSelectedForBulk(new Set());
      setBulkMode(false);
      fetchFavorites();
    } catch (error) {
      console.error("Bulk remove error:", error);
      Toast.show({ type: "error", text1: "Failed to remove" });
    }
  };

  // Toggle bulk selection
  const toggleBulkSelect = (bookId: string) => {
    Vibration.vibrate(30);
    setSelectedForBulk(prev => {
      const updated = new Set(prev);
      if (updated.has(bookId)) {
        updated.delete(bookId);
      } else {
        updated.add(bookId);
      }
      return updated;
    });
  };

  // Select all
  const selectAll = () => {
    Vibration.vibrate(30);
    const allIds = new Set(filteredFavorites.map(f => f.book_id));
    setSelectedForBulk(allIds);
  };

  // Share favorite
  const shareFavorite = async (book: Favorite) => {
    Vibration.vibrate(30);
    try {
      await Share.share({
        message: `❤️ Check out my favorite book: "${book.title}" by ${book.author}`,
        title: book.title,
      });
    } catch (err) {
      console.error('Share failed:', err);
    }
  };

  // Share all favorites
  const shareAllFavorites = async () => {
    Vibration.vibrate(30);
    const bookList = favorites.map((b, i) => `${i + 1}. "${b.title}" by ${b.author}`).join('\n');
    try {
      await Share.share({
        message: `📚 My Favorite Books (${favorites.length}):\n\n${bookList}`,
        title: 'My Favorite Books',
      });
    } catch (err) {
      console.error('Share failed:', err);
    }
  };

  // Pick random favorite
  const pickRandomFavorite = () => {
    if (favorites.length === 0) return;
    Vibration.vibrate([0, 50, 50, 50]);
    const random = favorites[Math.floor(Math.random() * favorites.length)];
    setSelectedBook(random);
    setDetailsVisible(true);
  };

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set<string>();
    favorites.forEach(f => {
      if (f.categoryName) cats.add(f.categoryName);
    });
    return Array.from(cats);
  }, [favorites]);

  // Stats
  const stats = useMemo(() => {
    const authors = new Set(favorites.map(f => f.author));
    const categoryCounts: Record<string, number> = {};
    favorites.forEach(f => {
      const cat = f.categoryName || 'Uncategorized';
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });
    const topCategory = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0];
    
    return {
      total: favorites.length,
      uniqueAuthors: authors.size,
      topCategory: topCategory ? topCategory[0] : 'None',
      topCategoryCount: topCategory ? topCategory[1] : 0,
      categoryCounts,
    };
  }, [favorites]);

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
    let result = favorites;
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(
        (book) =>
          book.title.toLowerCase().includes(query) ||
          book.author.toLowerCase().includes(query)
      );
    }
    
    // Filter by category
    if (filterByCategory) {
      result = result.filter(book => book.categoryName === filterByCategory);
    }
    
    // Sort
    switch (sortBy) {
      case 'oldest':
        result = [...result].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
      case 'title':
        result = [...result].sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'author':
        result = [...result].sort((a, b) => a.author.localeCompare(b.author));
        break;
      case 'newest':
      default:
        result = [...result].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
    }
    
    return result;
  }, [favorites, searchQuery, sortBy, filterByCategory]);

  // Render grid item
  const renderGridItem = ({ item, index }: { item: Favorite; index: number }) => {
    const isSelected = selectedForBulk.has(item.book_id);
    return (
      <Animated.View entering={ZoomIn.delay(index * 50).duration(400)} style={styles.gridCard}>
        <TouchableOpacity 
          activeOpacity={0.9} 
          onPress={() => bulkMode ? toggleBulkSelect(item.book_id) : openDetails(item)}
          onLongPress={() => { setBulkMode(true); toggleBulkSelect(item.book_id); }}
        >
          <View style={styles.gridImageContainer}>
            {item.image_url ? (
              <Image source={{ uri: item.image_url }} style={styles.gridCover} resizeMode="cover" />
            ) : (
              <View style={styles.gridPlaceholder}>
                <Ionicons name="book" size={32} color="#666" />
              </View>
            )}
            {bulkMode && (
              <View style={[styles.checkmark, isSelected && styles.checkmarkSelected]}>
                {isSelected && <Ionicons name="checkmark" size={16} color="#fff" />}
              </View>
            )}
            <TouchableOpacity style={styles.gridHeartBtn} onPress={() => handleRemoveFavorite(item.book_id)}>
              <Ionicons name="heart" size={16} color="#ef4444" />
            </TouchableOpacity>
          </View>
          <Text style={styles.gridTitle} numberOfLines={2}>{item.title}</Text>
          <Text style={styles.gridAuthor} numberOfLines={1}>{item.author}</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  // Render list item
  const renderListItem = ({ item, index }: { item: Favorite; index: number }) => {
    const isSelected = selectedForBulk.has(item.book_id);
    return (
      <Animated.View entering={SlideInRight.delay(index * 40).duration(400)} style={styles.listCard}>
        <TouchableOpacity 
          style={styles.listTouch} 
          activeOpacity={0.9} 
          onPress={() => bulkMode ? toggleBulkSelect(item.book_id) : openDetails(item)}
          onLongPress={() => { setBulkMode(true); toggleBulkSelect(item.book_id); }}
        >
          {bulkMode && (
            <View style={[styles.listCheckmark, isSelected && styles.checkmarkSelected]}>
              {isSelected && <Ionicons name="checkmark" size={14} color="#fff" />}
            </View>
          )}
          {item.image_url ? (
            <Image source={{ uri: item.image_url }} style={styles.listCover} resizeMode="cover" />
          ) : (
            <View style={[styles.gridPlaceholder, styles.listCover]}>
              <Ionicons name="book" size={20} color="#666" />
            </View>
          )}
          <View style={styles.listContent}>
            <Text style={styles.listTitle} numberOfLines={1}>{item.title}</Text>
            <Text style={styles.listAuthor} numberOfLines={1}>{item.author}</Text>
            {item.categoryName && (
              <View style={styles.listCategory}>
                <Ionicons name="folder-outline" size={10} color="#a78bfa" />
                <Text style={styles.listCategoryText}>{item.categoryName}</Text>
              </View>
            )}
          </View>
          <View style={styles.listActions}>
            <TouchableOpacity onPress={() => shareFavorite(item)}>
              <Ionicons name="share-social-outline" size={18} color="#888" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleRemoveFavorite(item.book_id)}>
              <Ionicons name="heart-dislike-outline" size={18} color="#ef4444" />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  if (loading) {
    return (
      <LinearGradient
        colors={["#0f0f23", "#1a1a2e", "#16213e"]}
        style={styles.loadingContainer}
      >
        <ActivityIndicator size="large" color="#8b5cf6" />
        <Text style={styles.loadingText}>Loading your favorites...</Text>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={["#0f0f23", "#1a1a2e", "#16213e"]}
      style={styles.container}
    >
      {/* Book List - All header content moved to ListHeaderComponent for proper scrolling */}
      <FlatList
        key={viewMode === 'grid' ? 'grid' : 'list'}
        data={filteredFavorites}
        keyExtractor={(item) => item.id}
        numColumns={viewMode === 'grid' ? 2 : 1}
        extraData={refreshKey}
        showsVerticalScrollIndicator={true}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8b5cf6" colors={['#8b5cf6']} />
        }
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.listContent,
          filteredFavorites.length === 0 && { flexGrow: 1 },
        ]}
        columnWrapperStyle={viewMode === 'grid' ? styles.gridRow : undefined}
        ListHeaderComponent={
          <View>
            {/* Header */}
            <View style={styles.header}>
              <View>
                <Text style={styles.headerTitle}>Favorites</Text>
                <Text style={styles.headerSubtitle}>{favorites.length} books you love</Text>
              </View>
              <View style={styles.headerActions}>
                <TouchableOpacity style={styles.headerBtn} onPress={() => setShowStatsModal(true)}>
                  <Ionicons name="stats-chart" size={20} color="#a78bfa" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.headerBtn} onPress={pickRandomFavorite}>
                  <Ionicons name="shuffle" size={20} color="#10b981" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.headerBtn} onPress={shareAllFavorites}>
                  <Ionicons name="share-social" size={20} color="#3b82f6" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Stats Row */}
            {favorites.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsRow} contentContainerStyle={{ paddingHorizontal: 16 }}>
                <TouchableOpacity style={[styles.statCard, { backgroundColor: 'rgba(239,68,68,0.15)' }]} onPress={() => setShowStatsModal(true)}>
                  <Text style={[styles.statNumber, { color: '#ef4444' }]}>{stats.total}</Text>
                  <Text style={styles.statLabel}>Favorites</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.statCard, { backgroundColor: 'rgba(139,92,246,0.15)' }]}>
                  <Text style={[styles.statNumber, { color: '#a78bfa' }]}>{stats.uniqueAuthors}</Text>
                  <Text style={styles.statLabel}>Authors</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.statCard, { backgroundColor: 'rgba(16,185,129,0.15)' }]}>
                  <Text style={[styles.statNumber, { color: '#10b981' }]}>{categories.length}</Text>
                  <Text style={styles.statLabel}>Categories</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.statCard, { backgroundColor: 'rgba(245,158,11,0.15)' }]} onPress={pickRandomFavorite}>
                  <Text style={styles.statEmoji}>🎲</Text>
                  <Text style={styles.statLabel}>Random</Text>
                </TouchableOpacity>
              </ScrollView>
            )}

            {/* Search Bar */}
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={18} color="#888" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search favorites..."
                placeholderTextColor="#666"
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
                >
                  <Ionicons name="close-circle" size={18} color="#888" />
                </TouchableOpacity>
              )}
            </View>

            {/* Action Bar */}
            <View style={styles.actionBar}>
              <View style={styles.actionLeft}>
                {/* Category Filter */}
                <TouchableOpacity 
                  style={[styles.filterBtn, filterByCategory && styles.filterBtnActive]} 
                  onPress={() => setShowCategoryFilter(true)}
                >
                  <Ionicons name="folder-outline" size={14} color={filterByCategory ? '#fff' : '#a78bfa'} />
                  <Text style={[styles.filterBtnText, filterByCategory && { color: '#fff' }]}>
                    {filterByCategory || 'Category'}
                  </Text>
                </TouchableOpacity>
                
                {/* Sort */}
                <TouchableOpacity style={styles.sortBtn} onPress={() => setShowSortModal(true)}>
                  <Ionicons name="swap-vertical" size={14} color="#a78bfa" />
                  <Text style={styles.sortBtnText}>{sortBy}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.actionRight}>
                {/* Bulk Mode Toggle */}
                <TouchableOpacity 
                  style={[styles.bulkBtn, bulkMode && styles.bulkBtnActive]} 
                  onPress={() => { setBulkMode(!bulkMode); setSelectedForBulk(new Set()); Vibration.vibrate(30); }}
                >
                  <Ionicons name="checkbox-outline" size={16} color={bulkMode ? '#fff' : '#888'} />
                </TouchableOpacity>

                {/* View Toggle */}
                <View style={styles.viewToggle}>
                  <TouchableOpacity 
                    style={[styles.viewBtn, viewMode === 'cards' && styles.viewBtnActive]} 
                    onPress={() => { setViewMode('cards'); Vibration.vibrate(30); }}
                  >
                    <Ionicons name="albums" size={14} color={viewMode === 'cards' ? '#fff' : '#666'} />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.viewBtn, viewMode === 'list' && styles.viewBtnActive]} 
                    onPress={() => { setViewMode('list'); Vibration.vibrate(30); }}
                  >
                    <Ionicons name="list" size={14} color={viewMode === 'list' ? '#fff' : '#666'} />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.viewBtn, viewMode === 'grid' && styles.viewBtnActive]} 
                    onPress={() => { setViewMode('grid'); Vibration.vibrate(30); }}
                  >
                    <Ionicons name="grid" size={14} color={viewMode === 'grid' ? '#fff' : '#666'} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Bulk Actions Bar */}
            {bulkMode && (
              <View style={styles.bulkBar}>
                <Text style={styles.bulkText}>{selectedForBulk.size} selected</Text>
                <View style={styles.bulkActions}>
                  <TouchableOpacity style={styles.bulkAction} onPress={selectAll}>
                    <Text style={styles.bulkActionText}>Select All</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.bulkAction, styles.bulkActionDanger]} 
                    onPress={handleBulkRemove}
                    disabled={selectedForBulk.size === 0}
                  >
                    <Ionicons name="trash" size={14} color="#fff" />
                    <Text style={styles.bulkActionText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Results Count */}
            {(searchQuery || filterByCategory) && (
              <View style={styles.resultsBar}>
                <Text style={styles.resultsText}>
                  {filteredFavorites.length} {filteredFavorites.length === 1 ? 'result' : 'results'}
                </Text>
                {filterByCategory && (
                  <TouchableOpacity onPress={() => setFilterByCategory(null)}>
                    <Ionicons name="close-circle" size={18} color="#888" />
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          <Animated.View entering={FadeIn.duration(400)}>
            <BlurView intensity={80} tint="dark" style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>{searchQuery ? '🔍' : '❤️'}</Text>
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
          </Animated.View>
        }
        renderItem={viewMode === 'grid' ? renderGridItem : viewMode === 'list' ? renderListItem : ({ item, index }) => (
          <Animated.View entering={FadeInDown.delay(index * 50).duration(400)}>
            <BookCard
              key={`${item.id}-${refreshKey}`}
              book={{
                id: item.book_id,
                title: item.title,
                author: item.author,
                image: item.image_url,
                description: item.description,
              }}
              onPress={() => bulkMode ? toggleBulkSelect(item.book_id) : openDetails(item)}
              onDelete={() => handleRemoveFavorite(item.book_id)}
              renderStars={renderStars}
              imageUrl={item.image_url}
              categoryName={item.categoryName || "Uncategorized"}
              fetchFavorites={fetchFavorites}
            />
          </Animated.View>
        )}
      />

      {/* Sort Modal */}
      <Modal visible={showSortModal} transparent animationType="fade">
        <BlurView intensity={100} tint="dark" style={styles.modalOverlay}>
          <Animated.View entering={ZoomIn.duration(300)} style={styles.sortModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sort By</Text>
              <TouchableOpacity onPress={() => setShowSortModal(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            {SORT_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={[styles.sortOption, sortBy === option.id && styles.sortOptionActive]}
                onPress={() => { setSortBy(option.id as any); setShowSortModal(false); Vibration.vibrate(30); }}
              >
                <Ionicons name={option.icon as any} size={20} color={sortBy === option.id ? '#8b5cf6' : '#888'} />
                <Text style={[styles.sortOptionText, sortBy === option.id && styles.sortOptionTextActive]}>
                  {option.label}
                </Text>
                {sortBy === option.id && <Ionicons name="checkmark" size={20} color="#8b5cf6" />}
              </TouchableOpacity>
            ))}
          </Animated.View>
        </BlurView>
      </Modal>

      {/* Category Filter Modal */}
      <Modal visible={showCategoryFilter} transparent animationType="fade">
        <BlurView intensity={100} tint="dark" style={styles.modalOverlay}>
          <Animated.View entering={ZoomIn.duration(300)} style={styles.categoryModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter by Category</Text>
              <TouchableOpacity onPress={() => setShowCategoryFilter(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[styles.categoryOption, !filterByCategory && styles.categoryOptionActive]}
              onPress={() => { setFilterByCategory(null); setShowCategoryFilter(false); }}
            >
              <Ionicons name="apps" size={18} color={!filterByCategory ? '#8b5cf6' : '#888'} />
              <Text style={[styles.categoryOptionText, !filterByCategory && styles.categoryOptionTextActive]}>
                All Categories
              </Text>
            </TouchableOpacity>
            <ScrollView style={styles.categoryList}>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.categoryOption, filterByCategory === cat && styles.categoryOptionActive]}
                  onPress={() => { setFilterByCategory(cat); setShowCategoryFilter(false); Vibration.vibrate(30); }}
                >
                  <Ionicons name="folder" size={18} color={filterByCategory === cat ? '#8b5cf6' : '#888'} />
                  <Text style={[styles.categoryOptionText, filterByCategory === cat && styles.categoryOptionTextActive]}>
                    {cat}
                  </Text>
                  <Text style={styles.categoryCount}>
                    {favorites.filter(f => f.categoryName === cat).length}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Animated.View>
        </BlurView>
      </Modal>

      {/* Stats Modal */}
      <Modal visible={showStatsModal} transparent animationType="fade">
        <BlurView intensity={100} tint="dark" style={styles.modalOverlay}>
          <Animated.View entering={ZoomIn.duration(300)} style={styles.statsModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📊 Your Favorites Stats</Text>
              <TouchableOpacity onPress={() => setShowStatsModal(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <Text style={styles.statBoxNumber}>{stats.total}</Text>
                <Text style={styles.statBoxLabel}>Total Favorites</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statBoxNumber}>{stats.uniqueAuthors}</Text>
                <Text style={styles.statBoxLabel}>Unique Authors</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statBoxNumber}>{categories.length}</Text>
                <Text style={styles.statBoxLabel}>Categories</Text>
              </View>
            </View>

            {stats.topCategory !== 'None' && (
              <View style={styles.topCategoryBox}>
                <Text style={styles.topCategoryLabel}>🏆 Top Category</Text>
                <Text style={styles.topCategoryName}>{stats.topCategory}</Text>
                <Text style={styles.topCategoryCount}>{stats.topCategoryCount} books</Text>
              </View>
            )}

            {Object.entries(stats.categoryCounts).length > 0 && (
              <View style={styles.categoryBreakdown}>
                <Text style={styles.breakdownTitle}>Category Breakdown</Text>
                {Object.entries(stats.categoryCounts).map(([cat, count]) => (
                  <View key={cat} style={styles.breakdownRow}>
                    <Text style={styles.breakdownCat}>{cat}</Text>
                    <View style={styles.breakdownBar}>
                      <View style={[styles.breakdownFill, { width: `${(count / stats.total) * 100}%` }]} />
                    </View>
                    <Text style={styles.breakdownCount}>{count}</Text>
                  </View>
                ))}
              </View>
            )}
          </Animated.View>
        </BlurView>
      </Modal>

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
  loadingText: { color: '#a78bfa', marginTop: 12, fontSize: 14 },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  headerTitle: { fontSize: 28, fontWeight: "800", color: "#fff", letterSpacing: 0.5 },
  headerSubtitle: { fontSize: 13, color: '#a78bfa', marginTop: 2 },
  headerActions: { flexDirection: 'row', gap: 8 },
  headerBtn: { 
    width: 38, height: 38, borderRadius: 12, 
    backgroundColor: 'rgba(255,255,255,0.1)', 
    justifyContent: 'center', alignItems: 'center',
  },

  // Stats Row
  statsRow: { marginBottom: 10, maxHeight: 70 },
  statCard: { 
    width: 70, height: 60, borderRadius: 12, 
    padding: 8, marginRight: 10, alignItems: 'center', justifyContent: 'center',
  },
  statNumber: { fontSize: 20, fontWeight: '800', color: '#a78bfa' },
  statEmoji: { fontSize: 20 },
  statLabel: { fontSize: 9, color: '#888', marginTop: 2, fontWeight: '600' },

  // Search
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    marginHorizontal: 20,
    marginBottom: 10,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  searchInput: { flex: 1, color: "#fff", fontSize: 14 },

  // Action Bar
  actionBar: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    paddingHorizontal: 20, 
    marginBottom: 10,
  },
  actionLeft: { flexDirection: 'row', gap: 8 },
  actionRight: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  filterBtn: { 
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.08)', 
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10,
  },
  filterBtnActive: { backgroundColor: '#8b5cf6' },
  filterBtnText: { color: '#a78bfa', fontSize: 11, fontWeight: '600' },
  sortBtn: { 
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.08)', 
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10,
  },
  sortBtnText: { color: '#a78bfa', fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  bulkBtn: { 
    width: 32, height: 32, borderRadius: 8, 
    backgroundColor: 'rgba(255,255,255,0.08)', 
    justifyContent: 'center', alignItems: 'center',
  },
  bulkBtnActive: { backgroundColor: '#8b5cf6' },
  viewToggle: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 8, padding: 2 },
  viewBtn: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 6 },
  viewBtnActive: { backgroundColor: '#8b5cf6' },

  // Bulk Bar
  bulkBar: { 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: 'rgba(139,92,246,0.2)', 
    marginHorizontal: 20, marginBottom: 10, padding: 12, borderRadius: 12,
  },
  bulkText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  bulkActions: { flexDirection: 'row', gap: 8 },
  bulkAction: { 
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.15)', 
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
  },
  bulkActionDanger: { backgroundColor: '#ef4444' },
  bulkActionText: { color: '#fff', fontSize: 12, fontWeight: '600' },

  // Results Bar
  resultsBar: { 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, marginBottom: 8,
  },
  resultsText: { color: '#888', fontSize: 12 },

  // List
  listContent: { paddingBottom: 100 },

  // Grid View
  gridRow: { justifyContent: 'space-between' },
  gridCard: { width: (width - 52) / 2, marginBottom: 12 },
  gridImageContainer: { 
    height: 180, borderRadius: 12, overflow: 'hidden', 
    backgroundColor: '#2d1b4e', position: 'relative',
  },
  gridCover: { width: '100%', height: '100%' },
  gridPlaceholder: { 
    width: '100%', height: '100%', 
    backgroundColor: '#2d1b4e', justifyContent: 'center', alignItems: 'center',
  },
  gridHeartBtn: { 
    position: 'absolute', top: 8, right: 8, 
    width: 28, height: 28, borderRadius: 14, 
    backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center',
  },
  checkmark: { 
    position: 'absolute', top: 8, left: 8, 
    width: 24, height: 24, borderRadius: 12, 
    backgroundColor: 'rgba(255,255,255,0.3)', borderWidth: 2, borderColor: '#fff',
    justifyContent: 'center', alignItems: 'center',
  },
  checkmarkSelected: { backgroundColor: '#8b5cf6', borderColor: '#8b5cf6' },
  gridTitle: { fontSize: 13, fontWeight: '600', color: '#e0d0ff', marginTop: 8 },
  gridAuthor: { fontSize: 11, color: '#888', marginTop: 2 },

  // List View
  listCard: { 
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, 
    marginBottom: 8, overflow: 'hidden',
  },
  listTouch: { flexDirection: 'row', padding: 10, alignItems: 'center' },
  listCheckmark: { 
    width: 20, height: 20, borderRadius: 10, marginRight: 10,
    backgroundColor: 'rgba(255,255,255,0.3)', borderWidth: 2, borderColor: '#fff',
    justifyContent: 'center', alignItems: 'center',
  },
  listCover: { width: 45, height: 65, borderRadius: 8 },
  listContent: { flex: 1, marginLeft: 12 },
  listTitle: { fontSize: 14, fontWeight: '600', color: '#e0d0ff' },
  listAuthor: { fontSize: 12, color: '#888', marginTop: 2 },
  listCategory: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  listCategoryText: { color: '#a78bfa', fontSize: 10 },
  listActions: { flexDirection: 'column', gap: 10, marginLeft: 8 },

  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
    borderRadius: 20,
    backgroundColor: "rgba(30,30,46,0.5)",
    marginTop: 50,
  },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: "#fff", fontSize: 18, fontWeight: "600", marginTop: 8, textAlign: "center" },
  emptySubtext: { color: "#94a3b8", fontSize: 14, textAlign: "center", marginTop: 8, lineHeight: 20 },

  // Modals
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  modalHeader: { 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },

  // Sort Modal
  sortModal: { 
    width: width * 0.85, backgroundColor: 'rgba(30,30,46,0.98)', 
    borderRadius: 20, padding: 20,
  },
  sortOption: { 
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 14, paddingHorizontal: 12, borderRadius: 12, marginBottom: 4,
  },
  sortOptionActive: { backgroundColor: 'rgba(139,92,246,0.2)' },
  sortOptionText: { flex: 1, color: '#888', fontSize: 15 },
  sortOptionTextActive: { color: '#fff', fontWeight: '600' },

  // Category Modal
  categoryModal: { 
    width: width * 0.85, maxHeight: '60%', 
    backgroundColor: 'rgba(30,30,46,0.98)', borderRadius: 20, padding: 20,
  },
  categoryList: { maxHeight: 300 },
  categoryOption: { 
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, paddingHorizontal: 12, borderRadius: 12, marginBottom: 4,
  },
  categoryOptionActive: { backgroundColor: 'rgba(139,92,246,0.2)' },
  categoryOptionText: { flex: 1, color: '#888', fontSize: 14 },
  categoryOptionTextActive: { color: '#fff', fontWeight: '600' },
  categoryCount: { color: '#666', fontSize: 12 },

  // Stats Modal
  statsModal: { 
    width: width * 0.9, backgroundColor: 'rgba(30,30,46,0.98)', 
    borderRadius: 24, padding: 20,
  },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  statBox: { 
    flex: 1, backgroundColor: 'rgba(139,92,246,0.15)', 
    borderRadius: 16, padding: 16, marginHorizontal: 4, alignItems: 'center',
  },
  statBoxNumber: { fontSize: 28, fontWeight: '800', color: '#a78bfa' },
  statBoxLabel: { color: '#888', fontSize: 11, marginTop: 4, textAlign: 'center' },
  topCategoryBox: { 
    backgroundColor: 'rgba(245,158,11,0.15)', 
    borderRadius: 16, padding: 16, marginBottom: 16, alignItems: 'center',
  },
  topCategoryLabel: { color: '#f59e0b', fontSize: 12, fontWeight: '600' },
  topCategoryName: { color: '#fff', fontSize: 20, fontWeight: '700', marginTop: 4 },
  topCategoryCount: { color: '#888', fontSize: 12, marginTop: 2 },
  categoryBreakdown: { marginTop: 8 },
  breakdownTitle: { color: '#fff', fontSize: 14, fontWeight: '600', marginBottom: 12 },
  breakdownRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  breakdownCat: { color: '#888', fontSize: 12, width: 100 },
  breakdownBar: { 
    flex: 1, height: 8, backgroundColor: 'rgba(255,255,255,0.1)', 
    borderRadius: 4, marginHorizontal: 8, overflow: 'hidden',
  },
  breakdownFill: { height: '100%', backgroundColor: '#8b5cf6', borderRadius: 4 },
  breakdownCount: { color: '#888', fontSize: 12, width: 30, textAlign: 'right' },
});