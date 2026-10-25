
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
// FIX: These imports will work correctly once the corresponding files have exported content.
import { UserRole } from '../../types';
import StudentDashboard from './StudentDashboard';
import TeacherDashboard from './TeacherDashboard';
import AdminDashboard from './AdminDashboard';

const DashboardIndex: React.FC = () => {
    const { user } = useAuth();

    switch (user?.role) {
        case UserRole.STUDENT:
            return <StudentDashboard />;
        case UserRole.TEACHER:
            return <TeacherDashboard />;
        case UserRole.ADMIN:
            return <AdminDashboard />;
        default:
            return <Navigate to="/login" replace />;
    }
};

export default DashboardIndex;