/*
  Warnings:

  - Added the required column `limiteDisponivel` to the `Crediario` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Crediario" ADD COLUMN     "limiteDisponivel" DECIMAL(10,2) NOT NULL;
