export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  strength: 'weak' | 'fair' | 'good' | 'strong';
}

export interface PasswordRequirement {
  test: (password: string) => boolean;
  message: string;
  weight: number;
}

const PASSWORD_REQUIREMENTS: PasswordRequirement[] = [
  {
    test: password => password.length >= 8,
    message: 'At least 8 characters',
    weight: 1,
  },
  {
    test: password => /[A-Z]/.test(password),
    message: 'At least one uppercase letter',
    weight: 1,
  },
  {
    test: password => /[a-z]/.test(password),
    message: 'At least one lowercase letter',
    weight: 1,
  },
  {
    test: password => /\d/.test(password),
    message: 'At least one number',
    weight: 1,
  },
  {
    test: password => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
    message: 'At least one special character (!@#$%^&*()_+-=[]{}|;:,.<>?)',
    weight: 1,
  },
];

const ADDITIONAL_REQUIREMENTS: PasswordRequirement[] = [
  {
    test: password => password.length >= 12,
    message: 'At least 12 characters (recommended)',
    weight: 0.5,
  },
  {
    test: password => !/(.)\1{2,}/.test(password),
    message: 'No more than 2 consecutive identical characters',
    weight: 0.5,
  },
  {
    test: password => !/^[0-9]+$/.test(password),
    message: 'Not entirely numeric',
    weight: 0.5,
  },
  {
    test: password => {
      const common = ['password', '123456', 'qwerty', 'abc123', 'password123'];
      return !common.some(common => password.toLowerCase().includes(common));
    },
    message: 'Not a common password pattern',
    weight: 0.5,
  },
];

export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];
  let score = 0;
  const maxScore =
    PASSWORD_REQUIREMENTS.reduce((sum, req) => sum + req.weight, 0) +
    ADDITIONAL_REQUIREMENTS.reduce((sum, req) => sum + req.weight, 0);

  // Check required criteria
  for (const requirement of PASSWORD_REQUIREMENTS) {
    if (!requirement.test(password)) {
      errors.push(requirement.message);
    } else {
      score += requirement.weight;
    }
  }

  // Check additional criteria for strength scoring
  for (const requirement of ADDITIONAL_REQUIREMENTS) {
    if (requirement.test(password)) {
      score += requirement.weight;
    }
  }

  // Determine strength
  const strengthRatio = score / maxScore;
  let strength: 'weak' | 'fair' | 'good' | 'strong';

  if (strengthRatio < 0.4) {
    strength = 'weak';
  } else if (strengthRatio < 0.6) {
    strength = 'fair';
  } else if (strengthRatio < 0.8) {
    strength = 'good';
  } else {
    strength = 'strong';
  }

  return {
    isValid: errors.length === 0,
    errors,
    strength,
  };
}

export function getPasswordStrengthColor(
  strength: 'weak' | 'fair' | 'good' | 'strong'
): string {
  switch (strength) {
    case 'weak':
      return '#ff4444';
    case 'fair':
      return '#ff8800';
    case 'good':
      return '#44aa44';
    case 'strong':
      return '#00aa00';
    default:
      return '#cccccc';
  }
}

export function getPasswordStrengthText(
  strength: 'weak' | 'fair' | 'good' | 'strong'
): string {
  switch (strength) {
    case 'weak':
      return 'Weak';
    case 'fair':
      return 'Fair';
    case 'good':
      return 'Good';
    case 'strong':
      return 'Strong';
    default:
      return '';
  }
}
