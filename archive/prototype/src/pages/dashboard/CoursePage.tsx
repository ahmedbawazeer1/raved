import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { mockCoursePaths, mockStudentProgress } from '../../data/mockData';
import { BookOpenIcon, CheckCircleIcon } from '../../components/Icons';

const CoursePage: React.FC = () => {
    const { courseId } = useParams<{ courseId: string }>();
    const course = mockCoursePaths.find(c => c.id === courseId);
    const progress = mockStudentProgress[courseId as keyof typeof mockStudentProgress] || { completedChapters: [] };

    if (!course) {
        return <div className="text-center p-8 bg-white rounded-lg shadow-md">لم يتم العثور على المسار التعليمي.</div>;
    }

    const totalChapters = course.modules.reduce((acc, mod) => acc + mod.chapters.length, 0);
    const completedPercentage = totalChapters > 0 ? Math.round((progress.completedChapters.length / totalChapters) * 100) : 0;

    return (
        <div className="space-y-6">
            {/* Course Header */}
            <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex flex-col md:flex-row gap-6">
                    <img src={course.imageUrl} alt={course.title} className="w-full md:w-1/3 h-48 object-cover rounded-lg" />
                    <div className="flex-1">
                        <h1 className="text-3xl font-bold text-gray-800">{course.title}</h1>
                        <p className="text-gray-600 mt-2">{course.description}</p>
                        <p className="text-sm text-gray-500 mt-4">المنسق: {course.teacher.fullName}</p>
                        <div className="mt-4">
                            <div className="flex justify-between items-center text-sm text-gray-600 mb-1">
                                <span>التقدم</span>
                                <span>{completedPercentage}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2.5">
                                <div className="bg-primary h-2.5 rounded-full" style={{ width: `${completedPercentage}%` }}></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Curriculum */}
            <div className="bg-white rounded-lg shadow-md p-6">
                 <h2 className="text-2xl font-bold text-primary-dark mb-4 flex items-center">
                    <BookOpenIcon className="w-6 h-6 ml-2" />
                    المنهج الدراسي
                </h2>
                <div className="space-y-4">
                    {course.modules.map((module, moduleIndex) => (
                        <div key={module.id} className="border rounded-lg p-4">
                            <h3 className="font-bold text-xl text-gray-700 mb-3">المستوى {moduleIndex + 1}: {module.title}</h3>
                            <ul className="divide-y divide-gray-200">
                                {module.chapters.map(chapter => {
                                    const isCompleted = progress.completedChapters.includes(chapter.id);
                                    return (
                                        <li key={chapter.id} className="py-3 flex justify-between items-center">
                                            <div className="flex items-center">
                                                {isCompleted ? 
                                                    <CheckCircleIcon className="w-5 h-5 text-green-500 ml-3" /> : 
                                                    <div className="w-5 h-5 border-2 border-gray-300 rounded-full ml-3" />
                                                }
                                                <span className={`font-medium ${isCompleted ? 'text-gray-500 line-through' : 'text-gray-800'}`}>{chapter.title}</span>
                                            </div>
                                            <Link to="#" className="text-sm font-semibold text-primary hover:underline">
                                                ابدأ الدرس
                                            </Link>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default CoursePage;