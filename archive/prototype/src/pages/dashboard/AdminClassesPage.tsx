
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { mockClasses } from '../../data/mockData';
import { BookOpenIcon, PlusCircleIcon, EditIcon, Trash2Icon } from '../../components/Icons';
import CreateClassModal from '../../components/CreateClassModal';


const AdminClassesPage: React.FC = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold text-gray-800 flex items-center">
                    <BookOpenIcon className="w-8 h-8 ml-3 text-primary" />
                    إدارة الفصول الدراسية
                </h2>
                <button 
                    onClick={() => setIsModalOpen(true)}
                    className="bg-primary text-white font-bold py-2 px-4 rounded-lg hover:bg-primary-dark transition-colors flex items-center">
                    <PlusCircleIcon className="w-5 h-5 ml-2" />
                    إنشاء فصل جديد
                </button>
            </div>

            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-right">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="p-4 font-semibold text-gray-600">اسم الفصل</th>
                                <th className="p-4 font-semibold text-gray-600">المسار التعليمي</th>
                                <th className="p-4 font-semibold text-gray-600">المعلم المسؤول</th>
                                <th className="p-4 font-semibold text-gray-600">عدد الطلاب</th>
                                <th className="p-4 font-semibold text-gray-600">إجراءات</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {mockClasses.map(cls => (
                                <tr key={cls.id} className="hover:bg-gray-50">
                                    <td className="p-4 font-semibold text-gray-900">{cls.name}</td>
                                    <td className="p-4 text-gray-600">{cls.coursePath.title}</td>
                                    <td className="p-4 text-gray-600">{cls.teacher.fullName}</td>
                                    <td className="p-4 text-gray-600">{cls.students.length}</td>
                                    <td className="p-4 whitespace-nowrap">
                                        <div className="flex space-x-2 space-x-reverse">
                                            <button className="text-gray-500 hover:text-blue-600 p-1" title="تعديل">
                                                <EditIcon className="w-5 h-5"/>
                                            </button>
                                            <button className="text-gray-500 hover:text-red-600 p-1" title="حذف"><Trash2Icon className="w-5 h-5"/></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
             <CreateClassModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
        </div>
    );
};

export default AdminClassesPage;