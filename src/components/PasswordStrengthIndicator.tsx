import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  getPasswordStrengthColor,
  getPasswordStrengthText,
  validatePassword,
} from '../utils/passwordValidation';

interface PasswordStrengthIndicatorProps {
  password: string;
  showRequirements?: boolean;
}

export const PasswordStrengthIndicator: React.FC<
  PasswordStrengthIndicatorProps
> = ({ password, showRequirements = false }) => {
  if (!password) {
    return null;
  }

  const validation = validatePassword(password);
  const strengthColor = getPasswordStrengthColor(validation.strength);

  return (
    <View style={styles.container}>
      <View style={styles.strengthIndicatorRow}>
        <View style={styles.strengthBar}>
          <View
            style={[
              styles.strengthProgress,
              {
                backgroundColor: strengthColor,
                width: validation.isValid ? '100%' : '60%',
              },
            ]}
          />
        </View>
        <Text style={[styles.strengthText, { color: strengthColor }]}>
          {getPasswordStrengthText(validation.strength)}
        </Text>
      </View>

      {showRequirements && validation.errors.length > 0 && (
        <View style={styles.requirementsContainer}>
          <Text style={styles.requirementsTitle}>Password Requirements:</Text>
          {validation.errors.map((error, index) => (
            <Text key={index} style={styles.requirementError}>
              • {error}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
  },
  strengthIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  strengthBar: {
    flex: 1,
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    marginRight: 10,
  },
  strengthProgress: {
    height: '100%',
    borderRadius: 2,
  },
  strengthText: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  requirementsContainer: {
    marginTop: 8,
    padding: 10,
    backgroundColor: '#fff5f5',
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#ff4444',
  },
  requirementsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  requirementError: {
    fontSize: 11,
    color: '#ff4444',
    lineHeight: 16,
  },
});

export default PasswordStrengthIndicator;
