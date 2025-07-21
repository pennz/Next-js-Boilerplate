import { faker } from '@faker-js/faker';

export const generateWeightData = () => {
  return Array.from({ length: 7 }, (_, i) => ({
    date: faker.date.recent({ days: 7 }).toISOString().split('T')[0],
    value: faker.number.float({ min: 70, max: 80, precision: 0.1 }),
    unit: 'kg',
  }));
};

export const generateStepsData = () => {
  return Array.from({ length: 7 }, (_, i) => ({
    date: faker.date.recent({ days: 7 }).toISOString().split('T')[0],
    value: faker.number.int({ min: 7000, max: 12000 }),
    unit: 'steps',
  }));
};

export const generateBloodPressureData = () => {
  return Array.from({ length: 5 }, (_, i) => ({
    date: faker.date.recent({ days: 5 }).toISOString().split('T')[0],
    systolic: faker.number.int({ min: 110, max: 130 }),
    diastolic: faker.number.int({ min: 70, max: 85 }),
    unit: 'mmHg',
  }));
};
