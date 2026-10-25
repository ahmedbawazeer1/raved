
import React from 'react';

const CurriculumSidebar: React.FC = () => {
    return (
        <div className="border rounded-lg p-4 bg-gray-50 h-full">
            <h3 className="font-bold text-lg mb-2">منهج المسار</h3>
            <ul className="space-y-2">
                <li className="p-2 bg-white rounded cursor-pointer hover:bg-blue-50">مقدمة</li>
                <li className="p-2 bg-white rounded cursor-pointer hover:bg-blue-50">الفصل الأول</li>
                <li className="p-2 bg-white rounded cursor-pointer hover:bg-blue-50">الفصل الثاني</li>
            </ul>
        </div>
    );
};

export default CurriculumSidebar;