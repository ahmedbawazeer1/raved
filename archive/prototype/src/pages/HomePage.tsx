
import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpenIcon, UsersIcon, BarChartIcon } from '../components/Icons';

const FeatureCard: React.FC<{ icon: React.ReactNode; title: string; description: string }> = ({ icon, title, description }) => (
    <div className="bg-white p-6 rounded-lg shadow-md text-center transform hover:scale-105 transition-transform duration-300">
        <div className="flex justify-center items-center mb-4">
            <div className="p-3 bg-primary-light text-white rounded-full">
                {icon}
            </div>
        </div>
        <h3 className="text-xl font-bold text-primary-dark mb-2">{title}</h3>
        <p className="text-gray-600">{description}</p>
    </div>
);

const HomePage: React.FC = () => {
    return (
        <div className="bg-gray-50 min-h-screen">
            {/* Header */}
            <header className="bg-white shadow-md">
                <nav className="container mx-auto px-6 py-4 flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-secondary">رفد</h1>
                    <div>
                        <Link to="/login" className="text-primary font-semibold hover:underline ml-6">تسجيل الدخول</Link>
                        <Link to="/register" className="bg-primary text-white font-bold py-2 px-4 rounded-lg hover:bg-primary-dark transition-colors">
                            إنشاء حساب
                        </Link>
                    </div>
                </nav>
            </header>

            {/* Hero Section */}
            <main className="container mx-auto px-6 py-16 text-center">
                <h2 className="text-4xl md:text-5xl font-extrabold text-primary-dark leading-tight mb-4">
                    منصة <span className="text-secondary">رفد</span> التعليمية
                </h2>
                <p className="text-lg text-gray-700 max-w-3xl mx-auto mb-8">
                    مستقبلك يبدأ من هنا. انضم إلى مسارات تعليمية متكاملة مصممة خصيصًا لتطوير مهاراتك وتحقيق طموحاتك.
                </p>
                <Link
                    to="/register"
                    className="bg-secondary text-white font-bold py-3 px-8 rounded-full text-lg hover:bg-yellow-500 transition-colors duration-300 shadow-lg"
                >
                    ابدأ رحلتك التعليمية
                </Link>
            </main>

            {/* Features Section */}
            <section className="bg-white py-20">
                <div className="container mx-auto px-6">
                    <h3 className="text-3xl font-bold text-center text-primary-dark mb-12">لماذا تختار <span className="text-secondary">رفد</span>؟</h3>
                    <div className="grid md:grid-cols-3 gap-8">
                        <FeatureCard 
                            icon={<BookOpenIcon className="w-8 h-8"/>}
                            title="مسارات متخصصة"
                            description="مناهج دراسية شاملة ومصممة بعناية من قبل خبراء لتأخذك من الصفر إلى الاحتراف."
                        />
                        <FeatureCard 
                            icon={<UsersIcon className="w-8 h-8"/>}
                            title="مجتمع تفاعلي"
                            description="تواصل مع المعلمين والطلاب، شارك معرفتك، واحصل على الدعم في مجتمعاتنا الدراسية."
                        />
                         <FeatureCard 
                            icon={<BarChartIcon className="w-8 h-8"/>}
                            title="متابعة الأداء"
                            description="تتبع تقدمك وإنجازاتك من خلال لوحة تحكم سهلة الاستخدام وتقارير أداء مفصلة."
                        />
                    </div>
                </div>
            </section>
            
            {/* Footer */}
            <footer className="bg-primary-dark text-white py-8">
                <div className="container mx-auto px-6 text-center">
                    <p>&copy; {new Date().getFullYear()} منصة رفد التعليمية. جميع الحقوق محفوظة.</p>
                </div>
            </footer>
        </div>
    );
};

export default HomePage;