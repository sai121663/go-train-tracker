
import calendar_dates from "../data/JSON_GO_GTFS/calendar_dates.json";

export const baseStations = [
            { name: "Union Station GO", x: 93, y: 72},
            { name: "Bloor GO", x: 88.5, y: 61},
            { name: "Mount Dennis GO", x: 87.5, y: 54},
            { name: "Weston GO", x: 86, y: 47},
            { name: "Etobicoke North GO", x: 82, y: 40},
            { name: "Malton GO", x: 77, y: 35},
            { name: "Bramalea GO", x: 73, y: 32.5},
            { name: "Brampton Innovation District GO", x: 67.5, y: 32.5},
            { name: "Mount Pleasant GO", x: 62.5, y: 32.5},
            { name: "Georgetown GO", x: 55.5, y: 32.5},
            { name: "Acton GO", x: 46.5, y: 31},
            { name: "Guelph Central GO", x: 28, y: 46},
            { name: "Kitchener GO", x: 9, y: 55}
        ];

// Returns a sorted list of all trips by their start time
export function preprocessTrips(trips, stopTimesByTrip, stopsById, route_id) {
    
  const currentDayOfWeek = new Date().getDay();

  // Finds a service_id from the GTFS that matches the current day of the week
  // (E.g. If today is a Monday, only render trips that occur on Mondays in the dataset)
  const matchingServiceIds = new Set(
    calendar_dates
      .filter(cd => {
       const year = Number(cd.date.slice(0, 4));
       const month = Number(cd.date.slice(4, 6)) - 1;
       const day = Number(cd.date.slice(6, 8));
      return new Date(year, month, day).getDay() === currentDayOfWeek;
      })
      .map(cd => cd.service_id)
  );

  console.log("currentDayOfWeek", currentDayOfWeek);
  console.log("matchingServiceIds", matchingServiceIds);
  console.log("sample trip service_id", trips[0]?.service_id);

  const seen = new Set();
  
  return trips
      .filter(t => t.route_id === route_id)  // Only keep trips that match route_id
      .filter(t => matchingServiceIds.has(t.service_id))
      .map(t => {

        const tripStops = stopTimesByTrip.get(t.trip_id) || [];

        let firstStop = stopsById.get(String(tripStops[0]?.stop_id));
        let lastStop = stopsById.get(String(tripStops[tripStops.length - 1]?.stop_id));

        if (!tripStops.length) return null;

        let startTime = convertToDateObject(tripStops[0].arrival_time);
        let endTime = convertToDateObject(
          tripStops[tripStops.length - 1].arrival_time
        );

        // Swap end and start time if they're in the wrong order
        if (endTime < startTime) {
          [startTime, endTime] = [endTime, startTime];
          [firstStop, lastStop] = [lastStop, firstStop]
        }

        return {
          tripId: t.trip_id,
          direction: Number(t.direction_id),
          startTime,
          endTime,
          firstStation: firstStop?.stop_name,
          lastStation: lastStop?.stop_name,
          serviceDate: t.trip_id.slice(0, 8) // e.g. "20260222" refers to a trip on February 22, 2026
        };
      })
      .filter(Boolean)

      // If two trips are running in the same DIRECTION at the same TIME, we only keep one of them
      .filter(t => {
        const key = `${t.direction}-${t.startTime.getHours()}-${t.startTime.getMinutes()}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })

      .sort((a, b) => a.startTime - b.startTime);
}


export function buildTrip(tripID, stopTimesByTrip, stopsById, baseStationsByName) {
    
    console.log("buildTrip has been called");

    const tripStops = stopTimesByTrip.get(tripID) || [];


    // Join stop_times & stops for the given stations
    return tripStops
      .sort((a, b) => Number(a.stop_sequence) - Number(b.stop_sequence))
      .map(st=> {
        const stop = stopsById.get(String(st.stop_id));
        if (!stop) return null;

        const baseStation = baseStationsByName.get(stop.stop_name);
        if (!baseStation) return null;

        return {
            name: stop.stop_name,
            arrival_time: convertToDateObject(st.arrival_time),
            x: baseStation?.x,
            y: baseStation?.y
        };
    })
    .filter(Boolean);

}



function convertToDateObject(timeString) {
  const [h, m, s] = timeString.split(":");
  const now = new Date();
  const date = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    Number(h % 24),
    Number(m),
    Number(s)
  );

  // If a trip goes past midnight, the date object updates to the next day
  if (h >= 24) {
    date.setDate(date.getDate() + 1);
  }

  return date;
}