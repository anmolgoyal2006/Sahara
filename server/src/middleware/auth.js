import supabase from '../config/supabase.js';

/**
 * Verifies the JWT from the Authorization header using Supabase.
 * Attaches the decoded user to req.user.
 */
export const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Not authorized, no token provided' });
  }

  const token = authHeader.split(' ')[1];

  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data?.user) {
    return res.status(401).json({ message: 'Not authorized, invalid or expired token' });
  }

  req.user = data.user;
  next();
};

/**
 * Restrict access to specific roles.
 * Usage: restrictTo('admin', 'doctor')
 */
export const restrictTo = (...roles) => {
  return (req, res, next) => {
    const userRole = req.user?.user_metadata?.role;

    if (!roles.includes(userRole)) {
      return res.status(403).json({
        message: `Access denied. Required role(s): ${roles.join(', ')}`,
      });
    }

    next();
  };
};
