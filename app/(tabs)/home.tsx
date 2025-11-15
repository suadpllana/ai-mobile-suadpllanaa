import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIsFocused } from "@react-navigation/native";
import { BlurView } from "expo-blur";
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Easing,
  FlatList,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SelectList } from "react-native-dropdown-select-list";
import Toast from 'react-native-toast-message';
import BookCard from "../../components/BookCard";
import BookModal from "../../components/BookModal";
import ChatModal from "../../components/ChatModal";
import { supabase } from "../../supabase";
const { width } = Dimensions.get("window");
type Book = {
  id: string;
  title: string;
  author: string;
  description: string;
  user_id: string;
  category_id?: string;
  status?: string;
  image?: string;
  cover_image?: string;
  position?: number; 
};

type Review = {
  id: string;
  book_id: string;
  user_id: string;
  rating: number;
  comment?: string;
  created_at: string;
};

type Category = {
  id: string;
  name: string;
  user_id: string;
};

export default function HomeScreen() {
  const [sortModalVisible, setSortModalVisible] = useState(false);


  const moveBookUp = (index: number) => {
    if (index === 0) return;
    setBooks((prevBooks) => {
      const newBooks = [...prevBooks];
      [newBooks[index - 1], newBooks[index]] = [newBooks[index], newBooks[index - 1]];
      return newBooks.map((book, idx) => ({ ...book, position: idx }));
    });
  };

  const moveBookDown = (index: number) => {
    setBooks((prevBooks) => {
      if (index === prevBooks.length - 1) return prevBooks;
      const newBooks = [...prevBooks];
      [newBooks[index], newBooks[index + 1]] = [newBooks[index + 1], newBooks[index]];
      return newBooks.map((book, idx) => ({ ...book, position: idx }));
    });
  };

  const handleSaveSort = async () => {
    if (!userId) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'No authenticated user' });
      return;
    }
    setLoading(true);
    try {
      const booksWithId = books
        .map((b, idx) => ({ id: b.id, position: b.position ?? idx }))
        .filter((b) => b.id);

      if (booksWithId.length === 0) {
        Toast.show({ type: 'error', text1: 'Error', text2: 'No persisted books to update. Save books first.' });
        setLoading(false);
        return;
      }

      const results = await Promise.all(
        booksWithId.map((b) => supabase.from('books').update({ position: b.position }).eq('id', b.id))
      );

      const failed = results.find((r) => (r as any).error);
      if (failed && (failed as any).error) {
        throw (failed as any).error;
      }

      const { data } = await supabase
        .from('books')
        .select('*')
        .eq('user_id', userId)
        .order('position', { ascending: true });
      setBooks(data || []);
      Toast.show({ type: 'success', text1: 'Saved', text2: 'Sort order saved' });
      setSortModalVisible(false);
    } catch (err: any) {
      const msg = err?.message || String(err) || 'Failed to save order';
      Toast.show({ type: 'error', text1: 'Error', text2: msg });
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };
  const DEFAULT_IMAGE = "https://via.placeholder.com/100x150?text=Book";
  const isFocused = useIsFocused();
  const [books, setBooks] = useState<Book[]>([]);
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [status, setStatus] = useState<string>("want to read");
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategoryId, setFilterCategoryId] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterRating, setFilterRating] = useState<string>("all");
  const ratingFilterOptions = [
    { key: "all", value: "All Ratings" },
    { key: "5", value: "5 stars" },
    { key: "4", value: "4 stars" },
    { key: "3", value: "3 stars" },
    { key: "2", value: "2 stars" },
    { key: "1", value: "1 star" },
  ];
  const [showFilters, setShowFilters] = useState(false);

  const handleClearFilters = () => {
    const doClear = async () => {
      try {
        await AsyncStorage.removeItem('@home:filters:v1');
      } catch (e) {
      }
      setFilterCategoryId("all");
      setFilterStatus("all");
      setFilterRating("all");
      setSearchQuery("");
      setShowFilters(false);
    };
    void doClear();
  };
  
  useEffect(() => {
    const loadFilters = async () => {
      try {
        const raw = await AsyncStorage.getItem('@home:filters:v1');
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (parsed?.filterCategoryId) setFilterCategoryId(parsed.filterCategoryId);
        if (parsed?.filterStatus) setFilterStatus(parsed.filterStatus);
        if (parsed?.filterRating) setFilterRating(parsed.filterRating);
        if (parsed?.searchQuery) setSearchQuery(parsed.searchQuery);
      } catch (e) {
      }
    };
    loadFilters();
  }, []);

  useEffect(() => {
    const save = async () => {
      try {
        const payload = JSON.stringify({ filterCategoryId, filterStatus, filterRating, searchQuery });
        await AsyncStorage.setItem('@home:filters:v1', payload);
      } catch (e) {
      }
    };
    save();
  }, [filterCategoryId, filterStatus, filterRating, searchQuery]);
  const [loading, setLoading] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [reviews, setReviews] = useState<Review[]>([]);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [chatModalVisible, setChatModalVisible] = useState(false);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [selectedBook, setSelectedBook] = useState<any | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [sortAscending, setSortAscending] = useState(true);

  const pulseAnim = new Animated.Value(1);
  const floatAnim = new Animated.Value(0);


const pickImage = async () => {
  try {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Toast.show({
        type: 'error',
        text1: 'Permission Required',
        text2: 'Allow photo access in Settings',
      });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [2, 3],
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.[0]?.uri) {
      return;
    }

    const uri = result.assets[0].uri;
    const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${userId}/${Date.now()}.${fileExt}`;
    const mimeType = fileExt === 'png' ? 'image/png' : 'image/jpeg';

    setLoading(true);

    const response = await fetch(uri);
    const arrayBuffer = await response.arrayBuffer();

    const { error } = await supabase.storage
      .from('user_uploads')
      .upload(fileName, arrayBuffer, {
        contentType: mimeType,
        upsert: true,
      });

    if (error && !error.message.includes('duplicate')) {
      throw error;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('user_uploads')
      .getPublicUrl(fileName);

    setSelectedImage(publicUrl);

    Toast.show({
      type: 'success',
      text1: 'Success!',
      text2: 'Cover uploaded!',
    });

  } catch (err: any) {
    console.error('Upload failed:', err);
    Toast.show({
      type: 'error',
      text1: 'Upload Failed',
      text2: err.message || 'Try again',
    });
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 1200,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();

    const float = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -8,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    float.start();

    return () => {
      pulse.stop();
      float.stop();
    };
  }, []);

  const categoryOptions = [
    { key: "all", value: "All Categories" },
    ...categories.map((c) => ({ key: c.id, value: c.name })),
  ];

  const bookCategoryOptions = [
    { key: "", value: "Select Category" },
    ...categories.map((c) => ({ key: c.id, value: c.name })),
  ];

  const statusOptions = [
    { key: "want to read", value: "Want to Read" },
    { key: "reading", value: "Currently Reading" },
    { key: "already read", value: "Already Read" },
  ];

  const statusFilterOptions = [
    { key: "all", value: "All Statuses" },
    ...statusOptions,
  ];

  const openChatModal = () => setChatModalVisible(true);
  const closeChatModal = () => setChatModalVisible(false);
  const openDetails = (b: any) => {
    setSelectedBook(b);
    setDetailsVisible(true);
  };
  const closeDetails = () => {
    setSelectedBook(null);
    setDetailsVisible(false);
  };

  useEffect(() => {
    const checkSession = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();
        if (error) throw error;
        if (!session || !session.user) {
          setErrorMessage("No authenticated user found");
          router.replace("./auth");
          return;
        }
        setUserId(session.user.id);
        setSessionChecked(true);
      } catch (error: any) {
        setErrorMessage(error.message || "Failed to verify session");
        router.replace("./auth");
      }
    };

    checkSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "SIGNED_OUT" || !session) {
          setUserId(null);
          setSessionChecked(false);
          router.replace("./auth");
        } else {
          setUserId(session.user.id);
          setSessionChecked(true);
          setErrorMessage("");
        }
      }
    );

    return () => authListener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!userId || !sessionChecked) return;

    const fetchAllData = async () => {
      setLoading(true);
      try {
        const [
          { data: booksData },
          { data: reviewsData },
          { data: categoriesData },
        ] = await Promise.all([
          supabase.from("books").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
          supabase.from("reviews").select("*").eq("user_id", userId),
          supabase.from("categories").select("*").eq("user_id", userId),
        ]);

        setBooks(booksData || []);
        setReviews(reviewsData || []);
        setCategories(categoriesData || []);

        if (!categoriesData || categoriesData.length === 0) {
          Toast.show({
            type: 'info',
            text1: 'No Categories',
            text2: 'Please add a category to continue.'
          });
        }
      } catch (error: any) {
        setErrorMessage(error.message || "Failed to fetch data");
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, [userId, sessionChecked, isFocused]);

  useEffect(() => {
    if (!userId) return;

    const handleChange = async () => {
      try {
        const { data } = await supabase
          .from('books')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
        setBooks(data || []);

        const { data: reviewsData } = await supabase
          .from('reviews')
          .select('*')
          .eq('user_id', userId);
        setReviews(reviewsData || []);

        const { data: categoriesData } = await supabase
          .from('categories')
          .select('*')
          .eq('user_id', userId);
        setCategories(categoriesData || []);
      } catch (err) {
        console.warn('Realtime update failed to fetch data', err);
      }
    };

    const channel = supabase
      .channel('public:books')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'books' }, () => handleChange())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reviews' }, () => handleChange())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, () => handleChange())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const handleAddOrUpdateBook = async () => {
    if (!title || !author || !categoryId) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Title, author, and category are required'
      });
      return;
    }
    if (title.length > 255 || author.length > 255) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Title and author must be 255 characters or less'
      });
      return;
    }

    setLoading(true);
    try {
      if (editingBook) {
        const { error } = await supabase
          .from("books")
          .update({
            title,
            author,
            description,
            category_id: categoryId,
            status,
            image: selectedImage || editingBook.image,
            cover_image: selectedImage || editingBook.cover_image,
          })
          .eq("id", editingBook.id)
          .eq("user_id", userId);
        if (error) throw error;
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'Book updated successfully!'
        });
      } else {
        const payload: any = {
          title,
          author,
          description,
          category_id: categoryId,
          user_id: userId,
          image: selectedImage || DEFAULT_IMAGE,
          cover_image: selectedImage || DEFAULT_IMAGE,
          status,
        };
        let { error } = await supabase.from("books").insert([payload]);
        if (error) {
          const { error: err2 } = await supabase
            .from("books")
            .insert([
              {
                title,
                author,
                description,
                category_id: categoryId,
                user_id: userId,
                status,
                image: selectedImage || DEFAULT_IMAGE,
                cover_image: selectedImage || DEFAULT_IMAGE,
              },
            ]);
          if (err2) throw err2;
        }
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'Book added successfully!'
        });
      }

      const { data } = await supabase
        .from("books")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      setBooks(data || []);
      resetForm();
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTitle("");
    setAuthor("");
    setDescription("");
    setCategoryId("");
    setStatus("want to read");
    setSelectedImage(null);
    setEditingBook(null);
    setModalVisible(false);
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Category name required'
      });
      return;
    }
    if (newCategoryName.length > 255) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Too long'
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("categories")
        .insert([{ name: newCategoryName, user_id: userId }]);
      if (error) throw error;
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Category added!'
      });
      setNewCategoryName("");
      setCategoryModalVisible(false);
      const { data } = await supabase
        .from("categories")
        .select("*")
        .eq("user_id", userId);
      setCategories(data || []);
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditBook = (book: Book) => {
    if (book.user_id !== userId) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Not your book'
      });
      return;
    }
    setEditingBook(book);
    setTitle(book.title);
    setAuthor(book.author);
    setDescription(book.description || "");
    setCategoryId(book.category_id || "");
    setStatus(book.status || "want to read");
    setSelectedImage(book.image || book.cover_image || null);
    setModalVisible(true);
  };

  const handleDeleteBook = async (id: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("books")
        .delete()
        .eq("id", id)
        .eq("user_id", userId);
      if (error) throw error;
      
      const { data } = await supabase
        .from("books")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      setBooks(data || []);
      
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Book deleted successfully'
      });
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRateBook = async (bookId: string, rating: number) => {
    setLoading(true);
    try {
      const { data: existing } = await supabase
        .from("reviews")
        .select("*")
        .eq("book_id", bookId)
        .eq("user_id", userId)
        .single();
      if (existing) {
        await supabase.from("reviews").update({ rating }).eq("id", existing.id);
      } else {
        await supabase
          .from("reviews")
          .insert([{ book_id: bookId, user_id: userId, rating }]);
      }
      const { data } = await supabase
        .from("reviews")
        .select("*")
        .eq("user_id", userId);
      setReviews(data || []);
      if(rating == 1) {
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: `${rating} star rating saved successfully`
      }
      );}
      else{

      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: `${rating} stars rating saved successfully`
      });
    }
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace("./auth");
  };

  const openModal = () => {
    if (categories.length === 0) {
      Toast.show({
        type: 'info',
        text1: 'No Categories',
        text2: 'Add one first.'
      });
      setCategoryModalVisible(true);
      return;
    }
    resetForm();
    setModalVisible(true);
  };

  const filteredBooks = books.filter((book) => {
    const matchesTitle = book.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategoryId === "all" || book.category_id === filterCategoryId;
    const matchesStatus = filterStatus === "all" || (book.status ?? "want to read") === filterStatus;
    let matchesRating = true;
    if (filterRating !== "all") {
      const review = reviews.find((r) => r.book_id === book.id && r.user_id === userId);
      matchesRating = review ? String(review.rating) === filterRating : false;
    }
    return matchesTitle && matchesCategory && matchesStatus && matchesRating;
  });

  const sortedBooks = [...filteredBooks].sort((a, b) => {
    const posA = a.position ?? 0;
    const posB = b.position ?? 0;
    return sortAscending ? posA - posB : posB - posA;
  });

  const renderStars = (bookId: string) => {
    const rating =
      reviews.find((r) => r.book_id === bookId && r.user_id === userId)
        ?.rating || 0;
    return (
      <View style={[styles.starRow, { alignItems: 'center', justifyContent: 'space-between' }]}>
        <View style={{ flexDirection: 'row', gap: 4 }}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity
              key={star}
              onPress={() => handleRateBook(bookId, star)}
              disabled={loading}
            >
              <Ionicons
                name={star <= rating ? "star" : "star-outline"}
                size={20}
                color={star <= rating ? "#FFD700" : "#888"}
              />
            </TouchableOpacity>
          ))}
        </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>

          {rating  &&(
         <TouchableOpacity
          onPress={() => handleDeleteReview(bookId)}
          disabled={loading}
          accessibilityLabel="Delete review"
          style={{ marginLeft: 8 }}
        >
          <Ionicons name="trash" size={18} color="#ef4444" />
        </TouchableOpacity>

          )}
          </View>

      </View>
    );
  };

  const handleDeleteReview = async (bookId: string) => {
    if (!userId) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('reviews')
        .delete()
        .eq('book_id', bookId)
        .eq('user_id', userId);
      if (error) throw error;

      const { data } = await supabase
        .from('reviews')
        .select('*')
        .eq('user_id', userId);
      setReviews(data || []);

      Toast.show({ type: 'success', text1: 'Success', text2: 'Review deleted' });
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: err.message });
    } finally {
      setLoading(false);
    }
  };

  if (!sessionChecked) {
    return (
      <LinearGradient colors={["#1a1a2e", "#16213e"]} style={styles.container}>
        <ActivityIndicator size="large" color="#8b5cf6" />
        {errorMessage ? (
          <Text style={{ color: '#fff', textAlign: 'center', marginTop: 20 }}>{errorMessage}</Text>
        ) : null}
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={["#0f0f23", "#1a1a2e", "#16213e"]}
      style={styles.container}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Library</Text>
        <TouchableOpacity onPress={handleSignOut} style={styles.signOutBtn}>
          <Ionicons name="log-out-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchBar}>
        <Ionicons
          name="search"
          size={20}
          color="#aaa"
          style={styles.searchIcon}
        />
        <TextInput
          placeholder="Search books..."
          placeholderTextColor="#888"
          style={[
            styles.searchInput,
            searchQuery ? { paddingRight: 44 } : null,
          ]}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery ? (
          <TouchableOpacity
            onPress={() => setSearchQuery("")}
            style={styles.clearBtn}
            accessibilityLabel="Clear search"
          >
            <Ionicons
              name="close"
              size={18}
              color="#aaa"
              style={styles.clearIcon}
            />
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity style={[styles.actionBtn, styles.filterBtn]} onPress={() => setShowFilters(true)}>
          <Ionicons name="filter" size={20} color="#fff" />
          <Text style={styles.actionBtnText}>Filter</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, styles.sortBtn]} onPress={() => setSortModalVisible(true)}>
          <Ionicons name="list" size={20} color="#fff" />
          <Text style={styles.actionBtnText}>Sort</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={showFilters} transparent animationType="fade">
        <BlurView intensity={100} tint="dark" style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: 'rgba(30,30,46,0.98)', borderRadius: 24, padding: 24, width: width * 0.9, maxWidth: 420, position: 'relative' }}>
            <TouchableOpacity
              onPress={() =>  handleClearFilters()}
              style={{ position: 'absolute', top: 18, right: 18, zIndex: 10 }}
              accessibilityLabel="Close filter modal"
            >
              <Ionicons name="close" size={38} color="#fff" style={{ fontWeight: 'bold', opacity: 0.95 }} />
            </TouchableOpacity>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 20, marginBottom: 20, textAlign: 'center' }}>Filter Books</Text>
            <View style={{ gap: 18, marginBottom: 20 }}>
              <View style={{ width: '100%' }}>
                <Text style={{ color: '#b794f4', fontWeight: '600', marginBottom: 6, fontSize: 15 }}>By Category:</Text>
                <SelectList
                  setSelected={setFilterCategoryId}
                  data={categoryOptions}
                  placeholder="All Categories"
                  search={false}
                  boxStyles={{ ...styles.filterBox, width: '100%', alignItems: 'flex-start' }}
                  inputStyles={{ ...styles.filterText, textAlign: 'left' }}
                  dropdownStyles={styles.dropdown}
                  dropdownTextStyles={{ color: "#fff", textAlign: 'left' }}
                  defaultOption={{ key: "all", value: "All Categories" }}
                  arrowicon={<Ionicons name="chevron-down" size={28} color="#fff" style={{ position: 'absolute', right: 12 }} />}
                />
              </View>
              <View style={{ width: '100%' }}>
                <Text style={{ color: '#b794f4', fontWeight: '600', marginBottom: 6, fontSize: 15 }}>By Status:</Text>
                <SelectList
                  setSelected={setFilterStatus}
                  data={statusFilterOptions}
                  placeholder="All Statuses"
                  search={false}
                  boxStyles={{ ...styles.statusFilterBox, width: '100%', alignItems: 'flex-start' }}
                  inputStyles={{ ...styles.filterText, textAlign: 'left' }}
                  dropdownStyles={styles.dropdown}
                  dropdownTextStyles={{ color: "#fff", textAlign: 'left' }}
                  defaultOption={{ key: "all", value: "All Statuses" }}
                  arrowicon={<Ionicons name="chevron-down" size={28} color="#fff" style={{ position: 'absolute', right: 12 }} />}
                />
              </View>
              <View style={{ width: '100%' }}>
                <Text style={{ color: '#b794f4', fontWeight: '600', marginBottom: 6, fontSize: 15 }}>By Rating:</Text>
                <SelectList
                  setSelected={setFilterRating}
                  data={ratingFilterOptions}
                  placeholder="All Ratings"
                  search={false}
                  boxStyles={{ ...styles.statusFilterBox, width: '100%', alignItems: 'flex-start' }}
                  inputStyles={{ ...styles.filterText, textAlign: 'left' }}
                  dropdownStyles={styles.dropdown}
                  dropdownTextStyles={{ color: "#fff", textAlign: 'left' }}
                  defaultOption={{ key: "all", value: "All Ratings" }}
                  arrowicon={<Ionicons name="chevron-down" size={28} color="#fff" style={{ position: 'absolute', right: 12 }} />}
                />
              </View>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
              <TouchableOpacity
                style={{ backgroundColor: '#ef4444', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 16, flex: 1, alignItems: 'center' }}
                onPress={handleClearFilters}
              >
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Clear Filters</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ backgroundColor: '#8b5cf6', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 16, flex: 1, alignItems: 'center' }}
                onPress={() => setShowFilters(false)}
              >
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </BlurView>
      </Modal>

      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.actionBtn} onPress={openModal}>
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.actionBtnText}>Add Book</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, styles.categoryBtn]}
          onPress={() => setCategoryModalVisible(true)}
        >
          <Ionicons name="folder-open" size={20} color="#fff" />
          <Text style={styles.actionBtnText}>Category</Text>
        </TouchableOpacity>
      </View>

  

<Modal
  visible={sortModalVisible}
  animationType="slide"
  transparent={true}
  onRequestClose={() => setSortModalVisible(false)}
>
  <View style={styles.sortModalOverlay}>
    <View style={styles.sortModalContainer}>
      <View style={styles.sortModalHeader}>
        <Text style={styles.sortModalTitle}>Sort Books</Text>
        <TouchableOpacity
          onPress={() => setSortModalVisible(false)}
          style={styles.sortCloseBtn}
        >
          <Ionicons name="close" size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.sortScrollView}
        contentContainerStyle={styles.sortScrollContent}
        showsVerticalScrollIndicator={true}
        bounces={true}
        overScrollMode="always"
      >
        {books
          .slice()
          .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
          .map((book, idx) => (
            <View key={book.id} style={styles.sortItem}>
              <Image
                source={{
                  uri:
                    (book.image && book.image.trim() !== "" && !book.image.includes("placeholder.com"))
                      ? book.image
                      : (book.cover_image && book.cover_image.trim() !== "" && !book.cover_image.includes("placeholder.com"))
                      ? book.cover_image
                      : DEFAULT_IMAGE
                }}
                style={styles.sortBookCover}
                resizeMode="cover"
              />
              <View style={styles.sortBookInfo}>
                <Text style={styles.sortBookTitle} numberOfLines={2}>
                  {book.title}
                </Text>
                <Text style={styles.sortBookAuthor}>{book.author}</Text>
              </View>

              <View style={styles.sortArrows}>
                <TouchableOpacity
                  onPress={() => moveBookUp(idx)}
                  disabled={idx === 0}
                  style={styles.sortArrowBtn}
                >
                  <Ionicons
                    name="arrow-up"
                    size={26}
                    color={idx === 0 ? "#666" : "#8b5cf6"}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => moveBookDown(idx)}
                  disabled={idx === books.length - 1}
                  style={styles.sortArrowBtn}
                >
                  <Ionicons
                    name="arrow-down"
                    size={26}
                    color={idx === books.length - 1 ? "#666" : "#8b5cf6"}
                  />
                </TouchableOpacity>
              </View>
            </View>
          ))}
      </ScrollView>

      <TouchableOpacity
        style={styles.sortDoneBtn}
        onPress={handleSaveSort}
      >
        <Text style={styles.sortDoneText}>Done</Text>
      </TouchableOpacity>
    </View>
  </View>
</Modal>
    


      <Animated.View
        style={[
          styles.floatingOrb,
          { transform: [{ scale: pulseAnim }, { translateY: floatAnim }] },
        ]}
      >
        <TouchableOpacity onPress={openChatModal} style={styles.orbButton}>
          <Text style={styles.orbText}>AI</Text>
        </TouchableOpacity>
      </Animated.View>

      {loading && !books.length ? (
        <ActivityIndicator
          size="large"
          color="#8b5cf6"
          style={{ marginTop: 50 }}
        />
      ) : (
        <FlatList
          data={sortedBooks}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.bookList}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No books yet. Add one!</Text>
          }
          renderItem={({ item }) => (
            <BookCard
              book={item}
              categoryName={
                categories.find((c) => c.id === item.category_id)?.name
              }
              onEdit={handleEditBook}
              onDelete={handleDeleteBook}
              renderStars={renderStars}
              onPress={openDetails}
              imageUrl={
                (item.image && item.image.trim() !== "" && !item.image.includes("placeholder.com")) ? item.image
                : (item.cover_image && item.cover_image.trim() !== "" && !item.cover_image.includes("placeholder.com")) ? item.cover_image
                : DEFAULT_IMAGE
              }
            />
          )}
        />
      )}

      <Modal visible={modalVisible} transparent animationType="slide">
        <BlurView intensity={100} tint="dark" style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {editingBook ? "Edit Book" : "New Book"}
            </Text>
            <Text onPress={resetForm} style={styles.modalClose} >x</Text>
                <TouchableOpacity 
              style={[
                styles.imageUploadBtn,
                selectedImage ? styles.imageUploadBtnWithImage : null
              ]}
              onPress={pickImage}
            >
              {selectedImage ? (
                <View style={styles.selectedImageContainer}>
                  <Image 
                    source={{ uri: selectedImage }}
                    style={styles.selectedImage}
                    onError={(error) => {
                      console.error('Image load error:', error);
                      setSelectedImage(null);
                      Toast.show({
                        type: 'error',
                        text1: 'Error',
                        text2: 'Failed to load image'
                      });
                    }}
                  />
                  <TouchableOpacity 
                    style={styles.removeImageBtn}
                    onPress={() => {
                      setSelectedImage(null);
                      Toast.show({
                        type: 'info',
                        text1: 'Image Removed',
                        text2: 'Upload a new image or continue without one'
                      });
                    }}
                  >
                    <Ionicons name="close-circle" size={24} color="#fff" />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.uploadPlaceholder}>
                  <Ionicons name="cloud-upload-outline" size={32} color="#8b5cf6" />
                  <Text style={styles.uploadText}>Upload Book Cover Image</Text>
                  <Text style={styles.uploadSubtext}>(Optional)</Text>
                </View>
              )}
            </TouchableOpacity>

            <TextInput
              style={styles.input}
              placeholder="Title"
              value={title}
              onChangeText={setTitle}
              placeholderTextColor="#aaa"
            />
            <TextInput
              style={styles.input}
              placeholder="Author"
              value={author}
              onChangeText={setAuthor}
              placeholderTextColor="#aaa"
            />

        

            <View style={{ zIndex: 2, marginBottom: 16 }}>
              <SelectList
                setSelected={setCategoryId}
                data={bookCategoryOptions}
                dropdownTextStyles={{ color: "#fff" }}
                inputStyles={styles.filterText}
                placeholder="Category"
                search={false}
                boxStyles={styles.dropdownBox}
                dropdownStyles={{
                  backgroundColor: '#1e1e2e',
                  borderWidth: 0,
                  borderRadius: 16,
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: 48,
                  zIndex: 2,
                  elevation: 2,
                  shadowColor: '#000',
                  shadowOpacity: 0.15,
                  shadowRadius: 8,
                }}
              />
            </View>
            <View style={{ zIndex: 1 }}>
              <SelectList
                setSelected={setStatus}
                data={statusOptions}
                dropdownTextStyles={{ color: "#fff" }}
                inputStyles={styles.filterText}
                placeholder="Status"
                search={false}
                boxStyles={styles.dropdownBox}
                dropdownStyles={{
                  backgroundColor: '#1e1e2e',
                  borderWidth: 0,
                  borderRadius: 16,
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: 48,
                  zIndex: 1,
                  elevation: 1,
                  shadowColor: '#000',
                  shadowOpacity: 0.10,
                  shadowRadius: 6,
                }}
              />
            </View>

            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Description (optional)"
              value={description}
              onChangeText={setDescription}
              multiline
              placeholderTextColor="#aaa"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={resetForm}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleAddOrUpdateBook}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveText}>
                    {editingBook ? "Update" : "Add"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </BlurView>
      </Modal>

      <Modal visible={categoryModalVisible} transparent animationType="fade">
        <BlurView intensity={100} tint="dark" style={styles.modalOverlay}>
          <View style={styles.smallModal}>
            <Text style={styles.modalTitle}>New Category</Text>
            <Text onPress={() => setCategoryModalVisible(false)} style={styles.modalClose} >x</Text>

            <TextInput
              style={styles.input}
              placeholder="Name"
              value={newCategoryName}
              onChangeText={setNewCategoryName}
              placeholderTextColor="#aaa"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setCategoryModalVisible(false)}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleAddCategory}
              >
                <Text style={styles.saveText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </BlurView>
      </Modal>

      <ChatModal
        visible={chatModalVisible}
        onClose={closeChatModal}
        userId={userId}
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
  container: { flex: 1, paddingTop: 10, overflow: "visible" },
  imageUploadBtn: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    borderStyle: 'dashed',
    minHeight: 200,
    justifyContent: 'center',
  },
  imageUploadBtnWithImage: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderStyle: 'solid',
    borderColor: 'rgba(139, 92, 246, 0.5)',
  },
  uploadPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  uploadText: {
    color: '#8b5cf6',
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
  },
  uploadSubtext: {
    color: 'rgba(139, 92, 246, 0.6)',
    marginTop: 4,
    fontSize: 14,
  },
  selectedImageContainer: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  selectedImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  removeImageBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    padding: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  selectContainer: { position: "relative", zIndex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 0.5,
  },
  modalClose: {
    position: 'absolute',
    top: 16,
    right: 16,
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  signOutBtn: { padding: 8 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    marginHorizontal: 20,
    borderRadius: 16,
    paddingHorizontal: 16,
    marginBottom: 16,
    backdropFilter: "blur(10px)",
    overflow: "visible",
  },
  filterBtn: { backgroundColor: "rgba(219, 22, 190, 0.67)" },
  searchIcon: { marginRight: 12 },
  searchInput: { flex: 1, color: "#fff", fontSize: 16, paddingVertical: 14 },
  clearBtn: { padding: 8, marginLeft: 8, alignSelf: "center" },
  clearIcon: {},
  filterBar: { marginHorizontal: 20, marginBottom: 16, overflow: "visible" },
  filterBox: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderWidth: 0,
    borderRadius: 16,
    paddingHorizontal: 16,
  },
  statusFilterBox: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderWidth: 0,
    borderRadius: 16,
    paddingHorizontal: 16,
    justifyContent: "flex-start",
    color: "white",
  },
  filterText: { color: "#fff", fontSize: 16 },
  dropdown: {
    backgroundColor: "#1e1e2e",
    borderWidth: 0,
    borderRadius: 16,
    position: "absolute",
    color: "white",
    top: 40,
    left: 0,
    right: 0,
    zIndex: 1000,
    elevation: 1000,
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: 50,
    marginBottom: 20,
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(139, 92, 246, 0.2)",
    paddingVertical: 14,
    borderRadius: 16,
    width: 4,
    height: 48,
    gap: 8,
  },
  categoryBtn: { backgroundColor: "rgba(34, 197, 94, 0.2)" },
  sortBtn: { backgroundColor: "rgba(12, 97, 233, 0.82)" },
  actionBtnText: { color: "#fff", fontWeight: "600", fontSize: 15 },
  bookList: { paddingHorizontal: 20, paddingBottom: 100 },
  emptyText: {
    textAlign: "center",
    color: "#888",
    fontSize: 16,
    marginTop: 50,
  },
  floatingOrb: { position: "absolute", bottom: 30, right: 20, zIndex: 1000 },
  orbButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#8b5cf6",
    justifyContent: "center",
    alignItems: "center",
    elevation: 10,
    shadowColor: "#8b5cf6",
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },
  orbText: { color: "#fff", fontSize: 20, fontWeight: "800" },
  modalOverlay: { flex: 1, justifyContent: "center", alignItems: "center" },
  modalCard: {
    backgroundColor: "rgba(30, 30, 46, 0.95)",
    padding: 24,
    borderRadius: 24,
    width: width * 0.9,
    maxWidth: 420,
    backdropFilter: "blur(20px)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  smallModal: {
    backgroundColor: "rgba(30, 30, 46, 0.95)",
    padding: 24,
    borderRadius: 24,
    width: width * 0.8,
    backdropFilter: "blur(20px)",
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
    marginBottom: 20,
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.1)",
    color: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    fontSize: 16,
  },
  textArea: { height: 100, textAlignVertical: "top" },
  dropdownBox: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 0,
    marginBottom: 16,
    borderRadius: 16,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  cancelBtn: {
    flex: 1,
    padding: 16,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 16,
    marginRight: 8,
    alignItems: "center",
  },
  saveBtn: {
    flex: 1,
    padding: 16,
    backgroundColor: "#8b5cf6",
    borderRadius: 16,
    marginLeft: 8,
    alignItems: "center",
  },
  cancelText: { color: "#fff", fontWeight: "600" },
  saveText: { color: "#fff", fontWeight: "700" },
  starRow: { flexDirection: "row", gap: 4, marginTop: 8 },
  errorText: {
    color: "#ef4444",
    textAlign: "center",
    marginTop: 20,
    fontSize: 14,
  },
  sortModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  sortModalContainer: {
    width: width * 0.92,
    maxWidth: 420,
    height: "82%",
    backgroundColor: "#1a1a2e",
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(139,92,246,0.3)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 20,
  },
  sortModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    paddingBottom: 12,
    backgroundColor: "#8b5cf6",
  },
  sortModalTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#fff",
  },
  sortCloseBtn: {
    padding: 8,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 20,
  },
  sortScrollView: {
    flex: 1,
  },
  sortScrollContent: {
    padding: 16,
    paddingBottom: 20,
  },
  sortItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(139,92,246,0.2)",
  },
  sortBookCover: {
    width: 50,
    height: 75,
    borderRadius: 8,
    marginRight: 16,
  },
  sortBookInfo: {
    flex: 1,
  },
  sortBookTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 22,
  },
  sortBookAuthor: {
    color: "#aaa",
    fontSize: 13,
    marginTop: 4,
  },
  sortArrows: {
    alignItems: "center",
    gap: 8,
  },
  sortArrowBtn: {
    padding: 6,
    backgroundColor: "rgba(139,92,246,0.2)",
    borderRadius: 12,
  },
  sortDoneBtn: {
    backgroundColor: "#8b5cf6",
    paddingVertical: 18,
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    alignItems: "center",
  },
  sortDoneText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
});