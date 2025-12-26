import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Vibration,
} from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeInUp, ZoomIn, SlideInRight, Layout } from 'react-native-reanimated';
import VerifyPhoneModal from '../../components/verify-phone/VerifyPhoneModal';
import { supabase } from '../../supabase';

const { width } = Dimensions.get('window');

// Achievement badges
const ACHIEVEMENTS = [
  { id: 'bookworm', icon: '📚', title: 'Bookworm', description: 'Added 10+ books', requirement: (books: number) => books >= 10 },
  { id: 'collector', icon: '🏆', title: 'Collector', description: 'Added 25+ books', requirement: (books: number) => books >= 25 },
  { id: 'librarian', icon: '📖', title: 'Librarian', description: 'Added 50+ books', requirement: (books: number) => books >= 50 },
  { id: 'organizer', icon: '🗂️', title: 'Organizer', description: 'Created 5+ categories', requirement: (_: number, cats: number) => cats >= 5 },
  { id: 'veteran', icon: '⭐', title: 'Veteran', description: '30+ days member', requirement: (_: number, __: number, days: number) => days >= 30 },
  { id: 'pioneer', icon: '🚀', title: 'Pioneer', description: 'Early adopter', requirement: () => true },
];

type Book = {
  id: string;
  title: string;
  author: string;
  description: string;
  user_id: string;
  category_id?: string;
};

type Category = {
  id: string;
  name: string;
  user_id: string;
};

// Quick action items
const QUICK_ACTIONS = [
  { id: 'discover', icon: 'compass', label: 'Discover', color: '#8b5cf6', route: '/(tabs)/discover' },
  { id: 'favorites', icon: 'heart', label: 'Favorites', color: '#ef4444', route: '/(tabs)/favorites' },
  { id: 'recommend', icon: 'sparkles', label: 'For You', color: '#f59e0b', route: '/(tabs)/recommend' },
  { id: 'progress', icon: 'analytics', label: 'Progress', color: '#10b981', route: '/(tabs)/reading-progress' },
];

export default function ProfileScreen() {
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [booksOpen, setBooksOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [emailHidden, setEmailHidden] = useState(true);
  const [phone, setPhone] = useState('');
  const [phoneHidden, setPhoneHidden] = useState(true);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  // New states for enhanced features
  const [showAchievements, setShowAchievements] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [searchBooks, setSearchBooks] = useState('');
  const [searchCategories, setSearchCategories] = useState('');
  const [selectedTheme, setSelectedTheme] = useState('purple');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  // Calculate member days
  const memberDays = useMemo(() => {
    if (!user?.created_at) return 0;
    const created = new Date(user.created_at);
    const now = new Date();
    return Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
  }, [user?.created_at]);

  // Calculate earned achievements
  const earnedAchievements = useMemo(() => {
    return ACHIEVEMENTS.filter(a => a.requirement(books.length, categories.length, memberDays));
  }, [books.length, categories.length, memberDays]);

  // Profile stats
  const stats = useMemo(() => {
    const uniqueAuthors = new Set(books.map(b => b.author)).size;
    const avgBooksPerCategory = categories.length > 0 
      ? Math.round(books.filter(b => b.category_id).length / categories.length * 10) / 10 
      : 0;
    const topCategory = categories.reduce((acc, cat) => {
      const count = books.filter(b => b.category_id === cat.id).length;
      return count > acc.count ? { name: cat.name, count } : acc;
    }, { name: 'None', count: 0 });
    
    return {
      totalBooks: books.length,
      totalCategories: categories.length,
      totalFavorites: favorites.length,
      uniqueAuthors,
      avgBooksPerCategory,
      topCategory: topCategory.name,
      topCategoryCount: topCategory.count,
      memberDays,
      achievementsEarned: earnedAchievements.length,
      achievementsTotal: ACHIEVEMENTS.length,
    };
  }, [books, categories, favorites, memberDays, earnedAchievements]);

  // Filtered books/categories
  const filteredBooks = useMemo(() => {
    if (!searchBooks.trim()) return books;
    const q = searchBooks.toLowerCase();
    return books.filter(b => 
      b.title.toLowerCase().includes(q) || 
      b.author.toLowerCase().includes(q)
    );
  }, [books, searchBooks]);

  const filteredCategories = useMemo(() => {
    if (!searchCategories.trim()) return categories;
    const q = searchCategories.toLowerCase();
    return categories.filter(c => c.name.toLowerCase().includes(q));
  }, [categories, searchCategories]);

  // Share profile
  const handleShareProfile = useCallback(async () => {
    Vibration.vibrate(30);
    try {
      await Share.share({
        message: `📚 Check out my reading profile!\n\n` +
          `📖 ${books.length} Books in Library\n` +
          `❤️ ${favorites.length} Favorites\n` +
          `🏆 ${earnedAchievements.length} Achievements Earned\n` +
          `📅 Member for ${memberDays} days\n\n` +
          `Join me on the reading journey!`,
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  }, [books.length, favorites.length, earnedAchievements.length, memberDays]);

  // Copy user ID
  const handleCopyUserId = useCallback(async () => {
    if (!user?.id) return;
    await Clipboard.setStringAsync(user.id);
    Vibration.vibrate(30);
    Alert.alert('Copied!', 'User ID copied to clipboard');
  }, [user?.id]);

  const computeFullName = (meta: any) => {
    if (!meta) return '';
    const fn = typeof meta.full_name === 'string' && meta.full_name.trim();
    if (fn) return fn;
    const parts = [meta.first_name, meta.last_name].filter(Boolean).map((s: string) => (s || '').trim());
    return parts.join(' ').trim();
  };

  const maskEmail = (e: string) => {
    try {
      const parts = e.split('@');
      if (parts.length !== 2) return '••••••';
      const name = parts[0];
      const domain = parts[1];
      if (name.length <= 2) return `${name[0]}***@${domain}`;
      return `${name.slice(0, 2)}***@${domain}`;
    } catch {
      return '••••••';
    }
  };

  const maskPhone = (p: string) => {
    try {
      const s = (p || '').trim();
      if (!s) return 'Not set';
      const digits = s.replace(/\D/g, '');
      if (digits.length <= 3) return '***';
      const visible = digits.slice(-3);
      return `${'*'.repeat(Math.max(0, digits.length - 3))}${visible}`;
    } catch {
      return '••••••';
    }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data: { user: u }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        setUser(u || null);

        if (u) {
          setEmail(u.email || '');
          setFullName(computeFullName(u.user_metadata) || '');
          setPhone(u.user_metadata?.phone ?? u.user_metadata?.phone_number ?? '');
          setPhoneVerified(Boolean(u.user_metadata?.phone_verified));
          setEmailVerified(Boolean(u.user_metadata?.email_verified) || Boolean((u as any)?.confirmed_at) || Boolean((u as any)?.email_confirmed_at));

          const { data: booksData, error: booksError } = await supabase
            .from('books')
            .select('*')
            .eq('user_id', u.id);
          if (booksError) throw booksError;
          setBooks(booksData || []);

          const { data: categoriesData, error: categoriesError } = await supabase
            .from('categories')
            .select('*')
            .eq('user_id', u.id);
          if (categoriesError) throw categoriesError;
          setCategories(categoriesData || []);

          // Fetch favorites count
          const { data: favoritesData } = await supabase
            .from('favorites')
            .select('*')
            .eq('user_id', u.id);
          setFavorites(favoritesData || []);
        }
      } catch (err: any) {
        Alert.alert('Error', err.message || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleUpdateProfile = async () => {
    if (!user) return;
    setLoading(true);
    try {
      let hasChanges = false;

      const updates: { 
        email?: string; 
        password?: string;
        data?: Record<string, any>;
      } = {};
        
      if (email !== user.email) {
        updates.email = email;
        hasChanges = true;
      }
        
      if (newPassword) {
        if (newPassword !== confirmPassword) {
          Alert.alert('Password Mismatch', 'New password and confirm password do not match.');
          setLoading(false);
          return;
        }
        updates.password = newPassword;
        hasChanges = true;
      }

      const currentFull = computeFullName(user.user_metadata);

      const metaUpdates: Record<string, any> = {};

      if ((fullName || '') !== (currentFull || '')) {
        const nameParts = (fullName || '').trim().split(/\s+/).filter(Boolean);
        const first = nameParts.length > 0 ? nameParts[0] : '';
        const last = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
        metaUpdates.full_name = fullName || '';
        metaUpdates.first_name = first;
        metaUpdates.last_name = last;
        hasChanges = true;
      }

      const currentPhone = user.user_metadata?.phone ?? user.user_metadata?.phone_number ?? '';
      if ((phone || '').trim() !== (currentPhone || '').trim()) {
        metaUpdates.phone = (phone || '').trim() || null;
        metaUpdates.phone_verified = false;
        hasChanges = true;
        setPhoneVerified(false);
      }

      if (Object.keys(metaUpdates).length > 0) {
        updates.data = metaUpdates;
      }

      if (hasChanges) {
        const { error: updateUserError } = await supabase.auth.updateUser(updates);
        if (updateUserError) throw updateUserError;
      }

      if (hasChanges) {
        Alert.alert(
          'Success', 
          email !== user.email 
            ? 'Profile updated successfully. Please check your email to confirm the email change.'
            : 'Profile updated successfully'
        );
      }
      
      setEditMode(false);
      setPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            router.replace('/auth');
          } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to sign out');
          }
        },
      },
    ]);
  };

  const handleDeleteBook = async (id: string) => {
    if (!user) return router.replace('/auth');

    Alert.alert('Delete Book', 'This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setLoading(true);
          try {
            const { error } = await supabase
              .from('books')
              .delete()
              .eq('id', id)
              .eq('user_id', user.id);
            if (error) throw error;

            setBooks(prev => prev.filter(b => b.id !== id));
            Alert.alert('Deleted', 'Book removed from your library.');
          } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to delete book');
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  const handleDeleteCategory = async (id: string) => {
    if (!user) return router.replace('/auth');

    const { data: booksUsing, error } = await supabase
      .from('books')
      .select('id')
      .eq('category_id', id)
      .eq('user_id', user.id);

    if (error || (booksUsing && booksUsing.length > 0)) {
      Alert.alert('Cannot Delete', 'This category is used by one or more books.');
      return;
    }

    Alert.alert('Delete Category', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setLoading(true);
          try {
            const { error } = await supabase
              .from('categories')
              .delete()
              .eq('id', id)
              .eq('user_id', user.id);
            if (error) throw error;

            setCategories(prev => prev.filter(c => c.id !== id));
            Alert.alert('Deleted', 'Category removed.');
          } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to delete category');
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  if (loading && !user) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <LinearGradient colors={['#2a0845', '#0f002b']} style={StyleSheet.absoluteFillObject} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#8b5cf6" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <LinearGradient colors={['#2a0845', '#0f002b']} style={StyleSheet.absoluteFillObject} />
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>Not Signed In</Text>
          <Text style={styles.emptySubtitle}>Please sign in to view your profile.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient colors={['#0f0f23', '#1a1a2e', '#16213e']} style={StyleSheet.absoluteFillObject} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          {/* Header with Actions */}
          <Animated.View entering={FadeInDown.duration(500)} style={styles.header}>
            <View>
              <Text style={styles.title}>My Profile</Text>
              <Text style={styles.subtitle}>Manage your account and library</Text>
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
                onPress={() => { setShowAchievements(true); Vibration.vibrate(30); }}
              >
                <Ionicons name="trophy" size={20} color="#f59e0b" />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.headerBtn} 
                onPress={handleShareProfile}
              >
                <Ionicons name="share-social" size={20} color="#3b82f6" />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.headerBtn} 
                onPress={() => { setShowSettings(true); Vibration.vibrate(30); }}
              >
                <Ionicons name="settings" size={20} color="#10b981" />
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* Quick Stats Row */}
          <Animated.View entering={FadeInUp.delay(100).duration(500)}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickStatsRow}>
              <TouchableOpacity style={[styles.quickStatCard, { backgroundColor: 'rgba(139,92,246,0.15)' }]} onPress={() => setShowStats(true)}>
                <Text style={[styles.quickStatNumber, { color: '#a78bfa' }]}>{stats.totalBooks}</Text>
                <Text style={styles.quickStatLabel}>Books</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.quickStatCard, { backgroundColor: 'rgba(239,68,68,0.15)' }]} onPress={() => router.push('/(tabs)/favorites')}>
                <Text style={[styles.quickStatNumber, { color: '#ef4444' }]}>{stats.totalFavorites}</Text>
                <Text style={styles.quickStatLabel}>Favorites</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.quickStatCard, { backgroundColor: 'rgba(16,185,129,0.15)' }]}>
                <Text style={[styles.quickStatNumber, { color: '#10b981' }]}>{stats.uniqueAuthors}</Text>
                <Text style={styles.quickStatLabel}>Authors</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.quickStatCard, { backgroundColor: 'rgba(245,158,11,0.15)' }]} onPress={() => setShowAchievements(true)}>
                <Text style={[styles.quickStatNumber, { color: '#f59e0b' }]}>{earnedAchievements.length}</Text>
                <Text style={styles.quickStatLabel}>Badges</Text>
              </TouchableOpacity>
              <View style={[styles.quickStatCard, { backgroundColor: 'rgba(59,130,246,0.15)' }]}>
                <Text style={[styles.quickStatNumber, { color: '#3b82f6' }]}>{memberDays}</Text>
                <Text style={styles.quickStatLabel}>Days</Text>
              </View>
            </ScrollView>
          </Animated.View>

          {/* Profile Card */}
          <Animated.View entering={FadeInDown.delay(150).duration(600)} style={styles.card}>
            <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFillObject} />

            {/* Avatar with Badge Count */}
            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {fullName?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'}
                </Text>
              </View>
              {earnedAchievements.length > 0 && (
                <View style={styles.badgeCount}>
                  <Text style={styles.badgeCountText}>{earnedAchievements.length}</Text>
                </View>
              )}
            </View>

            {/* User Info */}
            <Text style={styles.profileName}>{fullName || 'Reader'}</Text>
            <Text style={styles.profileMemberSince}>
              Member since {new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </Text>

            {/* Achievement Badges Preview */}
            {earnedAchievements.length > 0 && (
              <TouchableOpacity style={styles.badgesPreview} onPress={() => setShowAchievements(true)}>
                <View style={styles.badgesRow}>
                  {earnedAchievements.slice(0, 4).map((badge, i) => (
                    <Animated.View key={badge.id} entering={ZoomIn.delay(i * 100)} style={styles.badgePreviewItem}>
                      <Text style={styles.badgeEmoji}>{badge.icon}</Text>
                    </Animated.View>
                  ))}
                  {earnedAchievements.length > 4 && (
                    <View style={styles.badgePreviewMore}>
                      <Text style={styles.badgeMoreText}>+{earnedAchievements.length - 4}</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            )}

            <View style={styles.divider} />

            {/* Info Rows */}
            <View style={styles.infoRow}>
              <View style={styles.infoIconLabel}>
                <Ionicons name="person" size={16} color="#8b5cf6" />
                <Text style={styles.label}>Full Name</Text>
              </View>
              <Text style={styles.value}>{fullName || 'Not set'}</Text>
            </View>

              <View style={styles.infoRow}>
                <View style={styles.infoIconLabel}>
                  <Ionicons name="mail" size={16} color="#8b5cf6" />
                  <Text style={styles.label}>Email</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <Text style={[styles.value, { flex: 1 }]} numberOfLines={1} ellipsizeMode="middle">
                      {emailHidden ? maskEmail(email) : email}
                    </Text>
                    <TouchableOpacity onPress={() => setEmailHidden(h => !h)} style={{ marginLeft: 10 }} accessibilityLabel={emailHidden ? 'Show email' : 'Hide email'}>
                      <Ionicons name={emailHidden ? 'eye-off' : 'eye'} size={20} color="#b794f4" />
                    </TouchableOpacity>
                  </View>

                  {email ? (
                    <TouchableOpacity
                      onPress={async () => {
                        try {
                          const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: 'myapp://auth-callback' } });
                          if (error) throw error;
                          Alert.alert('Check your email', 'A verification / sign-in link was sent to your email.');
                        } catch (e: any) {
                          Alert.alert('Error', e?.message || 'Failed to send verification email');
                        }
                      }}
                      style={[styles.verifyBadge, emailVerified && styles.verifyBadgeVerified]}
                    >
                      <Text style={styles.verifyBadgeText}>{emailVerified ? '✓ Verified' : 'Verify'}</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>

              <View style={styles.infoRow}>
                <View style={styles.infoIconLabel}>
                  <Ionicons name="call" size={16} color="#8b5cf6" />
                  <Text style={styles.label}>Phone</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <Text style={[styles.value, { flex: 1 }]} numberOfLines={1} ellipsizeMode="middle">
                      {phone ? (phoneHidden ? maskPhone(phone) : phone) : 'Not set'}
                    </Text>
                    {phone ? (
                      <TouchableOpacity onPress={() => setPhoneHidden(h => !h)} style={{ marginLeft: 10 }} accessibilityLabel={phoneHidden ? 'Show phone' : 'Hide phone'}>
                        <Ionicons name={phoneHidden ? 'eye-off' : 'eye'} size={20} color="#b794f4" />
                      </TouchableOpacity>
                    ) : null}
                  </View>

                  {phone ? (
                    <TouchableOpacity
                      onPress={() => setVerifyModalOpen(true)}
                      style={[styles.verifyBadge, phoneVerified && styles.verifyBadgeVerified]}
                    >
                      <Text style={styles.verifyBadgeText}>{phoneVerified ? '✓ Verified' : 'Verify'}</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>

              {/* Quick Actions */}
              <View style={styles.quickActionsContainer}>
                <Text style={styles.quickActionsTitle}>Quick Actions</Text>
                <View style={styles.quickActionsGrid}>
                  {QUICK_ACTIONS.map((action, i) => (
                    <Animated.View key={action.id} entering={SlideInRight.delay(i * 50)}>
                      <TouchableOpacity 
                        style={[styles.quickActionBtn, { backgroundColor: `${action.color}20` }]}
                        onPress={() => { router.push(action.route as any); Vibration.vibrate(30); }}
                      >
                        <Ionicons name={action.icon as any} size={20} color={action.color} />
                        <Text style={[styles.quickActionLabel, { color: action.color }]}>{action.label}</Text>
                      </TouchableOpacity>
                    </Animated.View>
                  ))}
                </View>
              </View>

              <View style={styles.buttonRow}>
                <TouchableOpacity 
                  style={[styles.button, styles.editButton]} 
                  onPress={() => setEditMode(true)}
                >
                  <Ionicons name="pencil" size={16} color="#fff" style={{ marginRight: 6 }} />
                  <Text style={styles.buttonText}>Edit Profile</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.button, styles.signOutButton]} onPress={handleSignOut}>
                  <Ionicons name="log-out" size={16} color="#fff" style={{ marginRight: 6 }} />
                  <Text style={styles.buttonText}>Sign Out</Text>
                </TouchableOpacity>
              </View>
          </Animated.View>

          <Modal visible={editMode} transparent animationType="slide">
            <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill}>
              <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, justifyContent: 'center', padding: 20 }}>
                <View style={styles.editModalCard}>
                  <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 12 }}>Edit Profile</Text>

                  <View style={{ marginBottom: 12 }}>
                    <Text style={styles.label}>Full Name</Text>
                    <TextInput
                      style={styles.input}
                      value={fullName}
                      onChangeText={setFullName}
                      placeholder="Enter your full name"
                      placeholderTextColor="#8b5cf680"
                    />
                  </View>

                  <View style={{ marginBottom: 12 }}>
                    <Text style={styles.label}>Email</Text>
                    <TextInput
                      style={styles.input}
                      value={email}
                      onChangeText={setEmail}
                      placeholder="Enter your email"
                      placeholderTextColor="#8b5cf680"
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>

                  <View style={{ marginBottom: 12 }}>
                    <Text style={styles.label}>Phone</Text>
                    <TextInput
                      style={styles.input}
                      value={phone}
                      onChangeText={setPhone}
                      placeholder="Phone (optional)"
                      placeholderTextColor="#8b5cf680"
                      keyboardType="phone-pad"
                    />
                  </View>

                  <View style={{ marginBottom: 12 }}>
                    <Text style={styles.label}>New Password</Text>
                    <TextInput
                      style={styles.input}
                      value={newPassword}
                      onChangeText={setNewPassword}
                      placeholder="Enter new password"
                      placeholderTextColor="#8b5cf680"
                      secureTextEntry
                    />
                  </View>

                  <View style={{ marginBottom: 12 }}>
                    <Text style={styles.label}>Confirm Password</Text>
                    <TextInput
                      style={styles.input}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      placeholder="Confirm new password"
                      placeholderTextColor="#8b5cf680"
                      secureTextEntry
                    />
                  </View>

                  <View style={styles.buttonRow}>
                    <TouchableOpacity
                      style={[styles.button, styles.cancelButton]}
                      onPress={() => {
                        setEditMode(false);
                        setNewPassword('');
                        setConfirmPassword('');
                        setEmail(user.email || '');
                        setFullName(computeFullName(user.user_metadata) || '');
                        setPhone(user.user_metadata?.phone ?? user.user_metadata?.phone_number ?? '');
                      }}
                    >
                      <Text style={styles.buttonText}>Cancel</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.button, styles.saveButton]}
                      onPress={handleUpdateProfile}
                      disabled={loading}
                    >
                      {loading ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <Text style={styles.buttonText}>Save Changes</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </KeyboardAvoidingView>
            </BlurView>
          </Modal>

          <Animated.View entering={FadeInDown.delay(200).duration(600)}>
            <TouchableOpacity
              style={styles.sectionHeader}
              onPress={() => setBooksOpen((open) => !open)}
              activeOpacity={0.7}
            >
              <View style={styles.sectionHeaderLeft}>
                <View style={styles.sectionIcon}>
                  <Ionicons name="library" size={18} color="#8b5cf6" />
                </View>
                <Text style={styles.sectionHeaderText}>
                  My Books ({books.length})
                </Text>
              </View>
              <Ionicons name={booksOpen ? 'chevron-up' : 'chevron-down'} size={24} color="#8b5cf6" />
            </TouchableOpacity>
            
            {booksOpen && (
              <Animated.View entering={FadeIn.duration(300)}>
                {/* Search Bar for Books */}
                {books.length > 3 && (
                  <View style={styles.sectionSearchContainer}>
                    <Ionicons name="search" size={16} color="#666" />
                    <TextInput
                      style={styles.sectionSearchInput}
                      placeholder="Search books..."
                      placeholderTextColor="#666"
                      value={searchBooks}
                      onChangeText={setSearchBooks}
                    />
                    {searchBooks.length > 0 && (
                      <TouchableOpacity onPress={() => setSearchBooks('')}>
                        <Ionicons name="close-circle" size={16} color="#666" />
                      </TouchableOpacity>
                    )}
                  </View>
                )}
                
                {filteredBooks.length > 0 ? (
                  filteredBooks.map((book, i) => (
                    <Animated.View
                      key={book.id}
                      entering={FadeInDown.delay(i * 30).duration(300)}
                      layout={Layout.springify()}
                      style={styles.itemCard}
                    >
                      <View style={styles.itemIconContainer}>
                        <Ionicons name="book" size={20} color="#8b5cf6" />
                      </View>
                      <View style={styles.itemContent}>
                        <Text style={styles.itemTitle} numberOfLines={1}>
                          {book.title}
                        </Text>
                        <Text style={styles.itemSubtitle}>
                          {book.author}
                        </Text>
                        <View style={styles.itemCategoryTag}>
                          <Ionicons name="folder" size={10} color="#8b5cf6" />
                          <Text style={styles.itemCategory}>
                            {categories.find(c => c.id === book.category_id)?.name || 'Uncategorized'}
                          </Text>
                        </View>
                      </View>
                      <TouchableOpacity
                        style={styles.deleteBtn}
                        onPress={() => handleDeleteBook(book.id)}
                        disabled={loading}
                      >
                        <Ionicons name="trash-outline" size={18} color="#fff" />
                      </TouchableOpacity>
                    </Animated.View>
                  ))
                ) : (
                  <View style={styles.emptySection}>
                    <Text style={styles.emptyEmoji}>📚</Text>
                    <Text style={styles.emptyText}>
                      {searchBooks ? 'No books found' : 'No books in your library.'}
                    </Text>
                  </View>
                )}
              </Animated.View>
            )}
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(250).duration(600)} style={{ marginTop: 16 }}>
            <TouchableOpacity
              style={styles.sectionHeader}
              onPress={() => setCategoriesOpen((open) => !open)}
              activeOpacity={0.7}
            >
              <View style={styles.sectionHeaderLeft}>
                <View style={[styles.sectionIcon, { backgroundColor: 'rgba(16,185,129,0.15)' }]}>
                  <Ionicons name="folder-open" size={18} color="#10b981" />
                </View>
                <Text style={styles.sectionHeaderText}>
                  My Categories ({categories.length})
                </Text>
              </View>
              <Ionicons name={categoriesOpen ? 'chevron-up' : 'chevron-down'} size={24} color="#10b981" />
            </TouchableOpacity>
            
            {categoriesOpen && (
              <Animated.View entering={FadeIn.duration(300)}>
                {/* Search Bar for Categories */}
                {categories.length > 3 && (
                  <View style={styles.sectionSearchContainer}>
                    <Ionicons name="search" size={16} color="#666" />
                    <TextInput
                      style={styles.sectionSearchInput}
                      placeholder="Search categories..."
                      placeholderTextColor="#666"
                      value={searchCategories}
                      onChangeText={setSearchCategories}
                    />
                    {searchCategories.length > 0 && (
                      <TouchableOpacity onPress={() => setSearchCategories('')}>
                        <Ionicons name="close-circle" size={16} color="#666" />
                      </TouchableOpacity>
                    )}
                  </View>
                )}
                
                {filteredCategories.length > 0 ? (
                  filteredCategories.map((cat, i) => {
                    const bookCount = books.filter(b => b.category_id === cat.id).length;
                    return (
                      <Animated.View
                        key={cat.id}
                        entering={FadeInDown.delay(i * 30).duration(300)}
                        layout={Layout.springify()}
                        style={styles.itemCard}
                      >
                        <View style={[styles.itemIconContainer, { backgroundColor: 'rgba(16,185,129,0.15)' }]}>
                          <Ionicons name="folder" size={20} color="#10b981" />
                        </View>
                        <View style={styles.itemContent}>
                          <Text style={styles.itemTitle}>{cat.name}</Text>
                          <Text style={styles.itemSubtitle}>{bookCount} book{bookCount !== 1 ? 's' : ''}</Text>
                        </View>
                        <TouchableOpacity
                          style={[styles.deleteBtn, bookCount > 0 && styles.deleteBtnDisabled]}
                          onPress={() => handleDeleteCategory(cat.id)}
                          disabled={loading || bookCount > 0}
                        >
                          <Ionicons name="trash-outline" size={18} color={bookCount > 0 ? '#666' : '#fff'} />
                        </TouchableOpacity>
                      </Animated.View>
                    );
                  })
                ) : (
                  <View style={styles.emptySection}>
                    <Text style={styles.emptyEmoji}>🗂️</Text>
                    <Text style={styles.emptyText}>
                      {searchCategories ? 'No categories found' : 'No categories created.'}
                    </Text>
                  </View>
                )}
              </Animated.View>
            )}
          </Animated.View>

          {/* Achievements Modal */}
          <Modal visible={showAchievements} transparent animationType="fade">
            <BlurView intensity={100} tint="dark" style={styles.modalOverlay}>
              <Animated.View entering={ZoomIn.duration(300)} style={styles.achievementsModal}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>🏆 Achievements</Text>
                  <TouchableOpacity onPress={() => setShowAchievements(false)}>
                    <Ionicons name="close" size={24} color="#fff" />
                  </TouchableOpacity>
                </View>
                
                <Text style={styles.achievementProgress}>
                  {earnedAchievements.length} / {ACHIEVEMENTS.length} Unlocked
                </Text>
                
                <ScrollView style={styles.achievementsList}>
                  {ACHIEVEMENTS.map((achievement, i) => {
                    const earned = achievement.requirement(books.length, categories.length, memberDays);
                    return (
                      <Animated.View 
                        key={achievement.id} 
                        entering={FadeInDown.delay(i * 50)}
                        style={[styles.achievementCard, !earned && styles.achievementLocked]}
                      >
                        <Text style={styles.achievementIcon}>{achievement.icon}</Text>
                        <View style={styles.achievementInfo}>
                          <Text style={[styles.achievementTitle, !earned && styles.achievementTitleLocked]}>
                            {achievement.title}
                          </Text>
                          <Text style={styles.achievementDesc}>{achievement.description}</Text>
                        </View>
                        {earned ? (
                          <Ionicons name="checkmark-circle" size={24} color="#10b981" />
                        ) : (
                          <Ionicons name="lock-closed" size={20} color="#666" />
                        )}
                      </Animated.View>
                    );
                  })}
                </ScrollView>
              </Animated.View>
            </BlurView>
          </Modal>

          {/* Stats Modal */}
          <Modal visible={showStats} transparent animationType="fade">
            <BlurView intensity={100} tint="dark" style={styles.modalOverlay}>
              <Animated.View entering={ZoomIn.duration(300)} style={styles.statsModal}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>📊 Your Stats</Text>
                  <TouchableOpacity onPress={() => setShowStats(false)}>
                    <Ionicons name="close" size={24} color="#fff" />
                  </TouchableOpacity>
                </View>
                
                <View style={styles.statsGrid}>
                  <View style={styles.statBox}>
                    <Text style={styles.statBoxNumber}>{stats.totalBooks}</Text>
                    <Text style={styles.statBoxLabel}>Total Books</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={styles.statBoxNumber}>{stats.totalFavorites}</Text>
                    <Text style={styles.statBoxLabel}>Favorites</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={styles.statBoxNumber}>{stats.uniqueAuthors}</Text>
                    <Text style={styles.statBoxLabel}>Authors</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={styles.statBoxNumber}>{stats.totalCategories}</Text>
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

                <View style={styles.membershipBox}>
                  <Ionicons name="calendar" size={24} color="#a78bfa" />
                  <View style={{ marginLeft: 12 }}>
                    <Text style={styles.membershipLabel}>Member for</Text>
                    <Text style={styles.membershipDays}>{memberDays} days</Text>
                  </View>
                </View>

                <TouchableOpacity style={styles.copyIdBtn} onPress={handleCopyUserId}>
                  <Ionicons name="copy-outline" size={16} color="#a78bfa" />
                  <Text style={styles.copyIdText}>Copy User ID</Text>
                </TouchableOpacity>
              </Animated.View>
            </BlurView>
          </Modal>

          {/* Settings Modal */}
          <Modal visible={showSettings} transparent animationType="fade">
            <BlurView intensity={100} tint="dark" style={styles.modalOverlay}>
              <Animated.View entering={ZoomIn.duration(300)} style={styles.settingsModal}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>⚙️ Settings</Text>
                  <TouchableOpacity onPress={() => setShowSettings(false)}>
                    <Ionicons name="close" size={24} color="#fff" />
                  </TouchableOpacity>
                </View>
                
                <View style={styles.settingRow}>
                  <View style={styles.settingLeft}>
                    <Ionicons name="notifications" size={20} color="#a78bfa" />
                    <Text style={styles.settingLabel}>Notifications</Text>
                  </View>
                  <TouchableOpacity 
                    style={[styles.settingToggle, notificationsEnabled && styles.settingToggleActive]}
                    onPress={() => { setNotificationsEnabled(!notificationsEnabled); Vibration.vibrate(30); }}
                  >
                    <View style={[styles.settingToggleKnob, notificationsEnabled && styles.settingToggleKnobActive]} />
                  </TouchableOpacity>
                </View>

                <View style={styles.settingRow}>
                  <View style={styles.settingLeft}>
                    <Ionicons name="color-palette" size={20} color="#a78bfa" />
                    <Text style={styles.settingLabel}>Theme</Text>
                  </View>
                  <View style={styles.themeOptions}>
                    {['purple', 'blue', 'green'].map(theme => (
                      <TouchableOpacity 
                        key={theme}
                        style={[
                          styles.themeOption, 
                          { backgroundColor: theme === 'purple' ? '#8b5cf6' : theme === 'blue' ? '#3b82f6' : '#10b981' },
                          selectedTheme === theme && styles.themeOptionSelected
                        ]}
                        onPress={() => { setSelectedTheme(theme); Vibration.vibrate(30); }}
                      />
                    ))}
                  </View>
                </View>

                <View style={styles.settingDivider} />

                <TouchableOpacity style={styles.settingAction} onPress={handleShareProfile}>
                  <Ionicons name="share-social" size={20} color="#3b82f6" />
                  <Text style={styles.settingActionText}>Share Profile</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.settingAction} onPress={() => router.push('/(tabs)/favorites')}>
                  <Ionicons name="heart" size={20} color="#ef4444" />
                  <Text style={styles.settingActionText}>View Favorites</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.settingAction} onPress={() => router.push('/(tabs)/reading-progress')}>
                  <Ionicons name="analytics" size={20} color="#10b981" />
                  <Text style={styles.settingActionText}>Reading Progress</Text>
                </TouchableOpacity>

                <View style={styles.settingDivider} />

                <TouchableOpacity style={[styles.settingAction, styles.settingActionDanger]} onPress={handleSignOut}>
                  <Ionicons name="log-out" size={20} color="#ef4444" />
                  <Text style={[styles.settingActionText, { color: '#ef4444' }]}>Sign Out</Text>
                </TouchableOpacity>
              </Animated.View>
            </BlurView>
          </Modal>

          <VerifyPhoneModal
            visible={verifyModalOpen}
            phone={phone}
            onClose={() => setVerifyModalOpen(false)}
            onVerified={() => setPhoneVerified(true)}
          />

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0f0f23' },
  scrollContainer: { padding: 16, paddingBottom: 100 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  
  // Header
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'flex-start',
    marginBottom: 16 
  },
  headerActions: { flexDirection: 'row', gap: 8 },
  headerBtn: { 
    width: 38, height: 38, borderRadius: 12, 
    backgroundColor: 'rgba(255,255,255,0.1)', 
    justifyContent: 'center', alignItems: 'center',
  },

  // Quick Stats Row
  quickStatsRow: { marginBottom: 16 },
  quickStatCard: { 
    width: 75, height: 65, borderRadius: 14, 
    padding: 8, marginRight: 10, alignItems: 'center', justifyContent: 'center',
  },
  quickStatNumber: { fontSize: 22, fontWeight: '800' },
  quickStatLabel: { fontSize: 10, color: '#888', marginTop: 2, fontWeight: '600' },

  input: {
    backgroundColor: '#2a084580',
    borderRadius: 8,
    padding: 12,
    color: '#e0d0ff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#8b5cf640',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    gap: 12,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  editButton: {
    backgroundColor: '#8b5cf6',
  },
  cancelButton: {
    backgroundColor: '#6b7280',
  },
  saveButton: {
    backgroundColor: '#10b981',
  },
  signOutButton: {
    backgroundColor: '#ef4444',
  },

  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#a78bfa',
    marginTop: 4,
    lineHeight: 20,
  },

  card: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 20,
    padding: 20,
    position: 'relative',
  },
  avatarContainer: {
    alignSelf: 'center',
    position: 'relative',
    marginBottom: 12,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#8b5cf6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeCount: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#f59e0b',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#1a1a2e',
  },
  badgeCountText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  avatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
  },
  infoRow: { marginBottom: 12 },
  label: {
    fontSize: 13,
    color: '#b794f4',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    color: '#e0d0ff',
    fontWeight: '500',
  },
  signOutBtn: {
    backgroundColor: '#ef4444',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  signOutText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#e0d0ff',
    marginBottom: 12,
  },

  itemCard: {
    backgroundColor: '#1a0033',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  itemContent: { flex: 1, marginRight: 12 },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e0d0ff',
  },
  itemSubtitle: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  itemCategory: {
    fontSize: 11,
    color: '#8b5cf6',
  },
  itemCategoryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  itemIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(139,92,246,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  deleteBtn: {
    backgroundColor: '#dc2626',
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteBtnDisabled: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  deleteBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },

  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#a78bfa',
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#e0d0ff',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#b794f4',
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
  },
  emptySection: {
    padding: 24,
    alignItems: 'center',
  },
  emptyEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  editModalCard: {
    backgroundColor: 'rgba(26, 26, 46, 0.98)',
    borderRadius: 20,
    padding: 18,
    marginHorizontal: 12,
    maxWidth: 520,
    alignSelf: 'center',
  },

  // Profile Card Additions
  profileName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
  },
  profileMemberSince: {
    fontSize: 13,
    color: '#888',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 12,
  },
  badgesPreview: {
    alignSelf: 'center',
    marginBottom: 12,
  },
  badgesRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  badgePreviewItem: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeEmoji: { fontSize: 18 },
  badgePreviewMore: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(139,92,246,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeMoreText: { color: '#a78bfa', fontSize: 11, fontWeight: '700' },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical: 16,
  },
  infoIconLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  verifyBadge: {
    marginLeft: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#8b5cf6',
  },
  verifyBadgeVerified: {
    backgroundColor: '#10b981',
  },
  verifyBadgeText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },

  // Quick Actions
  quickActionsContainer: {
    marginTop: 16,
    marginBottom: 8,
  },
  quickActionsTitle: {
    fontSize: 13,
    color: '#888',
    fontWeight: '600',
    marginBottom: 10,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  quickActionLabel: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Section Headers
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 14,
    borderRadius: 14,
    marginBottom: 12,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(139,92,246,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionHeaderText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
  },
  sectionSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
    gap: 8,
  },
  sectionSearchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
  },

  // Modals
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
  },

  // Achievements Modal
  achievementsModal: {
    backgroundColor: 'rgba(26, 26, 46, 0.98)',
    borderRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  achievementProgress: {
    color: '#a78bfa',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
  },
  achievementsList: {
    maxHeight: 400,
  },
  achievementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
    gap: 12,
  },
  achievementLocked: {
    opacity: 0.5,
  },
  achievementIcon: {
    fontSize: 28,
  },
  achievementInfo: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  achievementTitleLocked: {
    color: '#888',
  },
  achievementDesc: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },

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
  statBoxNumber: {
    fontSize: 28,
    fontWeight: '800',
    color: '#a78bfa',
  },
  statBoxLabel: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  topCategoryBox: {
    backgroundColor: 'rgba(245,158,11,0.15)',
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  topCategoryLabel: {
    fontSize: 13,
    color: '#f59e0b',
    fontWeight: '600',
  },
  topCategoryName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
    marginTop: 4,
  },
  topCategoryCount: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  membershipBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 14,
    borderRadius: 14,
    marginBottom: 12,
  },
  membershipLabel: {
    fontSize: 12,
    color: '#888',
  },
  membershipDays: {
    fontSize: 18,
    fontWeight: '800',
    color: '#a78bfa',
  },
  copyIdBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(139,92,246,0.15)',
  },
  copyIdText: {
    color: '#a78bfa',
    fontSize: 13,
    fontWeight: '600',
  },

  // Settings Modal
  settingsModal: {
    backgroundColor: 'rgba(26, 26, 46, 0.98)',
    borderRadius: 20,
    padding: 20,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingLabel: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
  },
  settingToggle: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  settingToggleActive: {
    backgroundColor: '#8b5cf6',
  },
  settingToggleKnob: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#fff',
  },
  settingToggleKnobActive: {
    alignSelf: 'flex-end',
  },
  themeOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  themeOption: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  themeOptionSelected: {
    borderWidth: 2,
    borderColor: '#fff',
  },
  settingDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical: 8,
  },
  settingAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
  },
  settingActionDanger: {},
  settingActionText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
  },
});
