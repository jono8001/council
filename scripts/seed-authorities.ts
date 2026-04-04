import { db } from "../src/lib/db";

const pilotAuthorities = [
  {
    name: "Birmingham City Council",
    slug: "birmingham",
    onsCode: "E08000025",
    type: "Metropolitan Borough",
    region: "West Midlands",
    officialUrl: "https://www.birmingham.gov.uk",
  },
  {
    name: "Thurrock Council",
    slug: "thurrock",
    onsCode: "E06000034",
    type: "Unitary Authority",
    region: "East of England",
    officialUrl: "https://www.thurrock.gov.uk",
  },
  {
    name: "London Borough of Croydon",
    slug: "croydon",
    onsCode: "E09000008",
    type: "London Borough",
    region: "London",
    officialUrl: "https://www.croydon.gov.uk",
  },
  {
    name: "Woking Borough Council",
    slug: "woking",
    onsCode: "E07000217",
    type: "District",
    region: "South East",
    officialUrl: "https://www.woking.gov.uk",
  },
  {
    name: "Slough Borough Council",
    slug: "slough",
    onsCode: "E06000039",
    type: "Unitary Authority",
    region: "South East",
    officialUrl: "https://www.slough.gov.uk",
  },
  {
    name: "Nottingham City Council",
    slug: "nottingham",
    onsCode: "E06000018",
    type: "Unitary Authority",
    region: "East Midlands",
    officialUrl: "https://www.nottinghamcity.gov.uk",
  },
  {
    name: "Somerset Council",
    slug: "somerset",
    onsCode: "E06000066",
    type: "Unitary Authority",
    region: "South West",
    officialUrl: "https://www.somerset.gov.uk",
  },
  {
    name: "North Northamptonshire Council",
    slug: "north-northamptonshire",
    onsCode: "E06000061",
    type: "Unitary Authority",
    region: "East Midlands",
    officialUrl: "https://www.northnorthants.gov.uk",
  },
  {
    name: "West Berkshire Council",
    slug: "west-berkshire",
    onsCode: "E06000037",
    type: "Unitary Authority",
    region: "South East",
    officialUrl: "https://www.westberks.gov.uk",
  },
  {
    name: "East Riding of Yorkshire Council",
    slug: "east-riding",
    onsCode: "E06000011",
    type: "Unitary Authority",
    region: "Yorkshire and the Humber",
    officialUrl: "https://www.eastriding.gov.uk",
  },
] as const;

// Verified transparency and finance report source URLs per authority.
const sourceUrls: Record<string, { transparency: string; financeReports: string }> = {
  birmingham: {
    transparency: "https://www.birmingham.gov.uk/info/20215/corporate_procurement_services/517/invoicing_the_council/5",
    financeReports: "https://www.birmingham.gov.uk/info/20011/your_council/952/open_data",
  },
  thurrock: {
    transparency: "https://www.thurrock.gov.uk/what-we-spend/payments-to-suppliers",
    financeReports: "https://www.thurrock.gov.uk/what-we-publish/local-government-transparency-code",
  },
  croydon: {
    transparency: "https://www.croydon.gov.uk/council-and-elections/budgets-and-spending/accounts-and-payments/payments-over-ps500",
    financeReports: "https://www.croydon.gov.uk/council-and-elections/budgets-and-spending",
  },
  woking: {
    transparency: "https://www.woking.gov.uk/council-and-democracy/transparency-and-open-data",
    financeReports: "https://www.woking.gov.uk/council-and-democracy/council-finance",
  },
  slough: {
    transparency: "https://www.slough.gov.uk/downloads/download/206/payments-to-suppliers-over-500",
    financeReports: "https://www.slough.gov.uk/performance-spending",
  },
  nottingham: {
    transparency: "https://www.nottinghamcity.gov.uk/your-council/about-the-council/access-to-information/nottingham-data-hub",
    financeReports: "https://www.nottinghamcity.gov.uk/your-council/about-the-council/access-to-information/nottingham-data-hub",
  },
  somerset: {
    transparency: "https://www.somerset.gov.uk/finance-performance-and-legal/council-expenditure-over-500/",
    financeReports: "https://www.somerset.gov.uk/finance-performance-and-legal/",
  },
  "north-northamptonshire": {
    transparency: "https://www.northnorthants.gov.uk/finance/expenditure",
    financeReports: "https://www.northnorthants.gov.uk/your-council/transparency-and-open-data",
  },
  "west-berkshire": {
    transparency: "https://www.westberks.gov.uk/expenditure-over-500",
    financeReports: "https://www.westberks.gov.uk/article/40313/Where-the-council-s-money-comes-from-and-how-it-s-spent",
  },
  "east-riding": {
    transparency: "https://www.eastriding.gov.uk/council/governance-and-spending/budgets-and-spending/council-spending-and-salaries",
    financeReports: "https://www.eastriding.gov.uk/council/governance-and-spending/budgets-and-spending",
  },
};

async function upsertSource(
  authorityId: string,
  sourceType: "transparency" | "finance_reports",
  baseUrl: string,
) {
  return db.source.upsert({
    where: {
      authorityId_sourceType: {
        authorityId,
        sourceType,
      },
    },
    update: {
      baseUrl,
      sourceFormat: "html",
      parserName: "discoverLinks",
      status: "active",
    },
    create: {
      authorityId,
      sourceType,
      baseUrl,
      sourceFormat: "html",
      parserName: "discoverLinks",
      status: "active",
    },
  });
}

async function main() {
  for (const authority of pilotAuthorities) {
    const created = await db.authority.upsert({
      where: { slug: authority.slug },
      update: {
        name: authority.name,
        onsCode: authority.onsCode,
        type: authority.type,
        region: authority.region,
        officialUrl: authority.officialUrl,
      },
      create: {
        name: authority.name,
        slug: authority.slug,
        onsCode: authority.onsCode,
        type: authority.type,
        region: authority.region,
        officialUrl: authority.officialUrl,
      },
    });

    const urls = sourceUrls[authority.slug];
    if (!urls) {
      console.warn(`No source URLs configured for ${authority.slug}, skipping sources.`);
      continue;
    }

    await upsertSource(created.id, "transparency", urls.transparency);
    await upsertSource(created.id, "finance_reports", urls.financeReports);
  }
  console.log(`Seeded ${pilotAuthorities.length} pilot authorities with ONS codes and source URLs.`);
}

main()
  .catch((error) => {
    console.error("Seed failed", error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
