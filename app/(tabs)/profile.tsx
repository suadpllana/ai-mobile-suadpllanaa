import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeInDown, Layout } from 'react-native-reanimated';
import VerifyPhoneModal from '../../components/verify-phone/VerifyPhoneModal';
import { supabase } from '../../supabase';

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

export default function ProfileScreen() {
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
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
      <LinearGradient colors={['#2a0845', '#0f002b']} style={StyleSheet.absoluteFillObject} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <Animated.View entering={FadeInDown.duration(600)} style={styles.header}>
            <Text style={styles.title}>My Profile</Text>
            <Text style={styles.subtitle}>Manage your account and library</Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(100).duration(600)} style={styles.card}>
            <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFillObject} />

            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {fullName?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'}
              </Text>
            </View>

            <>
              <View style={styles.infoRow}>
                <Text style={styles.label}>Full Name</Text>
                <Text style={styles.value}>{fullName || 'Not set'}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.label}>Email</Text>
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
                      style={{ marginLeft: 12, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: emailVerified ? '#2a7f3f' : '#6b46c1' }}
                    >
                      <Text style={{ color: '#fff', fontWeight: '700' }}>{emailVerified ? 'Verified' : 'Verify'}</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.label}>Phone</Text>
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
                      style={{ marginLeft: 12, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: phoneVerified ? '#2a7f3f' : '#6b46c1' }}
                    >
                      <Text style={{ color: '#fff', fontWeight: '700' }}>{phoneVerified ? 'Verified' : 'Verify'}</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.label}>Member Since</Text>
                <Text style={styles.value}>
                  {new Date(user.created_at).toLocaleDateString('en-US', {
                    month: 'long',
                    year: 'numeric',
                  })}
                </Text>
              </View>

              <View style={styles.buttonRow}>
                <TouchableOpacity 
                  style={[styles.button, styles.editButton]} 
                  onPress={() => setEditMode(true)}
                >
                  <Text style={styles.buttonText}>Edit Profile</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.button, styles.signOutButton]} onPress={handleSignOut}>
                  <Text style={styles.buttonText}>Sign Out</Text>
                </TouchableOpacity>
              </View>
            </>
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
              style={[styles.sectionTitle, { flexDirection: 'row', alignItems: 'center' }]}
              onPress={() => setBooksOpen((open) => !open)}
              activeOpacity={0.7}
            >
              <Text style={{ color: '#e0d0ff', fontWeight: '700', fontSize: 20, flex: 1 }}>
                My Books ({books.length})
              </Text>
              <Text style={{ color: '#8b5cf6', fontSize: 32, fontWeight: 'bold', marginLeft: 8 }}>
                {booksOpen ? '▲' : '▼'}
              </Text>
            </TouchableOpacity>
            {booksOpen && (
              books.length > 0 ? (
                books.map((book, i) => (
                  <Animated.View
                    key={book.id}
                    entering={FadeInDown.delay(300 + i * 50).duration(400)}
                    layout={Layout.springify()}
                    style={styles.itemCard}
                  >
                    <View style={styles.itemContent}>
                      <Text style={styles.itemTitle} numberOfLines={1}>
                        {book.title}
                      </Text>
                      <Text style={styles.itemSubtitle}>
                        {book.author}
                      </Text>
                      <Text style={styles.itemCategory}>
                        {categories.find(c => c.id === book.category_id)?.name || 'Uncategorized'}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.deleteBtn}
                      onPress={() => handleDeleteBook(book.id)}
                      disabled={loading}
                    >
                      <Text style={styles.deleteBtnText}>Delete</Text>
                    </TouchableOpacity>
                  </Animated.View>
                ))
              ) : (
                <Text style={styles.emptyText}>No books in your library.</Text>
              )
            )}
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(400).duration(600)} style={{ marginTop: 24 }}>
            <TouchableOpacity
              style={[styles.sectionTitle, { flexDirection: 'row', alignItems: 'center' }]}
              onPress={() => setCategoriesOpen((open) => !open)}
              activeOpacity={0.7}
            >
              <Text style={{ color: '#e0d0ff', fontWeight: '700', fontSize: 20, flex: 1 }}>
                My Categories ({categories.length})
              </Text>
              <Text style={{ color: '#8b5cf6', fontSize: 32, fontWeight: 'bold', marginLeft: 8 }}>
                {categoriesOpen ? '▲' : '▼'}
              </Text>
            </TouchableOpacity>
            {categoriesOpen && (
              categories.length > 0 ? (
                categories.map((cat, i) => (
                  <Animated.View
                    key={cat.id}
                    entering={FadeInDown.delay(500 + i * 50).duration(400)}
                    layout={Layout.springify()}
                    style={styles.itemCard}
                  >
                    <View style={styles.itemContent}>
                      <Text style={styles.itemTitle}>{cat.name}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.deleteBtn}
                      onPress={() => handleDeleteCategory(cat.id)}
                      disabled={loading}
                    >
                      <Text style={styles.deleteBtnText}>Delete</Text>
                    </TouchableOpacity>
                  </Animated.View>
                ))
              ) : (
                <Text style={styles.emptyText}>No categories created.</Text>
              )
            )}
          </Animated.View>
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
  safeArea: { flex: 1, backgroundColor: '#0f002b' },
  scrollContainer: { padding: 16, paddingBottom: 32 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
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
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
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

  header: { marginBottom: 24 },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#e0d0ff',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 15,
    color: '#c0a9ff',
    marginTop: 4,
    lineHeight: 20,
  },

  card: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 24,
    padding: 20,
    position: 'relative',
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#8b5cf6',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 28,
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
    fontSize: 14,
    color: '#b794f4',
    marginTop: 2,
  },
  itemCategory: {
    fontSize: 13,
    color: '#8b5cf6',
    marginTop: 4,
    fontStyle: 'italic',
  },
  deleteBtn: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
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
    fontSize: 15,
    color: '#a78bfa',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  editModalCard: {
    backgroundColor: 'rgba(26, 26, 46, 0.98)',
    borderRadius: 20,
    padding: 18,
    marginHorizontal: 12,
    maxWidth: 520,
    alignSelf: 'center',
  },
});
