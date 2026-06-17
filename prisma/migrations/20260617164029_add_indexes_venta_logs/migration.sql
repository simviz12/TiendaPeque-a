-- CreateIndex
CREATE INDEX "logs_auditoria_fecha_idx" ON "logs_auditoria"("fecha");

-- CreateIndex
CREATE INDEX "logs_auditoria_usuarioId_idx" ON "logs_auditoria"("usuarioId");

-- CreateIndex
CREATE INDEX "ventas_fecha_idx" ON "ventas"("fecha");

-- CreateIndex
CREATE INDEX "ventas_productoId_idx" ON "ventas"("productoId");

-- CreateIndex
CREATE INDEX "ventas_vendedorId_idx" ON "ventas"("vendedorId");
