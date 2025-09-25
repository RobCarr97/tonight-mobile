import React, { useState } from 'react';
import {
  Alert,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

interface DeleteAccountModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isDeleting: boolean;
}

export const DeleteAccountModal: React.FC<DeleteAccountModalProps> = ({
  visible,
  onClose,
  onConfirm,
  isDeleting,
}) => {
  const [confirmationText, setConfirmationText] = useState('');
  const [error, setError] = useState('');

  const handleConfirm = async () => {
    if (confirmationText.toLowerCase() !== 'delete') {
      setError('Please type "delete" to confirm');
      return;
    }

    try {
      setError('');
      await onConfirm();
      // Modal will close automatically when user is logged out
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        'Failed to delete account. Please try again.';

      Alert.alert('Error', errorMessage);
      setError('');
    }
  };

  const handleClose = () => {
    setConfirmationText('');
    setError('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>Delete Account</Text>

          <Text style={styles.warning}>
            ⚠️ This action cannot be undone. Your account and all data will be
            permanently deleted.
          </Text>

          <Text style={styles.description}>
            This will permanently delete your account, including:
          </Text>

          <View style={styles.listContainer}>
            <Text style={styles.listItem}>• Your profile and photos</Text>
            <Text style={styles.listItem}>
              • All your matches and conversations
            </Text>
            <Text style={styles.listItem}>• Your date event history</Text>
            <Text style={styles.listItem}>
              • All personal data and preferences
            </Text>
          </View>

          <Text style={styles.confirmationLabel}>
            To confirm, type <Text style={styles.deleteText}>delete</Text>{' '}
            below:
          </Text>

          <TextInput
            style={[styles.input, error ? styles.inputError : null]}
            placeholder="Type 'delete' to confirm"
            value={confirmationText}
            onChangeText={text => {
              setConfirmationText(text);
              if (error) setError('');
            }}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isDeleting}
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={handleClose}
              disabled={isDeleting}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                styles.deleteButton,
                (confirmationText.toLowerCase() !== 'delete' || isDeleting) &&
                  styles.deleteButtonDisabled,
              ]}
              onPress={handleConfirm}
              disabled={
                confirmationText.toLowerCase() !== 'delete' || isDeleting
              }>
              <Text style={styles.deleteButtonText}>
                {isDeleting ? 'Deleting...' : 'Delete Account'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    maxHeight: '90%',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#d32f2f',
    textAlign: 'center',
    marginBottom: 16,
  },
  warning: {
    fontSize: 16,
    color: '#d32f2f',
    textAlign: 'center',
    marginBottom: 20,
    fontWeight: '600',
    backgroundColor: '#ffebee',
    padding: 12,
    borderRadius: 8,
  },
  description: {
    fontSize: 16,
    color: '#333',
    marginBottom: 12,
    fontWeight: '500',
  },
  listContainer: {
    marginBottom: 20,
    paddingLeft: 8,
  },
  listItem: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
    lineHeight: 20,
  },
  confirmationLabel: {
    fontSize: 16,
    color: '#333',
    marginBottom: 12,
    fontWeight: '500',
  },
  deleteText: {
    fontFamily: 'monospace',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    fontWeight: 'bold',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 8,
    fontFamily: 'monospace',
  },
  inputError: {
    borderColor: '#d32f2f',
    backgroundColor: '#ffebee',
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 14,
    marginBottom: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cancelButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '500',
  },
  deleteButton: {
    backgroundColor: '#d32f2f',
  },
  deleteButtonDisabled: {
    backgroundColor: '#ffcdd2',
    opacity: 0.7,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
