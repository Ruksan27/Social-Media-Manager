const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const profiles = await prisma.profile.findMany({
    select: { id: true, name: true, password: true, createdAt: true }
  });

  if (profiles.length === 0) {
    console.log('❌ No profiles found in database. You need to REGISTER first.');
  } else {
    console.log(`✅ Found ${profiles.length} profile(s):\n`);
    profiles.forEach(p => {
      console.log(`  Name: "${p.name}"`);
      console.log(`  Has password: ${p.password ? 'Yes (bcrypt hash)' : '❌ NO PASSWORD — cannot login!'}`);
      console.log(`  Created: ${p.createdAt}`);
      console.log('');
    });
  }

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
