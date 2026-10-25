import React from 'react';
import { CoursePath, Module, Chapter } from '../../types';
import { PlusCircleIcon, Trash2Icon } from '../Icons';

interface Step2Props {
    courseData: Partial<CoursePath>;
    setCourseData: React.Dispatch<React.SetStateAction<Partial<CoursePath>>>;
}

const Step2CurriculumBuilder: React.FC<Step2Props> = ({ courseData, setCourseData }) => {

    const addModule = () => {
        const newModule: Module = {
            id: `mod-${Date.now()}`,
            title: `مستوى جديد ${ (courseData.modules?.length || 0) + 1}`,
            chapters: [],
        };
        setCourseData(prev => ({ ...prev, modules: [...(prev.modules || []), newModule] }));
    };

    const addChapter = (moduleId: string) => {
        const newChapter: Chapter = {
            id: `ch-${Date.now()}`,
            title: 'درس جديد',
            contentBlocks: [],
        };
        setCourseData(prev => ({
            ...prev,
            modules: prev.modules?.map(m => m.id === moduleId ? { ...m, chapters: [...m.chapters, newChapter] } : m)
        }));
    };
    
    // Add remove and update functions similarly...

    return (
        <div className="space-y-4">
            <h3 className="text-xl font-bold text-primary-dark">بناء المنهج الدراسي</h3>
            {(courseData.modules || []).map(module => (
                <div key={module.id} className="border p-4 rounded-lg bg-gray-50 space-y-3">
                    <input 
                        type="text"
                        defaultValue={module.title}
                        className="w-full text-lg font-semibold p-2 border-b-2 focus:outline-none focus:border-primary bg-transparent"
                    />
                    {module.chapters.map(chapter => (
                        <div key={chapter.id} className="bg-white p-3 rounded-md shadow-sm flex justify-between items-center">
                            <input type="text" defaultValue={chapter.title} className="w-full focus:outline-none" />
                            <button className="text-red-500 hover:text-red-700"><Trash2Icon className="w-5 h-5"/></button>
                        </div>
                    ))}
                     <button onClick={() => addChapter(module.id)} className="w-full flex items-center justify-center p-2 border-2 border-dashed rounded-md text-sm text-gray-500 hover:text-primary">
                        <PlusCircleIcon className="w-4 h-4 ml-2"/> إضافة درس
                    </button>
                </div>
            ))}
            <button onClick={addModule} className="w-full flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-primary transition-colors">
                <PlusCircleIcon className="w-6 h-6 ml-2"/>
                إضافة مستوى (وحدة) جديد
            </button>
        </div>
    );
};

export default Step2CurriculumBuilder;
