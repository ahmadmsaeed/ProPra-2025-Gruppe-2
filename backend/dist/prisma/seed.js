"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt = require("bcryptjs");
const prisma = new client_1.PrismaClient();
async function main() {
    await prisma.$executeRawUnsafe('TRUNCATE TABLE "Submission", "Exercise", "Database", "User" RESTART IDENTITY CASCADE;');
    try {
        await prisma.submission.deleteMany();
        await prisma.exercise.deleteMany();
        await prisma.database.deleteMany();
        await prisma.user.deleteMany();
    }
    catch (e) {
        console.log('Tabellen existieren noch nicht. Dies wird beim ersten Start erwartet.');
    }
    console.log('Datenbank bereinigt. Starte Seeding...');
    const teacher = await prisma.user.create({
        data: {
            name: 'Hauptdozent',
            email: 'teacher@example.com',
            password: await bcrypt.hash('password123', 10),
            role: client_1.Role.TEACHER,
        },
    });
    console.log(`Dozent erstellt: ${teacher.email}`);
    const tutor1 = await prisma.user.create({
        data: {
            name: 'Tutor Eins',
            email: 'tutor1@example.com',
            password: await bcrypt.hash('password123', 10),
            role: client_1.Role.TUTOR,
        },
    });
    console.log(`Tutor erstellt: ${tutor1.email}`);
    const tutor2 = await prisma.user.create({
        data: {
            name: 'Tutor Zwei',
            email: 'tutor2@example.com',
            password: await bcrypt.hash('password123', 10),
            role: client_1.Role.TUTOR,
        },
    });
    console.log(`Tutor erstellt: ${tutor2.email}`);
    const student1 = await prisma.user.create({
        data: {
            name: 'Student Eins',
            email: 'student1@example.com',
            password: await bcrypt.hash('password123', 10),
            role: client_1.Role.STUDENT,
        },
    });
    console.log(`Student erstellt: ${student1.email}`);
    const student2 = await prisma.user.create({
        data: {
            name: 'Student Zwei',
            email: 'student2@example.com',
            password: await bcrypt.hash('password123', 10),
            role: client_1.Role.STUDENT,
        },
    });
    console.log(`Student erstellt: ${student2.email}`);
    const student3 = await prisma.user.create({
        data: {
            name: 'Student Drei',
            email: 'student3@example.com',
            password: await bcrypt.hash('password123', 10),
            role: client_1.Role.STUDENT,
        },
    });
    console.log(`Student erstellt: ${student3.email}`);
    console.log(`Seeding abgeschlossen.`);
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