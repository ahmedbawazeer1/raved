import React from 'react';
import { ContentBlockType } from '../types';
import { UsersIcon, BookOpenIcon, BarChartIcon } from './Icons'; // Using existing icons for demo

interface AddBlockModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAddBlock: (type: ContentBlockType) => void;
}

const AddBlockModal: React.FC<AddBlockModalProps> = ({ isOpen, onClose, onAddBlock }) => {
    if (!isOpen) return null;

    const blockTypes: { type: ContentBlockType; label: string; icon: React.ReactNode }[] = [
        { type: 'text', label: 'نص', icon: <BookOpenIcon className="w-8 h-8"/> },
        { type: 'image', label: 'صورة', icon: <UsersIcon className="w-8 h-8"/> },
        { type: 'video', label: 'فيديو', icon: <BarChartIcon className="w-8 h-8"/> },
        { type: 'quiz', label: 'اختبار قصير', icon: <BarChartIcon className="w-8 h-8"/> },
    ];

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-2xl">
                <div className="flex justify-between items-center border-b pb-3 mb-4">
                    <h2 className="text-xl font-bold text-primary-dark">إضافة محتوى جديد</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800">&times;</button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {blockTypes.map(block => (
                        <div key={block.type} 
                             onClick={() => onAddBlock(block.type)}
                             className="flex flex-col items-center justify-center p-4 border rounded-lg hover:bg-primary-light hover:text-white hover:border-primary cursor-pointer transition-colors">
                            <div className="mb-2">
                                {block.icon}
                            </div>
                            <span className="font-semibold">{block.label}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default AddBlockModal;
