import React from 'react';
import { Navigate } from 'react-router-dom';

const CourseBuilderPage: React.FC = () => {
    // This component is deprecated in favor of NewCourseBuilderPage.
    // Redirecting to the main courses page.
    return <Navigate to="/dashboard/all-courses" replace />;
};

export default CourseBuilderPage;