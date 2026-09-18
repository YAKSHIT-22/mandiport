-- prices_market_daily becomes a VIEW over prices_daily (DECISIONS D-024).
-- Measured on 90 days of real data: the table held 1.65M rows at 163 bytes each (257 MB) for
-- almost one row per prices_daily row, which itself costs 126 bytes. Computing it instead
-- roughly halves storage growth; the queries that read it stay unchanged because the view
-- keeps the same name and columns.
DROP TABLE IF EXISTS "prices_market_daily";
--> statement-breakpoint
CREATE VIEW "prices_market_daily" AS
SELECT p.arrival_date,
       p.market_id,
       p.commodity_id,
       d.state_id,
       round(percentile_cont(0.5) WITHIN GROUP (ORDER BY p.modal_price))::int AS modal_price,
       min(p.min_price) AS min_price,
       max(p.max_price) AS max_price
FROM prices_daily p
JOIN markets m ON m.id = p.market_id
JOIN districts d ON d.id = m.district_id
GROUP BY p.arrival_date, p.market_id, p.commodity_id, d.state_id;
