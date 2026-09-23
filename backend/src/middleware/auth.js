const jwt = require('jsonwebtoken');
const { admin, getFirebaseApp } = require('../config/firebase');
const User = require('../models/User');

/**
 * Protect routes: verifies Firebase ID token with checkRevoked flag OR JWT fallback
 */
const authenticate = async (req, res, next) => {
  let token = null;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Authentication required. No token provided.' });
  }

  try {
    let decodedUser = null;
    let authType = 'jwt';
    let tokenClaimRole = null;

    // 1. Check if Firebase Admin is configured and attempt verification with checkRevoked
    const firebaseApp = getFirebaseApp();
    if (firebaseApp) {
      try {
        // checkRevoked: true ensures revoked sessions / disabled users fail instantly
        const decodedFirebase = await admin.auth().verifyIdToken(token, true);
        decodedUser = await User.findOne({
          $or: [{ firebaseUid: decodedFirebase.uid }, { email: decodedFirebase.email?.toLowerCase() }],
        });
        authType = 'firebase';
        tokenClaimRole = decodedFirebase.role || null;
      } catch (fbErr) {
        // If revoked or invalid, do not fall back silently if it was a Firebase token
        if (fbErr.code === 'auth/id-token-revoked' || fbErr.code === 'auth/user-disabled') {
          return res.status(401).json({ success: false, message: 'Your session has been revoked. Please sign in again.' });
        }
      }
    }

    // 2. If not decoded via Firebase, verify as JWT fallback
    if (!decodedUser) {
      const decodedJwt = jwt.verify(token, process.env.JWT_SECRET);
      decodedUser = await User.findById(decodedJwt.id);
      authType = 'jwt';
      tokenClaimRole = decodedJwt.role || null;
    }

    if (!decodedUser) {
      return res.status(401).json({ success: false, message: 'User not found or token expired.' });
    }

    if (decodedUser.status === 'disabled') {
      return res.status(403).json({ success: false, message: 'Your account has been deactivated. Please contact your workspace administrator.' });
    }

    // 3. Backend Forced Password Reset Guard
    // If user must reset initial password, block access to all routes except reset/password and logout
    if (decodedUser.role !== 'admin' && (decodedUser.mustResetPassword || decodedUser.mustChangePassword)) {
      const allowedPaths = [
        '/me/password',
        '/users/me/password',
        '/api/users/me/password',
        '/api/auth/first-login-reset',
        '/first-login-reset',
        '/me',
        '/users/me',
        '/api/users/me',
        '/auth/me',
        '/api/auth/me',
        '/api/auth/logout',
      ];
      const currentPath = req.originalUrl || req.path;
      const isAllowed = allowedPaths.some((p) => currentPath.includes(p));

      if (!isAllowed) {
        return res.status(403).json({
          success: false,
          code: 'MUST_RESET_PASSWORD',
          message: 'Initial temporary password reset is required before accessing workspace resources.',
        });
      }
    }

    req.user = decodedUser;
    req.authType = authType;
    req.tokenClaimRole = tokenClaimRole;
    next();
  } catch (error) {
    console.error('[Auth Middleware Error]:', error.message);
    return res.status(401).json({ success: false, message: 'Invalid or expired authentication token.' });
  }
};

/**
 * Role authorization middleware with defense in depth cross-checking
 */
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Administrator privileges are required for this action.',
    });
  }

  // Cross-check token claim if present
  if (req.tokenClaimRole && req.tokenClaimRole !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Security alert: Role mismatch between authentication claim and database role.',
    });
  }

  next();
};

/**
 * Optional user populator
 */
const optionalAuth = async (req, res, next) => {
  try {
    let token = null;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }
    if (token) {
      const decodedJwt = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decodedJwt.id);
    }
  } catch (err) {
    // Ignore error in optional auth
  }
  next();
};

module.exports = {
  authenticate,
  requireAdmin,
  optionalAuth,
};
