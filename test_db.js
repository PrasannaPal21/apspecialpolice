const { PrismaClient } = require("./src/generated/prisma");
const prisma = new PrismaClient();

async function check() {
    const users = await prisma.user.findMany({
        where: { hallticket: { startsWith: 'TEST' } },
        include: {
            textFiles: true,
            wordFiles: true,
            excelFiles: true,
            pptFiles: true,
        }
    });

    for (const user of users) {
        const totalFiles = user.textFiles.length + user.wordFiles.length + user.excelFiles.length + user.pptFiles.length;
        if (totalFiles > 0 || user.hallticket === 'TEST005' || user.hallticket === 'TEST006' || user.hallticket === 'TEST007' || user.hallticket === 'TEST008') {
            console.log(`User ${user.hallticket}: text=${user.textFiles.length}, word=${user.wordFiles.length}, excel=${user.excelFiles.length}, ppt=${user.pptFiles.length}, isSubmitted=${user.isSubmitted}`);
        }
    }
}

check().catch(console.error).finally(() => prisma.$disconnect());
