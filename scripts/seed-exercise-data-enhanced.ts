import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Env } from '@/libs/Env';
import { exerciseSchema, muscleGroupSchema } from '@/models/Schema';

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

// Extended exercises with behavior tracking metadata
const exercises = [
  // Beginner-friendly exercises (high completion rates, good for habit formation)
  {
    name: 'Push-ups',
    description: 'Classic bodyweight chest exercise - excellent for building upper body strength and establishing workout habits',
    exerciseType: 'strength' as const,
    primaryMuscleGroup: 'Chest',
    instructions: 'Start in plank position, lower body to ground, push back up. Focus on controlled movement.',
    difficulty: 'beginner' as const,
    equipmentNeeded: 'None',
    // Behavior tracking metadata
    habitFormationRating: 9, // 1-10 scale for habit formation potential
    completionLikelihood: 8, // 1-10 scale for typical completion rates
    motivationImpact: 7, // 1-10 scale for motivation boost after completion
    barrierToEntry: 2, // 1-10 scale (lower = fewer barriers)
    contextSuitability: ['home', 'gym', 'outdoor', 'hotel'], // environments where exercise can be performed
    timeRequirement: 5, // minutes for typical set
    progressTrackability: 9, // how easy it is to track progress
  },
  {
    name: 'Bodyweight Squats',
    description: 'Fundamental leg exercise that builds lower body strength and functional movement patterns',
    exerciseType: 'strength' as const,
    primaryMuscleGroup: 'Quadriceps',
    instructions: 'Stand with feet shoulder-width apart, lower hips back and down, keep chest up',
    difficulty: 'beginner' as const,
    equipmentNeeded: 'None',
    habitFormationRating: 9,
    completionLikelihood: 9,
    motivationImpact: 7,
    barrierToEntry: 1,
    contextSuitability: ['home', 'gym', 'outdoor', 'office'],
    timeRequirement: 5,
    progressTrackability: 8,
  },
  {
    name: 'Plank',
    description: 'Isometric core strengthening exercise that builds stability and mental toughness',
    exerciseType: 'strength' as const,
    primaryMuscleGroup: 'Abs',
    instructions: 'Hold push-up position maintaining straight line from head to heels',
    difficulty: 'beginner' as const,
    equipmentNeeded: 'None',
    habitFormationRating: 8,
    completionLikelihood: 7,
    motivationImpact: 8,
    barrierToEntry: 2,
    contextSuitability: ['home', 'gym', 'outdoor', 'hotel'],
    timeRequirement: 3,
    progressTrackability: 9,
  },

  // Intermediate exercises (moderate barrier, good for progression)
  {
    name: 'Bench Press',
    description: 'Barbell chest press on bench - classic strength building exercise requiring gym access',
    exerciseType: 'strength' as const,
    primaryMuscleGroup: 'Chest',
    instructions: 'Lie on bench, lower barbell to chest with control, press up powerfully',
    difficulty: 'intermediate' as const,
    equipmentNeeded: 'Barbell, Bench',
    habitFormationRating: 6,
    completionLikelihood: 6,
    motivationImpact: 9,
    barrierToEntry: 7,
    contextSuitability: ['gym'],
    timeRequirement: 15,
    progressTrackability: 10,
  },
  {
    name: 'Pull-ups',
    description: 'Challenging bodyweight back exercise that provides high sense of accomplishment',
    exerciseType: 'strength' as const,
    primaryMuscleGroup: 'Back',
    instructions: 'Hang from bar, pull body up until chin clears bar, lower with control',
    difficulty: 'intermediate' as const,
    equipmentNeeded: 'Pull-up bar',
    habitFormationRating: 5,
    completionLikelihood: 4,
    motivationImpact: 10,
    barrierToEntry: 6,
    contextSuitability: ['gym', 'outdoor'],
    timeRequirement: 10,
    progressTrackability: 9,
  },
  {
    name: 'Deadlifts',
    description: 'Compound hip hinge movement that builds total body strength and confidence',
    exerciseType: 'strength' as const,
    primaryMuscleGroup: 'Hamstrings',
    instructions: 'Lift barbell from ground to hip level maintaining straight back throughout',
    difficulty: 'intermediate' as const,
    equipmentNeeded: 'Barbell',
    habitFormationRating: 6,
    completionLikelihood: 7,
    motivationImpact: 9,
    barrierToEntry: 8,
    contextSuitability: ['gym'],
    timeRequirement: 20,
    progressTrackability: 10,
  },

  // Cardio exercises (great for consistency and mood improvement)
  {
    name: 'Walking',
    description: 'Low-impact cardiovascular exercise perfect for daily habit formation',
    exerciseType: 'cardio' as const,
    primaryMuscleGroup: 'Quadriceps',
    instructions: 'Maintain comfortable pace for target duration, focus on consistent rhythm',
    difficulty: 'beginner' as const,
    equipmentNeeded: 'None',
    habitFormationRating: 10,
    completionLikelihood: 10,
    motivationImpact: 6,
    barrierToEntry: 1,
    contextSuitability: ['outdoor', 'treadmill', 'mall'],
    timeRequirement: 30,
    progressTrackability: 8,
  },
  {
    name: 'Running',
    description: 'Higher intensity cardiovascular exercise that builds endurance and mental resilience',
    exerciseType: 'cardio' as const,
    primaryMuscleGroup: 'Quadriceps',
    instructions: 'Maintain steady pace for target duration, breathe rhythmically',
    difficulty: 'intermediate' as const,
    equipmentNeeded: 'Running shoes',
    habitFormationRating: 7,
    completionLikelihood: 6,
    motivationImpact: 8,
    barrierToEntry: 3,
    contextSuitability: ['outdoor', 'treadmill'],
    timeRequirement: 30,
    progressTrackability: 9,
  },
  {
    name: 'Cycling',
    description: 'Low-impact cardio exercise suitable for longer duration sessions',
    exerciseType: 'cardio' as const,
    primaryMuscleGroup: 'Quadriceps',
    instructions: 'Pedal at consistent pace maintaining proper posture',
    difficulty: 'beginner' as const,
    equipmentNeeded: 'Bicycle or stationary bike',
    habitFormationRating: 8,
    completionLikelihood: 8,
    motivationImpact: 7,
    barrierToEntry: 5,
    contextSuitability: ['outdoor', 'gym', 'home'],
    timeRequirement: 45,
    progressTrackability: 8,
  },

  // Flexibility and recovery exercises (important for long-term adherence)
  {
    name: 'Yoga Flow',
    description: 'Flowing sequence of poses that improves flexibility, balance, and mindfulness',
    exerciseType: 'flexibility' as const,
    primaryMuscleGroup: 'Abs',
    instructions: 'Move through poses with controlled breathing, hold each position briefly',
    difficulty: 'beginner' as const,
    equipmentNeeded: 'Yoga mat',
    habitFormationRating: 8,
    completionLikelihood: 7,
    motivationImpact: 8,
    barrierToEntry: 3,
    contextSuitability: ['home', 'gym', 'outdoor'],
    timeRequirement: 20,
    progressTrackability: 6,
  },
  {
    name: 'Stretching Routine',
    description: 'Systematic stretching for muscle recovery and flexibility maintenance',
    exerciseType: 'flexibility' as const,
    primaryMuscleGroup: 'Hip Flexors',
    instructions: 'Hold each stretch for 30 seconds, breathe deeply and relax into position',
    difficulty: 'beginner' as const,
    equipmentNeeded: 'None',
    habitFormationRating: 7,
    completionLikelihood: 8,
    motivationImpact: 6,
    barrierToEntry: 2,
    contextSuitability: ['home', 'gym', 'office'],
    timeRequirement: 15,
    progressTrackability: 5,
  },

  // High-intensity exercises (advanced habit builders)
  {
    name: 'Burpees',
    description: 'Full-body high-intensity exercise that builds cardiovascular fitness and mental toughness',
    exerciseType: 'cardio' as const,
    primaryMuscleGroup: 'Chest',
    instructions: 'Drop to push-up, jump feet to hands, jump up with arms overhead',
    difficulty: 'advanced' as const,
    equipmentNeeded: 'None',
    habitFormationRating: 4,
    completionLikelihood: 3,
    motivationImpact: 9,
    barrierToEntry: 2,
    contextSuitability: ['home', 'gym', 'outdoor'],
    timeRequirement: 10,
    progressTrackability: 7,
  },
  {
    name: 'Mountain Climbers',
    description: 'Dynamic core and cardio exercise that can be modified for different fitness levels',
    exerciseType: 'cardio' as const,
    primaryMuscleGroup: 'Abs',
    instructions: 'In plank position, alternate bringing knees to chest rapidly',
    difficulty: 'intermediate' as const,
    equipmentNeeded: 'None',
    habitFormationRating: 6,
    completionLikelihood: 6,
    motivationImpact: 7,
    barrierToEntry: 2,
    contextSuitability: ['home', 'gym', 'outdoor'],
    timeRequirement: 8,
    progressTrackability: 7,
  },
];

async function seedExerciseDataWithBehaviorMetadata() {
  console.log('🌱 Seeding exercise data with behavior tracking metadata...');

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

    // Insert exercises with behavior metadata
    console.log('Inserting exercises with behavior tracking metadata...');
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
        // Store behavior metadata in instructions field as structured comment
        const behaviorMetadata = {
          habitFormationRating: exercise.habitFormationRating,
          completionLikelihood: exercise.completionLikelihood,
          motivationImpact: exercise.motivationImpact,
          barrierToEntry: exercise.barrierToEntry,
          contextSuitability: exercise.contextSuitability,
          timeRequirement: exercise.timeRequirement,
          progressTrackability: exercise.progressTrackability,
        };

        const enhancedInstructions = `${exercise.instructions}

BEHAVIOR_METADATA: ${JSON.stringify(behaviorMetadata)}`;

        await db.insert(exerciseSchema).values({
          name: exercise.name,
          description: exercise.description,
          exerciseType: exercise.exerciseType,
          primaryMuscleGroupId,
          instructions: enhancedInstructions,
          difficulty: exercise.difficulty,
          equipmentNeeded: exercise.equipmentNeeded,
        });
        console.log(`✅ Added exercise with behavior metadata: ${exercise.name}`);
        console.log(`   📊 Habit Formation Rating: ${exercise.habitFormationRating}/10`);
        console.log(`   📈 Completion Likelihood: ${exercise.completionLikelihood}/10`);
        console.log(`   ⚡ Motivation Impact: ${exercise.motivationImpact}/10`);
      } else {
        console.log(`⏭️  Exercise already exists: ${exercise.name}`);
      }
    }

    console.log('🎉 Exercise data with behavior metadata seeded successfully!');
    console.log('📋 Behavior Metadata Categories:');
    console.log('   - Habit Formation Rating: Potential for building consistent habits');
    console.log('   - Completion Likelihood: Expected success rate for typical users');
    console.log('   - Motivation Impact: Boost in motivation after completion');
    console.log('   - Barrier to Entry: Obstacles preventing exercise completion');
    console.log('   - Context Suitability: Environments where exercise can be performed');
    console.log('   - Time Requirement: Typical duration for exercise session');
    console.log('   - Progress Trackability: Ease of measuring improvement');
    
    console.log('📊 Exercise Distribution:');
    const beginnerCount = exercises.filter(e => e.difficulty === 'beginner').length;
    const intermediateCount = exercises.filter(e => e.difficulty === 'intermediate').length;
    const advancedCount = exercises.filter(e => e.difficulty === 'advanced').length;
    console.log(`   - Beginner: ${beginnerCount} exercises (high habit formation potential)`);
    console.log(`   - Intermediate: ${intermediateCount} exercises (progression focused)`);
    console.log(`   - Advanced: ${advancedCount} exercises (challenge and achievement)`);
  } catch (error) {
    console.error('❌ Error seeding exercise data with behavior metadata:', error);
    process.exit(1);
  }
}

seedExerciseDataWithBehaviorMetadata();