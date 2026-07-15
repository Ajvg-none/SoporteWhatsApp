const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * GET /api/users
 * Listar todos los usuarios (solo supervisores)
 * ✅ Requiere: verifyToken + checkSupervisorRole
 */
exports.getUsers = async (req, res) => {
  try {
    const usuarios = await prisma.usuario.findMany({
      where: { activo: true },
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        activo: true
      },
      orderBy: { id: 'asc' }
    });
    
    // CÓDIGO CORREGIDO:
    res.status(200).json({ success: true, data: usuarios });
    
  } catch (error) {
    console.error("Error al obtener usuarios:", error);
    res.status(500).json({ error: "Error interno del servidor al obtener usuarios" });
  }
};

/**
 * GET /api/users/tecnicos
 * Listar todos los técnicos (cualquier usuario autenticado)
 * ✅ Requiere: verifyToken (NO requiere supervisor)
 */
exports.getTechnicians = async (req, res) => {
  try {
    const technicians = await prisma.usuario.findMany({
      where: {
        rol: 'tecnico'
      },
      select: {
        id: true,
        nombre: true,
        email: true
      },
      orderBy: {
        nombre: 'asc'
      }
    });
    res.json({
      success: true,
      data: technicians
    });
  } catch (error) {
    console.error(' Error en getTechnicians:', error);
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
    const emailNormalizado = email.trim().toLowerCase();

    // 1. Verificar si el correo ya está registrado (activo o inactivo)
    const usuarioExistente = await prisma.usuario.findFirst({
      where: { email: emailNormalizado }
    });

    if (usuarioExistente) {
      // SI EL USUARIO EXISTE PERO ESTÁ INACTIVO -> LO RE-ACTIVAMOS Y ACTUALIZAMOS
      if (!usuarioExistente.activo) {
        const bcrypt = require('bcryptjs');
        const salt = await bcrypt.genSalt(10);
        const contraseñaHash = await bcrypt.hash(password, salt);

        const usuarioReactivado = await prisma.usuario.update({
          where: { id: usuarioExistente.id },
          data: {
            nombre: nombre.trim(),
            contraseñaHash: contraseñaHash,
            rol: rol,
            activo: true // Volvemos a darle acceso
          }
        });

        return res.status(200).json({
          success: true,
          message: "El usuario ya existía pero estaba inactivo. Ha sido re-activado y actualizado con éxito.",
          data: {
            id: usuarioReactivado.id,
            nombre: usuarioReactivado.nombre,
            email: usuarioReactivado.email,
            rol: usuarioReactivado.rol
          }
        });
      }

      // SI EL USUARIO YA ESTÁ ACTIVO -> AHÍ SÍ LANZAMOS EL ERROR
      return res.status(400).json({
        success: false,
        error: "El correo electrónico ya se encuentra registrado y activo en el sistema."
      });
    }

    // 2. Si no existe en absoluto, procedemos con tu lógica normal de creación...
    const bcrypt = require('bcryptjs');
    const salt = await bcrypt.genSalt(10);
    const contraseñaHash = await bcrypt.hash(password, salt);

    const nuevoUsuario = await prisma.usuario.create({
      data: {
        nombre: nombre.trim(),
        email: emailNormalizado,
        contraseñaHash: contraseñaHash,
        rol: rol,
        activo: true
      }
    });

    res.status(201).json({
      success: true,
      data: {
        id: nuevoUsuario.id,
        nombre: nuevoUsuario.nombre,
        email: nuevoUsuario.email,
        rol: nuevoUsuario.rol
      }
    });

  } catch (error) {
    console.error("Error al crear/re-activar usuario:", error);
    res.status(500).json({ success: false, error: "Error interno del servidor" });
  }
};

/**
 * PATCH /api/users/:id/desactivar
 * Desactivar un usuario (soft delete) sin eliminarlo físicamente
 * ✅ Requiere: verifyToken + checkSupervisorRole
 */
exports.desactivarUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const usuarioIdNumerico = Number(id);

    const usuarioExistente = await prisma.usuario.findUnique({
      where: { id: usuarioIdNumerico }
    });

    if (!usuarioExistente) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    if (req.user && req.user.id === usuarioIdNumerico) {
      return res.status(400).json({ error: "No puedes desactivar tu propia cuenta" });
    }

    await prisma.usuario.update({
      where: { id: usuarioIdNumerico },
      data: { activo: false }
    });

    res.status(200).json({
      success: true,
      message: "Técnico desactivado correctamente. Sus registros históricos se conservan."
    });

  } catch (error) {
    console.error("Error en desactivarUsuario:", error);
    res.status(500).json({ error: "Error interno del servidor al desactivar el usuario" });
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
    const usuarioIdNumerico = Number(id);

    // 1. Verificar que el usuario existe
    const usuarioExistente = await prisma.usuario.findUnique({
      where: { id: usuarioIdNumerico }
    });

    if (!usuarioExistente) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    // 2. Seguridad: Evitar que un usuario se desactive a sí mismo
    // (Asegúrate de que tu middleware de auth guarde el ID en req.user.id)
    if (req.user && req.user.id === usuarioIdNumerico) {
      return res.status(400).json({ error: "No puedes desactivar tu propia cuenta" });
    }

    // 3. ELIMINACIÓN LÓGICA (Soft Delete): Actualizamos 'activo' a false
    await prisma.usuario.update({
      where: { id: usuarioIdNumerico },
      data: { 
        activo: false 
      }
    });

    // 4. Respuesta exitosa
    res.status(200).json({ 
      message: "Técnico desactivado correctamente. Sus registros históricos se conservan." 
    });

  } catch (error) {
    console.error("Error en deleteUser:", error);
    res.status(500).json({ error: "Error interno del servidor al desactivar el usuario" });
  }
};