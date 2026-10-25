
import React from 'react';

const ComingSoonPage: React.FC<{ title: string }> = ({ title }) => {
    return (
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
            <h1 className="text-3xl font-bold text-primary-dark mb-4">{title}</h1>
            <p className="text-gray-600 text-lg">هذه الصفحة قيد التطوير وستكون متاحة قريبًا.</p>
        </div>
    );
};

export default ComingSoonPage;