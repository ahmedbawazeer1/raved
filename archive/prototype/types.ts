// types.ts

export enum UserRole {
    STUDENT = 'student',
    TEACHER = 'teacher',
    ADMIN = 'admin',
}

export interface User {
    id: string;
    fullName: string;
    email: string;
    role: UserRole;
    avatarUrl: string;
    registrationDate: string;
    status: 'Active' | 'Suspended';
}

export type ContentBlockType = 'text' | 'image' | 'video' | 'quiz';

export interface ContentBlock {
    id: string;
    type: ContentBlockType;
    content: string;
}

export interface Chapter {
    id: string;
    title: string;
    contentBlocks: ContentBlock[];
}

export interface Module {
    id: string;
    title: string;
    chapters: Chapter[];
}

export interface CoursePath {
    id: string;
    title: string;
    description: string;
    teacher: User;
    modules: Module[];
    imageUrl: string;
    faqs?: FAQItem[];
}

export interface Grade {
    assignmentTitle: string;
    score: number;
    total: number;
    date: string;
}

export interface StudentProgress {
    completedChapters: string[];
}

export interface Comment {
    id: string;
    author: User;
    content: string;
    timestamp: string;
}

export interface Post {
    id: string;
    author: User;
    content: string;
    timestamp: string;
    comments: Comment[];
}

export interface Community {
    id: string;
    name: string;
    teacher: User;
    students: User[];
    posts: Post[];
}

export interface Class {
    id: string;
    name: string;
    coursePath: CoursePath;
    teacher: User;
    students: User[];
}

export interface FAQItem {
    id: string;
    question: string;
    answer: string;
}
