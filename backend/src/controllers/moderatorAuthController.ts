import { Request, Response } from 'express';
import { ModeratorModel } from '../models/Moderator';
import { generateToken } from '../utils/jwt';
import { apiResponse } from '../utils/apiResponse';

/**
 * Component 6: Moderator Authentication Controller
 * Handles admin login and registration
 */

/**
 * Login moderator
 * POST /api/admin/auth/login
 */
export const loginModerator = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return apiResponse.error(res, 'Email and password are required', 400);
    }

    // Find moderator by email (includes cafe info)
    const moderator = await ModeratorModel.findByEmail(email);

    if (!moderator) {
      return apiResponse.error(res, 'Invalid credentials', 401);
    }

    // Verify password
    const isValidPassword = await ModeratorModel.verifyPassword(
      password,
      moderator.password_hash!
    );

    if (!isValidPassword) {
      return apiResponse.error(res, 'Invalid credentials', 401);
    }

    // Generate JWT token
    const token = generateToken({
      id: moderator.id,
      role: 'moderator',
      cafeId: moderator.cafe_id,
    });

    // Prepare response (exclude password hash)
    const { password_hash, ...moderatorData } = moderator;

    return apiResponse.success(res, {
      token,
      moderator: moderatorData,
      cafe: {
        id: moderator.cafe_id,
        name: moderator.cafe_name,
        location: moderator.cafe_location,
      },
    });
  } catch (error) {
    console.error('Moderator login error:', error);
    return apiResponse.error(res, 'Login failed', 500);
  }
};

/**
 * Register new moderator (owner only)
 * POST /api/admin/auth/register
 */
export const registerModerator = async (req: Request, res: Response) => {
  try {
    const { email, password, cafeId, role = 'moderator' } = req.body;

    if (!email || !password || !cafeId) {
      return apiResponse.error(
        res,
        'Email, password, and cafeId are required',
        400
      );
    }

    // Validate role
    if (!['owner', 'moderator'].includes(role)) {
      return apiResponse.error(res, 'Invalid role', 400);
    }

    // Check if moderator already exists
    const existingModerator = await ModeratorModel.findByEmail(email);
    if (existingModerator) {
      return apiResponse.error(res, 'Email already registered', 409);
    }

    // Create moderator
    const moderator = await ModeratorModel.create({
      cafeId,
      email,
      password,
      role,
    });

    return apiResponse.success(
      res,
      {
        moderator: {
          id: moderator.id,
          email: moderator.email,
          role: moderator.role,
          cafeId: moderator.cafe_id,
          permissions: moderator.permissions,
        },
      },
      201
    );
  } catch (error) {
    console.error('Moderator registration error:', error);
    return apiResponse.error(res, 'Registration failed', 500);
  }
};

/**
 * Get current moderator info
 * GET /api/admin/auth/me
 */
export const getCurrentModerator = async (req: Request, res: Response) => {
  try {
    const moderatorId = req.user?.id;

    if (!moderatorId) {
      return apiResponse.error(res, 'Unauthorized', 401);
    }

    const moderator = await ModeratorModel.findById(moderatorId);

    if (!moderator) {
      return apiResponse.error(res, 'Moderator not found', 404);
    }

    const { password_hash, ...moderatorData } = moderator;

    return apiResponse.success(res, { moderator: moderatorData });
  } catch (error) {
    console.error('Get current moderator error:', error);
    return apiResponse.error(res, 'Failed to fetch moderator', 500);
  }
};
