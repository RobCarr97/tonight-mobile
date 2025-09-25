import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface TonightLogoProps {
  size?: 'small' | 'medium' | 'large';
  showHeart?: boolean;
  style?: any;
}

const TonightLogo: React.FC<TonightLogoProps> = ({
  size = 'medium',
  showHeart = false,
  style,
}) => {
  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          fontSize: 24,
          heartSize: 20,
          letterSpacing: 1,
          height: 60,
        };
      case 'large':
        return {
          fontSize: 48,
          heartSize: 40,
          letterSpacing: 3,
          height: 120,
        };
      default: // medium
        return {
          fontSize: 36,
          heartSize: 30,
          letterSpacing: 2,
          height: 90,
        };
    }
  };

  const sizeStyles = getSizeStyles();

  return (
    <View style={[styles.container, style]}>
      {showHeart && (
        <View style={styles.heartContainer}>
          <LinearGradient
            colors={['#8B5CF6', '#EC4899']} // Purple to Pink gradient
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[
              styles.heartGradient,
              {
                width: sizeStyles.heartSize,
                height: sizeStyles.heartSize,
                borderRadius: sizeStyles.heartSize / 2,
              },
            ]}>
            <Text
              style={[styles.heart, { fontSize: sizeStyles.heartSize * 0.8 }]}>
              ♥
            </Text>
          </LinearGradient>
        </View>
      )}
      <LinearGradient
        colors={['#8B5CF6', '#EC4899']} // Purple to Pink gradient
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.textGradient, { height: sizeStyles.height * 0.6 }]}>
        <Text
          style={[
            styles.logoText,
            {
              fontSize: sizeStyles.fontSize,
              letterSpacing: sizeStyles.letterSpacing,
              lineHeight: sizeStyles.fontSize * 1.1,
            },
          ]}>
          TONIGHT
        </Text>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  heartContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  heartGradient: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  heart: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  textGradient: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  logoText: {
    fontWeight: '900',
    textAlign: 'center',
    color: 'white',
    fontFamily: 'System', // Use system font for better compatibility
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
});

export default TonightLogo;
