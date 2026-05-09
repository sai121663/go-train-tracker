// Used to speed up load time by filtering out only Kitchener Line stops

import fs from "fs";

const stopTimes = JSON.parse(fs.readFileSync("src/data/JSON_GO_GTFS/stop_times.json", "utf8"));
const trips = JSON.parse(fs.readFileSync("src/data/JSON_GO_GTFS/trips.json", "utf8"));

// Get all Kitchener Line trip IDs
const kitchenerTripIds = new Set(
  trips
    .filter(t => t.route_id === "01260426-GT")
    .map(t => t.trip_id)
);

// Filter stop_times to only Kitchener Line trips
const filtered = stopTimes.filter(st => kitchenerTripIds.has(st.trip_id));

fs.writeFileSync("src/data/JSON_GO_GTFS/stop_times_kitchener.json", JSON.stringify(filtered));

console.log(`Original: ${stopTimes.length} rows`);
console.log(`Filtered: ${filtered.length} rows`);
