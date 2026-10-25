import { User, UserRole, CoursePath, Grade, StudentProgress, Community, Class, Post } from '../types';

// Users
export const mockAdmin: User = {
  id: 'user-admin-1',
  fullName: 'علياء سالم',
  email: 'admin@rafed.com',
  role: UserRole.ADMIN,
  avatarUrl: 'https://i.pravatar.cc/150?u=admin1',
  registrationDate: '2023-01-15',
  status: 'Active',
};

export const mockTeachers: User[] = [
  {
    id: 'user-teacher-1',
    fullName: 'أحمد الغامدي',
    email: 'teacher1@rafed.com',
    role: UserRole.TEACHER,
    avatarUrl: 'https://i.pravatar.cc/150?u=teacher1',
    registrationDate: '2023-02-10',
    status: 'Active',
  },
  {
    id: 'user-teacher-2',
    fullName: 'فاطمة الزهراني',
    email: 'teacher2@rafed.com',
    role: UserRole.TEACHER,
    avatarUrl: 'https://i.pravatar.cc/150?u=teacher2',
    registrationDate: '2023-03-05',
    status: 'Active',
  },
];

export const mockStudents: User[] = [
  {
    id: 'user-student-1',
    fullName: 'خالد عبدالله',
    email: 'student1@rafed.com',
    role: UserRole.STUDENT,
    avatarUrl: 'https://i.pravatar.cc/150?u=student1',
    registrationDate: '2023-09-01',
    status: 'Active',
  },
  {
    id: 'user-student-2',
    fullName: 'سارة محمد',
    email: 'student2@rafed.com',
    role: UserRole.STUDENT,
    avatarUrl: 'https://i.pravatar.cc/150?u=student2',
    registrationDate: '2023-09-02',
    status: 'Active',
  },
   {
    id: 'user-student-3',
    fullName: 'يوسف إبراهيم',
    email: 'student3@rafed.com',
    role: UserRole.STUDENT,
    avatarUrl: 'https://i.pravatar.cc/150?u=student3',
    registrationDate: '2023-09-03',
    status: 'Suspended',
  },
];

export const allMockUsers: User[] = [mockAdmin, ...mockTeachers, ...mockStudents];

// Course Paths
export const mockCoursePaths: CoursePath[] = [
    {
        id: 'course-1',
        title: 'مقدمة في تطوير الويب الشامل',
        description: 'تعلم أساسيات HTML, CSS, JavaScript, و React لبناء تطبيقات ويب تفاعلية وحديثة.',
        teacher: mockTeachers[0],
        imageUrl: 'https://images.unsplash.com/photo-1542831371-29b0f74f9713?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1170&q=80',
        modules: [
            {
                id: 'mod-1-1', title: 'أساسيات الويب', chapters: [
                    { id: 'ch-1-1-1', title: 'مقدمة إلى HTML', contentBlocks: [{id: 'cb-1', type: 'text', content: 'محتوى الدرس...'}] },
                    { id: 'ch-1-1-2', title: 'أساسيات CSS', contentBlocks: [] },
                    { id: 'ch-1-1-3', title: 'مقدمة في JavaScript', contentBlocks: [] },
                ]
            },
            {
                id: 'mod-1-2', title: 'مفاهيم متقدمة', chapters: [
                    { id: 'ch-1-2-1', title: 'التعرف على React', contentBlocks: [] },
                    { id: 'ch-1-2-2', title: 'بناء أول تطبيق React', contentBlocks: [] },
                ]
            },
        ],
        faqs: [
            { id: 'faq-1', question: 'هل أحتاج خبرة مسبقة؟', answer: 'لا، هذا المسار مصمم للمبتدئين.' }
        ]
    },
    {
        id: 'course-2',
        title: 'علوم البيانات وتحليلها باستخدام Python',
        description: 'اكتشف عالم البيانات وتعلم كيفية تحليلها وتصويرها باستخدام مكتبات Python الشهيرة.',
        teacher: mockTeachers[1],
        imageUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1170&q=80',
        modules: [
            {
                id: 'mod-2-1', title: 'أساسيات Python للبيانات', chapters: [
                    { id: 'ch-2-1-1', title: 'مقدمة في Python', contentBlocks: [] },
                    { id: 'ch-2-1-2', title: 'مكتبة NumPy', contentBlocks: [] },
                    { id: 'ch-2-1-3', title: 'مكتبة Pandas', contentBlocks: [] },
                ]
            },
        ],
    },
];

// Student Data
export const mockStudentGrades: Grade[] = [
    { assignmentTitle: 'واجب HTML الأول', score: 95, total: 100, date: '2023-10-05' },
    { assignmentTitle: 'مشروع CSS', score: 88, total: 100, date: '2023-10-12' },
    { assignmentTitle: 'اختبار JavaScript قصير', score: 75, total: 100, date: '2023-10-20' },
];

export const mockStudentProgress: { [courseId: string]: StudentProgress } = {
    'course-1': {
        completedChapters: ['ch-1-1-1', 'ch-1-1-2'],
    },
    'course-2': {
        completedChapters: ['ch-2-1-1'],
    },
};

// Classes and Community
export const mockClasses: Class[] = [
    {
        id: 'class-1',
        name: 'تطوير الويب - دفعة 2024',
        coursePath: mockCoursePaths[0],
        teacher: mockTeachers[0],
        students: [mockStudents[0], mockStudents[1]],
    },
     {
        id: 'class-2',
        name: 'علوم البيانات - دفعة 2024',
        coursePath: mockCoursePaths[1],
        teacher: mockTeachers[1],
        students: [mockStudents[2]],
    },
];


export const mockClassCommunity: Community = {
    id: 'comm-1',
    name: 'مجتمع فصل تطوير الويب',
    teacher: mockTeachers[0],
    students: [mockStudents[0], mockStudents[1]],
    posts: [
        {
            id: 'post-1',
            author: mockTeachers[0],
            content: 'مرحباً بالجميع في مجتمعنا الدراسي! لا تترددوا في طرح أي أسئلة تخص المادة.',
            timestamp: '2023-10-01T10:00:00Z',
            comments: [],
        },
        {
            id: 'post-2',
            author: mockStudents[0],
            content: 'هل يمكن لأحد أن يشرح خاصية Flexbox في CSS بشكل أفضل؟',
            timestamp: '2023-10-02T15:30:00Z',
            comments: [],
        },
    ],
};
