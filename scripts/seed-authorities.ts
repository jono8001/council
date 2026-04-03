import { db } from "../src/lib/db";

const pilotAuthorities = [
  { name: "Birmingham City Council", slug: "birmingham", type: "Metropolitan Borough", region: "West Midlands", officialUrl: "https://www.birmingham.gov.uk" },
  { name: "Thurrock Council", slug: "thurrock", type: "Unitary Authority", region: "East of England", officialUrl: "https://www.thurrock.gov.uk" },
  { name: "London Borough of Croydon", slug: "croydon", type: "London Borough", region: "London", officialUrl: "https://www.croydon.gov.uk" },
  { name: "Woking Borough Council", slug: "woking", type: "District", region: "South East", officialUrl: "https://www.woking.gov.uk" },
  { name: "Slough Borough Council", slug: "slough", type: "Unitary Authority", region: "South East", officialUrl: "https://www.slough.gov.uk" },
  { name: "Nottingham City Council", slug: "nottingham", type: "Unitary Authority", region: "East Midlands", officialUrl: "https://www.nottinghamcity.gov.uk" },
  { name: "Somerset Council", slug: "somerset", type: "Unitary Authority", region: "South West", officialUrl: "https://www.somerset.gov.uk" },
  { name: "North Northamptonshire Council", slug: "north-northamptonshire", type: "Unitary Authority", region: "East Midlands", officialUrl: "https://www.northnorthants.gov.uk" },
  { name: "West Berkshire Council", slug: "west-berkshire", type: "Unitary Authority", region: "South East", officialUrl: "https://www.westberks.gov.uk" },
  { name: "East Riding of Yorkshire Council", slug: "east-riding", type: "Unitary Authority", region: "Yorkshire and the Humber", officialUrl: "https://www.eastriding.gov.uk" },
];

async function main() {
  for (const authority of pilotAuthorities) {
    const created = await db.authority.upsert({
      where: { slug: authority.slug },
      update: authority,
      create: authority,
    });

    await db.source.upsert({
      where: {
        id: `${created.id}-transparency`,
      },
      update: {
        baseUrl: `${authority.officialUrl}/transparency/spend-over-500/`,
        sourceType: "transparency",
        sourceFormat: "html",
        parserName: "discoverLinks",
        status: "active",
      },
      create: {
        id: `${created.id}-transparency`,
        authorityId: created.id,
        baseUrl: `${authority.officialUrl}/transparency/spend-over-500/`,
        sourceType: "transparency",
        sourceFormat: "html",
        parserName: "discoverLinks",
        status: "active",
      },
    });

    await db.source.upsert({
      where: {
        id: `${created.id}-finance`,
      },
      update: {
        baseUrl: `${authority.officialUrl}/council-and-democracy/finance-and-budget/`,
        sourceType: "finance_reports",
        sourceFormat: "html",
        parserName: "discoverLinks",
        status: "active",
      },
      create: {
        id: `${created.id}-finance`,
        authorityId: created.id,
        baseUrl: `${authority.officialUrl}/council-and-democracy/finance-and-budget/`,
        sourceType: "finance_reports",
        sourceFormat: "html",
        parserName: "discoverLinks",
        status: "active",
      },
    });
  }

  console.log(`Seeded ${pilotAuthorities.length} authorities and base source registry.`);
}

main().finally(async () => db.$disconnect());
