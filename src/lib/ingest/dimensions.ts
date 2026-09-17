import { sql, type SQL } from "drizzle-orm";
import { suggestCategory } from "@/lib/categories";
import type { Db } from "@/lib/db";
import { categories, commodities, districts, grades, markets, states, varieties } from "@/lib/db/schema";
import { displayName, uniqueSlug } from "@/lib/slug";

/**
 * Resolves names from ingested rows to integer ids, creating new states, districts,
 * markets, commodities, varieties and grades on first sight (SPEC §6.7). New commodities
 * get a suggested category with category_confirmed=false (SPEC §6.5).
 */

export interface DimensionNames {
  state: string;
  district: string;
  market: string;
  commodity: string;
  variety: string | null;
  grade: string | null;
}

export interface ResolvedIds {
  stateId: number;
  districtId: number;
  marketId: number;
  commodityId: number;
  varietyId: number | null;
  gradeId: number | null;
}

export type CreatedCounts = Record<
  "states" | "districts" | "markets" | "commodities" | "varieties" | "grades",
  number
>;

const key = (...parts: (string | number)[]) => parts.join("|~|");

function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}

function uniqueBy<T>(items: T[], keyOf: (item: T) => string): T[] {
  const seen = new Map<string, T>();
  for (const item of items) if (!seen.has(keyOf(item))) seen.set(keyOf(item), item);
  return [...seen.values()];
}

export class DimensionResolver {
  private stateIds = new Map<string, number>();
  private districtIds = new Map<string, number>();
  private marketIds = new Map<string, number>();
  private commodityIds = new Map<string, number>();
  private varietyIds = new Map<string, number>();
  private gradeIds = new Map<string, number>();
  private loaded = false;
  readonly created: CreatedCounts = {
    states: 0,
    districts: 0,
    markets: 0,
    commodities: 0,
    varieties: 0,
    grades: 0,
  };

  constructor(private readonly db: Db) {}

  private async rows<T>(query: SQL): Promise<T[]> {
    return (await this.db.execute(query)).rows as T[];
  }

  private async load(): Promise<void> {
    if (this.loaded) return;
    await Promise.all([
      this.loadStates(),
      this.loadDistricts(),
      this.loadMarkets(),
      this.loadCommodities(),
      this.loadVarieties(),
      this.loadGrades(),
    ]);
    this.loaded = true;
  }

  private async loadStates() {
    for (const r of await this.rows<{ id: number; name: string }>(sql`select id, name from states`))
      this.stateIds.set(r.name, r.id);
  }
  private async loadDistricts() {
    for (const r of await this.rows<{ id: number; state_id: number; name: string }>(
      sql`select id, state_id, name from districts`,
    ))
      this.districtIds.set(key(r.state_id, r.name), r.id);
  }
  private async loadMarkets() {
    for (const r of await this.rows<{ id: number; district_id: number; name: string }>(
      sql`select id, district_id, name from markets`,
    ))
      this.marketIds.set(key(r.district_id, r.name), r.id);
  }
  private async loadCommodities() {
    for (const r of await this.rows<{ id: number; source_name: string }>(
      sql`select id, source_name from commodities`,
    ))
      this.commodityIds.set(r.source_name, r.id);
  }
  private async loadVarieties() {
    for (const r of await this.rows<{ id: number; commodity_id: number; source_name: string }>(
      sql`select id, commodity_id, source_name from varieties`,
    ))
      this.varietyIds.set(key(r.commodity_id, r.source_name), r.id);
  }
  private async loadGrades() {
    for (const r of await this.rows<{ id: number; name: string }>(sql`select id, name from grades`))
      this.gradeIds.set(r.name, r.id);
  }

  private async takenSlugs(query: SQL): Promise<Set<string>> {
    return new Set((await this.rows<{ slug: string }>(query)).map((r) => r.slug));
  }

  /** Resolves a batch, creating missing dimension rows in bulk. */
  async resolveAll(rows: DimensionNames[]): Promise<ResolvedIds[]> {
    await this.load();

    const newStates = unique(rows.map((r) => r.state)).filter((n) => !this.stateIds.has(n));
    if (newStates.length > 0) {
      const taken = await this.takenSlugs(sql`select slug from states`);
      const inserted = await this.db
        .insert(states)
        .values(newStates.map((name) => ({ name, slug: uniqueSlug(name, taken) })))
        .onConflictDoNothing()
        .returning({ id: states.id });
      this.created.states += inserted.length;
      await this.loadStates();
    }

    const stateIdOf = (r: DimensionNames) => this.stateIds.get(r.state)!;
    const newDistricts = uniqueBy(rows, (r) => key(stateIdOf(r), r.district)).filter(
      (r) => !this.districtIds.has(key(stateIdOf(r), r.district)),
    );
    if (newDistricts.length > 0) {
      const taken = new Map<number, Set<string>>();
      const values = [];
      for (const r of newDistricts) {
        const stateId = stateIdOf(r);
        if (!taken.has(stateId))
          taken.set(
            stateId,
            await this.takenSlugs(sql`select slug from districts where state_id = ${stateId}`),
          );
        values.push({ stateId, name: r.district, slug: uniqueSlug(r.district, taken.get(stateId)!) });
      }
      const inserted = await this.db
        .insert(districts)
        .values(values)
        .onConflictDoNothing()
        .returning({ id: districts.id });
      this.created.districts += inserted.length;
      await this.loadDistricts();
    }

    const districtIdOf = (r: DimensionNames) => this.districtIds.get(key(stateIdOf(r), r.district))!;
    const newMarkets = uniqueBy(rows, (r) => key(districtIdOf(r), r.market)).filter(
      (r) => !this.marketIds.has(key(districtIdOf(r), r.market)),
    );
    if (newMarkets.length > 0) {
      const taken = new Map<number, Set<string>>();
      const values = [];
      for (const r of newMarkets) {
        const districtId = districtIdOf(r);
        if (!taken.has(districtId))
          taken.set(
            districtId,
            await this.takenSlugs(sql`select slug from markets where district_id = ${districtId}`),
          );
        values.push({ districtId, name: r.market, slug: uniqueSlug(r.market, taken.get(districtId)!) });
      }
      const inserted = await this.db
        .insert(markets)
        .values(values)
        .onConflictDoNothing()
        .returning({ id: markets.id });
      this.created.markets += inserted.length;
      await this.loadMarkets();
    }

    const newCommodities = unique(rows.map((r) => r.commodity)).filter((n) => !this.commodityIds.has(n));
    if (newCommodities.length > 0) {
      const taken = await this.takenSlugs(sql`select slug from commodities`);
      const categoryRows = await this.db
        .select({ id: categories.id, slug: categories.slug })
        .from(categories);
      const categoryIds = new Map(categoryRows.map((c) => [c.slug, c.id]));
      const inserted = await this.db
        .insert(commodities)
        .values(
          newCommodities.map((name) => {
            const shown = displayName(name);
            const suggested = suggestCategory(name);
            return {
              sourceName: name,
              displayName: shown,
              slug: uniqueSlug(shown, taken),
              categoryId: suggested ? (categoryIds.get(suggested) ?? null) : null,
              categoryConfirmed: false,
            };
          }),
        )
        .onConflictDoNothing()
        .returning({ id: commodities.id });
      this.created.commodities += inserted.length;
      await this.loadCommodities();
    }

    const commodityIdOf = (r: DimensionNames) => this.commodityIds.get(r.commodity)!;
    const newVarieties = uniqueBy(
      rows.filter((r) => r.variety),
      (r) => key(commodityIdOf(r), r.variety!),
    ).filter((r) => !this.varietyIds.has(key(commodityIdOf(r), r.variety!)));
    if (newVarieties.length > 0) {
      const taken = new Map<number, Set<string>>();
      const values = [];
      for (const r of newVarieties) {
        const commodityId = commodityIdOf(r);
        if (!taken.has(commodityId))
          taken.set(
            commodityId,
            await this.takenSlugs(sql`select slug from varieties where commodity_id = ${commodityId}`),
          );
        const shown = displayName(r.variety!);
        values.push({
          commodityId,
          sourceName: r.variety!,
          displayName: shown,
          slug: uniqueSlug(shown, taken.get(commodityId)!),
        });
      }
      const inserted = await this.db
        .insert(varieties)
        .values(values)
        .onConflictDoNothing()
        .returning({ id: varieties.id });
      this.created.varieties += inserted.length;
      await this.loadVarieties();
    }

    const newGrades = unique(rows.map((r) => r.grade).filter((g): g is string => Boolean(g))).filter(
      (n) => !this.gradeIds.has(n),
    );
    if (newGrades.length > 0) {
      const inserted = await this.db
        .insert(grades)
        .values(newGrades.map((name) => ({ name })))
        .onConflictDoNothing()
        .returning({ id: grades.id });
      this.created.grades += inserted.length;
      await this.loadGrades();
    }

    return rows.map((r) => {
      const stateId = stateIdOf(r);
      const districtId = districtIdOf(r);
      const commodityId = commodityIdOf(r);
      return {
        stateId,
        districtId,
        marketId: this.marketIds.get(key(districtId, r.market))!,
        commodityId,
        varietyId: r.variety ? this.varietyIds.get(key(commodityId, r.variety))! : null,
        gradeId: r.grade ? this.gradeIds.get(r.grade)! : null,
      };
    });
  }
}
