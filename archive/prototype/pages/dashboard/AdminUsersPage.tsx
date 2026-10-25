
import React, { useState, useMemo } from 'react';
import { allMockUsers } from '../../data/mockData';
import { User, UserRole } from '../../types';
import { UsersIcon, PlusCircleIcon, SearchIcon, EditIcon, Trash2Icon } from '../../components/Icons';

const RoleBadge: React.FC<{ role: UserRole }> = ({ role }) => {
    const roleStyles = {
        [UserRole.STUDENT]: 'bg-blue-100 text-blue-800',
        [UserRole.TEACHER]: 'bg-green-100 text-green-800',
        [UserRole.ADMIN]: 'bg-red-100 text-red-800',
    };
    const roleNames = {
        [UserRole.STUDENT]: 'طالب',
        [UserRole.TEACHER]: 'معلم',
        [UserRole.ADMIN]: 'إداري',
    };
    return (
        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${roleStyles[role]}`}>
            {roleNames[role]}
        </span>
    );
};

const StatusBadge: React.FC<{ status: 'Active' | 'Suspended' }> = ({ status }) => {
    const statusStyles = {
        Active: 'bg-green-100 text-green-800',
        Suspended: 'bg-yellow-100 text-yellow-800',
    };
    const statusNames = {
        Active: 'نشط',
        Suspended: 'معلق',
    };
    return (
        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusStyles[status]}`}>
            {statusNames[status]}
        </span>
    );
}

const AdminUsersPage: React.FC = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');

    const filteredUsers = useMemo(() => {
        return allMockUsers.filter(user => {
            const matchesSearch = user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                  user.email.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesRole = roleFilter === 'all' || user.role === roleFilter;
            return matchesSearch && matchesRole;
        });
    }, [searchTerm, roleFilter]);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold text-gray-800 flex items-center">
                    <UsersIcon className="w-8 h-8 ml-3 text-primary" />
                    إدارة المستخدمين
                </h2>
                <button className="bg-primary text-white font-bold py-2 px-4 rounded-lg hover:bg-primary-dark transition-colors flex items-center">
                    <PlusCircleIcon className="w-5 h-5 ml-2" />
                    إضافة مستخدم
                </button>
            </div>

            {/* Filters and Search */}
            <div className="bg-white p-4 rounded-lg shadow-md flex flex-col md:flex-row gap-4">
                <div className="relative flex-grow">
                    <input
                        type="text"
                        placeholder="ابحث بالاسم أو البريد الإلكتروني..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                </div>
                <select
                    value={roleFilter}
                    onChange={e => setRoleFilter(e.target.value as UserRole | 'all')}
                    className="w-full md:w-auto px-4 py-2 border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                >
                    <option value="all">كل الأدوار</option>
                    <option value={UserRole.STUDENT}>طالب</option>
                    <option value={UserRole.TEACHER}>معلم</option>
                    <option value={UserRole.ADMIN}>إداري</option>
                </select>
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-right">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="p-4 font-semibold text-gray-600">المستخدم</th>
                                <th className="p-4 font-semibold text-gray-600">الدور</th>
                                <th className="p-4 font-semibold text-gray-600">تاريخ التسجيل</th>
                                <th className="p-4 font-semibold text-gray-600">الحالة</th>
                                <th className="p-4 font-semibold text-gray-600">إجراءات</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {filteredUsers.map(user => (
                                <tr key={user.id} className="hover:bg-gray-50">
                                    <td className="p-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <img src={user.avatarUrl} alt={user.fullName} className="w-10 h-10 rounded-full ml-3" />
                                            <div>
                                                <p className="font-semibold text-gray-900">{user.fullName}</p>
                                                <p className="text-sm text-gray-500">{user.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4 whitespace-nowrap"><RoleBadge role={user.role} /></td>
                                    <td className="p-4 whitespace-nowrap text-gray-600">{new Date(user.registrationDate).toLocaleDateString('ar-EG')}</td>
                                    <td className="p-4 whitespace-nowrap"><StatusBadge status={user.status} /></td>
                                    <td className="p-4 whitespace-nowrap">
                                        <div className="flex space-x-2 space-x-reverse">
                                            <button className="text-gray-500 hover:text-primary p-1"><EditIcon className="w-5 h-5"/></button>
                                            <button className="text-gray-500 hover:text-red-600 p-1"><Trash2Icon className="w-5 h-5"/></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
             {filteredUsers.length === 0 && (
                <div className="text-center py-8 bg-white rounded-lg shadow-md">
                    <p className="text-gray-500">لا يوجد مستخدمون يطابقون معايير البحث.</p>
                </div>
            )}
        </div>
    );
};

export default AdminUsersPage;
