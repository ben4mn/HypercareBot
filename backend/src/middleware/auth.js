import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'change_this_password';
const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-key';

// Simple auth middleware for admin routes
export function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  const token = authHeader.substring(7);
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Login endpoint (add this to a separate auth routes file)
export async function login(req, res) {
  const { password } = req.body;
  
  if (!password) {
    return res.status(400).json({ error: 'Password required' });
  }
  
  // In production, store hashed password in database
  const isValid = password === ADMIN_PASSWORD;
  
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  const token = jwt.sign(
    { role: 'admin', timestamp: Date.now() },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
  
  res.json({ token });
}