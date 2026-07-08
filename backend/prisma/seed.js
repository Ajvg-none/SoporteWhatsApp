const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed de usuarios...\n');

  // Hashear contraseñas
  const hashedPasswordSupervisor = await bcrypt.hash('admin123', 10);
  const hashedPasswordTecnico = await bcrypt.hash('tecnico123', 10);

  // Crear o actualizar supervisor
  const supervisor = await prisma.usuario.upsert({
    where: { email: 'supervisor@empresa.com' },
    update: {
      // ⚠️ IMPORTANTE: Si el usuario ya existe, ACTUALIZA el hash
      contraseñaHash: hashedPasswordSupervisor,
      nombre: 'Carlos Supervisor',
      rol: 'supervisor',
    },
    create: {
      nombre: 'Carlos Supervisor',
      email: 'supervisor@empresa.com',
      contraseñaHash: hashedPasswordSupervisor,
      rol: 'supervisor',
    },
  });
  console.log('✅ Supervisor creado/actualizado:', supervisor.email);

  // Crear o actualizar técnico
  const tecnico = await prisma.usuario.upsert({
    where: { email: 'tecnico@empresa.com' },
    update: {
      contraseñaHash: hashedPasswordTecnico,
      nombre: 'Juan Técnico',
      rol: 'tecnico',
    },
    create: {
      nombre: 'Juan Técnico',
      email: 'tecnico@empresa.com',
      contraseñaHash: hashedPasswordTecnico,
      rol: 'tecnico',
    },
  });
  console.log('✅ Técnico creado/actualizado:', tecnico.email);

  // Verificación: probar que las contraseñas funcionan
  const testSupervisor = await bcrypt.compare('admin123', supervisor.contraseñaHash);
  const testTecnico = await bcrypt.compare('tecnico123', tecnico.contraseñaHash);

  console.log('\n🧪 Verificación de contraseñas:');
  console.log('   Supervisor (admin123):', testSupervisor ? '✅ OK' : '❌ FALLA');
  console.log('   Técnico (tecnico123):', testTecnico ? '✅ OK' : '❌ FALLA');

  if (testSupervisor && testTecnico) {
    console.log('\n🎉 Seed completado exitosamente!');
    console.log('\n📝 Credenciales de prueba:');
    console.log('   Supervisor: supervisor@empresa.com / admin123');
    console.log('   Técnico:    tecnico@empresa.com / tecnico123');
  } else {
    console.log('\n❌ ADVERTENCIA: Las contraseñas no coinciden con el hash.');
  }
}

main()
  .catch((e) => {
    console.error('❌ Error en el seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });