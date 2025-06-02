import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
// Add a new function to seed databases and exercises
async function seedDatabasesAndExercises(teacherId: number) {
  console.log('Seeding databases and exercises...');

  try {
    // First check if PersonenDB already exists
    let personenDb = await prisma.database.findUnique({
      where: { name: 'PersonenDB' }
    });
    
    if (!personenDb) {
      // Create PersonenDB database using raw SQL to avoid type issues with the author relationship
      await prisma.$executeRaw`
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
      
      // Get the created database
      personenDb = await prisma.database.findUnique({
        where: { name: 'PersonenDB' }
      });
    } else {
      // Update the existing database using raw query to avoid type errors
      await prisma.$executeRaw`
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
      
      // Refresh the database object
      personenDb = await prisma.database.findUnique({
        where: { id: personenDb.id }
      });
    }

    if (!personenDb) {
      throw new Error('Failed to create or find PersonenDB');
    }

    console.log(`Created database: ${personenDb.name}`);
  
    // Check if exercise already exists
    const existingExercise = await prisma.exercise.findFirst({
      where: {
        title: 'Alter auswählen',
        databaseSchemaId: personenDb.id
      }
    });
    
    if (!existingExercise) {
      // Create exercise for selecting age
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
    } else {
      console.log(`Exercise already exists: ${existingExercise.title}`);
    }

    // Add ToysDB
    let toysDb = await prisma.database.findUnique({
      where: { name: 'ToysDB' }
    });
    
    if (!toysDb) {
      // Create ToysDB database
      await prisma.$executeRaw`
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
      
      // Get the created database
      toysDb = await prisma.database.findUnique({
        where: { name: 'ToysDB' }
      });
    } else {
      // Update the existing database
      await prisma.$executeRaw`
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
      
      // Refresh the database object
      toysDb = await prisma.database.findUnique({
        where: { id: toysDb.id }
      });
    }

    if (!toysDb) {
      throw new Error('Failed to create or find ToysDB');
    }

    console.log(`Created database: ${toysDb.name}`);

    // Check if ToysDB exercise already exists
    const existingToysExercise = await prisma.exercise.findFirst({
      where: {
        title: 'Alle Spielzeuge anzeigen',
        databaseSchemaId: toysDb.id
      }
    });
    
    if (!existingToysExercise) {
      // Create simple exercise for selecting all toys
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
    } else {
      console.log(`Exercise already exists: ${existingToysExercise.title}`);
    }

    // Add ObjectsDB
    let objectsDb = await prisma.database.findUnique({
      where: { name: 'ObjectsDB' }
    });
    
    if (!objectsDb) {
      // Create ObjectsDB database
      await prisma.$executeRaw`
        INSERT INTO "Database" (name, schema, "seedData", "authorId", "createdAt", "updatedAt")
        VALUES (
          'ObjectsDB',
          'CREATE TABLE items (
            id SERIAL PRIMARY KEY,
            type VARCHAR(50),
            status VARCHAR(50),
            number INT,
            released BOOLEAN
          );',
          'INSERT INTO items (type, status, number, released) VALUES
          (''Widget'', ''Available'', 101, TRUE),
          (''Widget'', ''Out of Stock'', 102, FALSE),
          (''Gadget'', ''Available'', 103, TRUE),
          (''Tool'', ''Discontinued'', 104, FALSE);',
          ${teacherId},
          NOW(),
          NOW()
        )
      `;
      
      // Get the created database
      objectsDb = await prisma.database.findUnique({
        where: { name: 'ObjectsDB' }
      });
    } else {
      // Update the existing database
      await prisma.$executeRaw`
        UPDATE "Database" 
        SET "schema" = 'CREATE TABLE items (
          id SERIAL PRIMARY KEY,
          type VARCHAR(50),
          status VARCHAR(50),
          number INT,
          released BOOLEAN
        );',
        "seedData" = 'INSERT INTO items (type, status, number, released) VALUES
        (''Widget'', ''Available'', 101, TRUE),
        (''Widget'', ''Out of Stock'', 102, FALSE),
        (''Gadget'', ''Available'', 103, TRUE),
        (''Tool'', ''Discontinued'', 104, FALSE);',
        "updatedAt" = NOW()
        WHERE name = 'ObjectsDB'
      `;
    }

    console.log(`Created database: ${objectsDb!.name}`);

    // Check if ObjectsDB exercise already exists
    const existingObjectsExercise = await prisma.exercise.findFirst({
      where: {
        title: 'Verfügbare Objekte verwalten',
        databaseSchemaId: objectsDb!.id
      }
    });
    
    if (!existingObjectsExercise) {
      // Create exercise for deleting non-released objects and selecting remaining ones
      const objectsExercise = await prisma.exercise.create({
        data: {
          title: 'Verfügbare Objekte verwalten',
          description: 'Lösche alle Objekte aus der Tabelle "items", bei denen released = false ist. Zeige danach alle verbleibenden Objekte an. Verwende zwei separate SQL-Befehle: zuerst DELETE, dann SELECT.',
          initialQuery: 'DELETE',
          solutionQuery: 'DELETE FROM items WHERE released = false;\nSELECT * FROM items;',
          database: {
            connect: {
              id: objectsDb!.id
            }
          },
          author: {
            connect: {
              id: teacherId
            }
          }
        }
      });
    
      console.log(`Created exercise: ${objectsExercise.title}`);
    } else {
      console.log(`Exercise already exists: ${existingObjectsExercise.title}`);
    }
  
    return { personenDb, toysDb, objectsDb };
  } catch (error) {
    console.error('Error creating database and exercise:', error);
    throw error;
  }
}

// Add a new function to execute the schema and data for the PersonenDB
async function createPersonenTable(personenDbId: number) {
  console.log('Creating personen table...');
  
  try {
    // Find the PersonenDB entry
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
      // Execute schema to create the table, handle case if table already exists
      await prisma.$executeRawUnsafe(personenDb.schema);
      console.log('Personen table schema created successfully');
    } catch (err) {
      console.log('Table might already exist, continuing with seed data');
    }
    
    try {
      // Execute seed data to populate the table, handle case if data already exists
      await prisma.$executeRawUnsafe(personenDb.seedData);
      console.log('Personen table data inserted successfully');
    } catch (err) {
      console.log('Seed data might already exist, continuing');
    }
    
  } catch (error) {
    console.error('Error creating personen table:', error);
  }
}

// Add a new function to execute the schema and data for the ToysDB
async function createToysTable(toysDbId: number) {
  console.log('Creating toys table...');
  
  try {
    // Find the ToysDB entry
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
      // Execute schema to create the table, handle case if table already exists
      await prisma.$executeRawUnsafe(toysDb.schema);
      console.log('Toys table schema created successfully');
    } catch (err) {
      console.log('Toys table might already exist, continuing with seed data');
    }
    
    try {
      // Execute seed data to populate the table, handle case if data already exists
      await prisma.$executeRawUnsafe(toysDb.seedData);
      console.log('Toys table data inserted successfully');
    } catch (err) {
      console.log('Toys seed data might already exist, continuing');
    }
    
  } catch (error) {
    console.error('Error creating toys table:', error);
  }
}

// Add a new function to execute the schema and data for the ObjectsDB
async function createObjectsTable(objectsDbId: number) {
  console.log('Creating objects table...');
  
  try {
    // Find the ObjectsDB entry
    const objectsDb = await prisma.database.findUnique({
      where: {
        id: objectsDbId
      }
    });
    
    if (!objectsDb) {
      console.error('ObjectsDB not found in Database table');
      return;
    }
    
    console.log('Found ObjectsDB, executing schema...');
    
    try {
      // Execute schema to create the table, handle case if table already exists
      await prisma.$executeRawUnsafe(objectsDb.schema);
      console.log('Objects table schema created successfully');
    } catch (err) {
      console.log('Objects table might already exist, continuing with seed data');
    }
    
    try {
      // Execute seed data to populate the table, handle case if data already exists
      await prisma.$executeRawUnsafe(objectsDb.seedData);
      console.log('Objects table data inserted successfully');
    } catch (err) {
      console.log('Objects seed data might already exist, continuing');
    }
    
  } catch (error) {
    console.error('Error creating objects table:', error);
  }
}

async function main() {
  console.log('Starting database seeding...');
  
  try {
    // Clean database tables
    console.log('Cleaning database tables...');
    await prisma.submission.deleteMany({}).catch(() => console.log('No submissions to clear'));
    await prisma.exercise.deleteMany({}).catch(() => console.log('No exercises to clear'));
    await prisma.database.deleteMany({}).catch(() => console.log('No databases to clear'));
    await prisma.user.deleteMany({}).catch(() => console.log('No users to clear'));
    
    console.log('Database cleaned. Starting seeding...');

    // Create a teacher
    const teacher = await prisma.user.create({
      data: {
        name: 'Hauptdozent',
        email: 'teacher@example.com',
        password: await bcrypt.hash('password123', 10),
        role: Role.TEACHER,
      },
    });
    console.log(`Teacher created: ${teacher.email}`);

    // Create 2 tutors
    const tutor1 = await prisma.user.create({
      data: {
        name: 'Tutor Eins',
        email: 'tutor1@example.com',
        password: await bcrypt.hash('password123', 10),
        role: Role.TUTOR,
      },
    });
    console.log(`Tutor created: ${tutor1.email}`);

    const tutor2 = await prisma.user.create({
      data: {
        name: 'Tutor Zwei',
        email: 'tutor2@example.com',
        password: await bcrypt.hash('password123', 10),
        role: Role.TUTOR,
      },
    });
    console.log(`Tutor created: ${tutor2.email}`);

    // Create 3 students
    const student1 = await prisma.user.create({
      data: {
        name: 'Student Eins',
        email: 'student1@example.com',
        password: await bcrypt.hash('password123', 10),
        role: Role.STUDENT,
      },
    });
    console.log(`Student created: ${student1.email}`);

    const student2 = await prisma.user.create({
      data: {
        name: 'Student Zwei',
        email: 'student2@example.com',
        password: await bcrypt.hash('password123', 10),
        role: Role.STUDENT,
      },
    });
    console.log(`Student created: ${student2.email}`);
    
    const student3 = await prisma.user.create({
      data: {
        name: 'Student Drei',
        email: 'student3@example.com',
        password: await bcrypt.hash('password123', 10),
        role: Role.STUDENT,
      },
    });
    console.log(`Student created: ${student3.email}`);

    // Create databases and exercises
    const databases = await seedDatabasesAndExercises(teacher.id);
    
    // Create the actual personen table in PostgreSQL
    await createPersonenTable(databases.personenDb.id);
    
    // Create the actual toys table in PostgreSQL
    await createToysTable(databases.toysDb.id);
    
    // Create the actual objects table in PostgreSQL
    await createObjectsTable(databases.objectsDb!.id);

    console.log(`Seeding completed.`);
  } catch (error) {
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
