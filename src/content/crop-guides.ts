/**
 * Written sections for the top Tier 1 crop guides (SPEC §9.5 item 5). General, widely
 * established background only: every price, market and date on these pages is read from the
 * database at render time, never written here.
 */

export interface CropGuide {
  /** commodities.slug */
  slug: string;
  title: string;
  description: string;
  /** Opening paragraphs. */
  intro: string[];
  /** Season and calendar notes. */
  seasons: string[];
  /** Variety and grade notes. */
  varieties: string[];
  /** Selling notes specific to the crop. */
  selling: string[];
  updated: string;
}

export const CROP_GUIDES: CropGuide[] = [
  {
    slug: "wheat",
    title: "Wheat prices in Indian mandis: a seller's guide",
    description:
      "Where wheat is traded, how the rabi calendar and procurement shape prices, and what to check before selling.",
    intro: [
      "Wheat is India's main rabi cereal and one of the two crops with the most developed government procurement system. It is reported by more mandis than any other commodity in the daily price data, which makes its national median unusually reliable.",
      "Prices are quoted in rupees per quintal for fair average quality grain. Because wheat stores well, its price moves more slowly than vegetables: arrivals, procurement and stock decisions matter more than any single day's trade.",
    ],
    seasons: [
      "Wheat is sown from late October to December and harvested from March to May, earliest in central and western India and later in the north.",
      "The heaviest mandi arrivals fall between March and May, and prices are usually at their softest then. Procurement at MSP runs through the rabi marketing season, which starts in April.",
      "Between June and February, arrivals come from stored grain, and prices reflect release of stocks, milling demand and any government market interventions.",
    ],
    varieties: [
      "Most reports are for generic wheat rather than named varieties; where varieties appear they are usually described as Dara, Lokwan, Sharbati or simply Other.",
      "Moisture content, foreign matter and shrivelled or broken grain determine whether a lot passes procurement quality norms, and they affect private buyers' bids too.",
    ],
    selling: [
      "Compare your nearest procurement centre with private mandis: procurement removes price risk but may involve registration, a quality check and a wait for payment.",
      "Because wheat can be stored, the decision is as much about when as where. Look at the monthly averages for your market before you decide to hold.",
    ],
    updated: "2026-09-18",
  },
  {
    slug: "onion",
    title: "Onion prices in Indian mandis: a seller's guide",
    description:
      "Why onion prices swing so hard, which markets set the tone, and how storage and policy affect what you get.",
    intro: [
      "Onion is the most closely watched vegetable in Indian markets, and one of the most volatile. It is grown in three overlapping crops a year, stores for a few months in the right conditions, and is politically sensitive enough that trade policy changes can move prices within days.",
      "Maharashtra dominates the trade, and Lasalgaon in Nashik district is often treated as the reference market for the country, but onion is reported by well over a thousand mandis, so the national median is a better summary than any single yard.",
    ],
    seasons: [
      "The kharif crop arrives from roughly October to December, the late kharif from January to March, and the rabi crop from March to May.",
      "Rabi onion stores best and supplies the market for much of the year. Prices often ease during heavy rabi arrivals and firm up as stored stock runs down, typically later in the monsoon.",
      "Unseasonal rain at harvest or during storage damages bulbs and can tighten supply sharply.",
    ],
    varieties: [
      "Reports usually distinguish Red, Local, Pune Fursungi, Nashik and Other. Red onion dominates the data.",
      "Size grading matters commercially: larger, well-cured, single-centre bulbs fetch more, and exporters buy to specific size bands.",
    ],
    selling: [
      "Check the gap between minimum and maximum price on the day: a wide gap usually means quality is being priced hard.",
      "Because onion travels well, the best-mandi comparison is genuinely useful here, but confirm the yard's arrivals before travelling far.",
      "Export policy changes, including minimum export prices and duties, have repeatedly changed domestic onion prices. Check current policy separately; our export figures are annual and published with a lag.",
    ],
    updated: "2026-09-18",
  },
  {
    slug: "tomato",
    title: "Tomato prices in Indian mandis: a seller's guide",
    description:
      "How a perishable crop with no storage buffer behaves, and how to read violent price swings without over-reacting.",
    intro: [
      "Tomato is the clearest example of a crop with almost no storage buffer. Fruit must move within days of harvest, so prices respond immediately to arrivals, weather and transport disruption, and can multiply or collapse within a fortnight.",
      "It is reported by well over a thousand markets, spread across almost every state, with major production in Andhra Pradesh, Karnataka, Madhya Pradesh and Maharashtra.",
    ],
    seasons: [
      "Tomato is grown almost year-round somewhere in India, with staggered plantings that keep supply broadly continuous.",
      "Supply typically tightens in the monsoon, when heat, rain damage and transport problems reduce marketable fruit, and eases when several regions harvest together.",
      "Because the crop is short-duration, a price spike usually brings a supply response within a couple of months, which is why sharp peaks rarely last.",
    ],
    varieties: [
      "Reports commonly list Local, Hybrid, Deshi and Other. Firmness and shelf life matter more to buyers than the variety name.",
      "Grading is usually by size and ripeness. Overripe fruit sells at or below the minimum price.",
    ],
    selling: [
      "Sell close to home unless the price gap is very large: transport time is quality loss for tomato.",
      "Look at the last three or four reported days rather than a single day, because a one-day spike may not be there when you arrive.",
      "Where processing or export buyers operate near you, their requirements are stricter but their prices are steadier.",
    ],
    updated: "2026-09-18",
  },
  {
    slug: "potato",
    title: "Potato prices in Indian mandis: a seller's guide",
    description: "Cold storage, the winter harvest and what they mean for potato prices across the year.",
    intro: [
      "Potato sits between grain and vegetable: it is harvested in a concentrated season but stored in cold stores for months, so its price pattern is shaped by storage economics as much as by the harvest.",
      "Uttar Pradesh and West Bengal are the largest producers, and potato is reported by more than a thousand mandis nationally.",
    ],
    seasons: [
      "The main crop is planted from October to December and harvested from January to March, when arrivals peak and prices are usually lowest.",
      "From roughly April onwards, the market is supplied largely from cold storage, and prices tend to reflect storage costs, rentals and the pace of releases.",
      "Prices often firm towards the end of the storage season, before the next harvest arrives.",
    ],
    varieties: [
      "Reports distinguish Local, Jyoti, Chipsona, Kufri varieties and Other, though many entries are generic.",
      "Tuber size, skin condition and absence of greening or sprouting drive the price. Processing buyers specify dry matter and sugar content, which ordinary mandi grading does not capture.",
    ],
    selling: [
      "If you are storing, count rent, shrinkage and interest before comparing a future price with today's.",
      "Check the monthly averages for your market over past years before assuming that holding pays.",
    ],
    updated: "2026-09-18",
  },
  {
    slug: "brinjal",
    title: "Brinjal prices in Indian mandis: a seller's guide",
    description:
      "A year-round vegetable with strong local preferences, and what that means for where you sell.",
    intro: [
      "Brinjal is grown and traded almost everywhere in India and is reported by around a thousand markets. It is harvested repeatedly over several weeks, so growers usually sell little and often rather than in one large lot.",
      "Regional preference is unusually strong: the shape and colour buyers want in one state may not sell well in the next, which keeps trade local.",
    ],
    seasons: [
      "Plantings are staggered through the year, so arrivals are fairly continuous, with regional peaks after the monsoon and in winter.",
      "Heat and heavy rain reduce quality and tighten supply, and prices often firm in those periods.",
    ],
    varieties: [
      "Reports list Long, Round, Purple, Green, Local and Other. Prices for these can differ substantially in the same market on the same day.",
      "Freedom from borer damage matters more to buyers than size.",
    ],
    selling: [
      "Compare like with like: check the variety column before treating another market's higher price as an opportunity.",
      "Because harvest is repeated, frequent small sales to a nearby market usually beat occasional long trips.",
    ],
    updated: "2026-09-18",
  },
  {
    slug: "green-chilli",
    title: "Green chilli prices in Indian mandis: a seller's guide",
    description: "A perishable crop with a dry-chilli alternative, and how that choice affects your price.",
    intro: [
      "Green chilli is traded fresh across most of India and is reported by around a thousand markets. Growers of some varieties have a second option: dry the crop and sell it as dry chilli, which stores and travels far better.",
      "That choice links the fresh and dry markets, and it is why green chilli prices sometimes move with dry chilli prices in producing belts such as Andhra Pradesh and Telangana.",
    ],
    seasons: [
      "Green chilli is available year-round from staggered plantings, with heavier arrivals after the kharif harvest.",
      "Quality falls and prices often firm in heavy monsoon weeks, when fruit rots quickly after picking.",
    ],
    varieties: [
      "Reports list Local, Hybrid, Green Chilly and Other. Pungency and length preferences vary sharply by region.",
      "Uniform colour and absence of blemishes decide whether a lot sells near the maximum or the minimum.",
    ],
    selling: [
      "Fresh chilli deteriorates fast: prioritise a nearby market with steady arrivals over a distant high price.",
      "If you can dry the crop, compare the dry chilli price in your region before committing to fresh sales.",
    ],
    updated: "2026-09-18",
  },
  {
    slug: "bhindi-ladies-finger",
    title: "Bhindi (okra) prices in Indian mandis: a seller's guide",
    description: "A fast-perishing vegetable picked every few days, and how to sell it without losing value.",
    intro: [
      "Bhindi, also called okra or ladies finger, is picked every two or three days and loses tenderness quickly after harvest. It is reported by hundreds of markets across India through most of the year.",
      "Because it must move fast, bhindi prices are highly local and can differ between neighbouring markets on the same day.",
    ],
    seasons: [
      "Two main plantings dominate: a summer crop and a kharif crop, giving arrivals through much of the year.",
      "Supply usually tightens in extreme heat and in the heaviest monsoon weeks.",
    ],
    varieties: [
      "Most reports are generic, sometimes distinguishing Hybrid and Local.",
      "Buyers judge by pod length, tenderness and colour. Over-mature, fibrous pods sell near the minimum price.",
    ],
    selling: [
      "Harvest in the cool part of the day and move quickly: a few hours changes the grade.",
      "Compare the last two or three reported days across nearby markets rather than chasing a distant peak.",
    ],
    updated: "2026-09-18",
  },
  {
    slug: "maize",
    title: "Maize prices in Indian mandis: a seller's guide",
    description: "Feed demand, starch industry buying and the kharif calendar behind maize prices.",
    intro: [
      "Maize is bought mainly by the poultry feed and starch industries rather than by households, so its price follows industrial demand more than kitchen demand. It has an MSP, and it is reported by hundreds of markets.",
      "Major producing states include Karnataka, Madhya Pradesh, Bihar, Maharashtra and Telangana.",
    ],
    seasons: [
      "The main kharif crop is harvested from September to November; a substantial rabi crop arrives from February to April in states such as Bihar.",
      "Prices typically soften at the kharif peak and firm when feed demand is strong and stocks thin.",
    ],
    varieties: [
      "Reports usually list Local, Hybrid, Yellow, White and Other. Yellow maize dominates feed demand.",
      "Moisture is the critical quality factor: freshly harvested, damp maize is discounted, and buyers test for it.",
    ],
    selling: [
      "Drying properly before sale is often the single largest improvement you can make to realisation.",
      "Feed mills and starch units sometimes buy directly at rates that differ from the mandi; compare both.",
    ],
    updated: "2026-09-18",
  },
  {
    slug: "bitter-gourd",
    title: "Bitter gourd prices in Indian mandis: a seller's guide",
    description: "A repeatedly harvested gourd with strong seasonal swings, and how to time sales.",
    intro: [
      "Bitter gourd (karela) is harvested every few days over several weeks and is reported by hundreds of markets. Like other gourds, it is perishable, and prices react quickly to local arrivals.",
      "It is grown in most states, with staggered plantings to spread the harvest.",
    ],
    seasons: [
      "The summer crop arrives from roughly March to June, and the kharif crop from July to October, with winter supply from warmer regions.",
      "Prices are usually softest at peak arrivals and firmest in the gaps between seasons.",
    ],
    varieties: [
      "Reports list Local, Hybrid and Other, and occasionally regional names.",
      "Buyers prefer firm, dark green, medium-sized fruit; yellowing fruit is heavily discounted.",
    ],
    selling: [
      "Grade before you go: mixing over-mature fruit into a lot pulls the whole lot towards the minimum price.",
      "Given the short shelf life, prefer a reliable nearby market with regular arrivals.",
    ],
    updated: "2026-09-18",
  },
  {
    slug: "bengal-gram-gram-whole",
    title: "Gram (chana) prices in Indian mandis: a seller's guide",
    description: "India's largest pulse crop, its MSP, and how whole gram and dal prices differ.",
    intro: [
      "Bengal gram, usually called chana, is India's largest pulse crop. It has an MSP, is procured under price support schemes when prices fall below it, and stores well, so its price behaves more like a grain than a vegetable.",
      "Madhya Pradesh, Maharashtra and Rajasthan are among the largest producers, and gram is reported by hundreds of markets.",
    ],
    seasons: [
      "Gram is a rabi crop, sown from October to November and harvested from February to April.",
      "Arrivals peak in March and April, when prices are usually at their lowest, and procurement may begin if market prices fall below MSP.",
    ],
    varieties: [
      "Reports distinguish whole gram from chana dal, and sometimes Kabuli chana, which is a separate, larger-seeded type that usually trades at a premium.",
      "Seed size, colour and freedom from damaged or weevilled grain drive the price.",
    ],
    selling: [
      "Compare whole gram with whole gram: dal prices include processing and are not a like-for-like comparison.",
      "If market prices are below MSP, check whether procurement has opened in your state before deciding to hold or sell.",
    ],
    updated: "2026-09-18",
  },
  {
    slug: "paddy-common",
    title: "Paddy prices in Indian mandis: a seller's guide",
    description: "Procurement, common versus Grade A MSP, and how paddy prices differ from rice prices.",
    intro: [
      "Paddy is unmilled rice as sold by farmers, and it is the crop with the largest government procurement programme in India. Its MSP is announced in two grades, Common and Grade A, and procurement runs through the kharif marketing season.",
      "Paddy and rice are reported separately in mandi data: rice is the milled product and trades at a different level. Comparing the two directly is a common mistake.",
    ],
    seasons: [
      "The main kharif crop is harvested from September to December, with procurement running through the kharif marketing season that starts in October.",
      "A rabi or summer crop is harvested from March to June in several states, with its own procurement window.",
    ],
    varieties: [
      "Reports distinguish Common, Grade A, and basmati or specific varieties in some states. Basmati paddy is a distinct market, usually well above MSP-linked prices.",
      "Moisture content is the decisive quality factor at procurement centres, along with foreign matter and immature grain.",
    ],
    selling: [
      "Check the MSP that applies to your grade, and whether your nearest procurement centre is open and registered for your village.",
      "Where private buyers pay above MSP for a preferred variety, weigh that against payment terms and deductions.",
    ],
    updated: "2026-09-18",
  },
  {
    slug: "cucumbar-kheera",
    title: "Cucumber prices in Indian mandis: a seller's guide",
    description: "A fast-moving summer vegetable, its short shelf life, and how to sell it well.",
    intro: [
      "Cucumber, reported as Cucumbar (Kheera) in the mandi data, is a short-duration, high-turnover vegetable traded in hundreds of markets. Demand rises sharply in hot weather, and the crop is harvested repeatedly over a few weeks.",
      "Because it bruises easily and loses firmness quickly, cucumber trade is mostly local.",
    ],
    seasons: [
      "The summer crop dominates, with arrivals from roughly March to June, and further plantings supplying the monsoon and winter months in many regions.",
      "Prices usually peak before the main summer arrivals and fall once several districts harvest together.",
    ],
    varieties: [
      "Reports list Local, Hybrid and Other. Length and straightness matter to buyers, as does an unblemished skin.",
    ],
    selling: [
      "Pick at the right size: over-mature fruit with developed seeds is discounted heavily.",
      "Sell the same day where possible, and compare the two or three nearest markets rather than travelling far.",
    ],
    updated: "2026-09-18",
  },
  {
    slug: "cabbage",
    title: "Cabbage prices in Indian mandis: a seller's guide",
    description: "A winter-heavy vegetable that travels well, and how to use that in choosing a market.",
    intro: [
      "Cabbage keeps better than most leafy and fruiting vegetables and can travel several hundred kilometres without serious loss, which gives sellers more choice of market than usual.",
      "It is reported by several hundred mandis, with heavier trade in winter.",
    ],
    seasons: [
      "The main crop is a winter one, harvested from roughly November to February, when arrivals are heaviest and prices softest.",
      "Hill regions supply the market in summer, which keeps cabbage available through much of the year.",
    ],
    varieties: [
      "Reports usually list Local, Hybrid and Other.",
      "Head firmness, weight and freedom from splitting or insect damage determine the grade.",
    ],
    selling: [
      "Because cabbage travels, run the take-home calculation properly: a market 100 km away can genuinely be worth it when the price gap is wide.",
      "Harvest at full head firmness; loose heads are discounted.",
    ],
    updated: "2026-09-18",
  },
  {
    slug: "cauliflower",
    title: "Cauliflower prices in Indian mandis: a seller's guide",
    description:
      "A crop with tight harvest windows and sharp price swings at the start and end of the season.",
    intro: [
      "Cauliflower has a narrow harvest window: curds must be cut when compact and white, and quality falls within days. That makes prices unusually sensitive to how many growers are cutting in the same week.",
      "It is reported by several hundred markets, most heavily in winter.",
    ],
    seasons: [
      "Early varieties arrive from September and October at usually higher prices; the main winter crop follows from November to February with heavy arrivals and softer prices.",
      "Late-season supply from cooler regions extends availability into spring.",
    ],
    varieties: [
      "Reports list Local, Hybrid, Ranchi and Other, depending on the region.",
      "Curd whiteness, compactness and size drive price; yellowing or loose curds sell near the minimum.",
    ],
    selling: [
      "Timing the cut matters more than choosing the market: a day or two late can cost a grade.",
      "Early and late in the season, check several markets: price differences are widest when arrivals are thin.",
    ],
    updated: "2026-09-18",
  },
  {
    slug: "bottle-gourd",
    title: "Bottle gourd prices in Indian mandis: a seller's guide",
    description: "A widely grown gourd with steady demand, repeated harvests and local markets.",
    intro: [
      "Bottle gourd (lauki or dudhi) is grown across India and reported by several hundred markets. It is harvested repeatedly over several weeks and sold young, before the shell hardens.",
      "Demand is steady rather than seasonal, so prices respond mainly to local arrivals.",
    ],
    seasons: [
      "Summer and kharif plantings give arrivals through most of the year, with regional peaks after each.",
      "Prices usually firm in the gaps between plantings and in disruptive monsoon weeks.",
    ],
    varieties: [
      "Reports list Local, Hybrid and Other, occasionally distinguishing long and round types.",
      "Buyers want tender fruit of uniform size; mature fruit with hard skin is discounted sharply.",
    ],
    selling: [
      "Harvest young and grade by size: uniformity lifts the whole lot towards the modal price.",
      "Sell locally and often; the fruit does not justify long journeys.",
    ],
    updated: "2026-09-18",
  },
];

export const CROP_GUIDE_SLUGS = CROP_GUIDES.map((g) => g.slug);
