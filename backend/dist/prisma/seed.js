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
        let toysDb = await prisma.database.findUnique({
            where: { name: 'ToysDB' }
        });
        if (!toysDb) {
            await prisma.$executeRaw `
        INSERT INTO "Database" (name, schema, "seedData", "authorId", "createdAt", "updatedAt")
        VALUES (
          'ToysDB',
          'CREATE TABLE Toys (
            toyId INTEGER PRIMARY KEY,
            toyName VARCHAR(100) NOT NULL,
            toyType VARCHAR(50) NOT NULL
          );',
          'INSERT INTO Toys (toyId, toyName, toyType) VALUES
          (1, ''Lego City Set'', ''Building Blocks''),
          (2, ''Barbie Dreamhouse'', ''Doll''),
          (3, ''Hot Wheels Track'', ''Car''),
          (4, ''Teddy Bear'', ''Stuffed Animal''),
          (5, ''Monopoly Board Game'', ''Board Game''),
          (6, ''Nintendo Switch'', ''Video Game''),
          (7, ''Wooden Puzzle'', ''Puzzle''),
          (8, ''Remote Control Helicopter'', ''RC Vehicle'');',
          ${teacherId},
          NOW(),
          NOW()
        )
      `;
            toysDb = await prisma.database.findUnique({
                where: { name: 'ToysDB' }
            });
        }
        else {
            await prisma.$executeRaw `
        UPDATE "Database" 
        SET "schema" = 'CREATE TABLE Toys (
          toyId INTEGER PRIMARY KEY,
          toyName VARCHAR(100) NOT NULL,
          toyType VARCHAR(50) NOT NULL
        );',
        "seedData" = 'INSERT INTO Toys (toyId, toyName, toyType) VALUES
        (1, ''Lego City Set'', ''Building Blocks''),
        (2, ''Barbie Dreamhouse'', ''Doll''),
        (3, ''Hot Wheels Track'', ''Car''),
        (4, ''Teddy Bear'', ''Stuffed Animal''),
        (5, ''Monopoly Board Game'', ''Board Game''),
        (6, ''Nintendo Switch'', ''Video Game''),
        (7, ''Wooden Puzzle'', ''Puzzle''),
        (8, ''Remote Control Helicopter'', ''RC Vehicle'');',
        "updatedAt" = NOW()
        WHERE id = ${toysDb.id}
      `;
            toysDb = await prisma.database.findUnique({
                where: { id: toysDb.id }
            });
        }
        if (!toysDb) {
            throw new Error('Failed to create or find ToysDB');
        }
        console.log(`Created database: ${toysDb.name}`);
        const existingToysExercise = await prisma.exercise.findFirst({
            where: {
                title: 'Alle Spielzeuge anzeigen',
                databaseSchemaId: toysDb.id
            }
        });
        if (!existingToysExercise) {
            const toysExercise = await prisma.exercise.create({
                data: {
                    title: 'Alle Spielzeuge anzeigen',
                    description: 'Schreibe eine SQL-Abfrage, die alle Spielzeuge aus der Tabelle "Toys" auswählt. Zeige alle Spalten an.',
                    initialQuery: 'SELECT ',
                    solutionQuery: 'SELECT * FROM Toys',
                    database: {
                        connect: {
                            id: toysDb.id
                        }
                    },
                    author: {
                        connect: {
                            id: teacherId
                        }
                    }
                }
            });
            console.log(`Created exercise: ${toysExercise.title}`);
        }
        else {
            console.log(`Exercise already exists: ${existingToysExercise.title}`);
        }
        return { personenDb, toysDb };
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
async function createToysTable(toysDbId) {
    console.log('Creating toys table...');
    try {
        const toysDb = await prisma.database.findUnique({
            where: {
                id: toysDbId
            }
        });
        if (!toysDb) {
            console.error('ToysDB not found in Database table');
            return;
        }
        console.log('Found ToysDB, executing schema...');
        try {
            await prisma.$executeRawUnsafe(toysDb.schema);
            console.log('Toys table schema created successfully');
        }
        catch (err) {
            console.log('Toys table might already exist, continuing with seed data');
        }
        try {
            await prisma.$executeRawUnsafe(toysDb.seedData);
            console.log('Toys table data inserted successfully');
        }
        catch (err) {
            console.log('Toys seed data might already exist, continuing');
        }
    }
    catch (error) {
        console.error('Error creating toys table:', error);
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
        const databases = await seedDatabasesAndExercises(teacher.id);
        await createPersonenTable(databases.personenDb.id);
        await createToysTable(databases.toysDb.id);
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