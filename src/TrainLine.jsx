import kitchenerLine from "./assets/Kitchener-Line.png"
import {useEffect, useState, useMemo, useRef} from "react"
import {interpolatePosition} from "./logic/logic.js"

import stops from "./data/JSON_GO_GTFS/stops.json";
import trips from "./data/JSON_GO_GTFS/trips.json";


const response = await fetch("/stop_times_kitchener.json")
const stopTimes = await response.json();

import {buildTrip, preprocessTrips, baseStations} from "./logic/buildTrip";


import "./App.css"

function TrainLine() {

    const [sidePanelOpen, setSidePanelOpen] = useState(true);

    // startTime is set ONCE each time the app reloads
    const [startTime, setStartTime] = useState(new Date())

    // Allows us to switch directions (e.g. from Union->Kitchener to Kitchener->Union)
    const [direction, setDirection] = useState("0");

    const [isPaused, setIsPaused] = useState(false);
    const [pausedTime, setPausedTime] = useState();
    const [hoveredTripId, setHoveredTripId] = useState(null);
    const [simulatedTime, setSimulatedTime] = useState(null);
    const [activeTrips, setActiveTrips] = useState([]);

    // Live Rendering
    const [time, setTime] = useState(new Date());

    useEffect(() => {
      const interval = setInterval(() => {
        setTime(new Date());
      }, 1000);

        return () => clearInterval(interval);
    }, []); 

    
    const tripId = "20260423-GT-3036";

    // 1. Create a LOOK-UP map
    // Group all stop times by their trip ID (instant lookup)
    const stopTimesByTrip = useMemo(() => {
      
      if (!stopTimes) return new Map();     // returns an empty map if the GTFS data hasn't been loaded yet
      
      const map = new Map();

      for (const st of stopTimes) {
        if (!map.has(st.trip_id)) {
          map.set(st.trip_id, []);
        }
        map.get(st.trip_id).push(st);
      }

      return map;
    }, [stopTimes]);

    // 2. Maps trip ID to the list of stops on the trip 
    const stopsById = useMemo(() => {
      const map = new Map();
      for (const s of stops) {
        map.set(String(s.stop_id), s);
      }

      return map;
    }, []);

    // 3. Maps a station to its x/y coordinates
    const baseStationsByName = useMemo(() => {
      const map = new Map();
      for (const b of baseStations) {
        map.set(b.name, b);
      }

      return map;
    }, [])


    const stations = useMemo(() => {
      return buildTrip(tripId, stopTimesByTrip, stopsById, baseStationsByName);
    }, [tripId, stopTimesByTrip]);

    const route_id = "01260426-GT";

    // Fetches sorted list of trips based on start time
    const tripsMeta = useMemo(() => {

      return preprocessTrips(trips, stopTimesByTrip, stopsById, route_id);
    }, [stopTimesByTrip]);

    // Set the STARTING time for the simulation
    useEffect(() => {
        setSimulatedTime(new Date());
    }, [tripsMeta]);

    // Update the simulation time every second
    useEffect(() => {
      if (simulatedTime === null) return;

      const interval = setInterval(() => {
          setSimulatedTime(prev => new Date(prev.getTime() + 1000));
      }, 1000);

      return () => clearInterval(interval);
    }, [simulatedTime === null]);

    useEffect(() => {
    }, [simulatedTime]);


    // Initializes a list that stores ACTIVE trips
    // indexRef is a pointer to the current trip
    const indexRef = useRef(0);

    // Checks through tripsMeta every 30 seconds and updates "activeTrips"
    useEffect(() => {

      if (!simulatedTime) return;

      // Transforms the current date into a string 
      // (avoids printing the same trip across multiple dates)
    const currentDateString = 
        simulatedTime.getFullYear().toString() +
        String(simulatedTime.getMonth() + 1).padStart(2, "0") +
        String(simulatedTime.getDate()).padStart(2, "0");

        const active = tripsMeta.filter(t => 

          t.direction === Number(direction) &&
          t.startTime <= simulatedTime &&
          t.endTime >= simulatedTime
        );

        setActiveTrips(active);

    }, [tripsMeta, simulatedTime]);


    // Saves each built trip so that it could be reused for later
    // tripCache is a dictionary mapping tripID -> (detailed list of stations on the trip)
    const tripCache = useRef(new Map());

    function getBuiltTrip(tripID) {

      // Check if tripCache already has the given tripID
      if (!tripCache.current.has(tripID)) {
        tripCache.current.set(
          tripID,
          buildTrip(tripID, stopTimesByTrip, stopsById, baseStationsByName)
        );
      }

      return tripCache.current.get(tripID);
    }

    // Get list of stations for each active trip 
    const activeTripsData = useMemo(() => {
      const uniqueTrips = activeTrips.filter(
        (trip, index, arr) => 
          index === arr.findIndex(t => t.tripId === trip.tripId)
      );

      return uniqueTrips.map(t => ({
        tripId: t.tripId,
        stations: getBuiltTrip(t.tripId)
      }));
    }, [activeTrips]);
      
const firstTrain = activeTripsData[0];
const firstTrainData = firstTrain
      ? interpolatePosition(firstTrain.stations, simulatedTime)
      : null;

// Stores "Kitchener -> Union" or vice versa
const startToEndStation = `${stations[0].name} -> ${stations[stations.length - 1].name}`

// Get the top 5 upcoming trips
const upcomingTrips = tripsMeta 
    .filter(t =>
      t.direction === Number(direction) && 
      t.startTime > simulatedTime
    )
    .slice(0, 3);

if (!stations.length) {
      return <div>Loading trip...</div>;
}

  return (
    <>

    {/* Side Panel */}
    <div style={{
      position: "fixed", top: 0, left: 0,
      width: "440px", height: "100vh",
      overflowY: "auto",
      boxSizing: "border-box",
      background: "rgba(0,0,0,0.85)",
      color: "white",
      borderRadius: "0 10px 10px 0",
      padding: "20px 16px",
      boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
      zIndex: 1000,
      fontSize: "14px",
      transform: sidePanelOpen ? "translateX(0)" : "translateX(-100%)",  
      transition: "transform 0.3s ease"                               
    }}>

      {/* Direction Selector */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 14, color: "white", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>
          <strong> 🧭 Direction </strong>
        </div>
        <select
          value={direction}
          onChange={(e) => setDirection(e.target.value)}
          style={{
            width: "100%",
            background: "#1a1a1a",
            color: "white",
            border: "0.5px solid #444",
            borderRadius: 8,
            padding: "8px 10px",
            fontSize: 13,
            cursor: "pointer",
            outline: "none",
            appearance: "none",           
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23888' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
            backgroundRepeat: "no-repeat",
            backgroundPosition: "right 10px center",
            paddingRight: "28px"
          }}
        >
          <option value="0">Kitchener</option>
          <option value="1">Union</option>
        </select>
      </div>

      {/* Live section label */}
      <div style={{ fontSize: 14, letterSpacing: "0.08em", textTransform: "uppercase", color: "white", marginBottom: 8 }}>
        <strong> 🟢 Live trips ({activeTripsData.length}) </strong>
      </div>

      {activeTripsData.map(t => {
        const trainData = interpolatePosition(t.stations, simulatedTime);
        return (
          <div key={t.tripId} style={{
            background: "#f9f9f9", 
            border: "0.5px solid #e5e5e5",
            borderRadius: 12, 
            padding: "12px 14px", 
            marginBottom: 8,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            gap: 6
          }}>
            
            {/* Header */}

              <span style={{ 
                fontSize: 14, 
                color: "black", 
                fontWeight: 500 
              }}>
                  🚆  {trainData.firstStation?.name} → {trainData.lastStation?.name}
              </span>


            {/* Previous + Next Station */}
            <div style={{fontSize: 11, color: "#333"}}>

                 Departed: <strong> {trainData.prevStation?.name ?? trainData.firstStation?.name} </strong>
            </div>


            <div style={{ fontSize: 11, color: "#333", marginBottom: 2 }}>
              Next: <strong> {trainData.nextStation?.name} </strong>
            </div>

            <div style={{ fontSize: 16, color: "#333" }}>
              Arrives: <strong> {trainData.nextStation?.arrival_time?.toLocaleTimeString([], {hour: "2-digit", minute: "2-digit"})} </strong>
            </div>

            {/* "LIVE" badge */}
            <span style={{ 
                  fontSize: 10, 
                  background: "#EAF3DE", 
                  color: "#3B6D11", 
                  borderRadius: 999, 
                  padding: "2px 8px", 
                  letterSpacing: "0.06em",
                  marginBottom: 6 
            }}>
              LIVE
            </span>

            {/* Progress Bar + "LIVE" badge  */}
            <div style={{width: "100%"}}> 

                
              <div style={{ 
                height: 4, 
                width: "100%", 
                background: "#e5e5e5", 
                borderRadius: 999, 
                overflow: "hidden" 
              }}>
                <div style={{ 
                  width: `${trainData.progress * 100}%`, 
                  height: "100%", 
                  background: "#1D9E75", 
                  borderRadius: 999 
                }} />

              </div>
              
          
            </div>


          </div>
        );
      })}

    {/* Upcoming Trips */}
    <div style={{ fontSize: 14, letterSpacing: "0.08em", textTransform: "uppercase", color: "white", margin: "20px 0 8px" }}>
      <strong> 🕐 Upcoming Trips </strong>
    </div>

      {upcomingTrips.map((t, i) => {
        const minsRemaining = Math.round((t.startTime - simulatedTime) / 60000);

        const countdownColor = minsRemaining < 10 ? "#ff4444"
          : minsRemaining < 30 ? "#e07800"
          : "#1D9E75"


        return (
          <div key={t.tripId} style={{
            background: "#f9f9f9", 
            border: "0.5px solid #e5e5e5",
            borderRadius: 12, 
            padding: "12px 14px", 
            marginBottom: 8,
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12
          }}>

              {/* Trip Info */}
              <div style ={{width: "calc(100vw - 52px)"}}>
                <div style={{ 
                  fontSize: 14, 
                  fontWeight: 500,
                  marginBottom: 4,
                  whiteSpace: "nowrap",
                  color: "black"
                }}>
                  🚆  {t.firstStation} → {t.lastStation}
                </div>

              <span style={{
                fontSize: 10, 
                background: "rgba(255, 192, 100, 0.25)", 
                color: "#e07800",
                borderRadius: 999, 
                padding: "2px 8px", 
                letterSpacing: "0.06em",
                marginBottom: 6
              }}>
                SCHEDULED
              </span>
              
              <div style={{ fontSize: 12, color: "#999", marginTop: 1 }}>
                Departs {t.startTime.toLocaleTimeString([], {hour: "2-digit", minute: "2-digit"})}
              </div>
            </div>

            {/* Countdown Square */}
            <div style={{
              minWidth: 52,
              height: 52,
              background: `${countdownColor}`,
              border: `0.5px solid ${countdownColor}`,
              borderRadius: 10,
              display: "flex",
              flexDirection: "column",
              alignItems:  "center",
              justifyContent: "center",
              flexShrink: 0
            }}>

              <div style={{ fontSize: 18, fontWeight: 700, color: "white", lineHeight: 1}}>
                {minsRemaining}
              </div>
              <div style={{ fontSize: 9, color: "black", marginTop: 2, letterSpacing: "0.04em"}}>
                <strong> MIN </strong>
              </div>

            </div>

          </div>

                  
        );

      })}

  </div> 
  {/* Side Panel ends here */}

  {/* Toggle Button for Side Panel */}
  <div
    onClick={() => setSidePanelOpen(prev => !prev)}
    style={{
      position: "fixed",
      top: "50%",
      left: sidePanelOpen ? "440px" : "0px",        
      transform: "translateY(-50%)",
      background: "rgba(0,0,0,0.85)",
      color: "white",
      borderRadius: "0 6px 6px 0",
      padding: "10px 6px",
      cursor: "pointer",
      zIndex: 1001,
      transition: "left 0.3s ease", 
      fontSize: 12,
      userSelect: "none"
  }}>

    {sidePanelOpen ? "◀" : "▶"}

  </div>

    
  {/* Train Map */}
  <div style={{
    position: "fixed",
    top: 0,
    left: sidePanelOpen ? "480px" : "0px", 
    width: sidePanelOpen ? "calc(100vw - 480px)" : "100vw",
    height: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    paddingLeft: "360px",
    boxSizing: "border-box",
    padding: "20px"
  }}>

    <div style={{ color: "white", fontSize: 40, fontWeight: 500, marginBottom: 4 }}>
      🚆 Kitchener Line
    </div>

    <div style={{ fontSize: 20, color: "#888", marginBottom: 20 }}>
      Time: <strong style={{ color: "white" }}>{simulatedTime?.toLocaleTimeString()}</strong>
    </div>


      <div style={{
        position: "relative", 
        width: "100%", 
        maxWidth: 1000,
        aspectRatio: "1200 / 376"
      }}>

        <img 
          src={kitchenerLine} 
          style={{
            width: "100%", 
            height: "100%", 
            objectFit: "contain",
            position: "absolute",
            top: 0,
            left: 0
        }}/>
              
        {stations.map((station) => (
          <div 
            key={station.name}
            style={{
                position: "absolute",
                left: `${station.x}%`,
                top: `${station.y}%`,
                transform: "translate(-50%, -50%)",
                color: station.name == firstTrainData?.nextStation?.name ? "orange" : "red",
                fontSize: "25px"
              }}>
              ●
            </div>
        ))}

        {activeTripsData.map(t => { 
          const trainData = interpolatePosition(t.stations, simulatedTime);

          return (
            <div 
              key={t.tripId} 
              onMouseEnter={() => setHoveredTripId(t.tripId)}
              onMouseLeave={() => setHoveredTripId(null)}
              style={{
                  position: "absolute",          
                  left: `${trainData.left}%`,
                  top: `${trainData.top}%`,
                  transform: "translate(-50%, -50%)",
                  fontSize: "35px",
                  zIndex: 20,
                  cursor: "pointer"
                }}>
                🚆
                {hoveredTripId === t.tripId && (
                <div
                  style={{
                    position: "absolute",
                    bottom: "35px",
                    left: "50%",
                    transform: "translateX(-50%)",
                    background: "rgba(0,0,0,0.85)",
                    color: "white",
                    padding: "10px 12px",
                    borderRadius: "10px",
                    minWidth: "220px",
                    fontSize: "14px",
                    whiteSpace: "nowrap",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.3)"
                  }}
                >
                  <div style={{fontWeight: "bold", marginBottom: "6px", fontStyle: "italic"}}>
                    🚆 {trainData.firstStation?.name} → {trainData.lastStation?.name}
                  </div>


                  <div style={{marginBottom: 6}}> 
                    <span style={{opacity: 0.6}}> Previous: </span>
                      {trainData.prevStation?.name}
                  </div>

                  <div style={{marginBottom: 6}}> 
                    <span style={{opacity: 0.6}}> Next: </span>
                      {trainData.nextStation?.name}
                  </div>

                  <div style={{marginBottom: 6}}> 
                    <span style={{opacity: 0.6}}> Arrives: </span>
                      {trainData.nextStation?.arrival_time?.toLocaleTimeString([], {hour: "2-digit", minute: "2-digit"})}
                  </div>

                  <div style={{marginBottom: 6}}> 
                    <span style={{opacity: 0.6}}> </span>
                    <strong> {Math.round(trainData.progress * 100)}% </strong> complete
                  </div>

                </div>
              )}
            </div>
        );
      })}
                
      </div>

  </div>

</>
)}

export default TrainLine