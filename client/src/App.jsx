import React from 'react';
import {BrowserRouter, Routes, Route} from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Timetable from './pages/Timetable';
import Exams from './pages/Exams';
import Schedule from './pages/Schedule';
import Chat from './pages/Chat';

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Layout />}>
                    <Route index element={<Dashboard />} />
                    <Route path="timetable" element={<Timetable />} />
                    <Route path="exams" element={<Exams />} />
                    <Route path="schedule" element={<Schedule />} />
                    <Route path="chat" element={<Chat />} />
                </Route>
            </Routes>
        </BrowserRouter>
    );
}

export default App;
