

import React, { createContext, useContext, useState, ReactNode } from 'react';
// FIX: The following imports will work now that the corresponding files have content and exports.
import { User, UserRole } from '../types';
// FIX: Corrected import from mockTeacher to mockTeachers.
import { mockTeachers, mockAdmin, mockStudents } from '../data/mockData';

const mockStudentWithId1 = mockStudents[0];

interface AuthContextType {
  user: User | null;
  login: (role: UserRole) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  React.useEffect(() => {
    // Simulate checking for a logged-in user
    setTimeout(() => {
      setIsLoading(false);
    }, 500);
  }, []);

  const login = (role: UserRole) => {
    // In a real app, this would involve an API call
    switch (role) {
      case UserRole.STUDENT:
        setUser(mockStudentWithId1);
        break;
      case UserRole.TEACHER:
        // FIX: Use the first teacher from the mockTeachers array as mockTeacher is not exported.
        setUser(mockTeachers[0]);
        break;
      case UserRole.ADMIN:
        setUser(mockAdmin);
        break;
      default:
        setUser(null);
    }
  };

  const logout = () => {
    setUser(null);
  };

  const value = { user, login, logout, isLoading };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};