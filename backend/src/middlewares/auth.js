// backend/src/middlewares/auth.js
const jwt = require('jsonwebtoken');

/**
 * Middleware para verificar token JWT
 * Protege rutas que requieren autenticación
 */
const verifyToken = (req, res, next) => {
  // 1. Obtener el token del header Authorization
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Token no proporcionado'
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    // 2. Verificar el token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'clave_secreta_por_defecto');
    
    // 3. Añadir el usuario decodificado al request
    req.user = {
      id: decoded.id,
      email: decoded.email,
      rol: decoded.rol
    };
    
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Token inválido o expirado'
    });
  }
};

/**
 * Middleware para verificar que el usuario sea supervisor
 * Protege rutas que solo pueden usar supervisores
 */
const checkSupervisorRole = (req, res, next) => {
  if (req.user?.rol !== 'supervisor') {
    return res.status(403).json({
      success: false,
      error: 'Acceso denegado. Se requiere rol de supervisor.'
    });
  }
  next();
};

module.exports = {
  verifyToken,
  checkSupervisorRole
};