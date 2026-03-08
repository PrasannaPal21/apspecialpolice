const { PrismaClient } = require('./src/generated/prisma');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function clearUserData() {
  console.log('Clearing user-related data...');
  await prisma.englishSectionAnswer.deleteMany({});
  await prisma.excelFile.deleteMany({});
  await prisma.wordFile.deleteMany({});
  await prisma.pptFile.deleteMany({});
  await prisma.textFile.deleteMany({});
  await prisma.submission.deleteMany({});
  await prisma.user.deleteMany({});
  console.log('User data cleared.');
}

async function main() {
  try {
    await clearUserData();

    const usersToCreate = [
      
      { name: 'Test User 04', hallticket: 'TEST004', dobPlain: '04-04-1993', role: 'USER', examslot: 'Single Slot', examdate: '2026-03-09', examroom: 'CB-228' },
      { name: 'Test User 05', hallticket: 'TEST005', dobPlain: '05-05-1994', role: 'USER', examslot: 'Single Slot', examdate: '2026-03-09', examroom: 'CB-228' },
      { name: 'Test User 06', hallticket: 'TEST006', dobPlain: '06-06-1995', role: 'USER', examslot: 'Single Slot', examdate: '2026-03-09', examroom: 'CB-228' },
      { name: 'Test User 07', hallticket: 'TEST007', dobPlain: '07-07-1996', role: 'USER', examslot: 'Single Slot', examdate: '2026-03-09', examroom: 'CB-228' },
      { name: 'Test User 08', hallticket: 'TEST008', dobPlain: '08-08-1997', role: 'USER', examslot: 'Single Slot', examdate: '2026-03-09', examroom: 'CB-228' },
      { name: 'Test User 09', hallticket: 'TEST009', dobPlain: '09-09-1998', role: 'USER', examslot: 'Single Slot', examdate: '2026-03-09', examroom: 'CB-228' },
      { name: 'Test User 10', hallticket: 'TEST010', dobPlain: '10-10-1999', role: 'USER', examslot: 'Single Slot', examdate: '2026-03-09', examroom: 'CB-228' },

      { name: 'Testing123', hallticket: '8432183828', dobPlain: '10-10-1999', role: 'USER', examslot: 'Single Slot', examdate: '2026-03-09', examroom: 'CB-228' },

      { name: 'Ch.Usha Rani', hallticket: '7780465472', dobPlain: '01-01-1991', role: 'USER', examslot: 'Single Slot', examdate: '2026-03-09', examroom: 'CB-228' },
      { name: 'K.Chandrakala', hallticket: '8639433524', dobPlain: '02-02-1992', role: 'USER', examslot: 'Single Slot', examdate: '2026-03-09', examroom: 'CB-228' },
      { name: 'O.Naga Sruthi', hallticket: '7661998199', dobPlain: '03-03-1993', role: 'USER', examslot: 'Single Slot', examdate: '2026-03-09', examroom: 'CB-228' },
      { name: 'K.Venkata Ramana', hallticket: '9550394863', dobPlain: '04-04-1994', role: 'USER', examslot: 'Single Slot', examdate: '2026-03-09', examroom: 'CB-228' },
      { name: 'Sk.Chinna Baji', hallticket: '9492708791', dobPlain: '05-05-1995', role: 'USER', examslot: 'Single Slot', examdate: '2026-03-09', examroom: 'CB-228' },
      { name: 'N.Lalitha', hallticket: '9441357697', dobPlain: '06-06-1996', role: 'USER', examslot: 'Single Slot', examdate: '2026-03-09', examroom: 'CB-228' },
      { name: 'V.Haritha', hallticket: '9949339819', dobPlain: '07-07-1997', role: 'USER', examslot: 'Single Slot', examdate: '2026-03-09', examroom: 'CB-228' },
      { name: 'J.V.Srilaxmi', hallticket: '9395396110', dobPlain: '08-08-1998', role: 'USER', examslot: 'Single Slot', examdate: '2026-03-09', examroom: 'CB-228' },
      { name: 'O.Swathi', hallticket: '7330770881', dobPlain: '09-09-1999', role: 'USER', examslot: 'Single Slot', examdate: '2026-03-09', examroom: 'CB-228' },
      { name: 'U.Sridevi', hallticket: '8465868265', dobPlain: '10-10-2000', role: 'USER', examslot: 'Single Slot', examdate: '2026-03-09', examroom: 'CB-228' },
      { name: 'Ch.Venkatapathi', hallticket: '9959814227', dobPlain: '11-11-2001', role: 'USER', examslot: 'Single Slot', examdate: '2026-03-09', examroom: 'CB-228' },
      { name: 'G.Sumalatha', hallticket: '9494031434', dobPlain: '12-12-2002', role: 'USER', examslot: 'Single Slot', examdate: '2026-03-09', examroom: 'CB-228' },

      { name: 'Test Admin', hallticket: 'ADMIN001', dobPlain: '09-09-1985', role: 'ADMIN', examslot: 'Single Slot', examdate: '2026-03-09', examroom: 'CB-228' },
      { name: 'Test Admin', hallticket: 'ADMIN002', dobPlain: '09-09-1985', role: 'ADMIN', examslot: 'Single Slot', examdate: '2026-03-09', examroom: 'CB-228' },
      { name: 'Prasanna VIT', hallticket: 'SUPERADMIN001', dobPlain: '01-01-2004', role: 'SUPER_ADMIN', examslot: 'Single Slot', examdate: '2026-03-09', examroom: 'CB-228' },
      { name: 'Prasanna VIT 2', hallticket: 'SUPERADMIN002', dobPlain: '01-01-2004', role: 'SUPER_ADMIN', examslot: 'Single Slot', examdate: '2026-03-09', examroom: 'CB-228' },

    ];

    for (const u of usersToCreate) {
      const hashedDob = await bcrypt.hash(u.dobPlain, 10);
      await prisma.user.create({
        data: {
          name: u.name,
          hallticket: u.hallticket,
          dob: hashedDob,
          role: u.role,
          examslot: u.examslot,
          examdate: u.examdate,
          examroom: u.examroom,
        },
      });
      console.log(`Created: ${u.hallticket} (${u.role}) - DOB for login: ${u.dobPlain}`);
    }

    console.log('\nSeed done. 5 users created (4 USER + 1 ADMIN).');
    console.log('Login with hallticket + DOB (e.g. TEST001 / 01-01-1990).');
  } catch (e) {
    console.error('Error:', e);
    throw e;
  } finally {
    await prisma.$disconnect();
  }
}

main();
