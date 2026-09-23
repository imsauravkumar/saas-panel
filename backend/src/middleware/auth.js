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
    const msg = 'Authentication required. No token provided.';
    return res.status(401).json({
      success: false,
      error: msg,
      message: msg,
    });
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
          $or: [
            { firebaseUid: decodedFirebase.uid },
            { email: decodedFirebase.email?.toLowerCase() },
          ],
        });
        authType = 'firebase';
        tokenClaimRole = decodedFirebase.role || null;
      } catch (fbErr) {
        // If revoked or invalid, do not fall back silently if it was a Firebase token
        if (fbErr.code === 'auth/id-token-revoked' || fbErr.code === 'auth/user-disabled') {
          const msg = 'Your session has been revoked. Please sign in again.';
          return res.status(401).json({
            success: false,
            error: msg,
            message: msg,
          });
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
      const msg = 'User not found or token expired.';
      return res.status(401).json({
        success: false,
        error: msg,
        message: msg,
      });
    }

    if (decodedUser.status === 'disabled') {
      const msg = 'Your account has been deactivated. Please contact your workspace administrator.';
      return res.status(403).json({
        success: false,
        error: msg,
        message: msg,
      });
    }

    // 3. Backend Forced Password Reset Guard
    // If user must reset initial password, block access to all routes except reset/password and logout
    if (
      decodedUser.role !== 'admin' &&
      (decodedUser.mustResetPassword || decodedUser.mustChangePassword)
    ) {
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
        const msg =
          'Initial temporary password reset is required before accessing workspace resources.';
        return res.status(403).json({
          success: false,
          code: 'MUST_RESET_PASSWORD',
          error: msg,
          message: msg,
        });
      }
    }

    req.user = decodedUser;
    req.authType = authType;
    req.tokenClaimRole = tokenClaimRole;
    next();
  } catch (error) {
    console.error('[Auth Middleware Error]:', error.message);
    const msg = 'Invalid or expired authentication token.';
    return res.status(401).json({
      success: false,
      error: msg,
      message: msg,
    });
  }
};

/**
 * Role authorization middleware with defense in depth cross-checking
 */
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    const msg = 'Access denied. Administrator privileges are required for this action.';
    return res.status(403).json({
      success: false,
      error: msg,
      message: msg,
    });
  }

  // Cross-check token claim if present
  if (req.tokenClaimRole && req.tokenClaimRole !== 'admin') {
    const msg = 'Security alert: Role mismatch between authentication claim and database role.';
    return res.status(403).json({
      success: false,
      error: msg,
      message: msg,
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
  } catch (_err) {
    // Ignore error in optional auth
  }
  next();
};

module.exports = {
  authenticate,
  requireAdmin,
  optionalAuth,
};
