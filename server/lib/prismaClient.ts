import { PrismaClient } from '@prisma/client';

import { loadEnv } from '../utils/loadEnv';

loadEnv();

export const prismaClient = new PrismaClient();
