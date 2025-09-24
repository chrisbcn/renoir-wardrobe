// import React, { useState } from 'react';
import './App.css';

function App() {
  const [wardrobe, setWardrobe] = useState([]);
  const [testMessage, setTestMessage] = useState('App is loading...');

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Renoir - Test Mode</h1>
          <p className="text-gray-600">{testMessage}</p>
          <button 
            onClick={() => setTestMessage('Button clicked!')}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
          >
            Test Button
          </button>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <p>Wardrobe items: {wardrobe.length}</p>
        </div>
      </div>
    </div>
  );
}

export default App;