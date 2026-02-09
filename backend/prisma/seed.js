import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

const seedUsers = [
  {
    fullName: "Администратор Иванов",
    email: "admin@example.com",
    role: "ADMIN",
  },
  {
    fullName: "Петрова Анна Сергеевна",
    email: "worker1@example.com",
    role: "WORKER",
  },
  {
    fullName: "Сидоров Алексей Михайлович",
    email: "worker2@example.com",
    role: "WORKER",
  },
];

async function main() {
  const passwordHash = await bcrypt.hash("Password123!", 10);

  // Reset users so the seed stays deterministic for MVP demos
  await prisma.call.deleteMany();
  await prisma.user.deleteMany();

  await prisma.user.createMany({
    data: seedUsers.map((user) => ({
      ...user,
      passwordHash,
    })),
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error("Seed error", error);
    await prisma.$disconnect();
    process.exit(1);
  });
