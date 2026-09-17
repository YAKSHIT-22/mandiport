import Papa from "papaparse";
import { DataGovInParseError } from "./errors";

/** Parses a data.gov.in CSV body (header row + records) into plain objects. */
export function parseCsvRecords(body: string): Record<string, string>[] {
  const result = Papa.parse<Record<string, string>>(body.replace(/^﻿/, ""), {
    header: true,
    skipEmptyLines: "greedy",
  });
  const fatal = result.errors.find((e) => e.type !== "FieldMismatch");
  if (fatal) {
    throw new DataGovInParseError(`CSV parse failed at row ${fatal.row ?? "?"}: ${fatal.message}`);
  }
  return result.data;
}
