function getTimeProgress(start, end, now = new Date()) {

    const total = end - start;  // # of milliseconds between end and start
    const elapsed = now - start;    // # of milliseconds between curr and start

    return Math.min(Math.max((elapsed/total) * 100, 0), 100) / 100;

}

export function interpolatePosition(stations, time) {

        const now = time;

        // Finds the index of the previous station based on the current time
        const currIndex = stations.findIndex((station, i) => {
            const nextTime = stations[i + 1]?.arrival_time;
            return nextTime && now >= station.arrival_time && now < nextTime;
        
        });

        if (currIndex === -1 || !stations[currIndex + 1]) {
             // Train hasn't started started or already finished
            return {
                left: stations[stations.length - 1].x,
                top: stations[stations.length - 1].y,
                prevStation: stations[stations.length - 1],
                nextStation: stations[stations.length - 1],
                progress: 1

            };
        }

        const prevStation = stations[currIndex];
        const nextStation = stations[currIndex + 1];

        // Compute the % that currTime has passed between prev & next station
        const progress = getTimeProgress(prevStation.arrival_time, nextStation.arrival_time, now);

        // Calculate (x,y) position based on the % 
        return {
            left: prevStation.x + progress * (nextStation.x - prevStation.x),
            top: prevStation.y + progress * (nextStation.y - prevStation.y),
            currIndex, 
            prevStation, 
            nextStation,
            firstStation: stations[0],
            lastStation: stations[stations.length - 1],
            progress
        }
}

