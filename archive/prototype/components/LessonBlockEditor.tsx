import React from 'react';
import { Chapter, ContentBlock } from '../types';
import { PlusCircleIcon, Trash2Icon } from './Icons';

interface LessonBlockEditorProps {
    chapter: Chapter;
    onOpenAddBlock: () => void;
    // onUpdateChapter: (updatedChapter: Chapter) => void; // For real implementation
}

const LessonBlockEditor: React.FC<LessonBlockEditorProps> = ({ chapter, onOpenAddBlock }) => {
    
    const renderBlock = (block: ContentBlock) => {
        switch (block.type) {
            case 'text':
                return (
                    <textarea 
                        defaultValue={block.content}
                        className="w-full h-24 p-2 border rounded" 
                        placeholder="اكتب نص الدرس هنا..."
                    />
                );
            case 'image':
                return (
                     <div>
                        <input 
                            type="text"
                            defaultValue={block.content}
                            className="w-full p-2 border rounded mb-2" 
                            placeholder="أدخل رابط الصورة..."
                        />
                         {block.content && <img src={block.content} alt="Lesson content" className="mt-2 max-h-60 rounded" />}
                    </div>
                );
            // Add cases for video, quiz etc.
            default:
                return <p>نوع محتوى غير معروف: {block.type}</p>
        }
    };
    
    return (
        <div className="bg-white p-6 rounded-lg shadow-md space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">عنوان الفصل</label>
                <input 
                    type="text" 
                    defaultValue={chapter.title}
                    className="w-full text-xl font-bold p-2 border-b-2 focus:outline-none focus:border-primary"
                />
            </div>
            
            <h3 className="text-lg font-semibold text-gray-700 pt-4 border-t">محتوى الدرس</h3>

            {(chapter.contentBlocks || []).map((block) => (
                <div key={block.id} className="border p-4 rounded-lg bg-gray-50">
                     <div className="flex justify-between items-center mb-2">
                        <span className="font-semibold text-gray-600 capitalize">{block.type}</span>
                        <button className="text-red-500 hover:text-red-700">
                            <Trash2Icon className="w-5 h-5"/>
                        </button>
                    </div>
                    {renderBlock(block)}
                </div>
            ))}
            
            <button
                onClick={onOpenAddBlock}
                className="w-full flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-primary transition-colors"
            >
                <PlusCircleIcon className="w-6 h-6 ml-2" />
                إضافة محتوى جديد
            </button>
        </div>
    );
};

export default LessonBlockEditor;
