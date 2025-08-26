/**
 * Role-based access control middleware
 * Checks if user has required role to access the route
 * 
 * @param {string[]} allowedRoles - Array of roles that can access the route
 * @returns {Function} Express middleware function
 */
const roleCheck = (allowedRoles) => {
    return (req, res, next) => {
        try {
            // Check if user exists (should be set by auth middleware)
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    message: 'User not authenticated'
                });
            }
            
            // Normalize allowed roles to lowercase
            const normalizedAllowedRoles = allowedRoles.map(role => role.toLowerCase());
            
            // Check if user's role is in allowed roles
            if (!normalizedAllowedRoles.includes(req.user.role.toLowerCase())) {
                return res.status(403).json({
                    success: false,
                    message: `Access denied. Required roles: ${allowedRoles.join(', ')}`,
                    userRole: req.user.role,
                    requiredRoles: allowedRoles
                });
            }
            
            // User has required role, proceed to next middleware
            next();
            
        } catch (error) {
            console.error('Role check middleware error:', error);
            res.status(500).json({
                success: false,
                message: 'Server error during role verification'
            });
        }
    };
};

/**
 * Permission-based access control middleware
 * Checks if user has specific permission to perform action
 * 
 * @param {string} permission - Permission required to access the route
 * @returns {Function} Express middleware function
 */
const permissionCheck = (permission) => {
    return (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    message: 'User not authenticated'
                });
            }
            
            // Check if user has the required permission
            if (!req.user.hasPermission || !req.user.hasPermission(permission)) {
                return res.status(403).json({
                    success: false,
                    message: `Access denied. Required permission: ${permission}`,
                    userRole: req.user.role
                });
            }
            
            next();
            
        } catch (error) {
            console.error('Permission check middleware error:', error);
            res.status(500).json({
                success: false,
                message: 'Server error during permission verification'
            });
        }
    };
};

/**
 * Resource ownership middleware
 * Checks if user owns the resource or has admin privileges
 * 
 * @param {string} resourceField - Field name to check for ownership (default: 'createdBy')
 * @returns {Function} Express middleware function
 */
const ownershipCheck = (resourceField = 'createdBy') => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    message: 'User not authenticated'
                });
            }
            
            // Admin users can access any resource
            if (req.user.role === 'admin') {
                return next();
            }
            
            // Get resource ID from params
            const resourceId = req.params.id;
            
            if (!resourceId) {
                return res.status(400).json({
                    success: false,
                    message: 'Resource ID is required'
                });
            }
            
            // This is a generic check - in real implementation, you'd check the specific model
            // For now, we'll assume the resource has the ownership field
            const userId = req.user._id.toString();
            
            // Store the ownership info for use in the route handler
            req.ownership = {
                userId,
                resourceId,
                isOwner: false, // Will be set by the route handler after checking the resource
                isAdmin: req.user.role === 'admin'
            };
            
            next();
            
        } catch (error) {
            console.error('Ownership check middleware error:', error);
            res.status(500).json({
                success: false,
                message: 'Server error during ownership verification'
            });
        }
    };
};

/**
 * Rate limiting middleware for role-based limits
 * Different roles get different rate limits
 */
const roleBasedRateLimit = () => {
    const rateLimits = {
        admin: { requests: 1000, window: 60 * 60 * 1000 }, // 1000 requests per hour
        hr: { requests: 500, window: 60 * 60 * 1000 },     // 500 requests per hour
        staff: { requests: 100, window: 60 * 60 * 1000 }   // 100 requests per hour
    };
    
    // In-memory store for rate limiting (in production, use Redis)
    const requestCounts = new Map();
    
    return (req, res, next) => {
        try {
            if (!req.user) {
                return next(); // Let auth middleware handle this
            }
            
            const userRole = req.user.role.toLowerCase();
            const limit = rateLimits[userRole] || rateLimits.staff;
            const now = Date.now();
            const userKey = `${req.user._id}_${userRole}`;
            
            // Get or initialize user's request data
            const userData = requestCounts.get(userKey) || {
                count: 0,
                resetTime: now + limit.window
            };
            
            // Reset count if window has passed
            if (now > userData.resetTime) {
                userData.count = 0;
                userData.resetTime = now + limit.window;
            }
            
            // Check if limit exceeded
            if (userData.count >= limit.requests) {
                const resetIn = Math.ceil((userData.resetTime - now) / 1000);
                return res.status(429).json({
                    success: false,
                    message: 'Rate limit exceeded',
                    retryAfter: resetIn,
                    limit: limit.requests,
                    window: limit.window / 1000
                });
            }
            
            // Increment count and update
            userData.count++;
            requestCounts.set(userKey, userData);
            
            // Add rate limit headers
            res.set({
                'X-RateLimit-Limit': limit.requests,
                'X-RateLimit-Remaining': limit.requests - userData.count,
                'X-RateLimit-Reset': new Date(userData.resetTime).toISOString()
            });
            
            next();
            
        } catch (error) {
            console.error('Rate limit middleware error:', error);
            next(); // Don't block requests if rate limiting fails
        }
    };
};

/**
 * Conditional role check - allows access if user has ANY of the specified roles
 * 
 * @param {string[]} allowedRoles - Array of roles, user needs at least one
 * @returns {Function} Express middleware function
 */
const anyRole = (allowedRoles) => {
    return (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    message: 'User not authenticated'
                });
            }
            
            const normalizedAllowedRoles = allowedRoles.map(role => role.toLowerCase());
            
            if (!normalizedAllowedRoles.includes(req.user.role.toLowerCase())) {
                return res.status(403).json({
                    success: false,
                    message: `Access denied. You need one of these roles: ${allowedRoles.join(', ')}`,
                    userRole: req.user.role
                });
            }
            
            next();
            
        } catch (error) {
            console.error('Any role check error:', error);
            res.status(500).json({
                success: false,
                message: 'Server error during role verification'
            });
        }
    };
};

module.exports = {
    roleCheck,
    permissionCheck,
    ownershipCheck,
    roleBasedRateLimit,
    anyRole
};
