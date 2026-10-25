
import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { mockCoursePaths, mockStudentProgress, mockStudentGrades } from '../../data/mockData';
import { BookOpenIcon, BarChartIcon } from '../../components/Icons';

const StudentDashboard: React.FC = () => {
    const { user } = useAuth();
    
    // Mock data - in a real app, this would be fetched based on the user's ID
    const enrolledCourses = mockCoursePaths.slice(0, 2);
    const recentGrades = mockStudentGrades.slice(0, 3);

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-gray-800">مرحباً بعودتك، {user?.fullName.split(' ')[0]}!</h1>
                <p className="text-gray-600 mt-1">هنا ملخص سريع لنشاطك التعليمي.</p>
            </div>

            {/* My Courses */}
            <div className="bg-white p-6 rounded-lg shadow-md">
                 <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-primary-dark flex items-center">
                        <BookOpenIcon className="w-6 h-6 ml-2"/>
                        مساراتي الحالية
                    </h2>
                    <Link to="/dashboard/my-courses" className="text-sm font-semibold text-primary hover:underline">
                        عرض الكل
                    </Link>
                </div>
                <div className="space-y-4">
                    {enrolledCourses.map(course => {
                         const progress = mockStudentProgress[course.id as keyof typeof mockStudentProgress] || { completedChapters: [] };
                         const totalChapters = course.modules.reduce((acc, mod) => acc + (mod.chapters?.length || 0), 0);
                         const completedPercentage = totalChapters > 0 ? Math.round((progress.completedChapters.length / totalChapters) * 100) : 0;
                        return (
                             <div key={course.id} className="p-4 border rounded-lg">
                                 <div className="flex justify-between items-center">
                                    <h3 className="font-bold">{course.title}</h3>
                                     <Link to={`/dashboard/my-courses/${course.id}`} className="bg-primary-light text-white text-sm font-bold py-1 px-3 rounded-full hover:bg-primary">
                                        استئناف
                                    </Link>
                                 </div>
                                 <div className="flex items-center mt-2">
                                     <div className="w-full bg-gray-200 rounded-full h-2 mr-4">
                                         <div className="bg-primary h-2 rounded-full" style={{ width: `${completedPercentage}%` }}></div>
                                     </div>
                                     <span className="text-sm font-semibold text-gray-600">{completedPercentage}%</span>
                                 </div>
                             </div>
                        );
                    })}
                </div>
            </div>

             {/* Recent Grades */}
            <div className="bg-white p-6 rounded-lg shadow-md">
                 <div className="flex justify-between items-center mb-4">
                     <h2 className="text-xl font-bold text-primary-dark flex items-center">
                         <BarChartIcon className="w-6 h-6 ml-2" />
                         آخر التقديرات
                    </h2>
                     <Link to="/dashboard/grades" className="text-sm font-semibold text-primary hover:underline">
                        عرض السجل الكامل
                    </Link>
                </div>
                <ul className="divide-y divide-gray-200">
                    {recentGrades.map((grade, index) => (
                        <li key={index} className="py-3 flex justify-between items-center">
                            <span className="font-semibold text-gray-700">{grade.assignmentTitle}</span>
                            <span className="font-bold text-lg text-green-600">{grade.score}/{grade.total}</span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

export default StudentDashboard;