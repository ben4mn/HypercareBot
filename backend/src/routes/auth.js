import express from 'express';
import { login } from '../middleware/auth.js';

const router = express.Router();

router.post('/login', login);

export default router;