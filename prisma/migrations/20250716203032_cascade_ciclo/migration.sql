-- DropForeignKey
ALTER TABLE "ColaboradorCiclo" DROP CONSTRAINT "ColaboradorCiclo_idCiclo_fkey";

-- DropForeignKey
ALTER TABLE "LiderColaborador" DROP CONSTRAINT "LiderColaborador_idCiclo_fkey";

-- DropForeignKey
ALTER TABLE "MentorColaborador" DROP CONSTRAINT "MentorColaborador_idCiclo_fkey";

-- AddForeignKey
ALTER TABLE "LiderColaborador" ADD CONSTRAINT "LiderColaborador_idCiclo_fkey" FOREIGN KEY ("idCiclo") REFERENCES "CicloAvaliacao"("idCiclo") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MentorColaborador" ADD CONSTRAINT "MentorColaborador_idCiclo_fkey" FOREIGN KEY ("idCiclo") REFERENCES "CicloAvaliacao"("idCiclo") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ColaboradorCiclo" ADD CONSTRAINT "ColaboradorCiclo_idCiclo_fkey" FOREIGN KEY ("idCiclo") REFERENCES "CicloAvaliacao"("idCiclo") ON DELETE CASCADE ON UPDATE CASCADE;
