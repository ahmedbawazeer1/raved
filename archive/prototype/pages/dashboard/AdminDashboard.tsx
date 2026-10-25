import React from 'react';
import { Link } from 'react-router-dom';
import { UsersIcon, BookOpenIcon } from '../../components/Icons';
import { allMockUsers, mockCoursePaths } from '../../data/mockData';
import { UserRole } from '../../types';

const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: string | number; link: string; }> = ({ icon, label, value, link }) => (
    <Link to={link} className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow flex items-center">
        <div className="p-3 bg-primary-light text-white rounded-full mr-4">
            {icon}
        </div>
        <div>
            <p className="text-3xl font-bold text-gray-800">{value}</p>
            <p className="text-gray-500">{label}</p>
        </div>
    </Link>
);


const AdminDashboard: React.FC = () => {
    const totalStudents = allMockUsers.filter(u => u.role === UserRole.STUDENT).length;
    const totalTeachers = allMockUsers.filter(u => u.role === UserRole.TEACHER).length;
    const totalCourses = mockCoursePaths.length;

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold text-gray-800">لوحة تحكم الإدارة</h2>
            
            {/* Stats */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                <StatCard icon={<UsersIcon className="w-8 h-8"/>} label="إجمالي الطلاب" value={totalStudents} link="/dashboard/users" />
                <StatCard icon={<UsersIcon className="w-8 h-8"/>} label="إجمالي المعلمين" value={totalTeachers} link="/dashboard/users" />
                <StatCard icon={<BookOpenIcon className="w-8 h-8"/>} label="إجمالي المسارات" value={totalCourses} link="/dashboard/all-courses" />
            </div>

            {/* Recent Activity or Quick Actions */}
            <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-bold text-primary-dark mb-4">إجراءات سريعة</h3>
                 <div className="flex flex-wrap gap-4">
                    <Link to="/dashboard/users" className="bg-primary text-white font-bold py-2 px-4 rounded-lg hover:bg-primary-dark transition-colors">
                        إدارة المستخدمين
                    </Link>
                    <Link to="/dashboard/all-courses" className="bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 transition-colors">
                        إدارة المسارات التعليمية
                    </Link>
                     <Link to="/dashboard/reports" className="bg-yellow-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-yellow-600 transition-colors">
                        عرض التقارير
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;