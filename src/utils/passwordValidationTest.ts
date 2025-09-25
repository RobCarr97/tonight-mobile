import { validatePassword } from '../utils/passwordValidation';

// Simple test to verify password validation functionality
export const testPasswordValidation = () => {
  console.log('Testing Password Validation...');

  const testCases = [
    { password: '', expected: false, description: 'Empty password' },
    { password: '123', expected: false, description: 'Too short' },
    {
      password: 'password',
      expected: false,
      description: 'No uppercase, numbers, or special chars',
    },
    {
      password: 'Password1',
      expected: false,
      description: 'Missing special character',
    },
    {
      password: 'Password1!',
      expected: true,
      description: 'Valid strong password',
    },
    {
      password: 'MyStr0ng!P@ssw0rd',
      expected: true,
      description: 'Very strong password',
    },
    { password: '12345678', expected: false, description: 'Only numbers' },
    { password: 'PASSWORD123!', expected: false, description: 'No lowercase' },
  ];

  let passed = 0;
  let failed = 0;

  testCases.forEach(({ password, expected, description }) => {
    const result = validatePassword(password);
    const success = result.isValid === expected;

    if (success) {
      passed++;
      console.log(`✅ PASS: ${description}`);
    } else {
      failed++;
      console.log(`❌ FAIL: ${description}`);
      console.log(`   Expected: ${expected}, Got: ${result.isValid}`);
      console.log(`   Errors: ${result.errors.join(', ')}`);
      console.log(`   Strength: ${result.strength}`);
    }
  });

  console.log(`\nTest Results: ${passed} passed, ${failed} failed`);
  return { passed, failed };
};

// Example usage:
// testPasswordValidation();
