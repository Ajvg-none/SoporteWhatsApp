const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('\n========== DEBUG LOGIN ==========');
    console.log('Email recibido:', email);
    console.log('Password recibido:', password);

    // 1. Validar que se enviaron credenciales
    if (!email || !password) {
      console.log('ERROR: Faltan credenciales');
      return res.status(400).json({
        success: false,
        error: 'Email y contraseña son requeridos'
      });
    }

    // 2. Buscar usuario activo
    const usuario = await prisma.usuario.findFirst({
      where: {
        email: email.trim().toLowerCase(),
        activo: true
      }
    });

    console.log('Usuario encontrado:', usuario ? 'SÍ' : 'NO');

    if (!usuario) {
      console.log('ERROR: Usuario no existe en la BD o está inactivo');
      console.log('=================================\n');
      return res.status(401).json({
        success: false,
        error: 'Credenciales inválidas o usuario inactivo'
      });
    }

    console.log('Nombre del usuario:', usuario.nombre);
    console.log('Hash en BD:', usuario.contraseñaHash);
    console.log('Primeros 10 chars del hash:', usuario.contraseñaHash?.substring(0, 10));

    // 3. Verificar contraseña
    const passwordValida = await bcrypt.compare(password, usuario.contraseñaHash);
    console.log('Password válida:', passwordValida);
    console.log('=================================\n');

    if (!passwordValida) {
      return res.status(401).json({
        success: false,
        error: 'Credenciales inválidas'
      });
    }

    // 4. Generar JWT sin expiración
    const token = jwt.sign(
      {
        id: usuario.id,
        email: usuario.email,
        rol: usuario.rol,
        nombre: usuario.nombre
      },
      process.env.JWT_SECRET || 'clave_secreta_por_defecto'
    );

    // 5. Respuesta exitosa
    res.json({
      success: true,
      token,
      user: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol
      }
    });

  } catch (error) {
    console.error('❌ Error en login:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

exports.logout = (req, res) => {
  res.json({
    success: true,
    message: 'Sesión cerrada correctamente'
  });
};