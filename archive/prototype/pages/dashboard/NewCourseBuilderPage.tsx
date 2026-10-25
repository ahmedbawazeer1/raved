import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { mockCoursePaths, mockTeachers } from '../../data/mockData';
import Stepper from '../../components/course-builder/Stepper';
import Step1CourseDetails from '../../components/course-builder/Step1_CourseDetails';
import Step2CurriculumBuilder from '../../components/course-builder/Step2_CurriculumBuilder';
import Step3FaqBuilder from '../../components/course-builder/Step3_FaqBuilder';
import { CoursePath } from '../../types';

const NewCourseBuilderPage: React.FC = () => {
    const { courseId } = useParams<{ courseId: string }>();
    const navigate = useNavigate();
    const isNewCourse = courseId === 'new';
    
    // In a real app, you would fetch this data or use a state management library
    const [courseData, setCourseData] = React.useState<Partial<CoursePath>>(() => {
        if (isNewCourse) {
            return { title: '', description: '', teacher: mockTeachers[0], modules: [], faqs: [] };
        }
        return mockCoursePaths.find(c => c.id === courseId) || {};
    });

    const [currentStep, setCurrentStep] = React.useState(1);

    const handleNext = () => setCurrentStep(prev => Math.min(prev + 1, 3));
    const handleBack = () => setCurrentStep(prev => Math.max(prev - 1, 1));
    
    const handleSave = () => {
        console.log('Saving course:', courseData);
        // Add API call logic here
        navigate('/dashboard/all-courses');
    };
    
    const steps = ['تفاصيل المسار', 'المنهج الدراسي', 'الأسئلة الشائعة'];

    const renderStep = () => {
        switch (currentStep) {
            case 1:
                return <Step1CourseDetails courseData={courseData} setCourseData={setCourseData} />;
            case 2:
                return <Step2CurriculumBuilder courseData={courseData} setCourseData={setCourseData} />;
            case 3:
                return <Step3FaqBuilder courseData={courseData} setCourseData={setCourseData} />;
            default:
                return null;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                 <h2 className="text-3xl font-bold text-gray-800">
                    {isNewCourse ? 'إنشاء مسار تعليمي جديد' : `تعديل: ${courseData.title}`}
                </h2>
                <Link to="/dashboard/all-courses" className="text-sm font-semibold text-primary hover:underline">
                   العودة إلى المسارات
                </Link>
            </div>
            
            <Stepper steps={steps} currentStep={currentStep} />
            
            <div className="bg-white p-6 rounded-lg shadow-md">
                {renderStep()}
            </div>
            
            <div className="flex justify-between items-center mt-6">
                <div>
                    {currentStep > 1 && (
                        <button onClick={handleBack} className="bg-gray-200 text-gray-800 font-bold py-2 px-6 rounded-lg hover:bg-gray-300">
                            السابق
                        </button>
                    )}
                </div>
                <div>
                    {currentStep < 3 ? (
                        <button onClick={handleNext} className="bg-primary text-white font-bold py-2 px-6 rounded-lg hover:bg-primary-dark">
                            التالي
                        </button>
                    ) : (
                        <button onClick={handleSave} className="bg-green-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-green-700">
                            حفظ المسار
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default NewCourseBuilderPage;
