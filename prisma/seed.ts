import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const defaultSymptoms = [
  { name: "Headache", category: "Pain" },
  { name: "Fatigue", category: "Energy" },
  { name: "Joint Pain", category: "Pain" },
  { name: "Muscle Pain", category: "Pain" },
  { name: "Nausea", category: "Digestive" },
  { name: "Brain Fog", category: "Cognitive" },
  { name: "Dizziness", category: "Neurological" },
  { name: "Insomnia", category: "Sleep" },
  { name: "Anxiety", category: "Mental Health" },
  { name: "Stomach Pain", category: "Digestive" },
  { name: "Back Pain", category: "Pain" },
];

const defaultHabits = [
  { name: "Sleep Duration", trackingType: "duration" as const, unit: "hours" },
  { name: "Water Intake", trackingType: "numeric" as const, unit: "glasses" },
  { name: "Exercise", trackingType: "boolean" as const, unit: null },
  { name: "Alcohol", trackingType: "boolean" as const, unit: null },
  { name: "Caffeine", trackingType: "numeric" as const, unit: "cups" },
];

async function main() {
  console.log("Seeding default symptoms...");
  for (const symptom of defaultSymptoms) {
    await prisma.symptom.upsert({
      where: {
        // Use a synthetic unique key: name + null userId
        // Since there's no unique constraint, we check existing and skip
        id: `seed-symptom-${symptom.name.toLowerCase().replace(/\s+/g, "-")}`,
      },
      update: {},
      create: {
        id: `seed-symptom-${symptom.name.toLowerCase().replace(/\s+/g, "-")}`,
        name: symptom.name,
        category: symptom.category,
        userId: null,
        isActive: true,
      },
    });
  }
  console.log(`Seeded ${defaultSymptoms.length} default symptoms.`);

  console.log("Seeding default habits...");
  for (const habit of defaultHabits) {
    await prisma.habit.upsert({
      where: {
        id: `seed-habit-${habit.name.toLowerCase().replace(/\s+/g, "-")}`,
      },
      update: {},
      create: {
        id: `seed-habit-${habit.name.toLowerCase().replace(/\s+/g, "-")}`,
        name: habit.name,
        trackingType: habit.trackingType,
        unit: habit.unit,
        userId: null,
        isActive: true,
      },
    });
  }
  console.log(`Seeded ${defaultHabits.length} default habits.`);

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
