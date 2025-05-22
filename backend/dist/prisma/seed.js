"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt = require("bcryptjs");
const prisma = new client_1.PrismaClient();
async function seedDatabasesAndExercises(teacherId) {
    console.log('Seeding databases and exercises...');
    try {
        let personenDb = await prisma.database.findUnique({
            where: { name: 'PersonenDB' }
        });
        if (!personenDb) {
            await prisma.$executeRaw `
        INSERT INTO "Database" (name, schema, "seedData", "authorId", "createdAt", "updatedAt")
        VALUES (
          'PersonenDB',
          'CREATE TABLE personen (
            id INT PRIMARY KEY,
            name VARCHAR(50),
            alter INT,
            stadt VARCHAR(50)
          );',
          'INSERT INTO personen (id, name, alter, stadt) VALUES
          (1, ''Anna Müller'', 28, ''Berlin''),
          (2, ''Jonas Schmidt'', 34, ''Hamburg''),
          (3, ''Leila Ali'', 22, ''München'');',
          ${teacherId},
          NOW(),
          NOW()
        )
      `;
            personenDb = await prisma.database.findUnique({
                where: { name: 'PersonenDB' }
            });
        }
        else {
            await prisma.$executeRaw `
        UPDATE "Database" 
        SET "schema" = 'CREATE TABLE personen (
          id INT PRIMARY KEY,
          name VARCHAR(50),
          alter INT,
          stadt VARCHAR(50)
        );',
        "seedData" = 'INSERT INTO personen (id, name, alter, stadt) VALUES
        (1, ''Anna Müller'', 28, ''Berlin''),
        (2, ''Jonas Schmidt'', 34, ''Hamburg''),
        (3, ''Leila Ali'', 22, ''München'');',
        "updatedAt" = NOW()
        WHERE id = ${personenDb.id}
      `;
            personenDb = await prisma.database.findUnique({
                where: { id: personenDb.id }
            });
        }
        if (!personenDb) {
            throw new Error('Failed to create or find PersonenDB');
        }
        console.log(`Created database: ${personenDb.name}`);
        const existingExercise = await prisma.exercise.findFirst({
            where: {
                title: 'Alter auswählen',
                databaseSchemaId: personenDb.id
            }
        });
        if (!existingExercise) {
            const exercise = await prisma.exercise.create({
                data: {
                    title: 'Alter auswählen',
                    description: 'Schreibe eine SQL-Abfrage, die alle Alter (Spalte "alter") aus der Tabelle "personen" auswählt.',
                    initialQuery: 'SELECT ',
                    solutionQuery: 'SELECT alter FROM personen',
                    database: {
                        connect: {
                            id: personenDb.id
                        }
                    },
                    author: {
                        connect: {
                            id: teacherId
                        }
                    }
                }
            });
            console.log(`Created exercise: ${exercise.title}`);
        }
        else {
            console.log(`Exercise already exists: ${existingExercise.title}`);
        }
        return personenDb;
    }
    catch (error) {
        console.error('Error creating database and exercise:', error);
        throw error;
    }
}
async function createPersonenTable(personenDbId) {
    console.log('Creating personen table...');
    try {
        const personenDb = await prisma.database.findUnique({
            where: {
                id: personenDbId
            }
        });
        if (!personenDb) {
            console.error('PersonenDB not found in Database table');
            return;
        }
        console.log('Found PersonenDB, executing schema...');
        try {
            await prisma.$executeRawUnsafe(personenDb.schema);
            console.log('Personen table schema created successfully');
        }
        catch (err) {
            console.log('Table might already exist, continuing with seed data');
        }
        try {
            await prisma.$executeRawUnsafe(personenDb.seedData);
            console.log('Personen table data inserted successfully');
        }
        catch (err) {
            console.log('Seed data might already exist, continuing');
        }
    }
    catch (error) {
        console.error('Error creating personen table:', error);
    }
}
async function main() {
    console.log('Starting database seeding...');
    try {
        console.log('Cleaning database tables...');
        await prisma.submission.deleteMany({}).catch(() => console.log('No submissions to clear'));
        await prisma.exercise.deleteMany({}).catch(() => console.log('No exercises to clear'));
        await prisma.database.deleteMany({}).catch(() => console.log('No databases to clear'));
        await prisma.user.deleteMany({}).catch(() => console.log('No users to clear'));
        console.log('Database cleaned. Starting seeding...');
        const teacher = await prisma.user.create({
            data: {
                name: 'Hauptdozent',
                email: 'teacher@example.com',
                password: await bcrypt.hash('password123', 10),
                role: client_1.Role.TEACHER,
            },
        });
        console.log(`Teacher created: ${teacher.email}`);
        const tutor1 = await prisma.user.create({
            data: {
                name: 'Tutor Eins',
                email: 'tutor1@example.com',
                password: await bcrypt.hash('password123', 10),
                role: client_1.Role.TUTOR,
            },
        });
        console.log(`Tutor created: ${tutor1.email}`);
        const tutor2 = await prisma.user.create({
            data: {
                name: 'Tutor Zwei',
                email: 'tutor2@example.com',
                password: await bcrypt.hash('password123', 10),
                role: client_1.Role.TUTOR,
            },
        });
        console.log(`Tutor created: ${tutor2.email}`);
        const student1 = await prisma.user.create({
            data: {
                name: 'Student Eins',
                email: 'student1@example.com',
                password: await bcrypt.hash('password123', 10),
                role: client_1.Role.STUDENT,
            },
        });
        console.log(`Student created: ${student1.email}`);
        const student2 = await prisma.user.create({
            data: {
                name: 'Student Zwei',
                email: 'student2@example.com',
                password: await bcrypt.hash('password123', 10),
                role: client_1.Role.STUDENT,
            },
        });
        console.log(`Student created: ${student2.email}`);
        const student3 = await prisma.user.create({
            data: {
                name: 'Student Drei',
                email: 'student3@example.com',
                password: await bcrypt.hash('password123', 10),
                role: client_1.Role.STUDENT,
            },
        });
        console.log(`Student created: ${student3.email}`);
        const personenDb = await seedDatabasesAndExercises(teacher.id);
        await createPersonenTable(personenDb.id);
        console.log(`Seeding completed.`);
    }
    catch (error) {
        console.error('Seeding error:', error);
        throw error;
    }
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