import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Clean the database first - use try/catch for tables that may not exist yet
  try {
    await prisma.submission.deleteMany();
    await prisma.exercise.deleteMany();
    await prisma.database.deleteMany();
    await prisma.user.deleteMany();
  } catch (e) {
    console.log('Tabellen existieren noch nicht. Dies wird beim ersten Start erwartet.');
  }
  console.log('Datenbank bereinigt. Starte Seeding...');

  // Create a teacher
  const teacher = await prisma.user.create({
    data: {
      name: 'Hauptdozent',
      email: 'teacher@example.com',
      password: await bcrypt.hash('password123', 10),
      role: Role.TEACHER,
    },
  });
  console.log(`Dozent erstellt: ${teacher.email}`);

  // Create 2 tutors
  const tutor1 = await prisma.user.create({
    data: {
      name: 'Tutor Eins',
      email: 'tutor1@example.com',
      password: await bcrypt.hash('password123', 10),
      role: Role.TUTOR,
    },
  });
  console.log(`Tutor erstellt: ${tutor1.email}`);

  const tutor2 = await prisma.user.create({
    data: {
      name: 'Tutor Zwei',
      email: 'tutor2@example.com',
      password: await bcrypt.hash('password123', 10),
      role: Role.TUTOR,
    },
  });
  console.log(`Tutor erstellt: ${tutor2.email}`);

  // Create 3 students
  const student1 = await prisma.user.create({
    data: {
      name: 'Student Eins',
      email: 'student1@example.com',
      password: await bcrypt.hash('password123', 10),
      role: Role.STUDENT,
    },
  });
  console.log(`Student erstellt: ${student1.email}`);

  const student2 = await prisma.user.create({
    data: {
      name: 'Student Zwei',
      email: 'student2@example.com',
      password: await bcrypt.hash('password123', 10),
      role: Role.STUDENT,
    },
  });
  console.log(`Student erstellt: ${student2.email}`);
  const student3 = await prisma.user.create({
    data: {
      name: 'Student Drei',
      email: 'student3@example.com',
      password: await bcrypt.hash('password123', 10),
      role: Role.STUDENT,
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
