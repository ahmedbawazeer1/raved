
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { UploadCloudIcon } from '../components/Icons';

const RegisterPage: React.FC = () => {
  const [recommendationFile, setRecommendationFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setRecommendationFile(e.target.files[0]);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-2xl">
        <h1 className="text-3xl font-bold text-primary-dark mb-2 text-center">إنشاء حساب طالب جديد</h1>
        <p className="text-gray-600 mb-6 text-center">املأ البيانات التالية للانضمام إلى منصتنا التعليمية.</p>

        <form className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">الاسم الثلاثي</label>
              <input type="text" placeholder="مثال: محمد أحمد علي" className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ الميلاد</label>
              <input type="date" className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">رقم الهاتف</label>
              <input type="tel" placeholder="01XXXXXXXXX" className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">الجنس</label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary">
                <option>ذكر</option>
                <option>أنثى</option>
              </select>
            </div>
             <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">المحافظة</label>
              <input type="text" placeholder="مثال: القاهرة" className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">المدينة</label>
              <input type="text" placeholder="مثال: مدينة نصر" className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">اسم المدرسة</label>
            <input type="text" placeholder="مثال: مدرسة المستقبل الثانوية" className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary" />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">رفع توصية من معلم (PDF)</label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
              <div className="space-y-1 text-center">
                <UploadCloudIcon className="mx-auto h-12 w-12 text-gray-400" />
                <div className="flex text-sm text-gray-600">
                  <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-primary hover:text-primary-dark focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary">
                    <span>اختر ملفًا</span>
                    <input id="file-upload" name="file-upload" type="file" className="sr-only" accept=".pdf" onChange={handleFileChange}/>
                  </label>
                  <p className="pr-1">أو اسحبه وأفلته هنا</p>
                </div>
                {recommendationFile ? 
                 <p className="text-sm text-green-600">{recommendationFile.name}</p> :
                 <p className="text-xs text-gray-500">PDF فقط، بحد أقصى 5 ميجابايت</p>
                }
              </div>
            </div>
          </div>

          <div>
            <button type="submit" className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary">
              إنشاء الحساب
            </button>
          </div>
        </form>
         <p className="mt-6 text-center text-sm text-gray-600">
          لديك حساب بالفعل؟{' '}
          <Link to="/login" className="font-medium text-primary hover:text-primary-dark">
            سجل الدخول من هنا
          </Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;