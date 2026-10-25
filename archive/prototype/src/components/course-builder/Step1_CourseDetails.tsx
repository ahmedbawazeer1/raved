import React from 'react';
import { CoursePath } from '../../types';
import { mockTeachers } from '../../data/mockData';
import FileUpload from './FileUpload';

interface Step1Props {
    courseData: Partial<CoursePath>;
    setCourseData: React.Dispatch<React.SetStateAction<Partial<CoursePath>>>;
}

const Step1CourseDetails: React.FC<Step1Props> = ({ courseData, setCourseData }) => {
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setCourseData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleTeacherChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const teacher = mockTeachers.find(t => t.id === e.target.value);
        if (teacher) {
            setCourseData(prev => ({ ...prev, teacher }));
        }
    };
    
    return (
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">عنوان المسار</label>
                <input
                    type="text"
                    name="title"
                    value={courseData.title || ''}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                    placeholder="مثال: مقدمة في تطوير الويب"
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">وصف المسار</label>
                <textarea
                    name="description"
                    value={courseData.description || ''}
                    onChange={handleChange}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                    placeholder="اشرح ما سيتعلمه الطالب في هذا المسار."
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">المنسق (المعلم)</label>
                <select
                    name="teacher"
                    value={courseData.teacher?.id || ''}
                    onChange={handleTeacherChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary bg-white"
                >
                    {mockTeachers.map(teacher => (
                        <option key={teacher.id} value={teacher.id}>{teacher.fullName}</option>
                    ))}
                </select>
            </div>
             <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">صورة المسار</label>
                <FileUpload
                    onFileUpload={(file) => {
                        // In a real app, upload the file and set the URL
                        const imageUrl = URL.createObjectURL(file);
                        setCourseData(prev => ({ ...prev, imageUrl }));
                    }}
                />
                {courseData.imageUrl && <img src={courseData.imageUrl} alt="preview" className="mt-4 h-32 w-auto rounded"/>}
            </div>
        </div>
    );
};

export default Step1CourseDetails;