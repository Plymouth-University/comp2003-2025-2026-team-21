import prisma from "./src/utils/prisma";

async function run() {
  // use a fake organiser and student
  const fakeOrganiserId = "00000000-0000-0000-0000-000000000000";
  const fakeStudentId = "11111111-1111-1111-1111-111111111111";

  // ensure organiser and student exist (create or ignore)
  await prisma.organisation.upsert({
    where: { id: fakeOrganiserId },
    update: {},
    create: {
      id: fakeOrganiserId,
      email: "fake@org.com",
      password: "pass",
      name: "Fake Org",
      location: "Nowhere",
    },
  });
  await prisma.student.upsert({
    where: { id: fakeStudentId },
    update: {},
    create: {
      id: fakeStudentId,
      email: "fake@student.com",
      username: "fakestudent",
      password: "pass",
    },
  });

  const event = await prisma.event.create({
    data: {
      title: "test",
      description: "d",
      date: new Date(),
      location: "loc",
      price: "0",
      organiserId: fakeOrganiserId,
    },
  });
  const ticket = await prisma.ticket.create({
    data: {
      studentId: fakeStudentId,
      eventId: event.id,
    },
  });
  console.log("created", event.id, ticket.id);
  await prisma.event.delete({ where: { id: event.id } });
  const remain = await prisma.ticket.findMany({ where: { eventId: event.id } });
  console.log("remaining tickets", remain);
  await prisma.$disconnect();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
