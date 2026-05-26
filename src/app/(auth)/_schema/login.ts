import { z } from 'zod';

export const loginSchema = z.object({
	userName: z.string().min(1, { message: 'Email is required.' }),
	password: z.string().min(1, { message: 'Password is required.' }),
});

export type LoginFormValues = z.infer<typeof loginSchema>;


