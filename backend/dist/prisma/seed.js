"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt = require("bcryptjs");
const prisma = new client_1.PrismaClient();
async function main() {
    try {
        await prisma.submission.deleteMany();
        await prisma.exercise.deleteMany();
        await prisma.database.deleteMany();
        await prisma.user.deleteMany();
    }
    catch (e) {
        console.log('Tables do not exist yet. This is expected during the first run.');
    }
    console.log('Database cleared. Starting to seed...');
    const teacher = await prisma.user.create({
        data: {
            name: 'Main Teacher',
            email: 'teacher@example.com',
            password: await bcrypt.hash('password123', 10),
            role: client_1.Role.TEACHER,
        },
    });
    console.log(`Created teacher: ${teacher.email}`);
    const tutor1 = await prisma.user.create({
        data: {
            name: 'Tutor One',
            email: 'tutor1@example.com',
            password: await bcrypt.hash('password123', 10),
            role: client_1.Role.TUTOR,
        },
    });
    console.log(`Created tutor: ${tutor1.email}`);
    const tutor2 = await prisma.user.create({
        data: {
            name: 'Tutor Two',
            email: 'tutor2@example.com',
            password: await bcrypt.hash('password123', 10),
            role: client_1.Role.TUTOR,
        },
    });
    console.log(`Created tutor: ${tutor2.email}`);
    const student1 = await prisma.user.create({
        data: {
            name: 'Student One',
            email: 'student1@example.com',
            password: await bcrypt.hash('password123', 10),
            role: client_1.Role.STUDENT,
        },
    });
    console.log(`Created student: ${student1.email}`);
    const student2 = await prisma.user.create({
        data: {
            name: 'Student Two',
            email: 'student2@example.com',
            password: await bcrypt.hash('password123', 10),
            role: client_1.Role.STUDENT,
        },
    });
    console.log(`Created student: ${student2.email}`);
    const student3 = await prisma.user.create({
        data: {
            name: 'Student Three',
            email: 'student3@example.com',
            password: await bcrypt.hash('password123', 10),
            role: client_1.Role.STUDENT,
        },
    });
    console.log(`Created student: ${student3.email}`);
    const sampleDatabase = await prisma.database.create({
        data: {
            name: 'SQL Exercise - University Schema',
            schema: JSON.stringify({
                students: {
                    id: 'INT PRIMARY KEY',
                    name: 'VARCHAR(100)',
                    email: 'VARCHAR(100)',
                    major: 'VARCHAR(100)',
                    gpa: 'FLOAT'
                },
                courses: {
                    id: 'INT PRIMARY KEY',
                    title: 'VARCHAR(100)',
                    department: 'VARCHAR(100)',
                    credits: 'INT'
                },
                enrollments: {
                    id: 'INT PRIMARY KEY',
                    student_id: 'INT REFERENCES students(id)',
                    course_id: 'INT REFERENCES courses(id)',
                    semester: 'VARCHAR(20)',
                    grade: 'VARCHAR(2)'
                }
            }),
            seedData: JSON.stringify({
                students: [
                    { id: 1, name: 'Alice Smith', email: 'alice@university.edu', major: 'Computer Science', gpa: 3.8 },
                    { id: 2, name: 'Bob Johnson', email: 'bob@university.edu', major: 'Mathematics', gpa: 3.5 },
                    { id: 3, name: 'Charlie Brown', email: 'charlie@university.edu', major: 'Physics', gpa: 3.9 }
                ],
                courses: [
                    { id: 101, title: 'Introduction to Programming', department: 'CS', credits: 4 },
                    { id: 102, title: 'Data Structures', department: 'CS', credits: 4 },
                    { id: 201, title: 'Calculus I', department: 'MATH', credits: 3 }
                ],
                enrollments: [
                    { id: 1001, student_id: 1, course_id: 101, semester: 'Fall 2023', grade: 'A' },
                    { id: 1002, student_id: 1, course_id: 102, semester: 'Spring 2024', grade: 'B+' },
                    { id: 1003, student_id: 2, course_id: 201, semester: 'Fall 2023', grade: 'A-' },
                    { id: 1004, student_id: 3, course_id: 101, semester: 'Fall 2023', grade: 'A' }
                ]
            })
        }
    });
    console.log(`Created sample database: ${sampleDatabase.name}`);
    const sampleExercise = await prisma.exercise.create({
        data: {
            title: 'Basic SELECT Query',
            description: 'Write a SQL query to retrieve all students with a GPA greater than 3.5, ordered by GPA in descending order.',
            initialQuery: 'SELECT * FROM students WHERE',
            solutionQuery: 'SELECT * FROM students WHERE gpa > 3.5 ORDER BY gpa DESC;',
            databaseSchemaId: sampleDatabase.id,
            authorId: teacher.id
        }
    });
    console.log(`Created sample exercise: ${sampleExercise.title}`);
    console.log(`Seeding finished.`);
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map