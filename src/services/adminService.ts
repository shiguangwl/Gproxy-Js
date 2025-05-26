// src/services/adminService.ts
import bcrypt from 'bcryptjs';
import { D1Database } from '@cloudflare/workers-types';
import { setSetting, getSetting } from '../db'; // Import getSetting
import jwt from 'jsonwebtoken'; // Ensure this is imported

// Define UserPayload here or import from a shared types file if available
// This should match the payload structure used in authMiddleware
export interface UserPayload {
  id: string;
  // Add other fields if your JWT payload is more complex
}

const SALT_ROUNDS = 10;

export async function setupAdminPassword(db: D1Database, password: string): Promise<void> {
  if (!password) {
    throw new Error('Password cannot be empty.');
  }
  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
  await setSetting(db, 'admin_password_hash', hashedPassword);
}

export async function loginAdmin(db: D1Database, passwordInput: string, jwtSecret: string): Promise<string | null> {
  if (!passwordInput) {
    console.warn('Login attempt with empty password.');
    return null;
  }
  if (!jwtSecret) {
    console.error('JWT_SECRET is not provided to loginAdmin function.');
    // Depending on policy, you might throw an error or just return null
    return null;
  }

  const hashedPassword = await getSetting(db, 'admin_password_hash');
  if (!hashedPassword) {
    // Admin password not set up
    console.warn('Admin password hash not found in settings.');
    return null;
  }

  const match = await bcrypt.compare(passwordInput, hashedPassword);
  if (match) {
    const payload: UserPayload = { id: 'admin_user' }; // Or a more specific user ID
    const token = jwt.sign(payload, jwtSecret, { expiresIn: '1d' }); // Example: 1 day expiry
    return token;
  }
  console.warn('Password mismatch for admin login.');
  return null;
}

export async function changeAdminPassword(db: D1Database, currentPassword: string, newPassword: string): Promise<boolean> { return false; /* Placeholder */ }