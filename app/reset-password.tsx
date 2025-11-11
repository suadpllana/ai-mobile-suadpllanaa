import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { supabase } from '../supabase';
export default function ResetPasswordScreen() {
  const router = useRouter();
  const { email: emailParam } = useLocalSearchParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [queriedEmail, setQueriedEmail] = useState<string | null>(null);
  const [profileExists, setProfileExists] = useState<boolean | null>(null);

  useEffect(() => {
    const checkEmail = async () => {
      const email = typeof emailParam === 'string' ? emailParam : Array.isArray(emailParam) ? emailParam[0] : undefined;
      if (!email) return;
      setQueriedEmail(email);
      try {
        const { data, error } = await supabase.from('profiles').select('id,email').eq('email', email).maybeSingle();
        if (error) {
          console.warn('Error fetching profile for reset:', error);
          Toast.show({ type: 'error', text1: 'Lookup failed', text2: error.message || 'Could not check that email' });
          setProfileExists(false);
          return;
        }

        if (!data) {
          setProfileExists(false);
          Toast.show({ type: 'error', text1: 'No account found', text2: 'No user with that email address' });
          return;
        }

        setProfileExists(true);
      } catch (err) {
        console.warn('Unexpected error checking profile:', err);
        Toast.show({ type: 'error', text1: 'Error', text2: 'Unexpected error while checking that email' });
        setProfileExists(false);
      }
    };

    checkEmail();
  }, [emailParam]);
  const handleReset = async () => {
    setLoading(true);
    setError('');
    setSuccess(false);
    if (!password || !confirmPassword) {
      setError('Please enter and confirm your new password.');
      setLoading(false);
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      setLoading(false);
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      setLoading(false);
      return;
    }
    try {
      // If there is an active session we can update the user directly.
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData?.session;

      if (session) {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        setSuccess(true);
        Alert.alert('Success', 'Your password has been reset. You can now sign in.', [
          {
            text: 'OK',
            onPress: () => {
              router.replace('/auth');
            },
          },
        ]);
      } else {
        // No session: send reset email to the provided email (queriedEmail) if we have it.
        if (!queriedEmail) {
          setError('No email provided. Open the reset link from your email or request a reset link first.');
          setLoading(false);
          return;
        }

        const { error } = await supabase.auth.resetPasswordForEmail(queriedEmail, {
          redirectTo: 'myapp://reset-password',
        });
        if (error) throw error;
        Toast.show({ type: 'success', text1: 'Reset email sent', text2: 'Check your email for a reset link' });
        setLoading(false);
        return;
      }
    } catch (err) {
      const errorMsg = typeof err === 'object' && err && 'message' in err ? (err as Error).message : 'Failed to reset password.';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={['#0a0015', '#1a0033', '#0f001f']} style={styles.gradient}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
          <TouchableOpacity onPress={() => router.replace("/")} style={styles.backButton}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>

          <View style={styles.content}>
            <Text style={styles.title}>Reset Password</Text>
            <Text style={styles.subtitle}>Create a new password to regain access to your account.</Text>

            {error ? (
              <View style={styles.errorBubble}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="New Password"
                placeholderTextColor="rgba(224, 208, 255, 0.4)"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                editable={!loading}
              />
            </View>

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Confirm New Password"
                placeholderTextColor="rgba(224, 208, 255, 0.4)"
                secureTextEntry
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                editable={!loading}
              />
            </View>

            <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleReset} disabled={loading} activeOpacity={0.8}>
              <LinearGradient
                colors={loading ? ['#5e35b1', '#4527a0'] : ['#9c73f8', '#7c3aed', '#6b46c1']}
                style={StyleSheet.absoluteFillObject}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.buttonText}>{success ? 'Password Reset!' : 'Reset Password'}</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    width: '100%',
    paddingHorizontal: 24,
    paddingVertical: 32,
    justifyContent: 'center',
  },
  backButton: {
    position: 'absolute',
    top: 16,
    left: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    zIndex: 10,
  },
  backText: {
    color: '#b794f4',
    fontSize: 16,
    fontWeight: '600',
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#b794f4',
    marginBottom: 32,
    fontWeight: '500',
    opacity: 0.9,
    lineHeight: 24,
  },
  inputContainer: {
    marginBottom: 24,
  },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    fontSize: 16,
    backgroundColor: 'rgba(80, 20, 120, 0.2)',
    color: '#e0d0ff',
    fontWeight: '500',
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
  button: {
    height: 56,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginTop: 8,
    shadowColor: '#8b5cf6',
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 15,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
