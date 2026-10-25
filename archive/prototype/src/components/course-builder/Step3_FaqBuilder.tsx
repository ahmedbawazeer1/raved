import React from 'react';
import { CoursePath, FAQItem } from '../../types';
import { PlusCircleIcon, Trash2Icon } from '../Icons';

interface Step3Props {
    courseData: Partial<CoursePath>;
    setCourseData: React.Dispatch<React.SetStateAction<Partial<CoursePath>>>;
}

const Step3FaqBuilder: React.FC<Step3Props> = ({ courseData, setCourseData }) => {
    
    const addFaq = () => {
        const newFaq: FAQItem = {
            id: `faq-${Date.now()}`,
            question: '',
            answer: '',
        };
        setCourseData(prev => ({ ...prev, faqs: [...(prev.faqs || []), newFaq] }));
    };

    const updateFaq = (id: string, field: 'question' | 'answer', value: string) => {
        setCourseData(prev => ({
            ...prev,
            faqs: prev.faqs?.map(faq => faq.id === id ? { ...faq, [field]: value } : faq)
        }));
    };

    const removeFaq = (id: string) => {
        setCourseData(prev => ({
            ...prev,
            faqs: prev.faqs?.filter(faq => faq.id !== id)
        }));
    };
    
    return (
        <div className="space-y-4">
             <h3 className="text-xl font-bold text-primary-dark">إضافة الأسئلة الشائعة</h3>
             {(courseData.faqs || []).map(faq => (
                 <div key={faq.id} className="border p-4 rounded-lg bg-gray-50 space-y-2">
                     <div className="flex justify-between items-center">
                        <label className="text-sm font-medium text-gray-700">السؤال</label>
                        <button onClick={() => removeFaq(faq.id)} className="text-red-500 hover:text-red-700"><Trash2Icon className="w-5 h-5"/></button>
                     </div>
                     <input 
                         type="text"
                         value={faq.question}
                         onChange={(e) => updateFaq(faq.id, 'question', e.target.value)}
                         className="w-full p-2 border rounded-md"
                     />
                     <label className="block text-sm font-medium text-gray-700 pt-2">الإجابة</label>
                     <textarea
                         value={faq.answer}
                         onChange={(e) => updateFaq(faq.id, 'answer', e.target.value)}
                         rows={3}
                         className="w-full p-2 border rounded-md"
                     />
                 </div>
             ))}
            <button onClick={addFaq} className="w-full flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-primary transition-colors">
                <PlusCircleIcon className="w-6 h-6 ml-2" />
                إضافة سؤال جديد
            </button>
        </div>
    );
};

export default Step3FaqBuilder;