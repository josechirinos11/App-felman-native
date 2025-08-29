import { Image, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function LogoHeader() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.logoContainer}>
        <Image source={require('../assets/images/logo.png')} style={styles.logo} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({  container: {
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 3,
    // Shadow for iOS and Web
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
  },  logoContainer: {
    backgroundColor: '#f3f4f6',
    padding: 12,
    borderRadius: 15,
    elevation: 3,
    // Shadow for iOS and Web
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
  },
  logo: {
    width: 120,
    height: 60,
    resizeMode: 'contain',
  },
});
