
import React from 'react';

// This is a placeholder component, as its usage is not fully defined in the provided files.
// It would be used to add new lessons or levels in the CourseBuilderPage.

interface AddContentModalProps {
    isOpen: boolean;
    onClose: () => void;
    // ... other props like onSave, parentLevelId, etc.
}

const AddContentModal: React.FC<AddContentModalProps> = ({ isOpen, onClose }) => {
    if (!isOpen) {
        return null;
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
            <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
                <h2 className="text-2xl font-bold mb-4">إضافة محتوى جديد</h2>
                {/* Form elements would go here */}
                <p>نموذج لإضافة درس أو اختبار جديد.</p>
                <div className="mt-6 flex justify-end">
                    <button onClick={onClose} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 ml-3">
                        إغلاق
                    </button>
                    <button className="bg-primary text-white font-bold py-2 px-6 rounded-lg hover:bg-primary-dark">
                        حفظ
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddContentModal;