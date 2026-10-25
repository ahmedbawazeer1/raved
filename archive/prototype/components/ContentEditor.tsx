
import React from 'react';

const ContentEditor: React.FC = () => {
    return (
        <div className="border rounded-lg p-4 bg-white">
            <h3 className="font-bold text-lg mb-2">محرر المحتوى</h3>
            <p className="text-gray-500">هذا هو المكان الذي ستقوم فيه بتحرير محتوى الدرس أو الاختبار.</p>
            <textarea className="w-full h-64 p-2 border mt-4 rounded" placeholder="ابدأ الكتابة هنا..."></textarea>
        </div>
    );
};

export default ContentEditor;
