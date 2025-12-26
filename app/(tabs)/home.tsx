import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIsFocused } from "@react-navigation/native";
import { BlurView } from "expo-blur";
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Easing,
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

type ViewMode = 'list' | 'grid';

const MOTIVATIONAL_QUOTES = [
  { text: "A reader lives a thousand lives before he dies.", author: "George R.R. Martin" },
  { text: "The more that you read, the more things you will know.", author: "Dr. Seuss" },
  { text: "Reading is to the mind what exercise is to the body.", author: "Joseph Addison" },
  { text: "Books are a uniquely portable magic.", author: "Stephen King" },
  { text: "There is no friend as loyal as a book.", author: "Ernest Hemingway" },
  { text: "A book is a dream that you hold in your hand.", author: "Neil Gaiman" },
  { text: "Reading gives us someplace to go when we have to stay where we are.", author: "Mason Cooley" },
  { text: "One glance at a book and you hear the voice of another person.", author: "Carl Sagan" },
];

const SCREEN_WIDTH = Dimensions.get('window').width;

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

  // New feature states
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [refreshing, setRefreshing] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [dailyQuote, setDailyQuote] = useState(MOTIVATIONAL_QUOTES[0]);
  const [bookOfTheDay, setBookOfTheDay] = useState<Book | null>(null);
  const [readingStreak, setReadingStreak] = useState(0);
  const [showBookOfDay, setShowBookOfDay] = useState(false);

  const quickActionAnim = useRef(new Animated.Value(0)).current;

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

  // Load daily quote
  useEffect(() => {
    const today = new Date().getDate();
    const quoteIndex = today % MOTIVATIONAL_QUOTES.length;
    setDailyQuote(MOTIVATIONAL_QUOTES[quoteIndex]);
  }, []);

  // Load reading streak
  useEffect(() => {
    const loadStreak = async () => {
      try {
        const streak = await AsyncStorage.getItem('@reading_streak');
        const lastRead = await AsyncStorage.getItem('@last_read_date');
        const today = new Date().toDateString();
        
        if (lastRead === today) {
          setReadingStreak(parseInt(streak || '0'));
        } else if (lastRead) {
          const lastDate = new Date(lastRead);
          const todayDate = new Date(today);
          const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
          
          if (diffDays === 1) {
            const newStreak = parseInt(streak || '0') + 1;
            setReadingStreak(newStreak);
            await AsyncStorage.setItem('@reading_streak', newStreak.toString());
            await AsyncStorage.setItem('@last_read_date', today);
          } else if (diffDays > 1) {
            setReadingStreak(0);
            await AsyncStorage.setItem('@reading_streak', '0');
          }
        }
      } catch (e) {
        // Ignore errors
      }
    };
    loadStreak();
  }, []);

  // Set book of the day
  useEffect(() => {
    if (books.length > 0) {
      const today = new Date().getDate();
      const bookIndex = today % books.length;
      setBookOfTheDay(books[bookIndex]);
    }
  }, [books]);

  // Toggle quick actions animation
  const toggleQuickActions = () => {
    const toValue = showQuickActions ? 0 : 1;
    Animated.spring(quickActionAnim, {
      toValue,
      friction: 5,
      tension: 40,
      useNativeDriver: true,
    }).start();
    setShowQuickActions(!showQuickActions);
    Vibration.vibrate(50);
  };

  // Pull to refresh handler
  const onRefresh = useCallback(async () => {
    if (!userId) return;
    setRefreshing(true);
    Vibration.vibrate(50);
    
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
      
      Toast.show({ type: 'success', text1: '✨ Refreshed!', text2: 'Library updated' });
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to refresh' });
    } finally {
      setRefreshing(false);
    }
  }, [userId]);

  // Share library stats
  const shareLibraryStats = async () => {
    Vibration.vibrate(50);
    const stats = getLibraryStats();
    try {
      await Share.share({
        message: `📚 My Reading Stats\n\n📖 Total Books: ${stats.totalBooks}\n✅ Completed: ${stats.completed}\n📖 Currently Reading: ${stats.reading}\n📋 Want to Read: ${stats.wantToRead}\n⭐ Average Rating: ${stats.avgRating}\n🔥 Reading Streak: ${readingStreak} days\n\nTracked with MyBooks App`,
        title: 'My Reading Stats',
      });
    } catch (error) {
      // User cancelled
    }
  };

  // Get library statistics
  const getLibraryStats = useCallback(() => {
    const totalBooks = books.length;
    const completed = books.filter(b => b.status === 'already read').length;
    const reading = books.filter(b => b.status === 'reading').length;
    const wantToRead = books.filter(b => b.status === 'want to read').length;
    
    const ratedBooks = reviews.filter(r => books.some(b => b.id === r.book_id));
    const avgRating = ratedBooks.length > 0 
      ? (ratedBooks.reduce((sum, r) => sum + r.rating, 0) / ratedBooks.length).toFixed(1)
      : '0.0';
    
    const topCategory = categories.reduce((top, cat) => {
      const count = books.filter(b => b.category_id === cat.id).length;
      return count > (top?.count || 0) ? { name: cat.name, count } : top;
    }, { name: 'None', count: 0 });
    
    return { totalBooks, completed, reading, wantToRead, avgRating, topCategory };
  }, [books, reviews, categories]);

  // Random book picker
  const pickRandomBook = () => {
    if (books.length === 0) {
      Toast.show({ type: 'info', text1: 'No books!', text2: 'Add some books first' });
      return;
    }
    Vibration.vibrate([0, 50, 50, 50]);
    const randomBook = books[Math.floor(Math.random() * books.length)];
    setBookOfTheDay(randomBook);
    setShowBookOfDay(true);
  };

  // Render grid item
  const renderGridItem = ({ item, index }: { item: Book; index: number }) => {
    const rating = reviews.find(r => r.book_id === item.id && r.user_id === userId)?.rating || 0;
    const imageUri = (item.image && item.image.trim() !== "" && !item.image.includes("placeholder.com")) 
      ? item.image 
      : (item.cover_image && item.cover_image.trim() !== "" && !item.cover_image.includes("placeholder.com")) 
      ? item.cover_image 
      : DEFAULT_IMAGE;

    return (
      <TouchableOpacity 
        style={styles.gridItem}
        onPress={() => openDetails(item)}
        activeOpacity={0.8}
      >
        <View style={styles.gridCard}>
          <Image source={{ uri: imageUri }} style={styles.gridImage} />
          {rating > 0 && (
            <View style={styles.gridRatingBadge}>
              <Text style={styles.gridRatingText}>⭐ {rating}</Text>
            </View>
          )}
          <View style={styles.gridStatusBadge}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColorForGrid(item.status) }]} />
          </View>
        </View>
        <Text style={styles.gridTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.gridAuthor} numberOfLines={1}>{item.author}</Text>
      </TouchableOpacity>
    );
  };

  const getStatusColorForGrid = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'want to read': return '#f59e0b';
      case 'reading': return '#10b981';
      case 'already read': return '#6366f1';
      default: return '#6b7280';
    }
  };

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

  const filteredBooks = useMemo(() => books.filter((book) => {
    const matchesTitle = book.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategoryId === "all" || book.category_id === filterCategoryId;
    const matchesStatus = filterStatus === "all" || (book.status ?? "want to read") === filterStatus;
    let matchesRating = true;
    if (filterRating !== "all") {
      const review = reviews.find((r) => r.book_id === book.id && r.user_id === userId);
      matchesRating = review ? String(review.rating) === filterRating : false;
    }
    return matchesTitle && matchesCategory && matchesStatus && matchesRating;
  }), [books, searchQuery, filterCategoryId, filterStatus, filterRating, reviews, userId]);

  const sortedBooks = useMemo(() => [...filteredBooks].sort((a, b) => {
    const posA = a.position ?? 0;
    const posB = b.position ?? 0;
    return sortAscending ? posA - posB : posB - posA;
  }), [filteredBooks, sortAscending]);

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

          {rating > 0 &&(
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
      {/* Compact Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>My Library</Text>
          <Text style={styles.headerSubtitle}>{books.length} books {readingStreak > 0 ? `• 🔥 ${readingStreak} days` : ''}</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => setShowStatsModal(true)} style={styles.headerIconBtn}>
            <Ionicons name="stats-chart" size={20} color="#a78bfa" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSignOut} style={styles.headerIconBtn}>
            <Ionicons name="log-out-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Compact Stats Row */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsRow} contentContainerStyle={{ paddingHorizontal: 16 }}>
        <TouchableOpacity style={[styles.statCard, { backgroundColor: 'rgba(139,92,246,0.15)' }]} onPress={() => setShowStatsModal(true)}>
          <Text style={styles.statNumber}>{books.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.statCard, { backgroundColor: 'rgba(16,185,129,0.15)' }]}>
          <Text style={[styles.statNumber, { color: '#10b981' }]}>{books.filter(b => b.status === 'reading').length}</Text>
          <Text style={styles.statLabel}>Reading</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.statCard, { backgroundColor: 'rgba(99,102,241,0.15)' }]}>
          <Text style={[styles.statNumber, { color: '#6366f1' }]}>{books.filter(b => b.status === 'already read').length}</Text>
          <Text style={styles.statLabel}>Done</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.statCard, { backgroundColor: 'rgba(245,158,11,0.15)' }]}>
          <Text style={[styles.statNumber, { color: '#f59e0b' }]}>{books.filter(b => b.status === 'want to read').length}</Text>
          <Text style={styles.statLabel}>To Read</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.statCard, { backgroundColor: 'rgba(236,72,153,0.15)' }]} onPress={pickRandomBook}>
          <Text style={styles.statEmoji}>🎲</Text>
          <Text style={styles.statLabel}>Random</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Compact Search Bar */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color="#888" style={{ marginRight: 8 }} />
        <TextInput
          placeholder="Search..."
          placeholderTextColor="#666"
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery("")} style={{ padding: 4 }}>
            <Ionicons name="close-circle" size={18} color="#888" />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Combined Action Row */}
      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.smallActionBtn} onPress={openModal}>
          <Ionicons name="add" size={18} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.smallActionBtn, { backgroundColor: 'rgba(34,197,94,0.3)' }]} onPress={() => setCategoryModalVisible(true)}>
          <Ionicons name="folder" size={18} color="#22c55e" />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.smallActionBtn, { backgroundColor: 'rgba(219,22,190,0.3)' }]} onPress={() => setShowFilters(true)}>
          <Ionicons name="filter" size={18} color="#db16be" />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.smallActionBtn, { backgroundColor: 'rgba(59,130,246,0.3)' }]} onPress={() => setSortModalVisible(true)}>
          <Ionicons name="swap-vertical" size={18} color="#3b82f6" />
        </TouchableOpacity>
        <View style={styles.viewToggle}>
          <TouchableOpacity 
            style={[styles.viewToggleBtn, viewMode === 'list' && styles.viewToggleBtnActive]} 
            onPress={() => { setViewMode('list'); Vibration.vibrate(30); }}
          >
            <Ionicons name="list" size={16} color={viewMode === 'list' ? '#fff' : '#666'} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.viewToggleBtn, viewMode === 'grid' && styles.viewToggleBtnActive]} 
            onPress={() => { setViewMode('grid'); Vibration.vibrate(30); }}
          >
            <Ionicons name="grid" size={16} color={viewMode === 'grid' ? '#fff' : '#666'} />
          </TouchableOpacity>
        </View>
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
      ) : viewMode === 'grid' ? (
        <FlatList
          key="grid"
          data={sortedBooks}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={styles.gridList}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#8b5cf6"
              colors={['#8b5cf6']}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>📚</Text>
              <Text style={styles.emptyText}>No books yet!</Text>
              <Text style={styles.emptySubtext}>Tap + to add your first book</Text>
            </View>
          }
          renderItem={renderGridItem}
        />
      ) : (
        <FlatList
          key="list"
          data={sortedBooks}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.bookList}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#8b5cf6"
              colors={['#8b5cf6']}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>📚</Text>
              <Text style={styles.emptyText}>No books yet!</Text>
              <Text style={styles.emptySubtext}>Tap + to add your first book</Text>
            </View>
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

      {/* Stats Modal */}
      <Modal visible={showStatsModal} transparent animationType="fade">
        <BlurView intensity={100} tint="dark" style={styles.modalOverlay}>
          <View style={styles.statsModal}>
            <View style={styles.statsModalHeader}>
              <Text style={styles.statsModalTitle}>📊 Library Stats</Text>
              <TouchableOpacity onPress={() => setShowStatsModal(false)}>
                <Ionicons name="close" size={28} color="#fff" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.statsGrid}>
              <View style={styles.statsGridItem}>
                <LinearGradient colors={['#8b5cf6', '#6366f1']} style={styles.statsGradient}>
                  <Text style={styles.statsBigNumber}>{books.length}</Text>
                  <Text style={styles.statsGridLabel}>Total Books</Text>
                </LinearGradient>
              </View>
              <View style={styles.statsGridItem}>
                <LinearGradient colors={['#10b981', '#059669']} style={styles.statsGradient}>
                  <Text style={styles.statsBigNumber}>{books.filter(b => b.status === 'already read').length}</Text>
                  <Text style={styles.statsGridLabel}>Completed</Text>
                </LinearGradient>
              </View>
              <View style={styles.statsGridItem}>
                <LinearGradient colors={['#f59e0b', '#d97706']} style={styles.statsGradient}>
                  <Text style={styles.statsBigNumber}>{books.filter(b => b.status === 'reading').length}</Text>
                  <Text style={styles.statsGridLabel}>Reading Now</Text>
                </LinearGradient>
              </View>
              <View style={styles.statsGridItem}>
                <LinearGradient colors={['#ec4899', '#db2777']} style={styles.statsGradient}>
                  <Text style={styles.statsBigNumber}>{getLibraryStats().avgRating}</Text>
                  <Text style={styles.statsGridLabel}>Avg Rating</Text>
                </LinearGradient>
              </View>
            </View>

            <View style={styles.statsDetailRow}>
              <Ionicons name="flame" size={20} color="#f59e0b" />
              <Text style={styles.statsDetailText}>Reading Streak: {readingStreak} days</Text>
            </View>
            <View style={styles.statsDetailRow}>
              <Ionicons name="folder" size={20} color="#a78bfa" />
              <Text style={styles.statsDetailText}>Categories: {categories.length}</Text>
            </View>
            <View style={styles.statsDetailRow}>
              <Ionicons name="star" size={20} color="#fbbf24" />
              <Text style={styles.statsDetailText}>Reviews Given: {reviews.length}</Text>
            </View>

            <TouchableOpacity style={styles.shareStatsBtn} onPress={shareLibraryStats}>
              <Ionicons name="share-outline" size={20} color="#fff" />
              <Text style={styles.shareStatsBtnText}>Share My Stats</Text>
            </TouchableOpacity>
          </View>
        </BlurView>
      </Modal>

      {/* Book of the Day Modal */}
      <Modal visible={showBookOfDay} transparent animationType="fade">
        <BlurView intensity={100} tint="dark" style={styles.modalOverlay}>
          <View style={styles.bookOfDayModal}>
            <View style={styles.bookOfDayHeader}>
              <Text style={styles.bookOfDayTitle}>🎲 Random Pick!</Text>
              <TouchableOpacity onPress={() => setShowBookOfDay(false)}>
                <Ionicons name="close" size={28} color="#fff" />
              </TouchableOpacity>
            </View>
            
            {bookOfTheDay && (
              <View style={styles.bookOfDayContent}>
                <Image 
                  source={{ 
                    uri: bookOfTheDay.image || bookOfTheDay.cover_image || DEFAULT_IMAGE 
                  }} 
                  style={styles.bookOfDayImage} 
                />
                <Text style={styles.bookOfDayBookTitle}>{bookOfTheDay.title}</Text>
                <Text style={styles.bookOfDayAuthor}>{bookOfTheDay.author}</Text>
                <View style={[styles.bookOfDayStatus, { backgroundColor: getStatusColorForGrid(bookOfTheDay.status) + '30' }]}>
                  <Text style={[styles.bookOfDayStatusText, { color: getStatusColorForGrid(bookOfTheDay.status) }]}>
                    {bookOfTheDay.status || 'Not set'}
                  </Text>
                </View>
                
                <View style={styles.bookOfDayActions}>
                  <TouchableOpacity 
                    style={styles.bookOfDayBtn}
                    onPress={() => { setShowBookOfDay(false); openDetails(bookOfTheDay); }}
                  >
                    <Ionicons name="eye" size={18} color="#fff" />
                    <Text style={styles.bookOfDayBtnText}>View Details</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.bookOfDayBtn, { backgroundColor: '#10b981' }]}
                    onPress={pickRandomBook}
                  >
                    <Ionicons name="shuffle" size={18} color="#fff" />
                    <Text style={styles.bookOfDayBtnText}>Pick Another</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </BlurView>
      </Modal>

      {/* Quick Actions FAB Menu */}
      {showQuickActions && (
        <TouchableOpacity 
          style={styles.quickActionsOverlay} 
          activeOpacity={1} 
          onPress={toggleQuickActions}
        />
      )}
      
      <View style={styles.quickActionsContainer}>
        {showQuickActions && (
          <>
            <Animated.View style={[styles.quickActionItem, { 
              transform: [{ 
                translateY: quickActionAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -180] }) 
              }],
              opacity: quickActionAnim
            }]}>
              <TouchableOpacity style={[styles.quickActionBtn, { backgroundColor: '#10b981' }]} onPress={() => { toggleQuickActions(); openModal(); }}>
                <Ionicons name="add" size={24} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.quickActionLabel}>Add Book</Text>
            </Animated.View>
            
            <Animated.View style={[styles.quickActionItem, { 
              transform: [{ 
                translateY: quickActionAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -120] }) 
              }],
              opacity: quickActionAnim
            }]}>
              <TouchableOpacity style={[styles.quickActionBtn, { backgroundColor: '#f59e0b' }]} onPress={() => { toggleQuickActions(); setCategoryModalVisible(true); }}>
                <Ionicons name="folder-open" size={24} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.quickActionLabel}>Category</Text>
            </Animated.View>
            
            <Animated.View style={[styles.quickActionItem, { 
              transform: [{ 
                translateY: quickActionAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -60] }) 
              }],
              opacity: quickActionAnim
            }]}>
              <TouchableOpacity style={[styles.quickActionBtn, { backgroundColor: '#ec4899' }]} onPress={() => { toggleQuickActions(); pickRandomBook(); }}>
                <Ionicons name="shuffle" size={24} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.quickActionLabel}>Random</Text>
            </Animated.View>
          </>
        )}
        
        <TouchableOpacity style={styles.mainFab} onPress={toggleQuickActions}>
          <Animated.View style={{ 
            transform: [{ 
              rotate: quickActionAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '45deg'] }) 
            }] 
          }}>
            <Ionicons name="add" size={32} color="#fff" />
          </Animated.View>
        </TouchableOpacity>
      </View>

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
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 26,
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
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 8,
    overflow: "visible",
  },
  filterBtn: { backgroundColor: "rgba(219, 22, 190, 0.67)" },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, color: "#fff", fontSize: 14, paddingVertical: 10 },
  clearBtn: { padding: 6, marginLeft: 6, alignSelf: "center" },
  clearIcon: {},
  filterBar: { marginHorizontal: 20, marginBottom: 10, overflow: "visible" },
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
    marginHorizontal: 20,
    marginBottom: 10,
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(139, 92, 246, 0.2)",
    paddingVertical: 10,
    borderRadius: 12,
    height: 40,
    gap: 6,
  },
  categoryBtn: { backgroundColor: "rgba(34, 197, 94, 0.2)" },
  sortBtn: { backgroundColor: "rgba(12, 97, 233, 0.82)" },
  actionBtnText: { color: "#fff", fontWeight: "600", fontSize: 13 },
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

  // New styles for enhanced features
  headerSubtitle: {
    fontSize: 12,
    color: '#a78bfa',
    marginTop: 1,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 6,
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Stats Row - More compact
  statsRow: {
    marginBottom: 8,
    maxHeight: 70,
    flexGrow: 0,
    flexShrink: 0,
  },
  statCard: {
    width: 65,
    height: 60,
    borderRadius: 12,
    padding: 8,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: '#a78bfa',
  },
  statEmoji: {
    fontSize: 20,
  },
  statLabel: {
    fontSize: 9,
    color: '#888',
    marginTop: 2,
    fontWeight: '600',
  },

  // Small Action Buttons
  smallActionBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(139,92,246,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // View Toggle
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
    padding: 3,
    marginLeft: 'auto',
  },
  viewToggleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
  },
  viewToggleBtnActive: {
    backgroundColor: '#8b5cf6',
  },

  // Grid View
  gridList: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  gridRow: {
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  gridItem: {
    width: '48%',
    marginBottom: 16,
  },
  gridCard: {
    backgroundColor: 'rgba(30,30,46,0.9)',
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  gridImage: {
    width: '100%',
    height: 160,
  },
  gridRatingBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  gridRatingText: {
    color: '#fbbf24',
    fontSize: 11,
    fontWeight: '600',
  },
  gridStatusBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  gridTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
    paddingHorizontal: 4,
  },
  gridAuthor: {
    color: '#888',
    fontSize: 12,
    marginTop: 2,
    paddingHorizontal: 4,
    marginBottom: 8,
  },

  // Empty State
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptySubtext: {
    color: '#666',
    fontSize: 14,
    marginTop: 8,
  },

  // Stats Modal
  statsModal: {
    backgroundColor: 'rgba(30,30,46,0.98)',
    borderRadius: 24,
    padding: 24,
    width: width * 0.9,
    maxWidth: 400,
  },
  statsModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  statsModalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  statsGridItem: {
    width: '47%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  statsGradient: {
    padding: 16,
    alignItems: 'center',
  },
  statsBigNumber: {
    fontSize: 36,
    fontWeight: '800',
    color: '#fff',
  },
  statsGridLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  statsDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    gap: 12,
  },
  statsDetailText: {
    color: '#e0d0ff',
    fontSize: 15,
  },
  shareStatsBtn: {
    flexDirection: 'row',
    backgroundColor: '#8b5cf6',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    gap: 8,
  },
  shareStatsBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },

  // Book of the Day Modal
  bookOfDayModal: {
    backgroundColor: 'rgba(30,30,46,0.98)',
    borderRadius: 24,
    padding: 24,
    width: width * 0.85,
    maxWidth: 360,
  },
  bookOfDayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  bookOfDayTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
  },
  bookOfDayContent: {
    alignItems: 'center',
  },
  bookOfDayImage: {
    width: 140,
    height: 200,
    borderRadius: 12,
    marginBottom: 16,
  },
  bookOfDayBookTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 4,
  },
  bookOfDayAuthor: {
    fontSize: 14,
    color: '#a78bfa',
    marginBottom: 12,
  },
  bookOfDayStatus: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 20,
  },
  bookOfDayStatusText: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  bookOfDayActions: {
    flexDirection: 'row',
    gap: 12,
  },
  bookOfDayBtn: {
    flexDirection: 'row',
    backgroundColor: '#8b5cf6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    gap: 6,
  },
  bookOfDayBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },

  // Quick Actions FAB
  quickActionsOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  quickActionsContainer: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    alignItems: 'center',
  },
  quickActionItem: {
    position: 'absolute',
    alignItems: 'center',
    right: 4,
  },
  quickActionBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  quickActionLabel: {
    color: '#fff',
    fontSize: 10,
    marginTop: 4,
    fontWeight: '600',
  },
  mainFab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#8b5cf6',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#8b5cf6',
    shadowOpacity: 0.5,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 5 },
  },
});