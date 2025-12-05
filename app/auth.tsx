import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Easing,
    Keyboard,
    Modal,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { supabase } from '../supabase';
import { logger } from '../utils/logger';
import { validateEmail, validatePassword, validatePasswordMatch } from '../utils/validation';
import { sanitizeInput } from '../utils/security';

export default function AuthScreen() {
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [forgotVisible, setForgotVisible] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMessage, setForgotMessage] = useState('');

  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.9));
  const [keyboardOffset] = useState(new Animated.Value(0));

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 120,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
      Animated.timing(keyboardOffset, {
        toValue: -120,
        duration: 250,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start();
    });

    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      Animated.timing(keyboardOffset, {
        toValue: 0,
        duration: 250,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start();
    });

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, [keyboardOffset]);

  const createDefaultCategories = async (userId: string) => {
    const defaultCategories = [
      'Fiction', 'Non-Fiction', 'Mystery', 'Science Fiction', 'Fantasy', 'Romance',
      'Biography', 'History', 'Science', 'Technology', 'Business', 'Self-Help',
      'Poetry', 'Drama', 'Comics & Graphic Novels', "Children's Books", 'Young Adult', 'Educational'
    ];

    try {
      const categories = defaultCategories.map(name => ({ name, user_id: userId }));
      await supabase.from('categories').insert(categories);
    } catch (err) {
      logger.warn('Failed to create default categories:', err);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    // Sanitize inputs
    const sanitizedEmail = sanitizeInput(email);
    const sanitizedFirstName = sanitizeInput(firstName);
    const sanitizedLastName = sanitizeInput(lastName);
    const sanitizedPhone = sanitizeInput(phone);

    if (mode === 'sign-up') {
      if (!sanitizedFirstName.trim() || !sanitizedLastName.trim()) {
        setError('Please provide your full name.');
        setLoading(false);
        return;
      }
      
      const passwordMatch = validatePasswordMatch(password, confirmPassword);
      if (!passwordMatch.isValid) {
        setError(passwordMatch.error || 'Passwords do not match.');
        setLoading(false);
        return;
      }
      
      // Validate password strength for sign-up
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.isValid) {
        setError(passwordValidation.error || 'Password does not meet requirements.');
        setLoading(false);
        return;
      }
    }

    if (!sanitizedEmail || !password) {
      setError('Email and password are required.');
      setLoading(false);
      return;
    }
    
    if (!validateEmail(sanitizedEmail)) {
      setError('Please enter a valid email address.');
      setLoading(false);
      return;
    }

    try {
      if (mode === 'sign-up') {
        const { data: { user }, error: signUpError } = await supabase.auth.signUp({
          email: sanitizedEmail,
          password,
          options: { 
            data: { 
              first_name: sanitizedFirstName.trim(), 
              last_name: sanitizedLastName.trim(),
              phone: sanitizedPhone.trim() || null,
              created_at: new Date().toISOString()
            } 
          },
        });
        
        if (signUpError) throw signUpError;

        if (user) await createDefaultCategories(user.id);

        if (user && sanitizedPhone.trim()) {
          try {
            await supabase.from('profiles').insert([{ id: user.id, phone: sanitizedPhone.trim() }]);
          } catch (e) {
            logger.warn('Could not insert phone into profiles table:', e);
          }
        }

        Alert.alert('Check your email', 'Confirm your account to continue.', [{ text: 'OK' }]);
        setMode('sign-in');
        setPassword('');
        setFirstName('');
        setLastName('');
        setConfirmPassword('');
        setPhone('');
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ 
          email: sanitizedEmail, 
          password 
        });
        if (signInError) throw signInError;
        router.replace('/');
      }
    } catch (err: any) {
      setError(err?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const clearInputs = () => {
    setEmail('');
    setPassword('');
    setFirstName('');
    setLastName('');
    setConfirmPassword('');
    setPhone('');
    setError('');
  };

  const handleSendReset = async () => {
    setForgotLoading(true);
    setForgotMessage('');

    if (!validateEmail(forgotEmail)) {
      setForgotMessage('Please enter a valid email.');
      setForgotLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
        redirectTo: 'myapp://reset-password',
      });
      if (error) throw error;
      setForgotMessage('Password reset email sent if account exists.');
    } catch (err: any) {
      setForgotMessage(err?.message || 'Failed to send reset email.');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient
        colors={['#0b0014', '#1a0033', '#0f002b']}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFillObject}
      />


      <Animated.View style={[styles.container, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
        <View style={styles.glassCard}>
          <Text style={styles.titleGlow}>
            {mode === 'sign-up' ? 'Join the Library' : 'Welcome Back'}
          </Text>
          <Text style={styles.subtitle}>
            {mode === 'sign-up' ? 'Begin your reading journey' : 'Continue where you left off'}
          </Text>

          {error ? (
            <View style={styles.errorBubble}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.inputContainer}>
            {mode === 'sign-up' && (
              <>
                <TextInput
                  style={styles.input}
                  placeholder="First Name"
                  placeholderTextColor="#8b5cf688"
                  value={firstName}
                  onChangeText={setFirstName}
                  editable={!loading}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Last Name"
                  placeholderTextColor="#8b5cf688"
                  value={lastName}
                  onChangeText={setLastName}
                  editable={!loading}
                />
              </>
            )}

            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#8b5cf688"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!loading}
            />

            {mode === 'sign-up' && (
              <TextInput
                style={styles.input}
                placeholder="Phone (optional)"
                placeholderTextColor="#8b5cf688"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                editable={!loading}
              />
            )}

            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#8b5cf688"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              editable={!loading}
            />

            {mode === 'sign-up' && (
              <TextInput
                style={styles.input}
                placeholder="Confirm Password"
                placeholderTextColor="#8b5cf688"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                editable={!loading}
              />
            )}
          </View>

          <TouchableOpacity
            style={[styles.mainButton, loading && styles.mainButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={loading ? ['#5e35b1', '#4527a0'] : ['#9c73f8', '#7c3aed', '#6b46c1']}
              style={StyleSheet.absoluteFillObject}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.mainButtonText}>
                {mode === 'sign-up' ? 'Create Account' : 'Sign In'}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              clearInputs();
              setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in');
            }}
            style={styles.toggleButton}
          >
            <Text style={styles.toggleText}>
              {mode === 'sign-in'
                ? "New here? Create an account"
                : 'Already have an account? Sign in'}
            </Text>
          </TouchableOpacity>

          {mode === 'sign-in' && (
            <TouchableOpacity
              onPress={() => {
                setForgotVisible(true);
                setForgotEmail(email);
              }}
              style={styles.forgotButton}
            >
              <Text style={styles.forgotText}>Forgot your password?</Text>
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>

      <Modal visible={forgotVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalGlass}>
            <Text style={styles.modalTitle}>Reset Password</Text>
            <Text style={styles.modalSubtitle}>
              We'll send you a link to reset your password
            </Text>

            {forgotMessage ? (
              <Text style={[styles.modalSubtitle, { color: '#c0a9ff', marginTop: 8 }]}>
                {forgotMessage}
              </Text>
            ) : null}

            <TextInput
              style={styles.modalInput}
              placeholder="your@email.com"
              placeholderTextColor="#8b5cf699"
              value={forgotEmail}
              onChangeText={setForgotEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <TouchableOpacity
              style={[styles.mainButton, { marginTop: 20 }]}
              onPress={handleSendReset}
              disabled={forgotLoading}
            >
              <LinearGradient
                colors={['#9c73f8', '#7c3aed']}
                style={StyleSheet.absoluteFillObject}
              />
              <Text style={styles.mainButtonText}>
                {forgotLoading ? 'Sending...' : 'Send Reset Link'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setForgotVisible(false);
                Keyboard.dismiss();
              }}
              style={{ marginTop: 16 }}
            >
              <Text style={styles.toggleText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1, justifyContent: 'center', padding: 24 },
  
 

  glassCard: {
    backgroundColor: 'rgba(20, 0, 40, 0.4)',
    borderRadius: 28,
    padding: 32,
    backdropFilter: 'blur(20px)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
    shadowColor: '#8b5cf6',
    shadowOpacity: 0.3,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 10 },
    elevation: 20,
  },

  titleGlow: {
    fontSize: 36,
    fontWeight: '800',
    textAlign: 'center',
    backgroundClip: 'text',
    color: 'white',
    textShadowRadius: 20,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#b794f4',
    marginBottom: 32,
    fontWeight: '500',
    opacity: 0.9,
  },

  inputContainer: { marginBottom: 24 },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: 'rgba(80, 20, 120, 0.2)',
    color: '#e0d0ff',
    fontWeight: '500',
  },

  mainButton: {
    height: 56,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#8b5cf6',
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 15,
  },
  mainButtonDisabled: {
    opacity: 0.7,
  },
  mainButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  toggleButton: { marginTop: 24, alignItems: 'center' },
  toggleText: {
    color: '#b794f4',
    fontSize: 15,
    fontWeight: '600',
  },

  forgotButton: { marginTop: 16, alignItems: 'center' },
  forgotText: {
    color: '#8b5cf6',
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },

  errorBubble: {
    backgroundColor: 'rgba(255, 50, 100, 0.15)',
    borderColor: 'rgba(255, 100, 150, 0.3)',
    borderWidth: 1,
    padding: 14,
    borderRadius: 16,
    marginBottom: 20,
  },
  errorText: {
    color: '#ffb4c6',
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 0, 20, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalGlass: {
    backgroundColor: 'rgba(25, 0, 50, 0.5)',
    borderRadius: 24,
    padding: 32,
    width: '100%',
    maxWidth: 380,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    backdropFilter: 'blur(16px)',
  },
  modalTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#e0d0ff',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 15,
    color: '#c0a9ff',
    textAlign: 'center',
    lineHeight: 22,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.4)',
    borderRadius: 16,
    padding: 16,
    marginTop: 24,
    backgroundColor: 'rgba(100, 40, 160, 0.2)',
    color: '#fff',
    fontSize: 16,
  },
});