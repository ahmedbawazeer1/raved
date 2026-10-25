
import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { UserRole } from '../types';
import { useNavigate } from 'react-router-dom';

const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = (role: UserRole) => {
    login(role);
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md text-center">
        <h1 className="text-3xl font-bold text-primary-dark mb-2">تسجيل الدخول التجريبي</h1>
        <p className="text-gray-600 mb-8">اختر دورًا للدخول إلى لوحة التحكم الخاصة به.</p>
        
        <div className="space-y-4">
          <button
            onClick={() => handleLogin(UserRole.STUDENT)}
            className="w-full bg-primary text-white font-bold py-3 px-4 rounded-lg hover:bg-primary-dark transition-colors duration-300"
          >
            الدخول كـ طالب
          </button>
          <button
            onClick={() => handleLogin(UserRole.TEACHER)}
            className="w-full bg-green-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-700 transition-colors duration-300"
          >
            الدخول كـ معلم
          </button>
          <button
            onClick={() => handleLogin(UserRole.ADMIN)}
            className="w-full bg-red-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-red-700 transition-colors duration-300"
          >
            الدخول كـ إداري
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;