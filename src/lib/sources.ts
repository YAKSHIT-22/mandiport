/**
 * Dataset attribution (SPEC §11). Page URLs verified 2026-09-17 (each returns the dataset's own title).
 */
export const GODL_LICENCE_URL = "https://www.data.gov.in/sites/default/files/Gazette_Notification_OGDL.pdf";
export const GODL_LICENCE_NAME = "Government Open Data License – India (GODL-India)";

export interface Dataset {
  key: string;
  title: string;
  agency: string;
  pageUrl: string;
  apiUrl: string;
}

const api = (id: string) => `https://api.data.gov.in/resource/${id}`;

export const DATASETS = {
  mandiVariety: {
    key: "mandi_variety",
    title: "Variety-wise Daily Market Prices Data of Commodity",
    agency:
      "Directorate of Marketing and Inspection (Agmarknet), Ministry of Agriculture and Farmers Welfare",
    pageUrl: "https://www.data.gov.in/resource/variety-wise-daily-market-prices-data-commodity",
    apiUrl: api("35985678-0d79-46b4-9ed6-6f13308a1d24"),
  },
  mandiDaily: {
    key: "mandi_daily",
    title: "Current Daily Price of Various Commodities from Various Markets (Mandi)",
    agency: "Department of Agriculture and Farmers Welfare, Ministry of Agriculture and Farmers Welfare",
    pageUrl: "https://www.data.gov.in/resource/current-daily-price-various-commodities-various-markets-mandi",
    apiUrl: api("9ef84268-d588-465a-a308-a864a43d0070"),
  },
  msp: {
    key: "msp",
    title:
      "Commodity-wise Details of Minimum Support Prices (MSP) of Kharif, Rabi, and Others Crops from 2013-14 to 2024-25",
    agency: "Ministry of Agriculture and Farmers Welfare (published via Rajya Sabha)",
    pageUrl:
      "https://www.data.gov.in/resource/commodity-wise-details-minimum-support-prices-msp-kharif-rabi-and-others-crops-2013-14",
    apiUrl: api("82e89d31-2208-4be0-babd-2286a4d9110b"),
  },
  mspRabi: {
    key: "msp_rabi",
    title:
      "Commodities-wise government has fixed the Rabi Crops Minimum Support Price (MSP) from 2014-15 to 2025-26",
    agency: "Ministry of Agriculture and Farmers Welfare (published via Rajya Sabha)",
    pageUrl:
      "https://www.data.gov.in/resource/commodities-wise-government-has-fixed-rabi-crops-minimum-support-price-msp-2014-15-2025-26",
    apiUrl: api("b45f166a-9a89-492f-a8ed-3cb245850408"),
  },
  exports: {
    key: "exports",
    title: "Principal Commodity wise Export",
    agency: "Department of Commerce, Ministry of Commerce and Industry",
    pageUrl: "https://www.data.gov.in/catalog/principal-commodity-wise-export",
    apiUrl: api("d7999d61-6ea9-4455-95b1-ad3b9467a015"),
  },
} satisfies Record<string, Dataset>;

export type DatasetKey = keyof typeof DATASETS;
