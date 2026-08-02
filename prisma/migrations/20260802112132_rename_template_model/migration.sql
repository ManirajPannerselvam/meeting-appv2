/*
  Warnings:

  - The primary key for the `templates` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `chart_x` on the `templates` table. All the data in the column will be lost.
  - You are about to drop the column `chart_y` on the `templates` table. All the data in the column will be lost.
  - You are about to drop the column `code` on the `templates` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `templates` table. All the data in the column will be lost.
  - You are about to drop the column `created_by` on the `templates` table. All the data in the column will be lost.
  - You are about to drop the column `version` on the `templates` table. All the data in the column will be lost.
  - You are about to alter the column `chart` on the `templates` table. The data in that column could be lost. The data in that column will be cast from `String` to `Json`.
  - Added the required column `updatedAt` to the `templates` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;


CREATE TABLE "new_templates" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,

    "template_code" TEXT,

    "department" TEXT,

    "category" TEXT,

    "chart" JSONB,

    "chart_x" TEXT,

    "chart_y" TEXT,

    "description" TEXT,

    "fields" JSONB NOT NULL DEFAULT '[]',

    "created_by" TEXT,

    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);


INSERT INTO "new_templates"
(
    "id",
    "name",
    "chart",
    "fields",
    "createdAt",
    "updatedAt"
)
SELECT

    "id",
    "name",
    "chart",
    COALESCE("fields",'[]'),
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP

FROM "templates";


DROP TABLE "templates";


ALTER TABLE "new_templates"
RENAME TO "templates";


PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;