import prisma from "./src/utils/prisma";

async function checkUser() {
  const email = "kam@students.plymouth.ac.uk";
  
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      username: true,
      name: true,
    },
  });

  if (user) {
    console.log("\n✅ User found:");
    console.log("   Email:", user.email);
    console.log("   Username:", user.username);
    console.log("   Name:", user.name);
    console.log("   ID:", user.id);
  } else {
    console.log("\n❌ User not found with email:", email);
  }

  await prisma.$disconnect();
}

checkUser();
