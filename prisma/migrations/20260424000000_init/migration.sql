-- CreateTable
CREATE TABLE "McdonaldsLocation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeNumber" TEXT,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "postcode" TEXT,
    "latitude" REAL NOT NULL,
    "longitude" REAL NOT NULL,
    "googlePlaceId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "Competitor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "googlePlaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "postcode" TEXT,
    "latitude" REAL NOT NULL,
    "longitude" REAL NOT NULL,
    "primaryCategory" TEXT,
    "googleRating" REAL,
    "googleReviewCount" INTEGER,
    "googleMapsUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "CompetitorSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "mcdonaldsLocationId" TEXT NOT NULL,
    "competitorId" TEXT NOT NULL,
    "radiusMiles" REAL NOT NULL,
    "distanceMiles" REAL NOT NULL,
    "rank" INTEGER NOT NULL,
    "threatScore" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CompetitorSnapshot_mcdonaldsLocationId_fkey" FOREIGN KEY ("mcdonaldsLocationId") REFERENCES "McdonaldsLocation" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CompetitorSnapshot_competitorId_fkey" FOREIGN KEY ("competitorId") REFERENCES "Competitor" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "DeliveryRating" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "competitorId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerRestaurantId" TEXT,
    "providerUrl" TEXT,
    "rating" REAL,
    "reviewCount" INTEGER,
    "dataSource" TEXT NOT NULL,
    "confidence" REAL NOT NULL,
    "lastUpdated" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DeliveryRating_competitorId_fkey" FOREIGN KEY ("competitorId") REFERENCES "Competitor" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "OperatorNote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "competitorId" TEXT NOT NULL,
    "mcdonaldsLocationId" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "OperatorNote_competitorId_fkey" FOREIGN KEY ("competitorId") REFERENCES "Competitor" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OperatorNote_mcdonaldsLocationId_fkey" FOREIGN KEY ("mcdonaldsLocationId") REFERENCES "McdonaldsLocation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "McdonaldsLocation_googlePlaceId_key" ON "McdonaldsLocation"("googlePlaceId");
CREATE UNIQUE INDEX "Competitor_googlePlaceId_key" ON "Competitor"("googlePlaceId");
CREATE INDEX "CompetitorSnapshot_mcdonaldsLocationId_createdAt_idx" ON "CompetitorSnapshot"("mcdonaldsLocationId", "createdAt");
CREATE UNIQUE INDEX "DeliveryRating_competitorId_provider_key" ON "DeliveryRating"("competitorId", "provider");
CREATE INDEX "OperatorNote_competitorId_mcdonaldsLocationId_idx" ON "OperatorNote"("competitorId", "mcdonaldsLocationId");
