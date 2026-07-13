const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * GET /api/users
 * Listar todos los usuarios (solo supervisores)
 * ✅ Requiere: verifyToken + checkSupervisorRole
 */
exports.getUsers = async (req, res) => {
  try {
    const users = await prisma.usuario.findMany({
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        creadoEn: true
      },
      orderBy: {
        nombre: 'asc'
      }
    });

    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    console.error('❌ Error en getUsers:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

/**
 * POST /api/users
 * Crear un nuevo técnico (solo supervisores)
 * ✅ Requiere: verifyToken + checkSupervisorRole
 * ✅ S3-B07
 */
exports.createUser = async (req, res) => {
  try {
    const { nombre, email, password, rol } = req.body;

    // 1. Validar campos obligatorios
    if (!nombre || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Faltan campos obligatorios: nombre, email, password'
      });
    }

    // 2. Validar que el email no esté en uso
    const existingUser = await prisma.usuario.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'El email ya está registrado'
      });
    }

    // 3. Determinar el rol (por defecto 'tecnico')
    const userRol = rol === 'supervisor' ? 'supervisor' : 'tecnico';

    // 4. Hashear contraseña
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(password, 10);

    // 5. Crear usuario
    const newUser = await prisma.usuario.create({
      data: {
        nombre: nombre.trim(),
        email: email.trim().toLowerCase(),
        contraseñaHash: hashedPassword,
        rol: userRol
      },
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        creadoEn: true
      }
    });

    // 6. Respuesta exitosa
    res.status(201).json({
      success: true,
      message: `Usuario ${userRol} creado exitosamente`,
      data: newUser
    });

  } catch (error) {
    console.error('❌ Error en createUser:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

/**
 * DELETE /api/users/:id
 * Eliminar un usuario (solo supervisores)
 * ✅ Requiere: verifyToken + checkSupervisorRole
 * ✅ S3-B06
 */
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = parseInt(id);

    // 1. Validar que el ID sea válido
    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        error: 'ID de usuario inválido'
      });
    }

    // 2. Verificar que el usuario existe
    const user = await prisma.usuario.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    // 3. No permitir eliminar a sí mismo
    if (userId === req.user.id) {
      return res.status(400).json({
        success: false,
        error: 'No puedes eliminar tu propia cuenta'
      });
    }

    // 4. No permitir eliminar al último supervisor
    if (user.rol === 'supervisor') {
      const supervisorCount = await prisma.usuario.count({
        where: { rol: 'supervisor' }
      });

      if (supervisorCount <= 1) {
        return res.status(400).json({
          success: false,
          error: 'No se puede eliminar al último supervisor del sistema'
        });
      }
    }

    // 5. Verificar si tiene tickets asignados
    const ticketsAsignados = await prisma.ticket.count({
      where: { tecnicoAsignadoId: userId }
    });

    if (ticketsAsignados > 0) {
      return res.status(400).json({
        success: false,
        error: `No se puede eliminar el usuario porque tiene ${ticketsAsignados} tickets asignados. Reasigna los tickets primero.`
      });
    }

    // 6. Eliminar usuario
    await prisma.usuario.delete({
      where: { id: userId }
    });

    // 7. Respuesta exitosa
    res.json({
      success: true,
      message: `Usuario ${user.nombre} eliminado correctamente`
    });

  } catch (error) {
    console.error('❌ Error en deleteUser:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};