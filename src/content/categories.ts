/**
 * Category hub overviews (SPEC §9.5 item 6): short, original, practical. General context only;
 * every price or figure on the page comes from the database, not from this text.
 */
export const CATEGORY_OVERVIEWS: Record<string, { intro: string[] }> = {
  vegetables: {
    intro: [
      "Vegetables are the most frequently reported group in Indian mandis. Onion, potato and tomato alone appear in hundreds of markets on a normal day, and leafy and gourd vegetables fill out long daily lists in states such as Kerala, Tamil Nadu and Uttar Pradesh.",
      "Because most vegetables cannot be stored for long, their prices react quickly to arrivals. A few days of heavy rain, a festival or a harvest peak in a neighbouring state can move the modal price sharply within a week. That is why the change marks on each crop page compare with about a week and about a month earlier, rather than a year.",
      "When you compare markets, look at the arrival date and the grade before the price. Many vegetable reports are for local or non-standard grades, and a market that reported yesterday may not have traded today. Onion and potato keep better than most, so their price history is steadier and more useful for timing sales.",
    ],
  },
  fruits: {
    intro: [
      "Fruit prices in mandis follow harvest calendars closely. Mango, grapes, pomegranate, banana and citrus each have months when arrivals peak and prices soften, and months when little fresh produce reaches the market.",
      "Quality varies more for fruit than for most crops, so a single market can report a wide gap between minimum and maximum price on the same day. The modal price, the most common trading price, is usually the best single figure to compare, but check the variety and grade listed on the crop page.",
      "Banana and papaya are traded almost everywhere and report year-round. Apples come mostly from northern hill states and are stored and sold over many months. Some fruits, such as grapes and pomegranate, are also important exports, so the export section on their pages shows the broad “fresh fruits” trade group they fall under.",
    ],
  },
  cereals: {
    intro: [
      "Cereals are India's staple grains: wheat, paddy and rice, maize, and millets such as bajra, jowar and ragi. Several of them have a minimum support price (MSP) announced by the government each season, and the crop pages show how mandi prices compare with it.",
      "Grain prices usually move more slowly than vegetable prices because grain can be stored. The biggest movements tend to come around harvest, when arrivals rise, and when procurement starts or ends in major producing states.",
      "Paddy and rice are reported separately. Paddy is unhusked grain sold by farmers; rice is the milled product. Basmati and non-basmati are also distinct in both mandi and export data, so check which one a price refers to before comparing.",
    ],
  },
  pulses: {
    intro: [
      "Pulses include gram (chana), tur or arhar, moong, urad and masur, sold both whole and as split dal. Most major pulses have an MSP, and government procurement under price support schemes can matter when market prices fall below it.",
      "Whole grain and dal are reported as separate commodities because processing adds cost. Compare whole with whole and dal with dal.",
      "Pulse prices respond to domestic harvests, import decisions and stock limits, so they can shift over weeks rather than days. The monthly averages on market pages help show whether a price is unusual for the time of year once enough history has been collected.",
    ],
  },
  spices: {
    intro: [
      "Spices such as cumin (jeera), coriander seed, turmeric, dry chillies, black pepper and cardamom are traded through specialised markets, often concentrated in a few producing districts. Unjha for cumin and Guntur for chillies are well-known examples.",
      "Because trade is concentrated, a small number of markets can account for most reports, and a single large market's price can move the national median. Look at the number of markets reporting before reading too much into a change.",
      "Spices are among India's larger agricultural exports. Official export figures group them together under “spices”, so a crop page shows the trend for the whole group rather than for one spice.",
    ],
  },
  oilseeds: {
    intro: [
      "Oilseeds include groundnut, mustard (rapeseed), soybean, sesame, sunflower, castor, safflower and niger seed. Most have an MSP, and several are important for India's edible oil supply.",
      "Oilseed prices are influenced by international edible oil markets as well as domestic harvests. A change in global palm or soybean oil prices can show up in mandi prices for mustard and soybean over the following weeks.",
      "Some oilseeds, such as sesame and groundnut, are exported directly, while soybean is exported mainly as oil meal. The export section on each crop page names the trade group used.",
    ],
  },
  fibres: {
    intro: [
      "Fibre crops in the mandi data are mainly cotton and jute, with smaller volumes of mesta and coconut coir. Cotton and jute both have an MSP.",
      "Cotton is traded as raw seed cotton (kapas) in mandis, and its price depends on staple length and quality as well as international cotton prices. Jute is concentrated in eastern states, especially West Bengal and Assam.",
      "Reports for fibre crops are seasonal: most cotton arrives from October to March. Outside that window, fewer markets report and national medians rest on fewer observations.",
    ],
  },
  flowers: {
    intro: [
      "Flowers such as marigold, rose, jasmine and tuberose are sold in a small number of mandis, mostly in southern and western states, and sometimes by weight rather than by quintal.",
      "Flower prices can change very sharply around festivals and weddings, and a price from one day may not hold even for the next. Always check the arrival date shown next to a price.",
      "Because few markets report flowers regularly, many flower pages show a limited-data note. Floriculture exports are published only as one broad group.",
    ],
  },
  "dry-fruits": {
    intro: [
      "Dry fruits in mandi reports include cashew nuts, almonds, raisins (dry grapes), figs and makhana (fox nut). Only a few markets report them, and prices depend heavily on grade and size.",
      "Cashew is also one of India's established agricultural exports, and its export figures are published separately. For other dry fruits, trade data is either grouped with other products or not available.",
      "With few reporting markets, use these prices as a reference point and confirm with traders before a transaction.",
    ],
  },
  "livestock-poultry": {
    intro: [
      "Some regulated markets also report livestock and poultry, such as goats, cows, bullocks and poultry birds, and a few report fish and prawns. These are usually priced per animal or per unit, not per quintal, so compare only within the same market and unit.",
      "Coverage is thin and irregular: only a handful of markets report these items, and on many days none do. The pages here show what has been reported, with dates, but they are not a full picture of livestock trade.",
      "Marine products and meat are large export groups, and their export trends appear where a mapping exists.",
    ],
  },
  others: {
    intro: [
      "This group holds everything that does not fit the main categories, such as jaggery (gur), arecanut, betel leaves, tobacco, firewood, fodder and medicinal plants. It also holds crops whose category has not yet been confirmed by our reviewers.",
      "Many of these items are reported by only a few markets, and some use units other than quintals. Read the unit and date carefully, and treat sparse figures as indicative.",
      "If you think a crop is in the wrong category, tell us through the contact page.",
    ],
  },
};
