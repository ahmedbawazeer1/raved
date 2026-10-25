import React, { useState } from 'react';
import { NavLink, Outlet, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { UserRole } from '../../types';
import {
    HomeIcon,
    BookOpenIcon,
    BarChartIcon,
    MessageCircleIcon,
    UsersIcon,
    SettingsIcon,
    LogOutIcon,
    GraduationCapIcon,
    ClipboardListIcon
} from '../../components/Icons';
import AIAssistantButton from '../../components/AIAssistantButton';
import AIAssistantChat from '../../components/AIAssistantChat';

interface NavItemProps {
    to: string;
    icon: React.ReactNode;
    label: string;
}

const NavItem: React.FC<NavItemProps> = ({ to, icon, label }) => (
    <NavLink
        to={to}
        end
        className={({ isActive }) =>
            `flex items-center px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                isActive
                    ? 'bg-primary text-white'
                    : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
            }`
        }
    >
        {icon}
        <span className="ml-3">{label}</span>
    </NavLink>
);

const Sidebar: React.FC = () => {
    const { user } = useAuth();
    const { logout } = useAuth();

    const studentLinks = [
        { to: '/dashboard', icon: <HomeIcon className="w-5 h-5" />, label: 'لوحة التحكم' },
        { to: '/dashboard/my-courses', icon: <BookOpenIcon className="w-5 h-5" />, label: 'مساراتي' },
        { to: '/dashboard/grades', icon: <BarChartIcon className="w-5 h-5" />, label: 'تقديراتي' },
        // A mock classId is used. In a real app, this should be dynamic.
        { to: '/dashboard/community/comm-1', icon: <MessageCircleIcon className="w-5 h-5" />, label: 'المجتمع' },
    ];

    const teacherLinks = [
        { to: '/dashboard', icon: <HomeIcon className="w-5 h-5" />, label: 'لوحة التحكم' },
        { to: '/dashboard/my-classes', icon: <UsersIcon className="w-5 h-5" />, label: 'فصولي' },
        { to: '/dashboard/assignments', icon: <ClipboardListIcon className="w-5 h-5" />, label: 'الواجبات' },
    ];

    const adminLinks = [
        { to: '/dashboard', icon: <HomeIcon className="w-5 h-5" />, label: 'لوحة التحكم' },
        { to: '/dashboard/users', icon: <UsersIcon className="w-5 h-5" />, label: 'المستخدمون' },
        { to: '/dashboard/all-courses', icon: <BookOpenIcon className="w-5 h-5" />, label: 'المسارات' },
        { to: '/dashboard/classes', icon: <GraduationCapIcon className="w-5 h-5" />, label: 'الفصول' },
        { to: '/dashboard/reports', icon: <BarChartIcon className="w-5 h-5" />, label: 'التقارير' },
    ];

    let links;
    switch (user?.role) {
        case UserRole.STUDENT:
            links = studentLinks;
            break;
        case UserRole.TEACHER:
            links = teacherLinks;
            break;
        case UserRole.ADMIN:
            links = adminLinks;
            break;
        default:
            links = [];
    }
    
    return (
        <aside className="w-64 flex-shrink-0 bg-white shadow-md flex flex-col p-4" style={{ direction: 'rtl' }}>
            <div className="flex items-center mb-8 px-2">
                 <Link to="/" className="text-2xl font-bold text-secondary">رفد</Link>
            </div>
            <nav className="flex-grow space-y-2">
                {links.map(link => <NavItem key={link.to} {...link} />)}
            </nav>
            <div className="mt-auto">
                <div className="border-t pt-4 space-y-2">
                    <NavItem to="/dashboard/settings" icon={<SettingsIcon className="w-5 h-5" />} label="الإعدادات" />
                    <button
                        onClick={logout}
                        className="w-full flex items-center px-4 py-2.5 text-sm font-medium rounded-lg text-gray-600 hover:bg-gray-200 hover:text-gray-900"
                    >
                        <LogOutIcon className="w-5 h-5" />
                        <span className="ml-3">تسجيل الخروج</span>
                    </button>
                </div>
                 <div className="mt-4 p-4 bg-gray-100 rounded-lg">
                    <div className="flex items-center">
                        <img src={user?.avatarUrl} alt={user?.fullName} className="w-10 h-10 rounded-full ml-3" />
                        <div>
                            <p className="font-bold text-gray-800">{user?.fullName}</p>
                            <p className="text-sm text-gray-500 capitalize">{user?.role}</p>
                        </div>
                    </div>
                </div>
            </div>
        </aside>
    );
};

const DashboardLayout: React.FC = () => {
    const [isChatOpen, setIsChatOpen] = useState(false);

    return (
        <div className="min-h-screen bg-gray-50 flex" style={{ direction: 'rtl' }}>
            <Sidebar />
            <main className="flex-grow p-8 overflow-auto">
                <Outlet />
            </main>
            <div style={{ direction: 'ltr' }} className="fixed bottom-8 left-8 z-50">
                <AIAssistantChat isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
                <AIAssistantButton onClick={() => setIsChatOpen(prev => !prev)} />
            </div>
        </div>
    );
};

export default DashboardLayout;
