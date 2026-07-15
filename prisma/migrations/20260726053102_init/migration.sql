-- CreateTable
CREATE TABLE "templates" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "chart" TEXT,
    "chart_x" TEXT,
    "chart_y" TEXT,
    "created_by" TEXT,
    "fields" JSONB,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
