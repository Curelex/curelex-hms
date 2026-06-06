import express from 'express';
import { signup, login, me, ssoExchange } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { authSignupValidator, authLoginValidator } from '../middleware/validators.js';

const router = express.Router();

router.post('/signup', authSignupValidator, validateRequest, signup);
router.post('/login',  authLoginValidator, validateRequest, login);
router.post('/sso-exchange', ssoExchange); // ← no auth needed, token is the proof
router.get('/me', protect, me);

export default router;