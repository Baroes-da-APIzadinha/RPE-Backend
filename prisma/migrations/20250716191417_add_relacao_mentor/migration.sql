-- CreateTable
CREATE TABLE "RelacaoMentor" (
    "idMentor" UUID NOT NULL,
    "idColaborador" UUID NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "RelacaoMentor_idMentor_idColaborador_key" ON "RelacaoMentor"("idMentor", "idColaborador");

-- AddForeignKey
ALTER TABLE "RelacaoMentor" ADD CONSTRAINT "RelacaoMentor_idMentor_fkey" FOREIGN KEY ("idMentor") REFERENCES "Colaborador"("idColaborador") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RelacaoMentor" ADD CONSTRAINT "RelacaoMentor_idColaborador_fkey" FOREIGN KEY ("idColaborador") REFERENCES "Colaborador"("idColaborador") ON DELETE RESTRICT ON UPDATE CASCADE;
