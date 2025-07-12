-- AlterTable
ALTER TABLE "projetos" ADD COLUMN     "idLider" UUID;

-- AddForeignKey
ALTER TABLE "projetos" ADD CONSTRAINT "projetos_idLider_fkey" FOREIGN KEY ("idLider") REFERENCES "Colaborador"("idColaborador") ON DELETE SET NULL ON UPDATE CASCADE;
