import React from 'react';
import { UploadCloudIcon } from '../Icons';

interface FileUploadProps {
    onFileUpload: (file: File) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileUpload }) => {
    const [fileName, setFileName] = React.useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setFileName(file.name);
            onFileUpload(file);
        }
    };

    return (
        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
            <div className="space-y-1 text-center">
                <UploadCloudIcon className="mx-auto h-12 w-12 text-gray-400" />
                <div className="flex text-sm text-gray-600">
                    <label htmlFor="course-image-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-primary hover:text-primary-dark focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary">
                        <span>اختر ملفًا</span>
                        <input id="course-image-upload" name="course-image-upload" type="file" className="sr-only" accept="image/*" onChange={handleFileChange} />
                    </label>
                    <p className="pr-1">أو اسحبه وأفلته هنا</p>
                </div>
                {fileName ?
                    <p className="text-sm text-green-600">{fileName}</p> :
                    <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
                }
            </div>
        </div>
    );
};

export default FileUpload;