-- ============================================================================
-- Migración: 20260828000000_unique_open_ticket_per_cliente
-- Índice único parcial (PostgreSQL) para impedir tickets duplicados por
-- mensajes concurrentes (dos webhooks que llegan casi al mismo tiempo).
--
-- Garantiza que SOLO pueda existir un ticket en estado NO 'cerrado'
-- (nuevo / asignado / esperando / resuelto) por número de cliente.
-- El segundo INSERT concurrente lanzará una violación de unicidad (P2002 en
-- Prisma), que findOrCreateOpenTicket captura y recupera el ticket existente.
--
-- NOTA: Este índice NO se puede expresar en schema.prisma (Prisma no soporta
-- índices parciales). Es una migración manual. Al ejecutar `prisma db push`
-- en local, verificar que el índice no sea descartado (o volver a aplicar
-- este archivo con `prisma db execute --file prisma/migrations/20260828000000_unique_open_ticket_per_cliente/migration.sql`).
-- ============================================================================

CREATE UNIQUE INDEX idx_unique_open_ticket
  ON tickets (numero_cliente)
  WHERE estado != 'cerrado';