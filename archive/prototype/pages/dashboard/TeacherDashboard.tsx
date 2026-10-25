
import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { mockClasses } from '../../data/mockData';
import { BookOpenIcon, UsersIcon } from '../../components/Icons';

const TeacherDashboard: React.FC = () => {
    const { user } = useAuth();
    // Filter classes for the current teacher
    const myClasses = mockClasses.filter(c => c.teacher.id === user?.id);

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-gray-800">أهلاً بك، {user?.fullName}!</h1>
                <p className="text-gray-600 mt-1">إليك نظرة عامة على فصولك الدراسية الحالية.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                {myClasses.map(cls => (
                     <div key={cls.id} className="bg-white rounded-lg shadow-md p-6 transform hover:-translate-y-1 transition-transform">
                        <h3 className="text-xl font-bold text-primary-dark mb-2">{cls.name}</h3>
                        <p className="text-gray-600 text-sm mb-4 flex items-center">
                             <BookOpenIcon className="w-4 h-4 ml-2" />
                            {cls.coursePath.title}
                        </p>
                         <div className="flex items-center text-gray-700 mb-6">
                             <UsersIcon className="w-5 h-5 ml-2" />
                            <span className="font-semibold">{cls.students.length} طالب</span>
                        </div>
                        <div className="flex gap-4">
                             <Link to={`/dashboard/community/comm-1`} className="flex-1 text-center bg-primary text-white font-bold py-2 px-4 rounded-lg hover:bg-primary-dark transition-colors">
                                إدارة الفصل
                            </Link>
                             <Link to="/dashboard/assignments" className="flex-1 text-center bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors">
                                عرض الواجبات
                            </Link>
                        </div>
                    </div>
                ))}
            </div>

             {myClasses.length === 0 && (
                 <div className="bg-white p-8 rounded-lg shadow-md text-center">
                     <h3 className="text-xl font-semibold text-gray-700">لم يتم تعيين فصول لك بعد.</h3>
                    <p className="text-gray-500 mt-2">يرجى التواصل مع الإدارة لإضافتك إلى الفصول الدراسية.</p>
                </div>
            )}
        </div>
    );
};

export default TeacherDashboard;
