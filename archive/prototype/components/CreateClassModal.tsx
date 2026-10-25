
import React from 'react';
import { mockCoursePaths, mockTeachers, mockStudents } from '../data/mockData';
import { Class } from '../types';

interface CreateClassModalProps {
    isOpen: boolean;
    onClose: () => void;
    // classData?: Class; // For editing
}

const CreateClassModal: React.FC<CreateClassModalProps> = ({ isOpen, onClose }) => {
    if (!isOpen) {
        return null;
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg">
                <h2 className="text-2xl font-bold mb-4 text-primary-dark">إنشاء فصل دراسي جديد</h2>
                <form className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">اسم الفصل</label>
                        <input type="text" placeholder="مثال: تطوير الويب - دفعة يناير 2024" className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary" />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">المسار التعليمي</label>
                         <select className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary bg-white">
                             {mockCoursePaths.map(course => (
                                 <option key={course.id} value={course.id}>{course.title}</option>
                             ))}
                         </select>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">المعلم المسؤول</label>
                         <select className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary bg-white">
                             {mockTeachers.map(teacher => (
                                 <option key={teacher.id} value={teacher.id}>{teacher.fullName}</option>
                             ))}
                         </select>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">إضافة طلاب</label>
                         <p className="text-xs text-gray-500 mb-2">في تطبيق حقيقي، سيكون هذا حقل بحث متعدد الاختيارات.</p>
                          <div className="max-h-40 overflow-y-auto border rounded-md p-2">
                             {mockStudents.map(student => (
                                 <div key={student.id} className="flex items-center p-1">
                                    <input type="checkbox" id={`student-${student.id}`} className="ml-2"/>
                                    <label htmlFor={`student-${student.id}`}>{student.fullName}</label>
                                 </div>
                             ))}
                         </div>
                    </div>
                </form>
                <div className="mt-6 flex justify-end">
                    <button type="button" onClick={onClose} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 ml-3">
                        إغلاق
                    </button>
                    <button type="submit" className="bg-primary text-white font-bold py-2 px-6 rounded-lg hover:bg-primary-dark">
                        إنشاء الفصل
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CreateClassModal;
