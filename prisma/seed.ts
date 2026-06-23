import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const employees = [
    { id: 'emp-001', name: 'Ada Obi', annualLeaveBalance: 18 },
    { id: 'emp-002', name: 'Chidi Eze', annualLeaveBalance: 10 },
  ];

  for (const employee of employees) {
    await prisma.employee.upsert({
      where: { id: employee.id },
      update: {
        name: employee.name,
        annualLeaveBalance: employee.annualLeaveBalance,
      },
      create: employee,
    });
  }

  console.log('Seeded employees:');
  console.log('  emp-001 - Ada Obi - 18 days');
  console.log('  emp-002 - Chidi Eze - 10 days');
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });