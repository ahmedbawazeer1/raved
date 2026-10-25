import React from 'react';
import { Link } from 'react-router-dom';
import { mockCoursePaths, mockStudentProgress } from '../../data/mockData';
import { BookOpenIcon } from '../../components/Icons';

const StudentCoursesPage: React.FC = () => {
    // In a real app, this would be filtered by the student's enrollments
    const enrolledCourses = mockCoursePaths;

    return (
        <div className="space-y-6">
            <div className="flex items-center">
                <div className="p-2 bg-primary-light text-white rounded-full mr-3">
                    <BookOpenIcon className="w-6 h-6" />
                </div>
                <h1 className="text-3xl font-bold text-gray-800">مساراتي التعليمية</h1>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {enrolledCourses.map(course => {
                    const progress = mockStudentProgress[course.id as keyof typeof mockStudentProgress] || { completedChapters: [] };
                    const totalChapters = course.modules.reduce((acc, mod) => acc + (mod.chapters?.length || 0), 0);
                    const completedPercentage = totalChapters > 0 ? Math.round((progress.completedChapters.length / totalChapters) * 100) : 0;

                    return (
                        <Link to={`/dashboard/my-courses/${course.id}`} key={course.id} className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden flex flex-col">
                            <img src={course.imageUrl} alt={course.title} className="w-full h-40 object-cover" />
                            <div className="p-4 flex flex-col flex-grow">
                                <h3 className="text-lg font-bold text-primary-dark mb-2">{course.title}</h3>
                                <p className="text-sm text-gray-600 mb-4 flex-grow">{course.description.substring(0, 100)}...</p>
                                <div className="mt-auto">
                                    <div className="flex justify-between items-center text-sm text-gray-600 mb-1">
                                        <span>التقدم</span>
                                        <span>{completedPercentage}%</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                                        <div className="bg-primary h-2.5 rounded-full" style={{ width: `${completedPercentage}%` }}></div>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
};

export default StudentCoursesPage;