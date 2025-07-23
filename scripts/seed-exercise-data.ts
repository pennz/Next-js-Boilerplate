import { drizzle } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import { exerciseSchema, muscleGroupSchema } from '@/models/Schema';
import { Env } from '@/libs/Env';

const db = drizzle({
  connection: {
    connectionString: Env.DATABASE_URL,
    ssl: !Env.DATABASE_URL.includes('localhost') && !Env.DATABASE_URL.includes('127.0.0.1'),
  },
});

const muscleGroups = [
  // Upper Body
  { name: 'Chest', bodyPart: 'Upper Body', description: 'Pectorals and surrounding chest muscles' },
  { name: 'Back', bodyPart: 'Upper Body', description: 'Latissimus dorsi, rhomboids, traps' },
  { name: 'Shoulders', bodyPart: 'Upper Body', description: 'Deltoids and rotator cuff muscles' },
  { name: 'Biceps', bodyPart: 'Upper Body', description: 'Front arm muscles' },
  { name: 'Triceps', bodyPart: 'Upper Body', description: 'Back arm muscles' },
  { name: 'Forearms', bodyPart: 'Upper Body', description: 'Lower arm muscles' },
  
  // Core
  { name: 'Abs', bodyPart: 'Core', description: 'Abdominal muscles' },
  { name: 'Obliques', bodyPart: 'Core', description: 'Side abdominal muscles' },
  { name: 'Lower Back', bodyPart: 'Core', description: 'Lower back and spinal erectors' },
  
  // Lower Body
  { name: 'Quadriceps', bodyPart: 'Lower Body', description: 'Front thigh muscles' },
  { name: 'Hamstrings', bodyPart: 'Lower Body', description: 'Back thigh muscles' },
  { name: 'Glutes', bodyPart: 'Lower Body', description: 'Buttock muscles' },
  { name: 'Calves', bodyPart: 'Lower Body', description: 'Lower leg muscles' },
  { name: 'Hip Flexors', bodyPart: 'Lower Body', description: 'Hip and groin muscles' },
];

const exercises = [
  // Chest exercises
  {
    name: 'Push-ups',
    description: 'Classic bodyweight chest exercise',
    exerciseType: 'strength' as const,
    primaryMuscleGroup: 'Chest',
    instructions: 'Start in plank position, lower body to ground, push back up',
    difficulty: 'beginner' as const,
    equipmentNeeded: 'None',
  },
  {
    name: 'Bench Press',
    description: 'Barbell chest press on bench',
    exerciseType: 'strength' as const,
    primaryMuscleGroup: 'Chest',
    instructions: 'Lie on bench, lower barbell to chest, press up',
    difficulty: 'intermediate' as const,
    equipmentNeeded: 'Barbell, Bench',
  },
  
  // Back exercises
  {
    name: 'Pull-ups',
    description: 'Bodyweight back exercise',
    exerciseType: 'strength' as const,
    primaryMuscleGroup: 'Back',
    instructions: 'Hang from bar, pull body up until chin over bar',
    difficulty: 'intermediate' as const,
    equipmentNeeded: 'Pull-up bar',
  },
  {
    name: 'Bent-over Row',
    description: 'Barbell rowing exercise',
    exerciseType: 'strength' as const,
    primaryMuscleGroup: 'Back',
    instructions: 'Bend at hips, row barbell to lower chest',
    difficulty: 'intermediate' as const,
    equipmentNeeded: 'Barbell',
  },
  
  // Leg exercises
  {
    name: 'Squats',
    description: 'Fundamental leg exercise',
    exerciseType: 'strength' as const,
    primaryMuscleGroup: 'Quadriceps',
    instructions: 'Stand with feet shoulder-width apart, lower hips back and down',
    difficulty: 'beginner' as const,
    equipmentNeeded: 'None',
  },
  {
    name: 'Deadlifts',
    description: 'Hip hinge movement',
    exerciseType: 'strength' as const,
    primaryMuscleGroup: 'Hamstrings',
    instructions: 'Lift barbell from ground to hip level with straight back',
    difficulty: 'intermediate' as const,
    equipmentNeeded: 'Barbell',
  },
  
  // Cardio exercises
  {
    name: 'Running',
    description: 'Cardiovascular endurance exercise',
    exerciseType: 'cardio' as const,
    primaryMuscleGroup: 'Quadriceps',
    instructions: 'Maintain steady pace for target duration',
    difficulty: 'beginner' as const,
    equipmentNeeded: 'None',
  },
  {
    name: 'Cycling',
    description: 'Low-impact cardio exercise',
    exerciseType: 'cardio' as const,
    primaryMuscleGroup: 'Quadriceps',
    instructions: 'Pedal at consistent pace for target duration',
    difficulty: 'beginner' as const,
    equipmentNeeded: 'Bicycle or stationary bike',
  },
  
  // Core exercises
  {
    name: 'Plank',
    description: 'Isometric core strengthening',
    exerciseType: 'strength' as const,
    primaryMuscleGroup: 'Abs',
    instructions: 'Hold push-up position maintaining straight line',
    difficulty: 'beginner' as const,
    equipmentNeeded: 'None',
  },
  {
    name: 'Russian Twists',
    description: 'Rotational core exercise',
    exerciseType: 'strength' as const,
    primaryMuscleGroup: 'Obliques',
    instructions: 'Sit with knees bent, rotate torso side to side',
    difficulty: 'beginner' as const,
    equipmentNeeded: 'None',
  },
];

async function seedExerciseData() {
  console.log('🌱 Seeding exercise data...');
  
  try {
    // Insert muscle groups
    console.log('Inserting muscle groups...');
    for (const muscleGroup of muscleGroups) {
      const existing = await db
        .select()
        .from(muscleGroupSchema)
        .where(eq(muscleGroupSchema.name, muscleGroup.name))
        .limit(1);
      
      if (existing.length === 0) {
        await db.insert(muscleGroupSchema).values(muscleGroup);
        console.log(`✅ Added muscle group: ${muscleGroup.name}`);
      } else {
        console.log(`⏭️  Muscle group already exists: ${muscleGroup.name}`);
      }
    }
    
    // Get muscle group IDs for exercises
    const muscleGroupMap = new Map();
    const allMuscleGroups = await db.select().from(muscleGroupSchema);
    for (const mg of allMuscleGroups) {
      muscleGroupMap.set(mg.name, mg.id);
    }
    
    // Insert exercises
    console.log('Inserting exercises...');
    for (const exercise of exercises) {
      const primaryMuscleGroupId = muscleGroupMap.get(exercise.primaryMuscleGroup);
      
      if (!primaryMuscleGroupId) {
        console.log(`❌ Primary muscle group not found: ${exercise.primaryMuscleGroup}`);
        continue;
      }
      
      const existing = await db
        .select()
        .from(exerciseSchema)
        .where(eq(exerciseSchema.name, exercise.name))
        .limit(1);
      
      if (existing.length === 0) {
        await db.insert(exerciseSchema).values({
          name: exercise.name,
          description: exercise.description,
          exerciseType: exercise.exerciseType,
          primaryMuscleGroupId,
          instructions: exercise.instructions,
          difficulty: exercise.difficulty,
          equipmentNeeded: exercise.equipmentNeeded,
        });
        console.log(`✅ Added exercise: ${exercise.name}`);
      } else {
        console.log(`⏭️  Exercise already exists: ${exercise.name}`);
      }
    }
    
    console.log('🎉 Exercise data seeded successfully!');
  } catch (error) {
    console.error('❌ Error seeding exercise data:', error);
    process.exit(1);
  }
}

seedExerciseData();