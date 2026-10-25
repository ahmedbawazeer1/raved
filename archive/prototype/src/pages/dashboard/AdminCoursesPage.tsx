import React from 'react';
import { Link } from 'react-router-dom';
import { mockCoursePaths } from '../../data/mockData';
import { BookOpenIcon, PlusCircleIcon, EditIcon, Trash2Icon } from '../../components/Icons';

const AdminCoursesPage: React.FC = () => {
    // In a real app, you might have state and handlers for deleting courses.
    // const [courses, setCourses] = useState(mockCoursePaths);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold text-gray-800 flex items-center">
                    <BookOpenIcon className="w-8 h-8 ml-3 text-primary" />
                    إدارة المسارات التعليمية
                </h2>
                <Link
                    to="/dashboard/all-courses/builder/new"
                    className="bg-primary text-white font-bold py-2 px-4 rounded-lg hover:bg-primary-dark transition-colors flex items-center"
                >
                    <PlusCircleIcon className="w-5 h-5 ml-2" />
                    إنشاء مسار جديد
                </Link>
            </div>

            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-right">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="p-4 font-semibold text-gray-600">المسار التعليمي</th>
                                <th className="p-4 font-semibold text-gray-600">المنسق</th>
                                <th className="p-4 font-semibold text-gray-600">عدد المستويات</th>
                                <th className="p-4 font-semibold text-gray-600">إجراءات</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {mockCoursePaths.map(course => (
                                <tr key={course.id} className="hover:bg-gray-50">
                                    <td className="p-4">
                                        <div className="flex items-center">
                                            <img src={course.imageUrl} alt={course.title} className="w-16 h-10 object-cover rounded ml-4" />
                                            <div>
                                                <p className="font-semibold text-gray-900">{course.title}</p>
                                                <p className="text-sm text-gray-500">{course.description.substring(0, 40)}...</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4 whitespace-nowrap text-gray-600">{course.teacher.fullName}</td>
                                    <td className="p-4 whitespace-nowrap text-gray-600">{course.modules.length}</td>
                                    <td className="p-4 whitespace-nowrap">
                                        <div className="flex space-x-2 space-x-reverse">
                                            <Link
                                                to={`/dashboard/all-courses/builder/${course.id}`}
                                                className="text-gray-500 hover:text-blue-600 p-1"
                                                title="بناء/تعديل المسار"
                                            >
                                                <EditIcon className="w-5 h-5" />
                                            </Link>
                                            <button className="text-gray-500 hover:text-red-600 p-1" title="حذف">
                                                <Trash2Icon className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
             {mockCoursePaths.length === 0 && (
                <div className="text-center py-8 bg-white rounded-lg shadow-md">
                    <p className="text-gray-500">لا توجد مسارات تعليمية لعرضها. ابدأ بإنشاء واحد جديد!</p>
                </div>
            )}
        </div>
    );
};

export default AdminCoursesPage;