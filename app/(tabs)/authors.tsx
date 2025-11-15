import { useIsFocused } from '@react-navigation/native';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import Toast from 'react-native-toast-message';
import { ThemedText } from '../../components/themed-text';
import { ThemedView } from '../../components/themed-view';
import { useThemeColor } from '../../hooks/use-theme-color';
import { consumeRequestedAuthor } from '../../lib/authorNav';
import { supabase } from '../../supabase';

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

export default function AuthorsScreen() {
  const [selectedAuthor, setSelectedAuthor] = useState<string | null>(null);
  const [books, setBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [startIndex, setStartIndex] = useState(0);
  const [totalItems, setTotalItems] = useState<number | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const isFocused = useIsFocused();
  const tintColor = useThemeColor({}, 'tint');
  const cardBg = useThemeColor({ light: '#ffffff', dark: '#1b1b1b' }, 'background');
  const mutedText = useThemeColor({ light: '#6b7280', dark: '#9ba1a6' }, 'text');
  const textColor = useThemeColor({}, 'text');
  const AUTHORS_PER_PAGE = 30;
  const [authorPage, setAuthorPage] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('All');
  const [bookSearchQuery, setBookSearchQuery] = useState('');
  useEffect(() => {
    setAuthorPage(0);
  }, [searchQuery]);
  const filteredAuthors = AUTHORS_LIST.filter(a => {
    const matchesSearch = !searchQuery.trim() || a.name.toLowerCase().includes(searchQuery.trim().toLowerCase());
    const matchesGenre = selectedGenre === 'All' || a.genre === selectedGenre;
    return matchesSearch && matchesGenre;
  });

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
    const navAuthor = consumeRequestedAuthor();
    if (navAuthor && navAuthor !== selectedAuthor) {
      fetchBooks(navAuthor, false);
    }
  }, [isFocused, selectedAuthor]);

  const fetchBooks = async (author: string, append = false) => {
    if (!append) {
      setStartIndex(0);
      setTotalItems(null);
      setBooks([]);
      setBookSearchQuery('');
      setLoading(true);
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

  return (
    <ThemedView style={styles.container}>
      {!selectedAuthor ? (
        <>
          <ThemedText type="title" style={styles.header}>Top Authors</ThemedText>

          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search authors"
            placeholderTextColor={mutedText}
            style={[styles.searchInput, { backgroundColor: cardBg, color: textColor }]}
            returnKeyType="search"
          />

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.genreScroll}>
            {genres.map(g => (
              <TouchableOpacity
                key={g}
                onPress={() => { setSelectedGenre(g); setAuthorPage(0); }}
                style={[
                  styles.genreChip,
                  selectedGenre === g ? { backgroundColor: tintColor, borderColor: tintColor } : { backgroundColor: cardBg, borderColor: 'transparent' }
                ]}
              >
                <ThemedText style={[styles.genreChipText, { color: selectedGenre === g ? 'black' : textColor }]}>{g}</ThemedText>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <FlatList
            data={paginatedAuthors}
            keyExtractor={(item) => item.name}
            numColumns={2}
            columnWrapperStyle={styles.column}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => {
              const avatarUri = `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name)}&background=0D9488&color=fff&size=128&rounded=true`;
              return (
                <TouchableOpacity
                  style={[styles.authorCard, { backgroundColor: cardBg }]}
                  onPress={() => fetchBooks(item.name)}
                  activeOpacity={0.8}
                >
                  <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
                  <View style={{ flex: 1 }}>
                    <ThemedText type="defaultSemiBold" style={styles.authorName}>{item.name}</ThemedText>
                    <ThemedText style={{ fontSize: 12, color: mutedText }}>{item.genre}</ThemedText>
                  </View>
                </TouchableOpacity>
              );
            }}
          />
          {filteredAuthors.length === 0 ? (
            <ThemedText style={{ textAlign: 'center', marginTop: 12 }}>No authors found</ThemedText>
          ) : null}
          <View style={styles.pagerRow}>
            <TouchableOpacity
              onPress={() => setAuthorPage(p => Math.max(0, p - 1))}
              style={[styles.pagerButton, authorPage === 0 && styles.pagerButtonDisabled]}
              disabled={authorPage === 0}
            >
              <ThemedText style={styles.pagerText}>{'‹ Prev'}</ThemedText>
            </TouchableOpacity>

            <ThemedText style={styles.pagerInfo}>{`Page ${authorPage + 1} of ${totalAuthorPages}`}</ThemedText>

            <TouchableOpacity
              onPress={() => setAuthorPage(p => Math.min(totalAuthorPages - 1, p + 1))}
              style={[styles.pagerButton, authorPage >= totalAuthorPages - 1 && styles.pagerButtonDisabled]}
              disabled={authorPage >= totalAuthorPages - 1}
            >
              <ThemedText style={styles.pagerText}>{'Next ›'}</ThemedText>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <View style={{ flex: 1 }}>
          <TouchableOpacity onPress={() => { setSelectedAuthor(null); setBooks([]); setBookSearchQuery(''); }}>
            <ThemedText style={[styles.backText, { color: tintColor }]}>{'< Back to Authors'}</ThemedText>
          </TouchableOpacity>
          <ThemedText type="subtitle" style={[styles.headerSmall, { color: tintColor }]}>{selectedAuthor}'s Best Books</ThemedText>

          {loading && books.length === 0 ? (
            <ActivityIndicator style={{ marginTop: 24 }} size="large" color={tintColor} />
          ) : (
            <View>
              <TextInput
                value={bookSearchQuery}
                onChangeText={setBookSearchQuery}
                placeholder="Search books by title"
                placeholderTextColor={mutedText}
                style={[styles.searchInput, { backgroundColor: cardBg, color: textColor, marginHorizontal: 0 }]}
                returnKeyType="search"
              />

              {filteredBooks.length === 0 ? (
                <ThemedText style={{ textAlign: 'center', marginTop: 12 }}>No books found</ThemedText>
              ) : (
                <FlatList
                  data={filteredBooks}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingBottom: 24 }}
              onEndReachedThreshold={0.6}
              onEndReached={() => {
                if (!loadingMore && totalItems !== null && startIndex < totalItems) {
                  fetchBooks(selectedAuthor as string, true);
                }
              }}
              ListFooterComponent={() => loadingMore ? <ActivityIndicator style={{ margin: 12 }} color={tintColor} /> : null}
              renderItem={({ item }) => {
                const vol = item.volumeInfo || {};
                const thumb = vol.imageLinks?.thumbnail || `https://ui-avatars.com/api/?name=${encodeURIComponent((vol.authors && vol.authors[0]) || selectedAuthor || 'Author')}&background=cccccc&color=333&size=128`;
                return (
                  <View style={[styles.bookCard, { backgroundColor: cardBg }]}> 
                    <Image source={{ uri: thumb }} style={styles.bookImage} />
                    <View style={styles.bookContent}>
                      <ThemedText style={styles.bookTitle}>{vol.title || 'Untitled'}</ThemedText>
                      <ThemedText style={[styles.bookAuthor, { color: mutedText }]}>{(vol.authors && vol.authors.join(', ')) || selectedAuthor}</ThemedText>
                      {vol.publishedDate ? <ThemedText style={styles.published}>{vol.publishedDate}</ThemedText> : null}
                      <TouchableOpacity onPress={() => addToLibrary(item)} style={[styles.addBtn, { backgroundColor: tintColor }]}> 
                        <ThemedText style={styles.addBtnText}>Add to library</ThemedText>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              }}
                />
              )}
            </View>
          )}
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  header: { textAlign: 'center', marginBottom: 16, fontSize: 28 },
  headerSmall: { fontSize: 22, marginBottom: 12 },
  listContent: { paddingBottom: 24 },
  column: { justifyContent: 'space-between', marginBottom: 12 },
  authorCard: { flex: 1, margin: 6, padding: 14, borderRadius: 12, flexDirection: 'row', alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6 },
  avatar: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarImage: { width: 48, height: 48, borderRadius: 24, marginRight: 12, backgroundColor: '#e5e7eb' },
  avatarText: { color: '#fff', fontWeight: '700' },
  authorName: { flex: 1, fontSize: 16 },
  backText: { marginBottom: 12, fontSize: 16 },
  bookCard: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, marginBottom: 14, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6 },
  bookImage: { width: 64, height: 96, borderRadius: 8, marginRight: 12, backgroundColor: '#f3f4f6' },
  bookContent: { flex: 1 },
  bookTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  bookAuthor: { fontSize: 14, marginBottom: 6 },
  published: { fontSize: 13, marginBottom: 8 },
  addBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, alignSelf: 'flex-start' },
  addBtnText: { color: 'black', fontWeight: '700' },
  pagerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingHorizontal: 6 },
  pagerButton: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 },
  pagerButtonDisabled: { opacity: 0.35 },
  pagerText: { fontSize: 14, fontWeight: '700' },
  pagerInfo: { fontSize: 14 },
  searchInput: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 16, marginBottom: 10 },
  genreScroll: { paddingVertical: 6 , height: 80 },
  genreChip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 18, marginRight: 8, borderWidth: 1, marginBottom: 6, height: 40, justifyContent: 'center', alignItems: 'center' },
  genreChipText: { fontSize: 14, fontWeight: '600' },
});






















