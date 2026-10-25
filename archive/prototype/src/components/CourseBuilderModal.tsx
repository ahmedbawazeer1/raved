
import React from 'react';

// Placeholder component. Its purpose is less clear from the name alone,
// but it might be a modal used within the course builder for a specific task.

interface CourseBuilderModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const CourseBuilderModal: React.FC<CourseBuilderModalProps> = ({ isOpen, onClose }) => {
    if (!isOpen) {
        return null;
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
            <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
                <h2 className="text-2xl font-bold mb-4">نافذة منبثقة لمُنشئ المسار</h2>
                <p>هذه نافذة منبثقة تستخدم داخل صفحة منشئ المسار.</p>
                <div className="mt-6 flex justify-end">
                    <button onClick={onClose} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 ml-3">
                        إغلاق
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CourseBuilderModal;