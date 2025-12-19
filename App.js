// App.js
import { NavigationContainer } from '@react-navigation/native';
import * as Font from 'expo-font';
import * as Linking from 'expo-linking';
import { getAuth } from 'firebase/auth';
import { doc, getDoc, getFirestore } from 'firebase/firestore';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import Navigation from './navigation/Navigation';
import SplashScreen from './screens/SplashScreen';

const prefix = Linking.createURL('/');

export default function App() {
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const navigationRef = useRef(null);

  const linking = {
    prefixes: [prefix, 'swapism4://'],
    config: {
      screens: {
        UserProfile: 'profile/:userId',
        PostDetails: 'post/:postId',
        Welcome: 'welcome',
        Login: 'login',
        Signup: 'signup',
      },
    },
    async getInitialURL() {
      const url = await Linking.getInitialURL();
      if (url) {
        return url;
      }
      return null;
    },
    subscribe(listener) {
      const onReceiveURL = ({ url }) => {
        listener(url);
      };

      const subscription = Linking.addEventListener('url', onReceiveURL);
      return () => {
        subscription.remove();
      };
    },
  };

  useEffect(() => {
    async function loadFonts() {
      await Font.loadAsync({
        'Georgia': require('./assets/fonts/Georgia.ttf'),
        'TimesNewRoman': require('./assets/fonts/TimesNewRoman.ttf'),
      });
      setFontsLoaded(true);
    }

    loadFonts();
  }, []);

  useEffect(() => {
    if (fontsLoaded) {
      // Show splash screen for 2.5 seconds after fonts are loaded
      const timer = setTimeout(() => {
        setShowSplash(false);
      }, 2500);

      return () => clearTimeout(timer);
    }
  }, [fontsLoaded]);

  useEffect(() => {
    const handleDeepLink = async (url) => {
      if (!url) return;

      const { path } = Linking.parse(url);
      const auth = getAuth();
      const db = getFirestore();
      const currentUser = auth.currentUser;

      // Handle profile deep link
      if (path.startsWith('profile/')) {
        const userId = path.replace('profile/', '');
        
        if (!currentUser) {
          // User not logged in, redirect to signup/login
          navigationRef.current?.navigate('Welcome');
          return;
        }

        // Navigate to user profile
        setTimeout(() => {
          navigationRef.current?.navigate('UserProfile', { userId });
        }, 100);
      }

      // Handle post deep link
      if (path.startsWith('post/')) {
        const postId = path.replace('post/', '');
        
        if (!currentUser) {
          // User not logged in, redirect to signup/login
          navigationRef.current?.navigate('Welcome');
          return;
        }

        // Fetch the post and navigate
        try {
          const postRef = doc(db, 'wardrobe-plug-fyp/user/images', postId);
          const postSnap = await getDoc(postRef);
          
          if (postSnap.exists()) {
            const post = { id: postSnap.id, ...postSnap.data() };
            setTimeout(() => {
              navigationRef.current?.navigate('PostDetails', { post });
            }, 100);
          }
        } catch (error) {
          console.error('Error fetching post:', error);
        }
      }
    };

    // Handle initial URL
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink(url);
    });

    // Handle URL changes while app is running
    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleDeepLink(url);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#9abeaa" />
      </View>
    );
  }

  if (showSplash) {
    return <SplashScreen />;
  }

  return (
    <NavigationContainer ref={navigationRef} linking={linking}>
      <Navigation />
    </NavigationContainer>
  );
}
