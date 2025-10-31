import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Animated,
  Easing,
  Keyboard,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../supabase';
import { Ionicons } from '@expo/vector-icons';

export default function AuthScreen() {
  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      if (session) router.replace('/home');
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) router.replace('/home');
    });

    return () => subscription.unsubscribe();
  }, []);

  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [surname, setSurname] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Forgot password modal state
  const [forgotVisible, setForgotVisible] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMessage, setForgotMessage] = useState('');

  // Animations
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

  const validateEmail = (value: string) => {
    const re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\\.,;:\s@\"]+\.)+[^<>()[\]\\.,;:\s@\"]{2,})$/i;
    return re.test(String(value).toLowerCase());
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    if (!email || !password) {
      setError('Please provide both email and password.');
      setLoading(false);
      return;
    }
    if (!validateEmail(email)) {
      setError('Please enter a valid email address.');
      setLoading(false);
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      setLoading(false);
      return;
    }
    if (mode === 'sign-up' && (!name || !surname)) {
      setError('Please provide both name and surname.');
      setLoading(false);
      return;
    }

    try {
      if (mode === 'sign-up') {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              display_name: `${name} ${surname}`,
            },
          },
        });
        if (signUpError) throw signUpError;
        Alert.alert('Success', 'Check your email to confirm your account.');
        setMode('sign-in');
        setEmail('');
        setPassword('');
        setName('');
        setSurname('');
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        router.replace('/home');
      }
    } catch (err: any) {
      const msg =
        err?.message ||
        (err?.status === 400 ? 'Invalid credentials.' : undefined) ||
        JSON.stringify(err) ||
        'An unexpected error occurred.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSendReset = async () => {
    setForgotLoading(true);
    setForgotMessage('');

    if (!forgotEmail) {
      setForgotMessage('Please enter your email.');
      setForgotLoading(false);
      return;
    }
    if (!validateEmail(forgotEmail)) {
      setForgotMessage('Please enter a valid email address.');
      setForgotLoading(false);
      return;
    }

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(forgotEmail);
      if (resetError) throw resetError;
      setForgotMessage('If an account exists, a password reset email was sent.');
    } catch (err: any) {
      setForgotMessage(err?.message || 'Unable to send reset email.');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={['#667eea', '#764ba2', '#f093fb']}
      style={styles.gradientBackground}
    >
    

      <Animated.View style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [
            { scale: scaleAnim },
            { translateY: keyboardOffset },
          ],
        }
      ]}>
   

        <Animated.View style={[styles.card, {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        }]}>
          <LinearGradient
            colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
            style={styles.glassCard}
          >
            <View style={styles.header}>
              <View style={styles.logoContainer}>
                <View style={styles.logo}>
                  <Ionicons name="sparkles" size={32} color="#6366f1" />
                </View>
              </View>
              <Text style={styles.subtitle}>
                {mode === 'sign-up' ? 'Create your account to get started' : 'Sign in to your account'}
              </Text>
            </View>

            {error ? (
              <Animated.View style={[styles.errorContainer, { opacity: fadeAnim }]}>
                <Ionicons name="alert-circle" size={20} color="#f87171" />
                <Text style={styles.errorText}>{error}</Text>
              </Animated.View>
            ) : null}

            {mode === 'sign-up' && (
              <>
                <TextInput
                  style={[styles.input, styles.glassInput]}
                  placeholder="First Name"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  editable={!loading}
                  placeholderTextColor="#9CA3AF"
                />
                <TextInput
                  style={[styles.input, styles.glassInput]}
                  placeholder="Last Name"
                  value={surname}
                  onChangeText={setSurname}
                  autoCapitalize="words"
                  editable={!loading}
                  placeholderTextColor="#9CA3AF"
                />
              </>
            )}

            <TextInput
              style={[styles.input, styles.glassInput]}
              placeholder="Email Address"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!loading}
              placeholderTextColor="#9CA3AF"
            />

            <TextInput
              style={[styles.input, styles.glassInput]}
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              editable={!loading}
              placeholderTextColor="#9CA3AF"
            />

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={loading ? ['#9CA3AF', '#9CA3AF'] : ['#6366f1', '#8b5cf6']}
                style={styles.buttonGradient}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.buttonText}>
                    {mode === 'sign-up' ? 'Create Account' : 'Sign In'}
                  </Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.toggleButton}
              onPress={() => setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in')}
              activeOpacity={0.7}
            >
              <Text style={styles.toggleText}>
                {mode === 'sign-in' 
                  ? "Don't have an account? Create one" 
                  : 'Already have an account? Sign in'
                }
              </Text>
            </TouchableOpacity>

            {mode === 'sign-in' && (
              <TouchableOpacity
                style={styles.forgotButton}
                onPress={() => {
                  setForgotVisible(true);
                  setForgotEmail(email);
                }}
              >
                <Text style={styles.forgotText}>Forgot Password?</Text>
              </TouchableOpacity>
            )}
          </LinearGradient>
        </Animated.View>
      </Animated.View>

      {/* Enhanced Forgot Password Modal */}
      <Modal visible={forgotVisible} animationType="fade" transparent>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setForgotVisible(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.modalCardContainer}>
            <LinearGradient
              colors={['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.05)']}
              style={styles.modalGlassCard}
            >
              <View style={styles.modalHeader}>
                <Ionicons name="key-outline" size={32} color="#6366f1" />
                <Text style={styles.modalTitle}>Reset Password</Text>
                <Text style={styles.modalSubtitle}>Enter your email to receive reset instructions</Text>
              </View>

              {forgotMessage ? (
                <View style={[
                  styles.modalFeedback,
                  forgotMessage.includes('sent') ? styles.successFeedback : styles.errorFeedback
                ]}>
                  <Ionicons 
                    name={forgotMessage.includes('sent') ? "checkmark-circle" : "alert-circle"} 
                    size={20} 
                    color={forgotMessage.includes('sent') ? "#10b981" : "#f87171"} 
                  />
                  <Text style={styles.modalFeedbackText}>{forgotMessage}</Text>
                </View>
              ) : null}

              <TextInput
                style={[styles.modalInput, styles.glassInput]}
                placeholder="Enter your email"
                value={forgotEmail}
                onChangeText={setForgotEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!forgotLoading}
                placeholderTextColor="#9CA3AF"
              />

              <TouchableOpacity
                style={styles.modalButton}
                onPress={handleSendReset}
                disabled={forgotLoading}
              >
                <LinearGradient
                  colors={forgotLoading ? ['#9CA3AF', '#9CA3AF'] : ['#6366f1', '#8b5cf6']}
                  style={styles.modalButtonGradient}
                >
                  {forgotLoading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.modalButtonText}>Send Reset Link</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setForgotVisible(false)}
              >
                <Text style={styles.modalCloseText}>Cancel</Text>
              </TouchableOpacity>
            </LinearGradient>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradientBackground: {
    flex: 1,
  },
  floatingShape1: {
    position: 'absolute',
    top: 50,
    right: 30,
    zIndex: 1,
  },
  floatingShape2: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    zIndex: 1,
  },
  floatingShape3: {
    position: 'absolute',
    top: '50%',
    right: '20%',
    zIndex: 1,
  },



  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    paddingTop: 80,
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 24,
    zIndex: 10,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    backdropFilter: 'blur(10px)',
  },
  card: {
    width: '100%',
    maxWidth: 420,
    marginBottom: 40,
  },
  glassCard: {
    padding: 40,
    borderRadius: 24,
    backdropFilter: 'blur(20px)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: 'white',
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 8,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: '500',
  },
  input: {
    marginBottom: 20,
    padding: 20,
    fontSize: 16,
    borderRadius: 16,
    fontWeight: '500',
  },
  glassInput: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    color: 'white',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(248,113,113,0.2)',
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.3)',
  },
  errorText: {
    color: '#fee2e2',
    fontSize: 14,
    marginLeft: 8,
    fontWeight: '500',
    flex: 1,
  },
  button: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
  },
  buttonGradient: {
    padding: 20,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  toggleButton: {
    paddingVertical: 16,
  },
  toggleText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  forgotButton: {
    marginTop: 8,
    paddingVertical: 12,
  },
  forgotText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 24,
  },
  modalCardContainer: {
    width: '100%',
    maxWidth: 420,
  },
  modalGlassCard: {
    borderRadius: 24,
    padding: 32,
    backdropFilter: 'blur(20px)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.3,
    shadowRadius: 40,
    elevation: 20,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: 'white',
    marginTop: 12,
    marginBottom: 4,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    lineHeight: 22,
  },
  modalInput: {
    marginBottom: 24,
  },
  modalFeedback: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
  },
  successFeedback: {
    backgroundColor: 'rgba(16,185,129,0.2)',
    borderColor: 'rgba(16,185,129,0.3)',
  },
  errorFeedback: {
    backgroundColor: 'rgba(248,113,113,0.2)',
    borderColor: 'rgba(248,113,113,0.3)',
  },
  modalFeedbackText: {
    color: 'white',
    fontSize: 14,
    marginLeft: 8,
    fontWeight: '500',
    flex: 1,
  },
  modalButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
  },
  modalButtonGradient: {
    padding: 20,
    alignItems: 'center',
  },
  modalButtonText: {
    color: 'white',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  modalCloseButton: {
    paddingVertical: 16,
  },
  modalCloseText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});