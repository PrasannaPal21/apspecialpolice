import { PrismaClient, Role } from './src/generated/prisma'; // Adjust path if needed

const prisma = new PrismaClient();

async function main() {
  const updated = await prisma.user.updateMany({
    where: {
      name: {
        startsWith: 'ADMIN',
      },
    },
    data: {
      role: Role.ADMIN,
    },
  });

  console.log(`✅ Updated ${updated.count} user(s) to ADMIN role`);
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });