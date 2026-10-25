import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { mockClassCommunity } from '../../data/mockData';
import { useAuth } from '../../hooks/useAuth';
import { Post } from '../../types';
import { UsersIcon } from '../../components/Icons';

const CommunityPage: React.FC = () => {
    const { classId } = useParams<{ classId: string }>();
    const community = mockClassCommunity; // Mock: always show the same community
    const { user } = useAuth();
    const [newPostContent, setNewPostContent] = useState('');

    if (!community) {
        return <div className="text-center p-8 bg-white rounded-lg shadow-md">لم يتم العثور على هذا الفصل.</div>;
    }
    
    const handlePostSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (newPostContent.trim() && user) {
            const newPost: Post = {
                id: `post-${Date.now()}`,
                author: user,
                content: newPostContent,
                timestamp: new Date().toISOString(),
                comments: [],
            };
            community.posts.unshift(newPost);
            setNewPostContent('');
        }
    };

    return (
        <div className="flex flex-col lg:flex-row gap-6">
            {/* Main Feed */}
            <div className="flex-grow lg:w-2/3 space-y-6">
                <div className="bg-white p-6 rounded-lg shadow-md">
                     <h2 className="text-2xl font-bold text-gray-800 mb-4">{community.name}</h2>
                    <form onSubmit={handlePostSubmit}>
                        <textarea
                            value={newPostContent}
                            onChange={(e) => setNewPostContent(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                            rows={3}
                            placeholder="اكتب منشورًا جديدًا..."
                        ></textarea>
                        <button type="submit" className="mt-2 bg-primary text-white font-bold py-2 px-6 rounded-lg hover:bg-primary-dark">
                            نشر
                        </button>
                    </form>
                </div>

                {/* Posts */}
                {community.posts.map(post => (
                    <div key={post.id} className="bg-white p-6 rounded-lg shadow-md">
                        <div className="flex items-start mb-4">
                            <img src={post.author.avatarUrl} alt={post.author.fullName} className="w-12 h-12 rounded-full ml-4" />
                            <div>
                                <p className="font-bold text-gray-800">{post.author.fullName}</p>
                                <p className="text-sm text-gray-500">{new Date(post.timestamp).toLocaleString('ar-EG')}</p>
                            </div>
                        </div>
                        <p className="text-gray-700 whitespace-pre-wrap">{post.content}</p>
                        {/* Comments section would go here */}
                    </div>
                ))}
            </div>

            {/* Sidebar with members */}
            <div className="lg:w-1/3">
                 <div className="bg-white rounded-lg shadow-md p-6">
                    <h3 className="text-xl font-bold text-primary-dark mb-4 flex items-center">
                        <UsersIcon className="w-6 h-6 ml-2" />
                        أعضاء الفصل ({community.students.length + 1})
                    </h3>
                    <ul className="space-y-3">
                        <li key={community.teacher.id} className="flex items-center">
                            <img src={community.teacher.avatarUrl} alt={community.teacher.fullName} className="w-10 h-10 rounded-full ml-3" />
                            <div>
                                <p className="font-semibold text-gray-800">{community.teacher.fullName}</p>
                                <p className="text-sm text-green-600">المعلم</p>
                            </div>
                        </li>
                        {community.students.map(student => (
                            <li key={student.id} className="flex items-center">
                                <img src={student.avatarUrl} alt={student.fullName} className="w-10 h-10 rounded-full ml-3" />
                                <p className="font-semibold text-gray-800">{student.fullName}</p>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default CommunityPage;
