-- CreateTable
CREATE TABLE "BrutalFacts" (
    "idColaborador" UUID NOT NULL,
    "idCiclo" UUID NOT NULL,
    "brutalFact" TEXT NOT NULL,

    CONSTRAINT "BrutalFacts_pkey" PRIMARY KEY ("idColaborador","idCiclo")
);

-- AddForeignKey
ALTER TABLE "BrutalFacts" ADD CONSTRAINT "BrutalFacts_idColaborador_fkey" FOREIGN KEY ("idColaborador") REFERENCES "Colaborador"("idColaborador") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrutalFacts" ADD CONSTRAINT "BrutalFacts_idCiclo_fkey" FOREIGN KEY ("idCiclo") REFERENCES "CicloAvaliacao"("idCiclo") ON DELETE CASCADE ON UPDATE CASCADE;
