   -- Esto garantiza que no haya dos tickets abiertos para el mismo número
   CREATE UNIQUE INDEX IF NOT EXISTS idx_ticket_abierto_unico 
   ON tickets(numero_cliente)
   WHERE estado IN ('nuevo', 'asignado', 'esperando', 'resuelto');