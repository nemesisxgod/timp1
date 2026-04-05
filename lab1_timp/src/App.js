import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import axios from "axios";
import Home from "./pages/Home";
import Detail from "./pages/Detail";
import Form from "./pages/Form";

function App() {
  const [events, setEvents] = useState([]);
  const [cameras, setCameras] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError("");
      try {
        const [eventsResponse, camerasResponse] = await Promise.all([
          axios.get("http://localhost:5000/events"),
          axios.get("http://localhost:5000/cameras"),
        ]);
        setEvents(eventsResponse.data);
        setCameras(camerasResponse.data);
      } catch {
        setError("Не удалось загрузить данные.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={
            <Home
              events={events}
              setEvents={setEvents}
              cameras={cameras}
              setCameras={setCameras}
              isLoading={isLoading}
              error={error}
              setError={setError}
            />
          }
        />
        <Route
          path="/detail/:entity/:id"
          element={
            <Detail
              events={events}
              setEvents={setEvents}
              cameras={cameras}
              setCameras={setCameras}
            />
          }
        />
        <Route
          path="/detail/:id"
          element={
            <Detail
              events={events}
              setEvents={setEvents}
              cameras={cameras}
              setCameras={setCameras}
            />
          }
        />
        <Route
          path="/add"
          element={<Form setEvents={setEvents} setCameras={setCameras} />}
        />
      </Routes>
    </Router>
  );
}

export default App;
