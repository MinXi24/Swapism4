import { createContext, useContext, useState } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [isGuest, setIsGuest] = useState(false);

  const enterGuestMode = () => {
    setIsGuest(true);
  };

  const exitGuestMode = () => {
    setIsGuest(false);
  };

  return (
    <AuthContext.Provider value={{ isGuest, enterGuestMode, exitGuestMode }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

// Keep backward compatibility
export const GuestContext = AuthContext;
export function useGuest() {
  return useAuth();
}
