-- AddForeignKey
ALTER TABLE "alocacoes_colaborador_projeto" ADD CONSTRAINT "alocacoes_colaborador_projeto_idColaborador_fkey" FOREIGN KEY ("idColaborador") REFERENCES "Colaborador"("idColaborador") ON DELETE CASCADE ON UPDATE CASCADE;
