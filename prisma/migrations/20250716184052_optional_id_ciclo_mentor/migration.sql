-- DropForeignKey
ALTER TABLE "MentorColaborador" DROP CONSTRAINT "MentorColaborador_idCiclo_fkey";

-- AlterTable
ALTER TABLE "MentorColaborador" ALTER COLUMN "idCiclo" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "MentorColaborador" ADD CONSTRAINT "MentorColaborador_idCiclo_fkey" FOREIGN KEY ("idCiclo") REFERENCES "CicloAvaliacao"("idCiclo") ON DELETE SET NULL ON UPDATE CASCADE;
