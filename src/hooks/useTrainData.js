import {useMemo} from "react";

// Adds 'm' minutes to startTime
const addMinutes = (startTime, m) => {
    const d = new Date(startTime.getTime() + m * 60000)
    return `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`
}

export function useTrainData(direction, startTime) {
    
        console.log("startTime is ", startTime);

        const baseStations = [
            { name: "Union", x: 93, y: 72},
            { name: "Bloor", x: 88.5, y: 61},
            { name: "Mount Dennis", x: 87.5, y: 54},
            { name: "Weston", x: 86, y: 47},
            { name: "Etobicoke North", x: 82, y: 40},
            { name: "Malton", x: 77, y: 35},
            { name: "Bramalea", x: 73, y: 32.5},
            { name: "Brampton Innovation", x: 67.5, y: 32.5},
            { name: "Mount Pleasant", x: 62.5, y: 32.5},
            { name: "Georgetown", x: 55.5, y: 32.5},
            { name: "Acton", x: 46.5, y: 31},
            { name: "Guelph", x: 28, y: 46},
            { name: "Kitchener", x: 9, y: 55}
        ];

        // Stores the # of minutes it takes to get to each station in "forward" direction (Union -> Kitchener)
        // E.g. Union (0th stop) -> Mount Dennis (2nd stop) takes 16 minutes
        
        // Fix baseOffsets
        // baseOffsets stores the time interval between station i & i + 1
        // const baseOffsets = [12, 4, 4, 5, 6, 6, 8, 6, 10, 14, 16, 19]  // real intervals between stations
        const baseOffsets = [0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1]  // used for debugging

        // Reverse the order of the stations if necessary
        const orderedStations  = 
            direction == "forward"
            ? baseStations
            : [...baseStations].reverse() 

        // Reverse the order of station offsets 
        const orderedOffsets = 
            direction == "forward"
            ? baseOffsets
            : [...baseOffsets].reverse()


        let totalTripTime = 0;
        // Adds the time for each station
        // E.g. { name: "Union", x: 640, y: 150, time: addMinutes(-5)}
        const stations = orderedStations.map((station, index) => {

            // Don't add an offset for the first station
            if (index > 0) {
            totalTripTime += orderedOffsets[index - 1];
            }

            const time = new Date(startTime.getTime() + totalTripTime * 60000)
            
            return {...station, time};
        });

        return {stations, totalTripTime};

}