import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { BlurView } from 'expo-blur';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect, useState, useMemo, useCallback } from 'react';
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
  View,
  Vibration,
} from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeInUp, ZoomIn, SlideInRight } from 'react-native-reanimated';
import Toast from 'react-native-toast-message';
import { supabase } from '../../supabase';

const { width } = Dimensions.get('window');

// Featured authors with special badges
const FEATURED_AUTHORS = ['Stephen King', 'J.K. Rowling', 'George R.R. Martin', 'Brandon Sanderson', 'Agatha Christie'];
const TRENDING_AUTHORS = ['Colleen Hoover', 'Sarah J. Maas', 'Rebecca Yarros', 'Taylor Jenkins Reid', 'Emily Henry'];
const CLASSIC_AUTHORS = ['Jane Austen', 'Charles Dickens', 'Leo Tolstoy', 'F. Scott Fitzgerald', 'Ernest Hemingway'];

const TOP_AUTHORS = [
  'Stephen King', 'J.K. Rowling', 'Agatha Christie', 'James Patterson',
  'Dan Brown', 'George R.R. Martin', 'J.R.R. Tolkien', 'C.S. Lewis', 'Haruki Murakami',
  'Margaret Atwood', 'Neil Gaiman', 'Paulo Coelho', 'Isabel Allende', 'Ernest Hemingway',
  'Jane Austen', 'Mark Twain', 'Charles Dickens', 'F. Scott Fitzgerald', 'Leo Tolstoy',
  'Gabriel Garcia Marquez', 'William Faulkner', 'Virginia Woolf', 'Oscar Wilde', 'Emily Bronte',
  'H.G. Wells', 'Arthur Conan Doyle', 'Terry Pratchett', 'Suzanne Collins', 'Rick Riordan',
  'Roald Dahl', 'Michael Crichton', 'Khaled Hosseini', 'J.D. Salinger', 'Harper Lee',
  'E.L. James', 'Stephenie Meyer', 'Nicholas Sparks', 'Colleen Hoover', 'Robert Ludlum',
  'Ken Follett', 'Tom Clancy', 'Patricia Cornwell', 'Jeffrey Archer', 'Lisa Gardner',
  'Dean Koontz', 'David Baldacci', 'Lee Child', 'Jo Nesbo', 'Michael Connelly',

  'Toni Morrison', 'Salman Rushdie', 'Kazuo Ishiguro', 'Zadie Smith', 'Chimamanda Ngozi Adichie',
  'Ian McEwan', 'Julian Barnes', 'Hilary Mantel', 'Alice Munro', 'Philip Roth',
  'John Updike', 'Saul Bellow', 'Norman Mailer', 'Don DeLillo', 'Thomas Pynchon',
  'David Foster Wallace', 'Jonathan Franzen', 'Jeffrey Eugenides', 'Donna Tartt', 'Marilynne Robinson',
  'Colson Whitehead', 'Jhumpa Lahiri', 'Arundhati Roy', 'Orhan Pamuk', 'Elena Ferrante',
  'Michel Houellebecq', 'Umberto Eco', 'Milan Kundera', 'Günter Grass', 'Mario Vargas Llosa',

  'Richard Dawkins', 'Carl Sagan', 'Stephen Hawking', 'Yuval Noah Harari', 'Bill Bryson',
  'Neil deGrasse Tyson', 'Brian Greene', 'Sam Harris', 'Daniel Kahneman', 'Michio Kaku',
  'Jared Diamond', 'Siddhartha Mukherjee', 'Mary Roach', 'Oliver Sacks', 'Richard Feynman',

  'Friedrich Nietzsche', 'Jean-Paul Sartre', 'Albert Camus', 'Simone de Beauvoir', 'Michel Foucault',
  'Jordan Peterson', 'Slavoj Žižek', 'Noam Chomsky', 'Hannah Arendt', 'Judith Butler',

  'Doris Kearns Goodwin', 'Ron Chernow', 'David McCullough', 'Erik Larson', 'Barbara Tuchman',
  'Antony Beevor', 'Simon Schama', 'Mary Beard', 'Yuval Noah Harari', 'Walter Isaacson',

  'Isaac Asimov', 'Arthur C. Clarke', 'Philip K. Dick', 'Frank Herbert', 'Ursula K. Le Guin',
  'Ray Bradbury', 'Robert A. Heinlein', 'Anne McCaffrey', 'Brandon Sanderson', 'Joe Abercrombie',
  'Robin Hobb', 'Patrick Rothfuss', 'N.K. Jemisin', 'Liu Cixin', 'Ted Chiang',
  'Octavia E. Butler', 'Samuel R. Delany', 'China Miéville', 'Alastair Reynolds', 'Peter F. Hamilton',

  'Gillian Flynn', 'Tana French', 'Stieg Larsson', 'Nesbø Jo', 'Harlan Coben',
  'Karin Slaughter', 'Tess Gerritsen', 'Jeffery Deaver', 'John le Carré', 'Frederick Forsyth',
  'Donna Leon', 'Louise Penny', 'Anthony Horowitz', 'Ruth Ware', 'Lucy Foley',

  'Nora Roberts', 'Danielle Steel', 'Julia Quinn', 'Tessa Dare', 'Lisa Kleypas',
  'Sarah J. Maas', 'Jennifer L. Armentrout', 'Ana Huang', 'Emily Henry', 'Christina Lauren',

  'Clive Barker', 'Anne Rice', 'Shirley Jackson', 'Bram Stoker', 'Lovecraft H.P.',
  'Joe Hill', 'Alma Katsu', 'Silvia Moreno-Garcia', 'Paul Tremblay', 'Grady Hendrix',

  'Maya Angelou', 'Rupi Kaur', 'Ocean Vuong', 'Amanda Gorman', 'William Shakespeare',
  'T.S. Eliot', 'Sylvia Plath', 'Langston Hughes', 'Pablo Neruda', 'Rainer Maria Rilke',

  'Malcolm Gladwell', 'James Clear', 'Atomic Habits', 'Brené Brown', 'Matthew McConaughey',
  'Michelle Obama', 'Trevor Noah', 'Tara Westover', 'Viktor E. Frankl', 'Dale Carnegie',
  'Robert Kiyosaki', 'Napoleon Hill', 'Simon Sinek', 'Adam Grant', 'Cal Newport',

  'Fyodor Dostoevsky', 'Franz Kafka', 'Homer', 'Dante Alighieri', 'Hermann Hesse',
  'Albert Camus', 'George Orwell', 'Aldous Huxley', 'Ray Bradbury', 'Joseph Conrad',
  'Chinua Achebe', 'Ngũgĩ wa Thiongʼo', 'R.K. Narayan', 'Pramoedya Ananta Toer', 'Kōbō Abe',

  'John Green', 'Rainbow Rowell', 'Cassandra Clare', 'Leigh Bardugo', 'Holly Black',
  'Veronica Roth', 'Marie Lu', 'Ransom Riggs', 'Angie Thomas', 'Nic Stone',
  'Jason Reynolds', 'Sabaa Tahir', 'Tom Fletcher', 'Jeff Kinney', 'Dav Pilkey',

  'Alan Moore', 'Neil Gaiman', 'Marjane Satrapi', 'Art Spiegelman', 'Osamu Tezuka',
  'Akira Toriyama', 'Naoki Urasawa', 'Eiichiro Oda', 'Kentaro Miura', 'CLAMP',

  'Brandon Mull', 'James Dashner', 'Pierce Brown', 'V.E. Schwab', 'Tamsyn Muir',
  'Rebecca Yarros', 'Sarah Adams', 'Ana Huang', 'Freida McFadden', 'Alex Michaelides',
  'Lisa Jewell', 'Riley Sager', 'C.J. Box', 'Craig Johnson', 'William Kent Krueger',
  'Elin Hilderbrand', 'Liane Moriarty', 'Celeste Ng', 'Taylor Jenkins Reid', 'Kristin Hannah',

  'Fredrik Backman', 'Andrzej Sapkowski', 'Joël Dicker', 'Hanya Yanagihara', 'Sally Rooney',
  'Delia Owens', 'Matt Haig', 'Robert Galbraith', 'Bernardine Evaristo', 'Akwaeke Emezi',

  'Ray Dalio', 'Carol Dweck', 'Angela Duckworth', 'Elizabeth Gilbert', 'Glennon Doyle',
  'Paulo Freire', 'bell hooks', 'Ta-Nehisi Coates', 'Ibram X. Kendi', 'Rebecca Solnit',

  'Douglas Adams', 'Kurt Vonnegut', 'Joseph Heller', 'Anthony Burgess', 'William Gibson',
  'Cormac McCarthy', 'Alice Walker', 'Toni Cade Bambara', 'Zora Neale Hurston', 'James Baldwin',
  'Ralph Ellison', 'Richard Wright', 'W.E.B. Du Bois', 'Frantz Fanon', 'Edward Said',

  'Andy Weir', 'Blake Crouch', 'Hugh Howey', 'Emily St. John Mandel', 'Rumaan Alam',
  'Brit Bennett', 'Kiley Reid', 'Ocean Vuong', 'Carmen Maria Machado', 'Ted Chiang',

  'Ayn Rand', 'Aesop', 'Sun Tzu', 'Machiavelli', 'Marcus Aurelius',
  'Rumi', 'Hafiz', 'Kahlil Gibran', 'Lao Tzu', 'Confucius'
];


const TOP_AUTHORS_GENRE_MAP: Record<string, string> = TOP_AUTHORS.reduce((acc, name) => {
  acc[name] = 'General';
  return acc;
}, {} as Record<string, string>);

const GENRE_OVERRIDES: Record<string, string> = {
  'Rumi': 'Poetry',
  'Lao Tzu': 'Philosophy',
  'Confucius': 'Philosophy',
  'Marcus Aurelius': 'Philosophy',
  'Kahlil Gibran': 'Poetry',
  'Paulo Coelho': 'Spiritual',
  'C.S. Lewis': 'Fantasy',
  'Sun Tzu': 'Philosophy',
  'Machiavelli': 'Philosophy',
  'Stephen King': 'Horror',
  'J.K. Rowling': 'Fantasy',
  'Agatha Christie': 'Mystery',
  'James Patterson': 'Thriller',
  'Dan Brown': 'Thriller',
  'George R.R. Martin': 'Fantasy',
  'J.R.R. Tolkien': 'Fantasy',
  'Haruki Murakami': 'Literary Fiction',
  'Margaret Atwood': 'Literary Fiction',
  'Neil Gaiman': 'Fantasy',
  'Isabel Allende': 'Magical Realism',
  'Ernest Hemingway': 'Classics',
  'Jane Austen': 'Classics',
  'Mark Twain': 'Classics',
  'Charles Dickens': 'Classics',
  'F. Scott Fitzgerald': 'Classics',
  'Leo Tolstoy': 'Classics',
  'Gabriel Garcia Marquez': 'Magical Realism',
  'Toni Morrison': 'Literary Fiction',
  'Salman Rushdie': 'Literary Fiction',
  'Kazuo Ishiguro': 'Literary Fiction',
  'Zadie Smith': 'Literary Fiction',
  'Chimamanda Ngozi Adichie': 'Literary Fiction',
  'Ian McEwan': 'Literary Fiction',
  'Alice Munro': 'Short Stories',
  'Philip Roth': 'Literary Fiction',
  'Doris Kearns Goodwin': 'History',
  'Ron Chernow': 'Biography',
  'David McCullough': 'History',
  'Erik Larson': 'History',
  'Walter Isaacson': 'Biography',
  'Isaac Asimov': 'Science Fiction',
  'Arthur C. Clarke': 'Science Fiction',
  'Philip K. Dick': 'Science Fiction',
  'Frank Herbert': 'Science Fiction',
  'Ursula K. Le Guin': 'Science Fiction',
  'Ray Bradbury': 'Science Fiction',
  'Jared Diamond': 'Non-fiction',
  'Richard Dawkins': 'Science',
  'Carl Sagan': 'Science',
  'Stephen Hawking': 'Science',
  'Yuval Noah Harari': 'History',
  'Michelle Obama': 'Memoir',
  'Malcolm Gladwell': 'Non-fiction',
  'James Clear': 'Self-help',
  'Brené Brown': 'Self-help',
  'Fyodor Dostoevsky': 'Classics',
  'Franz Kafka': 'Classics',
  'Homer': 'Classics',
  'Dante Alighieri': 'Classics',
  'Chinua Achebe': 'Literary Fiction',
  'John Green': 'Young Adult',
  'Rainbow Rowell': 'Young Adult',
  'Cassandra Clare': 'Young Adult',
  'Octavia E. Butler': 'Science Fiction',
  'Nora Roberts': 'Romance',
  'Danielle Steel': 'Romance',
  'Julia Quinn': 'Romance',
  'Tessa Dare': 'Romance',
  'Sarah J. Maas': 'Fantasy',
  'Gillian Flynn': 'Thriller',
  'Tana French': 'Mystery',
  'Stieg Larsson': 'Mystery',
  'Harlan Coben': 'Mystery',
  'Louise Penny': 'Mystery',
  'Donna Tartt': 'Literary Fiction',
  'Colson Whitehead': 'Literary Fiction',
  'Jhumpa Lahiri': 'Literary Fiction',
  'Arundhati Roy': 'Literary Fiction',
  'Elena Ferrante': 'Literary Fiction',
  'Umberto Eco': 'Literary Fiction',
  'Milan Kundera': 'Literary Fiction',
  'Mario Vargas Llosa': 'Literary Fiction',
  'Brandon Sanderson': 'Fantasy',
  'Patrick Rothfuss': 'Fantasy',
  'N.K. Jemisin': 'Fantasy',
  'Liu Cixin': 'Science Fiction',
  'Ted Chiang': 'Science Fiction',
  'Harper Lee': 'Classics',
  'J.D. Salinger': 'Classics',
  'Rupi Kaur': 'Poetry',
  'Maya Angelou': 'Poetry',
  'William Shakespeare': 'Classics',
  'T.S. Eliot': 'Poetry',
  'Sylvia Plath': 'Poetry',
  'Langston Hughes': 'Poetry',
  'Pablo Neruda': 'Poetry',
  'Rainer Maria Rilke': 'Poetry',
  'Robert Kiyosaki': 'Business',
  'Napoleon Hill': 'Self-help',
  'Simon Sinek': 'Business',
  'Adam Grant': 'Business',
  'Cal Newport': 'Self-help',
  'Douglas Adams': 'Science Fiction',
  'Kurt Vonnegut': 'Literary Fiction',
  'William Gibson': 'Science Fiction',
  'Cormac McCarthy': 'Literary Fiction',
  'Alice Walker': 'Literary Fiction',
  'James Baldwin': 'Literary Fiction',
  'Edward Said': 'Non-fiction',
  'Noam Chomsky': 'Non-fiction',
  'Ta-Nehisi Coates': 'Non-fiction',
  'Ibram X. Kendi': 'Non-fiction',
  'Rebecca Solnit': 'Non-fiction',
  'Andy Weir': 'Science Fiction',
  'Blake Crouch': 'Science Fiction',
  'Hugh Howey': 'Science Fiction',
  'Emily St. John Mandel': 'Contemporary',
  'Ayn Rand': 'Philosophy',
};

Object.assign(TOP_AUTHORS_GENRE_MAP, GENRE_OVERRIDES);

type AuthorItem = { name: string; genre: string };
const AUTHORS_LIST: AuthorItem[] = TOP_AUTHORS.map(name => ({ name, genre: TOP_AUTHORS_GENRE_MAP[name] || 'General' }));

const GOOGLE_BOOKS_API = 'https://www.googleapis.com/books/v1/volumes?q=inauthor:';

// Genre icons mapping
const GENRE_ICONS: Record<string, string> = {
  'All': 'apps',
  'Fantasy': 'planet',
  'Science Fiction': 'rocket',
  'Mystery': 'search',
  'Thriller': 'flash',
  'Romance': 'heart',
  'Horror': 'skull',
  'Classics': 'book',
  'Literary Fiction': 'library',
  'Poetry': 'sparkles',
  'Philosophy': 'bulb',
  'History': 'time',
  'Biography': 'person',
  'Science': 'flask',
  'Self-help': 'trending-up',
  'Business': 'briefcase',
  'Non-fiction': 'newspaper',
  'Young Adult': 'happy',
  'Memoir': 'journal',
  'General': 'ellipsis-horizontal',
};

// Sort options
const SORT_OPTIONS = [
  { id: 'name', label: 'Name A-Z', icon: 'text' },
  { id: 'name-desc', label: 'Name Z-A', icon: 'text' },
  { id: 'genre', label: 'Genre', icon: 'folder' },
  { id: 'featured', label: 'Featured First', icon: 'star' },
];

// View modes
type ViewMode = 'grid' | 'list' | 'compact';

export default function AuthorsScreen() {
  const [selectedAuthor, setSelectedAuthor] = useState<string | null>(null);
  const [books, setBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [startIndex, setStartIndex] = useState(0);
  const [totalItems, setTotalItems] = useState<number | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const isFocused = useIsFocused();
  
  const AUTHORS_PER_PAGE = 30;
  const [authorPage, setAuthorPage] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('All');
  const [bookSearchQuery, setBookSearchQuery] = useState('');
  
  // New states for enhanced features
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState('name');
  const [showSortModal, setShowSortModal] = useState(false);
  const [showAuthorModal, setShowAuthorModal] = useState(false);
  const [selectedAuthorInfo, setSelectedAuthorInfo] = useState<AuthorItem | null>(null);
  const [favoriteAuthors, setFavoriteAuthors] = useState<Set<string>>(new Set());
  const [recentlyViewed, setRecentlyViewed] = useState<string[]>([]);
  const [showStats, setShowStats] = useState(false);

  // Load favorite authors from storage
  useEffect(() => {
    const loadFavorites = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUserId(session.user.id);
        // Load from local storage or database
        const stored = await supabase.from('favorite_authors').select('author_name').eq('user_id', session.user.id);
        if (stored.data) {
          setFavoriteAuthors(new Set(stored.data.map(f => f.author_name)));
        }
      }
    };
    loadFavorites();
  }, []);

  // Stats calculations
  const stats = useMemo(() => {
    const genreCounts: Record<string, number> = {};
    AUTHORS_LIST.forEach(a => {
      genreCounts[a.genre] = (genreCounts[a.genre] || 0) + 1;
    });
    const topGenre = Object.entries(genreCounts).sort((a, b) => b[1] - a[1])[0];
    return {
      totalAuthors: AUTHORS_LIST.length,
      totalGenres: Object.keys(genreCounts).length,
      favoriteCount: favoriteAuthors.size,
      recentCount: recentlyViewed.length,
      topGenre: topGenre?.[0] || 'None',
      topGenreCount: topGenre?.[1] || 0,
    };
  }, [favoriteAuthors.size, recentlyViewed.length]);

  // Toggle favorite author
  const toggleFavorite = useCallback(async (authorName: string) => {
    Vibration.vibrate(30);
    setFavoriteAuthors(prev => {
      const next = new Set(prev);
      if (next.has(authorName)) {
        next.delete(authorName);
        // Remove from database
        if (userId) {
          supabase.from('favorite_authors').delete().eq('user_id', userId).eq('author_name', authorName);
        }
        Toast.show({ type: 'info', text1: 'Removed from favorites', text2: authorName });
      } else {
        next.add(authorName);
        // Add to database
        if (userId) {
          supabase.from('favorite_authors').insert({ user_id: userId, author_name: authorName });
        }
        Toast.show({ type: 'success', text1: 'Added to favorites', text2: authorName });
      }
      return next;
    });
  }, [userId]);

  // Share author
  const shareAuthor = useCallback(async (authorName: string) => {
    Vibration.vibrate(30);
    try {
      await Share.share({
        message: `Check out ${authorName}'s books! 📚\n\nDiscover amazing reads from this author.`,
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  }, []);

  // Copy author name
  const copyAuthorName = useCallback(async (authorName: string) => {
    await Clipboard.setStringAsync(authorName);
    Vibration.vibrate(30);
    Toast.show({ type: 'success', text1: 'Copied!', text2: `${authorName} copied to clipboard` });
  }, []);
  useEffect(() => {
    setAuthorPage(0);
  }, [searchQuery]);

  // Filtered and sorted authors
  const filteredAuthors = useMemo(() => {
    let result = AUTHORS_LIST.filter(a => {
      const matchesSearch = !searchQuery.trim() || a.name.toLowerCase().includes(searchQuery.trim().toLowerCase());
      const matchesGenre = selectedGenre === 'All' || a.genre === selectedGenre;
      return matchesSearch && matchesGenre;
    });

    // Sort
    switch (sortBy) {
      case 'name':
        result = result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'name-desc':
        result = result.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case 'genre':
        result = result.sort((a, b) => a.genre.localeCompare(b.genre) || a.name.localeCompare(b.name));
        break;
      case 'featured':
        result = result.sort((a, b) => {
          const aFeatured = FEATURED_AUTHORS.includes(a.name) ? 0 : TRENDING_AUTHORS.includes(a.name) ? 1 : 2;
          const bFeatured = FEATURED_AUTHORS.includes(b.name) ? 0 : TRENDING_AUTHORS.includes(b.name) ? 1 : 2;
          return aFeatured - bFeatured || a.name.localeCompare(b.name);
        });
        break;
    }

    return result;
  }, [searchQuery, selectedGenre, sortBy]);

  const totalAuthorPages = Math.max(1, Math.ceil(filteredAuthors.length / AUTHORS_PER_PAGE));
  const paginatedAuthors = filteredAuthors.slice(authorPage * AUTHORS_PER_PAGE, (authorPage + 1) * AUTHORS_PER_PAGE);
  const genres = ['All', ...Array.from(new Set(AUTHORS_LIST.map(a => a.genre))).sort()];

  useEffect(() => {
    const fetchUserId = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session && session.user) setUserId(session.user.id);
    };
    fetchUserId();
  }, []);

  useEffect(() => {
    if (!isFocused) return;
    // Check for navigation request (kept for compatibility)
  }, [isFocused, selectedAuthor]);

  // Add to recently viewed
  const addToRecentlyViewed = useCallback((authorName: string) => {
    setRecentlyViewed(prev => {
      const filtered = prev.filter(a => a !== authorName);
      return [authorName, ...filtered].slice(0, 10);
    });
  }, []);

  // Refresh handler
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setAuthorPage(0);
    setTimeout(() => setRefreshing(false), 500);
  }, []);

  const fetchBooks = async (author: string, append = false) => {
    if (!append) {
      setStartIndex(0);
      setTotalItems(null);
      setBooks([]);
      setBookSearchQuery('');
      setLoading(true);
      addToRecentlyViewed(author);
    } else {
      setLoadingMore(true);
    }

    setSelectedAuthor(author);
    try {
      const si = append ? startIndex : 0;
      const res = await fetch(`${GOOGLE_BOOKS_API}${encodeURIComponent(author)}&orderBy=relevance&maxResults=20&startIndex=${si}`);
      const data = await res.json();

      const items = data.items || [];
      if (append) {
        setBooks(prev => [...prev, ...items]);
      } else {
        setBooks(items);
      }

      if (typeof data.totalItems === 'number') {
        setTotalItems(data.totalItems);
      }

      setStartIndex(prev => prev + items.length);
    } catch (e) {
      if (!append) setBooks([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const addToLibrary = async (book: any) => {
    if (!userId) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'User not authenticated.' });
      return;
    }
    const volume = book.volumeInfo;
    const payload = {
      title: volume.title || '',
      author: (volume.authors && volume.authors.join(', ')) || selectedAuthor || '',
      description: volume.description || '',
      user_id: userId,
      image: volume.imageLinks?.thumbnail || 'https://via.placeholder.com/100x150?text=Book',
      cover_image: volume.imageLinks?.thumbnail || 'https://via.placeholder.com/100x150?text=Book',
      status: 'want to read',
    };
    try {
      const { error } = await supabase.from('books').insert([payload]);
      if (error) throw error;
      Toast.show({ type: 'success', text1: 'Added!', text2: `${payload.title} added to your library.` });
      router.replace('/home');
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: err.message });
    }
  };

  const filteredBooks = bookSearchQuery.trim()
    ? books.filter(item => {
        const title = (item?.volumeInfo?.title || '').toString().toLowerCase();
        return title.includes(bookSearchQuery.trim().toLowerCase());
      })
    : books;

  // Render author card based on view mode
  const renderAuthorCard = ({ item, index }: { item: AuthorItem; index: number }) => {
    const avatarUri = `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name)}&background=8b5cf6&color=fff&size=128&rounded=true`;
    const isFeatured = FEATURED_AUTHORS.includes(item.name);
    const isTrending = TRENDING_AUTHORS.includes(item.name);
    const isClassic = CLASSIC_AUTHORS.includes(item.name);
    const isFavorite = favoriteAuthors.has(item.name);

    if (viewMode === 'compact') {
      return (
        <Animated.View entering={FadeIn.delay(index * 20).duration(300)}>
          <TouchableOpacity
            style={styles.compactCard}
            onPress={() => fetchBooks(item.name)}
            onLongPress={() => { setSelectedAuthorInfo(item); setShowAuthorModal(true); }}
            activeOpacity={0.8}
          >
            <Image source={{ uri: avatarUri }} style={styles.compactAvatar} />
            <View style={{ flex: 1 }}>
              <View style={styles.authorNameRow}>
                <Text style={styles.compactName} numberOfLines={1}>{item.name}</Text>
                {isFeatured && <Text style={styles.badge}>⭐</Text>}
                {isTrending && <Text style={styles.badge}>🔥</Text>}
                {isClassic && <Text style={styles.badge}>📚</Text>}
              </View>
              <Text style={styles.compactGenre}>{item.genre}</Text>
            </View>
            <TouchableOpacity onPress={() => toggleFavorite(item.name)} style={styles.favoriteBtn}>
              <Ionicons name={isFavorite ? 'heart' : 'heart-outline'} size={18} color={isFavorite ? '#ef4444' : '#666'} />
            </TouchableOpacity>
          </TouchableOpacity>
        </Animated.View>
      );
    }

    if (viewMode === 'list') {
      return (
        <Animated.View entering={FadeInDown.delay(index * 30).duration(300)}>
          <TouchableOpacity
            style={styles.listCard}
            onPress={() => fetchBooks(item.name)}
            onLongPress={() => { setSelectedAuthorInfo(item); setShowAuthorModal(true); }}
            activeOpacity={0.8}
          >
            <Image source={{ uri: avatarUri }} style={styles.listAvatar} />
            <View style={styles.listInfo}>
              <View style={styles.authorNameRow}>
                <Text style={styles.listName}>{item.name}</Text>
                {isFeatured && <Text style={styles.badge}>⭐</Text>}
                {isTrending && <Text style={styles.badge}>🔥</Text>}
                {isClassic && <Text style={styles.badge}>📚</Text>}
              </View>
              <View style={styles.genreTag}>
                <Ionicons name={(GENRE_ICONS[item.genre] || 'book') as any} size={12} color="#8b5cf6" />
                <Text style={styles.listGenre}>{item.genre}</Text>
              </View>
            </View>
            <View style={styles.listActions}>
              <TouchableOpacity onPress={() => toggleFavorite(item.name)} style={styles.actionBtn}>
                <Ionicons name={isFavorite ? 'heart' : 'heart-outline'} size={20} color={isFavorite ? '#ef4444' : '#666'} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => shareAuthor(item.name)} style={styles.actionBtn}>
                <Ionicons name="share-outline" size={20} color="#3b82f6" />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Animated.View>
      );
    }

    // Grid view (default)
    return (
      <Animated.View entering={ZoomIn.delay(index * 30).duration(300)} style={styles.gridCardWrapper}>
        <TouchableOpacity
          style={styles.gridCard}
          onPress={() => fetchBooks(item.name)}
          onLongPress={() => { setSelectedAuthorInfo(item); setShowAuthorModal(true); }}
          activeOpacity={0.8}
        >
          {/* Badges */}
          {(isFeatured || isTrending || isClassic) && (
            <View style={styles.badgeContainer}>
              {isFeatured && <Text style={styles.cardBadge}>⭐</Text>}
              {isTrending && <Text style={styles.cardBadge}>🔥</Text>}
              {isClassic && <Text style={styles.cardBadge}>📚</Text>}
            </View>
          )}
          
          {/* Favorite button */}
          <TouchableOpacity 
            style={styles.gridFavoriteBtn} 
            onPress={() => toggleFavorite(item.name)}
          >
            <Ionicons name={isFavorite ? 'heart' : 'heart-outline'} size={16} color={isFavorite ? '#ef4444' : '#888'} />
          </TouchableOpacity>

          <Image source={{ uri: avatarUri }} style={styles.gridAvatar} />
          <Text style={styles.gridName} numberOfLines={2}>{item.name}</Text>
          <View style={styles.genreTag}>
            <Ionicons name={(GENRE_ICONS[item.genre] || 'book') as any} size={10} color="#8b5cf6" />
            <Text style={styles.gridGenre}>{item.genre}</Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <LinearGradient colors={['#0f0f23', '#1a1a2e', '#16213e']} style={styles.container}>
      {!selectedAuthor ? (
        <>
          {/* Header */}
          <Animated.View entering={FadeInDown.duration(500)} style={styles.header}>
            <View>
              <Text style={styles.title}>Authors</Text>
              <Text style={styles.subtitle}>{filteredAuthors.length} authors to explore</Text>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity 
                style={styles.headerBtn} 
                onPress={() => { setShowStats(true); Vibration.vibrate(30); }}
              >
                <Ionicons name="stats-chart" size={20} color="#a78bfa" />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.headerBtn} 
                onPress={() => { setShowSortModal(true); Vibration.vibrate(30); }}
              >
                <Ionicons name="swap-vertical" size={20} color="#10b981" />
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* Quick Stats Row */}
          <Animated.View entering={FadeInUp.delay(100).duration(500)}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickStatsRow}>
              <View style={[styles.quickStatCard, { backgroundColor: 'rgba(139,92,246,0.15)' }]}>
                <Text style={[styles.quickStatNumber, { color: '#a78bfa' }]}>{stats.totalAuthors}</Text>
                <Text style={styles.quickStatLabel}>Authors</Text>
              </View>
              <View style={[styles.quickStatCard, { backgroundColor: 'rgba(239,68,68,0.15)' }]}>
                <Text style={[styles.quickStatNumber, { color: '#ef4444' }]}>{stats.favoriteCount}</Text>
                <Text style={styles.quickStatLabel}>Favorites</Text>
              </View>
              <View style={[styles.quickStatCard, { backgroundColor: 'rgba(16,185,129,0.15)' }]}>
                <Text style={[styles.quickStatNumber, { color: '#10b981' }]}>{stats.totalGenres}</Text>
                <Text style={styles.quickStatLabel}>Genres</Text>
              </View>
              <View style={[styles.quickStatCard, { backgroundColor: 'rgba(245,158,11,0.15)' }]}>
                <Text style={[styles.quickStatNumber, { color: '#f59e0b' }]}>{recentlyViewed.length}</Text>
                <Text style={styles.quickStatLabel}>Recent</Text>
              </View>
            </ScrollView>
          </Animated.View>

          {/* Search Bar */}
          <Animated.View entering={FadeInDown.delay(150).duration(500)} style={styles.searchContainer}>
            <Ionicons name="search" size={18} color="#888" />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search authors..."
              placeholderTextColor="#666"
              style={styles.searchInput}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color="#888" />
              </TouchableOpacity>
            )}
          </Animated.View>

          {/* Genre Filter & View Toggle */}
          <Animated.View entering={FadeInDown.delay(200).duration(500)} style={styles.filterRow}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.genreScroll}>
              {genres.map(g => (
                <TouchableOpacity
                  key={g}
                  onPress={() => { setSelectedGenre(g); setAuthorPage(0); Vibration.vibrate(30); }}
                  style={[
                    styles.genreChip,
                    selectedGenre === g && styles.genreChipActive
                  ]}
                >
                  <Ionicons 
                    name={(GENRE_ICONS[g] || 'book') as any} 
                    size={14} 
                    color={selectedGenre === g ? '#fff' : '#a78bfa'} 
                  />
                  <Text style={[styles.genreChipText, selectedGenre === g && styles.genreChipTextActive]}>
                    {g}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Animated.View>

          {/* View Mode Toggle */}
          <Animated.View entering={FadeIn.delay(250).duration(500)} style={styles.viewToggleContainer}>
            <View style={styles.viewToggle}>
              <TouchableOpacity 
                style={[styles.viewBtn, viewMode === 'grid' && styles.viewBtnActive]}
                onPress={() => { setViewMode('grid'); Vibration.vibrate(30); }}
              >
                <Ionicons name="grid" size={16} color={viewMode === 'grid' ? '#fff' : '#666'} />
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.viewBtn, viewMode === 'list' && styles.viewBtnActive]}
                onPress={() => { setViewMode('list'); Vibration.vibrate(30); }}
              >
                <Ionicons name="list" size={16} color={viewMode === 'list' ? '#fff' : '#666'} />
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.viewBtn, viewMode === 'compact' && styles.viewBtnActive]}
                onPress={() => { setViewMode('compact'); Vibration.vibrate(30); }}
              >
                <Ionicons name="menu" size={16} color={viewMode === 'compact' ? '#fff' : '#666'} />
              </TouchableOpacity>
            </View>
            <Text style={styles.resultsText}>{filteredAuthors.length} results</Text>
          </Animated.View>

          {/* Recently Viewed */}
          {recentlyViewed.length > 0 && !searchQuery && selectedGenre === 'All' && (
            <Animated.View entering={FadeIn.duration(400)} style={styles.recentSection}>
              <Text style={styles.sectionTitle}>Recently Viewed</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {recentlyViewed.slice(0, 5).map((name, i) => (
                  <TouchableOpacity 
                    key={name} 
                    style={styles.recentChip}
                    onPress={() => fetchBooks(name)}
                  >
                    <Image 
                      source={{ uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=8b5cf6&color=fff&size=64&rounded=true` }} 
                      style={styles.recentAvatar} 
                    />
                    <Text style={styles.recentName} numberOfLines={1}>{name.split(' ')[0]}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </Animated.View>
          )}

          {/* Authors List */}
          <FlatList
            data={paginatedAuthors}
            keyExtractor={(item) => item.name}
            numColumns={viewMode === 'grid' ? 2 : 1}
            key={viewMode}
            columnWrapperStyle={viewMode === 'grid' ? styles.gridRow : undefined}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8b5cf6" colors={['#8b5cf6']} />
            }
            renderItem={renderAuthorCard}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyEmoji}>🔍</Text>
                <Text style={styles.emptyText}>No authors found</Text>
                <Text style={styles.emptySubtext}>Try a different search or filter</Text>
              </View>
            }
          />

          {/* Pagination */}
          {filteredAuthors.length > 0 && (
            <View style={styles.pagerRow}>
              <TouchableOpacity
                onPress={() => { setAuthorPage(p => Math.max(0, p - 1)); Vibration.vibrate(30); }}
                style={[styles.pagerButton, authorPage === 0 && styles.pagerButtonDisabled]}
                disabled={authorPage === 0}
              >
                <Ionicons name="chevron-back" size={18} color={authorPage === 0 ? '#444' : '#a78bfa'} />
                <Text style={[styles.pagerText, authorPage === 0 && styles.pagerTextDisabled]}>Prev</Text>
              </TouchableOpacity>

              <Text style={styles.pagerInfo}>{authorPage + 1} / {totalAuthorPages}</Text>

              <TouchableOpacity
                onPress={() => { setAuthorPage(p => Math.min(totalAuthorPages - 1, p + 1)); Vibration.vibrate(30); }}
                style={[styles.pagerButton, authorPage >= totalAuthorPages - 1 && styles.pagerButtonDisabled]}
                disabled={authorPage >= totalAuthorPages - 1}
              >
                <Text style={[styles.pagerText, authorPage >= totalAuthorPages - 1 && styles.pagerTextDisabled]}>Next</Text>
                <Ionicons name="chevron-forward" size={18} color={authorPage >= totalAuthorPages - 1 ? '#444' : '#a78bfa'} />
              </TouchableOpacity>
            </View>
          )}

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
                    onPress={() => { setSortBy(option.id); setShowSortModal(false); Vibration.vibrate(30); }}
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

          {/* Stats Modal */}
          <Modal visible={showStats} transparent animationType="fade">
            <BlurView intensity={100} tint="dark" style={styles.modalOverlay}>
              <Animated.View entering={ZoomIn.duration(300)} style={styles.statsModal}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>📊 Author Stats</Text>
                  <TouchableOpacity onPress={() => setShowStats(false)}>
                    <Ionicons name="close" size={24} color="#fff" />
                  </TouchableOpacity>
                </View>
                
                <View style={styles.statsGrid}>
                  <View style={styles.statBox}>
                    <Text style={styles.statBoxNumber}>{stats.totalAuthors}</Text>
                    <Text style={styles.statBoxLabel}>Total Authors</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={styles.statBoxNumber}>{stats.totalGenres}</Text>
                    <Text style={styles.statBoxLabel}>Genres</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={styles.statBoxNumber}>{stats.favoriteCount}</Text>
                    <Text style={styles.statBoxLabel}>Favorites</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={styles.statBoxNumber}>{stats.recentCount}</Text>
                    <Text style={styles.statBoxLabel}>Recent</Text>
                  </View>
                </View>

                <View style={styles.topGenreBox}>
                  <Text style={styles.topGenreLabel}>🏆 Most Authors in</Text>
                  <Text style={styles.topGenreName}>{stats.topGenre}</Text>
                  <Text style={styles.topGenreCount}>{stats.topGenreCount} authors</Text>
                </View>

                <View style={styles.legendSection}>
                  <Text style={styles.legendTitle}>Badge Legend</Text>
                  <View style={styles.legendRow}>
                    <Text style={styles.legendBadge}>⭐</Text>
                    <Text style={styles.legendText}>Featured Author</Text>
                  </View>
                  <View style={styles.legendRow}>
                    <Text style={styles.legendBadge}>🔥</Text>
                    <Text style={styles.legendText}>Trending Now</Text>
                  </View>
                  <View style={styles.legendRow}>
                    <Text style={styles.legendBadge}>📚</Text>
                    <Text style={styles.legendText}>Classic Author</Text>
                  </View>
                </View>
              </Animated.View>
            </BlurView>
          </Modal>

          {/* Author Info Modal */}
          <Modal visible={showAuthorModal} transparent animationType="fade">
            <BlurView intensity={100} tint="dark" style={styles.modalOverlay}>
              <Animated.View entering={ZoomIn.duration(300)} style={styles.authorModal}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Author Info</Text>
                  <TouchableOpacity onPress={() => setShowAuthorModal(false)}>
                    <Ionicons name="close" size={24} color="#fff" />
                  </TouchableOpacity>
                </View>
                
                {selectedAuthorInfo && (
                  <>
                    <Image 
                      source={{ uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedAuthorInfo.name)}&background=8b5cf6&color=fff&size=128&rounded=true` }} 
                      style={styles.authorModalAvatar}
                    />
                    <Text style={styles.authorModalName}>{selectedAuthorInfo.name}</Text>
                    <View style={styles.authorModalGenreTag}>
                      <Ionicons name={(GENRE_ICONS[selectedAuthorInfo.genre] || 'book') as any} size={14} color="#8b5cf6" />
                      <Text style={styles.authorModalGenre}>{selectedAuthorInfo.genre}</Text>
                    </View>

                    <View style={styles.authorModalActions}>
                      <TouchableOpacity 
                        style={styles.authorModalBtn}
                        onPress={() => { fetchBooks(selectedAuthorInfo.name); setShowAuthorModal(false); }}
                      >
                        <Ionicons name="book" size={20} color="#fff" />
                        <Text style={styles.authorModalBtnText}>View Books</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.authorModalBtn, styles.authorModalBtnSecondary]}
                        onPress={() => toggleFavorite(selectedAuthorInfo.name)}
                      >
                        <Ionicons 
                          name={favoriteAuthors.has(selectedAuthorInfo.name) ? 'heart' : 'heart-outline'} 
                          size={20} 
                          color={favoriteAuthors.has(selectedAuthorInfo.name) ? '#ef4444' : '#fff'} 
                        />
                        <Text style={styles.authorModalBtnText}>
                          {favoriteAuthors.has(selectedAuthorInfo.name) ? 'Unfavorite' : 'Favorite'}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    <View style={styles.authorModalLinks}>
                      <TouchableOpacity style={styles.authorModalLink} onPress={() => shareAuthor(selectedAuthorInfo.name)}>
                        <Ionicons name="share-social" size={18} color="#3b82f6" />
                        <Text style={styles.authorModalLinkText}>Share</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.authorModalLink} onPress={() => copyAuthorName(selectedAuthorInfo.name)}>
                        <Ionicons name="copy" size={18} color="#10b981" />
                        <Text style={styles.authorModalLinkText}>Copy Name</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </Animated.View>
            </BlurView>
          </Modal>
        </>
      ) : (
        /* Books View */
        <View style={{ flex: 1 }}>
          <Animated.View entering={FadeInDown.duration(400)} style={styles.booksHeader}>
            <TouchableOpacity 
              style={styles.backBtn}
              onPress={() => { setSelectedAuthor(null); setBooks([]); setBookSearchQuery(''); }}
            >
              <Ionicons name="arrow-back" size={20} color="#a78bfa" />
              <Text style={styles.backText}>Authors</Text>
            </TouchableOpacity>
            <View style={styles.booksHeaderRight}>
              <TouchableOpacity onPress={() => toggleFavorite(selectedAuthor)} style={styles.headerActionBtn}>
                <Ionicons 
                  name={favoriteAuthors.has(selectedAuthor) ? 'heart' : 'heart-outline'} 
                  size={22} 
                  color={favoriteAuthors.has(selectedAuthor) ? '#ef4444' : '#888'} 
                />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => shareAuthor(selectedAuthor)} style={styles.headerActionBtn}>
                <Ionicons name="share-outline" size={22} color="#3b82f6" />
              </TouchableOpacity>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(100).duration(400)} style={styles.authorBanner}>
            <Image 
              source={{ uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedAuthor)}&background=8b5cf6&color=fff&size=128&rounded=true` }} 
              style={styles.authorBannerAvatar}
            />
            <View style={styles.authorBannerInfo}>
              <Text style={styles.authorBannerName}>{selectedAuthor}</Text>
              <Text style={styles.authorBannerBooks}>
                {totalItems ? `${totalItems.toLocaleString()} books found` : 'Loading...'}
              </Text>
            </View>
          </Animated.View>

          {loading && books.length === 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#8b5cf6" />
              <Text style={styles.loadingText}>Finding books...</Text>
            </View>
          ) : (
            <View style={{ flex: 1 }}>
              <View style={styles.bookSearchContainer}>
                <Ionicons name="search" size={16} color="#888" />
                <TextInput
                  value={bookSearchQuery}
                  onChangeText={setBookSearchQuery}
                  placeholder="Search books by title..."
                  placeholderTextColor="#666"
                  style={styles.bookSearchInput}
                  returnKeyType="search"
                />
                {bookSearchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setBookSearchQuery('')}>
                    <Ionicons name="close-circle" size={16} color="#888" />
                  </TouchableOpacity>
                )}
              </View>

              {filteredBooks.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyEmoji}>📚</Text>
                  <Text style={styles.emptyText}>No books found</Text>
                </View>
              ) : (
                <FlatList
                  data={filteredBooks}
                  keyExtractor={(item) => item.id}
                  contentContainerStyle={{ paddingBottom: 100, paddingHorizontal: 16 }}
                  onEndReachedThreshold={0.6}
                  onEndReached={() => {
                    if (!loadingMore && totalItems !== null && startIndex < totalItems) {
                      fetchBooks(selectedAuthor as string, true);
                    }
                  }}
                  ListFooterComponent={() => loadingMore ? <ActivityIndicator style={{ margin: 12 }} color="#8b5cf6" /> : null}
                  renderItem={({ item, index }) => {
                    const vol = item.volumeInfo || {};
                    const thumb = vol.imageLinks?.thumbnail || `https://ui-avatars.com/api/?name=${encodeURIComponent((vol.authors && vol.authors[0]) || selectedAuthor || 'Author')}&background=2d1b4e&color=fff&size=128`;
                    return (
                      <Animated.View entering={FadeInDown.delay(index * 30).duration(300)}>
                        <View style={styles.bookCard}>
                          <Image source={{ uri: thumb }} style={styles.bookImage} />
                          <View style={styles.bookContent}>
                            <Text style={styles.bookTitle} numberOfLines={2}>{vol.title || 'Untitled'}</Text>
                            <Text style={styles.bookAuthor} numberOfLines={1}>
                              {(vol.authors && vol.authors.join(', ')) || selectedAuthor}
                            </Text>
                            {vol.publishedDate && (
                              <Text style={styles.bookYear}>{vol.publishedDate.split('-')[0]}</Text>
                            )}
                            {vol.pageCount && (
                              <Text style={styles.bookPages}>{vol.pageCount} pages</Text>
                            )}
                            <TouchableOpacity 
                              onPress={() => addToLibrary(item)} 
                              style={styles.addLibraryBtn}
                            >
                              <Ionicons name="add" size={16} color="#fff" />
                              <Text style={styles.addLibraryText}>Add to Library</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      </Animated.View>
                    );
                  }}
                />
              )}
            </View>
          )}
        </View>
      )}
      <Toast />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 10 },
  
  // Header
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  title: { fontSize: 28, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  subtitle: { fontSize: 13, color: '#a78bfa', marginTop: 2 },
  headerActions: { flexDirection: 'row', gap: 8 },
  headerBtn: { 
    width: 38, height: 38, borderRadius: 12, 
    backgroundColor: 'rgba(255,255,255,0.1)', 
    justifyContent: 'center', alignItems: 'center',
  },

  // Quick Stats
  quickStatsRow: { marginBottom: 12, paddingLeft: 16 },
  quickStatCard: { 
    width: 75, height: 65, borderRadius: 14, 
    padding: 8, marginRight: 10, alignItems: 'center', justifyContent: 'center',
  },
  quickStatNumber: { fontSize: 22, fontWeight: '800' },
  quickStatLabel: { fontSize: 10, color: '#888', marginTop: 2, fontWeight: '600' },

  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  searchInput: { flex: 1, color: '#fff', fontSize: 14 },

  // Filter Row
  filterRow: { marginBottom: 8 },
  genreScroll: { paddingHorizontal: 16 },
  genreChip: { 
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8, 
    paddingHorizontal: 14, 
    borderRadius: 20, 
    marginRight: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  genreChipActive: { backgroundColor: '#8b5cf6' },
  genreChipText: { fontSize: 13, fontWeight: '600', color: '#a78bfa' },
  genreChipTextActive: { color: '#fff' },

  // View Toggle
  viewToggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  viewToggle: { 
    flexDirection: 'row', 
    backgroundColor: 'rgba(255,255,255,0.08)', 
    borderRadius: 10, 
    padding: 3,
  },
  viewBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  viewBtnActive: { backgroundColor: '#8b5cf6' },
  resultsText: { color: '#888', fontSize: 12 },

  // Recent Section
  recentSection: { paddingHorizontal: 20, marginBottom: 12 },
  sectionTitle: { color: '#888', fontSize: 13, fontWeight: '600', marginBottom: 10 },
  recentChip: { alignItems: 'center', marginRight: 16 },
  recentAvatar: { width: 50, height: 50, borderRadius: 25, marginBottom: 4 },
  recentName: { color: '#fff', fontSize: 11, fontWeight: '600', maxWidth: 60, textAlign: 'center' },

  // List Content
  listContent: { paddingHorizontal: 16, paddingBottom: 100 },
  gridRow: { justifyContent: 'space-between' },

  // Grid Card
  gridCardWrapper: { width: (width - 48) / 2, marginBottom: 12 },
  gridCard: { 
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    position: 'relative',
  },
  gridAvatar: { width: 64, height: 64, borderRadius: 32, marginBottom: 10 },
  gridName: { color: '#fff', fontSize: 14, fontWeight: '700', textAlign: 'center', marginBottom: 4 },
  gridGenre: { color: '#888', fontSize: 11 },
  badgeContainer: { 
    position: 'absolute', 
    top: 8, 
    left: 8, 
    flexDirection: 'row', 
    gap: 2 
  },
  cardBadge: { fontSize: 14 },
  gridFavoriteBtn: { 
    position: 'absolute', 
    top: 8, 
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // List Card
  listCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
  listAvatar: { width: 50, height: 50, borderRadius: 25, marginRight: 12 },
  listInfo: { flex: 1 },
  listName: { color: '#fff', fontSize: 15, fontWeight: '700' },
  listGenre: { color: '#888', fontSize: 12 },
  listActions: { flexDirection: 'row', gap: 8 },
  actionBtn: { 
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center', alignItems: 'center',
  },

  // Compact Card
  compactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 6,
  },
  compactAvatar: { width: 36, height: 36, borderRadius: 18, marginRight: 10 },
  compactName: { color: '#fff', fontSize: 14, fontWeight: '600', flex: 1 },
  compactGenre: { color: '#888', fontSize: 11 },
  favoriteBtn: { padding: 6 },

  // Common
  authorNameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  badge: { fontSize: 12 },
  genreTag: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 4,
    backgroundColor: 'rgba(139,92,246,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 4,
  },

  // Pagination
  pagerRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  pagerButton: { 
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8, 
    paddingHorizontal: 12, 
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  pagerButtonDisabled: { backgroundColor: 'rgba(255,255,255,0.03)' },
  pagerText: { fontSize: 14, fontWeight: '600', color: '#a78bfa' },
  pagerTextDisabled: { color: '#444' },
  pagerInfo: { fontSize: 14, color: '#888', fontWeight: '600' },

  // Empty State
  emptyContainer: { alignItems: 'center', padding: 40 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  emptySubtext: { color: '#888', fontSize: 13, marginTop: 4 },

  // Modals
  modalOverlay: { flex: 1, justifyContent: 'center', padding: 20 },
  modalHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 20 
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },

  // Sort Modal
  sortModal: {
    backgroundColor: 'rgba(26, 26, 46, 0.98)',
    borderRadius: 20,
    padding: 20,
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  sortOptionActive: { backgroundColor: 'rgba(139,92,246,0.2)' },
  sortOptionText: { flex: 1, color: '#888', fontSize: 15, fontWeight: '500' },
  sortOptionTextActive: { color: '#fff' },

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
  topGenreBox: {
    backgroundColor: 'rgba(245,158,11,0.15)',
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  topGenreLabel: { fontSize: 13, color: '#f59e0b', fontWeight: '600' },
  topGenreName: { fontSize: 18, fontWeight: '800', color: '#fff', marginTop: 4 },
  topGenreCount: { fontSize: 12, color: '#888', marginTop: 2 },
  legendSection: { marginTop: 8 },
  legendTitle: { color: '#888', fontSize: 13, fontWeight: '600', marginBottom: 10 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  legendBadge: { fontSize: 18 },
  legendText: { color: '#fff', fontSize: 14 },

  // Author Modal
  authorModal: {
    backgroundColor: 'rgba(26, 26, 46, 0.98)',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
  },
  authorModalAvatar: { width: 80, height: 80, borderRadius: 40, marginBottom: 12 },
  authorModalName: { fontSize: 20, fontWeight: '800', color: '#fff', marginBottom: 8, textAlign: 'center' },
  authorModalGenreTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(139,92,246,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 20,
  },
  authorModalGenre: { color: '#a78bfa', fontSize: 13, fontWeight: '600' },
  authorModalActions: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  authorModalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  authorModalBtnSecondary: { backgroundColor: 'rgba(255,255,255,0.1)' },
  authorModalBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  authorModalLinks: { flexDirection: 'row', gap: 24 },
  authorModalLink: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  authorModalLinkText: { color: '#888', fontSize: 13 },

  // Books View
  booksHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  backText: { color: '#a78bfa', fontSize: 16, fontWeight: '600' },
  booksHeaderRight: { flexDirection: 'row', gap: 8 },
  headerActionBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center', alignItems: 'center',
  },

  authorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'rgba(139,92,246,0.1)',
    marginHorizontal: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  authorBannerAvatar: { width: 60, height: 60, borderRadius: 30, marginRight: 14 },
  authorBannerInfo: { flex: 1 },
  authorBannerName: { fontSize: 20, fontWeight: '800', color: '#fff' },
  authorBannerBooks: { fontSize: 13, color: '#a78bfa', marginTop: 2 },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#a78bfa', marginTop: 12, fontSize: 14 },

  bookSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
    gap: 8,
  },
  bookSearchInput: { flex: 1, color: '#fff', fontSize: 14 },

  // Book Card
  bookCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },
  bookImage: { 
    width: 70, 
    height: 105, 
    borderRadius: 8, 
    marginRight: 12,
    backgroundColor: '#2d1b4e',
  },
  bookContent: { flex: 1, justifyContent: 'space-between' },
  bookTitle: { fontSize: 15, fontWeight: '700', color: '#fff', marginBottom: 4 },
  bookAuthor: { fontSize: 13, color: '#888', marginBottom: 4 },
  bookYear: { fontSize: 12, color: '#666' },
  bookPages: { fontSize: 12, color: '#666', marginBottom: 8 },
  addLibraryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  addLibraryText: { color: '#fff', fontSize: 12, fontWeight: '600' },
});






















