import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from '../supabase';

export default function AuthScreen() {
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Forgot password modal state
  const [forgotVisible, setForgotVisible] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMessage, setForgotMessage] = useState('');

  // Simple email validation
  const validateEmail = (value: string) => {
    const re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\\.,;:\s@\"]+\.)+[^<>()[\]\\.,;:\s@\"]{2,})$/i;
    return re.test(String(value).toLowerCase());
  };

  const createDefaultCategories = async (userId: string) => {
    const defaultCategories = [
      'Fiction',
      'Non-Fiction',
      'Mystery',
      'Science Fiction',
      'Fantasy',
      'Romance',
      'Biography',
      'History',
      'Science',
      'Technology',
      'Business',
      'Self-Help',
      'Poetry',
      'Drama',
      'Comics & Graphic Novels',
      'Children\'s Books',
      'Young Adult',
      'Educational'
    ];

    try {
      const categories = defaultCategories.map(name => ({
        name,
        user_id: userId
      }));
      await supabase.from('categories').insert(categories);
    } catch (err) {
      console.warn('Failed to create default categories:', err);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    // Better validation with field-level messages
    if (mode === 'sign-up') {
      if (!firstName || !lastName) {
        setError('Please provide your first and last name.');
        setLoading(false);
        return;
      }
      if (firstName.length > 100 || lastName.length > 100) {
        setError('Name fields must be 100 characters or less.');
        setLoading(false);
        return;
      }
      const signUpDate = new Date().toISOString();
    }
    
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

    try {
      if (mode === 'sign-up') {
        // Include first/last name in user_metadata so we can show it in profile
        const { data: { user }, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { 
            data: { 
              first_name: firstName, 
              last_name: lastName,
              created_at: new Date().toISOString()
            } 
          },
        });
        
        if (signUpError) throw signUpError;

        // Create default categories for the new user
        if (user) {
          await createDefaultCategories(user.id);
        }

        Alert.alert('Success', 'Check your email to confirm your account. Then sign in.');
        setMode('sign-in');
        setPassword('');
        setFirstName('');
        setLastName('');
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        // On success navigate to home (tabs)
        router.replace('/');
      }
    } catch (err: any) {
      // Map common Supabase errors to friendlier messages
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
      // Supabase v2: resetPasswordForEmail
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
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>{mode === 'sign-up' ? 'Sign Up' : 'Sign In'}</Text>
        <Text style={styles.subtitle}>{mode === 'sign-up' ? 'Create your account' : 'Welcome back'}</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          editable={!loading}
          accessibilityLabel="Email"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          editable={!loading}
          accessibilityLabel="Password"
        />
        {mode === 'sign-up' ? (
          <>
            <TextInput
              style={styles.input}
              placeholder="First Name"
              value={firstName}
              onChangeText={setFirstName}
              editable={!loading}
              accessibilityLabel="First Name"
            />
            <TextInput
              style={styles.input}
              placeholder="Last Name"
              value={lastName}
              onChangeText={setLastName}
              editable={!loading}
              accessibilityLabel="Last Name"
            />
          </>
        ) : null}

        <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={loading} accessibilityLabel="Authenticate">
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{mode === 'sign-up' ? 'Sign Up' : 'Sign In'}</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in')} accessibilityRole="button">
          <Text style={styles.toggle}>{mode === 'sign-in' ? "Don't have an account? Sign Up" : 'Already have an account? Sign In'}</Text>
        </TouchableOpacity>

        {mode === 'sign-in' ? (
          <TouchableOpacity onPress={() => { setForgotVisible(true); setForgotEmail(email); }} style={styles.forgot}>
            <Text style={styles.forgotText}>Forgot password?</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Forgot Password Modal */}
      <Modal visible={forgotVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Reset password</Text>
            <Text style={styles.modalSubtitle}>Enter your email and we will send reset instructions.</Text>
            {forgotMessage ? <Text style={styles.feedback}>{forgotMessage}</Text> : null}
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={forgotEmail}
              onChangeText={setForgotEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!forgotLoading}
            />

            <TouchableOpacity style={styles.button} onPress={handleSendReset} disabled={forgotLoading}>
              {forgotLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Send reset email</Text>}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setForgotVisible(false)}>
              <Text style={styles.toggle}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    marginBottom: 32,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: '#f9f9f9',
  },
  button: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  toggle: {
    textAlign: 'center',
    color: '#6366f1',
    fontSize: 16,
    fontWeight: '500',
  },
  error: {
    backgroundColor: '#fee2e2',
    color: '#dc2626',
    padding: 12,
    borderRadius: 8,
    textAlign: 'center',
    marginBottom: 16,
    fontSize: 14,
  },
  forgot: {
    marginTop: 8,
  },
  forgotText: {
    textAlign: 'center',
    color: '#374151',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 420,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    textAlign: 'center',
  },
  feedback: {
    textAlign: 'center',
    marginBottom: 12,
    color: '#111827',
  },
});