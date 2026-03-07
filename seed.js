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
      { name: 'Test User 11', hallticket: 'TEST111', dobPlain: '01-01-1990', role: 'USER', examslot: 'Single Slot', examdate: '2026-03-08', examroom: 'Room A' },
      { name: 'Test User 12', hallticket: 'TEST112', dobPlain: '02-02-1991', role: 'USER', examslot: 'Single Slot', examdate: '2026-03-08', examroom: 'Room A' },
      { name: 'Test User 13', hallticket: 'TEST113', dobPlain: '03-03-1992', role: 'USER', examslot: 'Single Slot', examdate: '2026-03-08', examroom: 'Room A' },
      { name: 'Test User 14', hallticket: 'TEST114', dobPlain: '04-04-1993', role: 'USER', examslot: 'Single Slot', examdate: '2026-03-08', examroom: 'Room A' },
      { name: 'Test Admin', hallticket: 'ADMIN001', dobPlain: '09-09-1985', role: 'ADMIN', examslot: 'Single Slot', examdate: '2026-03-08', examroom: 'Room A' },
      { name: 'Test Admin', hallticket: 'ADMIN002', dobPlain: '09-09-1985', role: 'ADMIN', examslot: 'Single Slot', examdate: '2026-03-08', examroom: 'Room A' },
      { name: 'Prasanna VIT', hallticket: 'SUPERADMIN001', dobPlain: '01-01-2004', role: 'SUPER_ADMIN', examslot: 'Single Slot', examdate: '2026-03-08', examroom: 'Room A' },
      { name: 'Prasanna VIT 2', hallticket: 'SUPERADMIN002', dobPlain: '01-01-2004', role: 'SUPER_ADMIN', examslot: 'Single Slot', examdate: '2026-03-08', examroom: 'Room A' },

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
