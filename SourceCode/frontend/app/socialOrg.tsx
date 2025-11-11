import React, { useState } from "react";

'use client';


export default function EventFeed() {
    const [selectedDay, setSelectedDay] = useState('Monday');
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('events');

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    return (
        <div className="flex flex-col h-screen bg-gray-50">
            <div className="bg-white border-b border-gray-200 p-4 flex gap-3">
                <input
                    type="text"
                    placeholder="Search events..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <select
                    value={selectedDay}
                    onChange={(e) => setSelectedDay(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    {days.map((day) => (
                        <option key={day} value={day}>{day}</option>
                    ))}
                </select>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-4">
                    <div className="bg-white p-4 rounded-lg shadow">Event item</div>
                </div>
            </div>

            <div className="bg-white border-t border-gray-200 flex gap-2 p-4">
                <button
                    onClick={() => setActiveTab('events')}
                    className={`flex-1 py-2 rounded-lg font-medium ${
                        activeTab === 'events' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'
                    }`}
                >
                    Events
                </button>
                <button
                    onClick={() => setActiveTab('tickets')}
                    className={`flex-1 py-2 rounded-lg font-medium ${
                        activeTab === 'tickets' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'
                    }`}
                >
                    My Tickets
                </button>
                <button
                    onClick={() => setActiveTab('social')}
                    className={`flex-1 py-2 rounded-lg font-medium ${
                        activeTab === 'social' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'
                    }`}
                >
                    Social
                </button>
            </div>
        </div>
    );
}