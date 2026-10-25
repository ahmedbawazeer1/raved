import React from 'react';
import { mockStudentGrades } from '../../data/mockData';
import { BarChartIcon } from '../../components/Icons';

const StudentGradesPage: React.FC = () => {
    
    const getGradeColor = (score: number, total: number) => {
        const percentage = (score / total) * 100;
        if (percentage >= 90) return 'text-green-600';
        if (percentage >= 75) return 'text-blue-600';
        if (percentage >= 50) return 'text-yellow-600';
        return 'text-red-600';
    };

    return (
        <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center mb-6">
                <div className="p-2 bg-primary-light text-white rounded-full mr-3">
                    <BarChartIcon className="w-6 h-6"/>
                </div>
                <h3 className="text-2xl font-bold text-primary-dark">سجل التقديرات</h3>
            </div>
            
            <div className="overflow-x-auto">
                <table className="w-full text-right">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="p-4 font-semibold text-gray-600">التقييم</th>
                            <th className="p-4 font-semibold text-gray-600">الدرجة</th>
                            <th className="p-4 font-semibold text-gray-600">النسبة المئوية</th>
                            <th className="p-4 font-semibold text-gray-600">تاريخ التقييم</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {mockStudentGrades.map((grade, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                                <td className="p-4 font-semibold text-gray-800">{grade.assignmentTitle}</td>
                                <td className={`p-4 font-bold text-lg ${getGradeColor(grade.score, grade.total)}`}>
                                    {grade.score} / {grade.total}
                                </td>
                                <td className="p-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                        <span className="text-gray-600 mr-2">{((grade.score / grade.total) * 100).toFixed(1)}%</span>
                                        <div className="w-24 bg-gray-200 rounded-full h-2.5">
                                             <div className="bg-primary h-2.5 rounded-full" style={{width: `${(grade.score / grade.total) * 100}%`}}></div>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-4 text-gray-600">{grade.date}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
             {mockStudentGrades.length === 0 && (
                <p className="text-center text-gray-500 py-8">لا توجد تقديرات لعرضها.</p>
            )}
        </div>
    );
};

export default StudentGradesPage;
