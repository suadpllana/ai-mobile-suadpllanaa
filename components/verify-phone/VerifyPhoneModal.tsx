import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { supabase } from '../../supabase';

type Props = {
  visible: boolean;
  phone: string;
  onClose: () => void;
  onVerified: () => void;
};

export default function VerifyPhoneModal({ visible, phone, onClose, onVerified }: Props) {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'send' | 'confirm'>('send');
  const [code, setCode] = useState('');

  const sendOtp = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithOtp({ phone });
      if (error) throw error;
      setStep('confirm');
      Alert.alert('Code sent', 'A verification code was sent to your phone.');
    } catch (err: any) {
      const msg = err?.message || String(err) || 'Failed to send verification code';
      const low = (msg || '').toLowerCase();
      if (low.includes('unsupported') || low.includes('provider') || low.includes('carrier')) {
        Alert.alert(
          'Unsupported phone provider',
          'SMS cannot be delivered to this phone number or carrier. Try using a different phone number (different carrier) or verify via email instead.'
        );
      } else {
        Alert.alert('Error', msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const confirmOtp = async () => {
    try {
      setLoading(true);
      const { data, error } = await (supabase as any).auth.verifyOtp({ phone, token: code, type: 'sms' });
      if (error) throw error;

      try {
        await supabase.auth.updateUser({ data: { phone_verified: true } });
      } catch (e) {
        console.warn('Could not update auth user metadata with phone_verified', e);
      }

      try {
        const { data: userData } = await supabase.auth.getUser();
        const userId = (userData as any)?.user?.id;
        if (userId) {
          await supabase.from('profiles').upsert([{ id: userId, phone_verified: true }]);
        }
      } catch (e) {
        console.warn('Could not upsert profiles.phone_verified', e);
      }

      Alert.alert('Verified', 'Your phone number has been verified.');
      setCode('');
      setStep('send');
      onVerified();
      onClose();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to verify code');
    } finally {
      setLoading(false);
    }
  };

  const close = () => {
    setCode('');
    setStep('send');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={close}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Verify Phone</Text>
          <Text style={styles.subtitle}>We will send a code to {phone}</Text>

          {step === 'send' ? (
            <TouchableOpacity style={styles.button} onPress={sendOtp} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Send Code</Text>}
            </TouchableOpacity>
          ) : (
            <>
              <TextInput
                style={styles.input}
                placeholder="Enter code"
                placeholderTextColor="#999"
                value={code}
                onChangeText={setCode}
                keyboardType={Platform.OS === 'ios' ? 'number-pad' : 'numeric'}
              />
              <TouchableOpacity style={styles.button} onPress={confirmOtp} disabled={loading || !code.trim()}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Verify</Text>}
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity style={styles.cancel} onPress={close}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    backgroundColor: '#1a002b',
    borderRadius: 12,
    padding: 20,
  },
  title: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 8 },
  subtitle: { color: '#cfc0ff', marginBottom: 12 },
  input: {
    backgroundColor: '#2a0845',
    color: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#7c3aed',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  buttonText: { color: '#fff', fontWeight: '700' },
  cancel: { alignItems: 'center', marginTop: 6 },
  cancelText: { color: '#c0a9ff' },
});