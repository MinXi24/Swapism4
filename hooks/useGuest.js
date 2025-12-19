/**
 * GUEST MODE CUSTOM HOOK
 * 
 * Manages guest user state and provides utilities to check guest status
 * and handle guest-specific limitations throughout the app
 */

import { getAuth } from 'firebase/auth';
import { useEffect, useState } from 'react';

export const useGuest = () => {
  const [isGuest, setIsGuest] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const auth = getAuth();

  useEffect(() => {
    const checkGuestStatus = () => {
      const currentUser = auth.currentUser;
      
      // User is a guest if they're not authenticated
      const guestStatus = !currentUser;
      
      setIsGuest(guestStatus);
      setIsLoading(false);
    };

    // Check immediately
    checkGuestStatus();

    // Listen for auth state changes
    const unsubscribe = auth.onAuthStateChanged(() => {
      checkGuestStatus();
    });

    return () => unsubscribe();
  }, [auth]);

  return {
    isGuest,
    isLoading,
  };
};

export default useGuest;
