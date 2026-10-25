import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';

// Page Imports
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardLayout from './pages/dashboard/DashboardLayout';
import DashboardIndex from './pages/dashboard/DashboardIndex';
import StudentCoursesPage from './pages/dashboard/StudentCoursesPage';
import CoursePage from './pages/dashboard/CoursePage';
import StudentGradesPage from './pages/dashboard/StudentGradesPage';
import CommunityPage from './pages/dashboard/CommunityPage';
import TeacherAssignmentsPage from './pages/dashboard/TeacherAssignmentsPage';
import AdminUsersPage from './pages/dashboard/AdminUsersPage';
import AdminCoursesPage from './pages/dashboard/AdminCoursesPage';
import AdminClassesPage from './pages/dashboard/AdminClassesPage';
import AdminReportsPage from './pages/dashboard/AdminReportsPage';
import SettingsPage from './pages/dashboard/SettingsPage';
import NewCourseBuilderPage from './pages/dashboard/NewCourseBuilderPage';
import ComingSoonPage from './pages/dashboard/ComingSoonPage';

// A wrapper for protected routes
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, isLoading } = useAuth();
    if (isLoading) {
        return <div>Loading...</div>; // Or a spinner component
    }
    if (!user) {
        return <Navigate to="/login" replace />;
    }
    return <>{children}</>;
};

function AppRoutes() {
    return (
        <Routes>
            {/* Public Routes */}
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Protected Dashboard Routes */}
            <Route
                path="/dashboard"
                element={
                    <ProtectedRoute>
                        <DashboardLayout />
                    </ProtectedRoute>
                }
            >
                <Route index element={<DashboardIndex />} />
                
                {/* Student Routes */}
                <Route path="my-courses" element={<StudentCoursesPage />} />
                <Route path="my-courses/:courseId" element={<CoursePage />} />
                <Route path="grades" element={<StudentGradesPage />} />
                <Route path="community/:classId" element={<CommunityPage />} />

                {/* Teacher Routes */}
                <Route path="my-classes" element={<ComingSoonPage title="فصولي" />} />
                <Route path="assignments" element={<TeacherAssignmentsPage />} />

                {/* Admin Routes */}
                <Route path="users" element={<AdminUsersPage />} />
                <Route path="all-courses" element={<AdminCoursesPage />} />
                <Route path="all-courses/builder/:courseId" element={<NewCourseBuilderPage />} />
                <Route path="classes" element={<AdminClassesPage />} />
                <Route path="reports" element={<AdminReportsPage />} />

                {/* Common Routes */}
                <Route path="settings" element={<SettingsPage />} />
                
                {/* Fallback for any other dashboard route */}
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Route>

            {/* Fallback for any other route */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}

function App() {
    return (
        <Router>
            <AuthProvider>
                <AppRoutes />
            </AuthProvider>
        </Router>
    );
}

export default App;