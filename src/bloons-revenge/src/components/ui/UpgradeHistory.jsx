import React, { useState } from 'react';

const UpgradeHistory = ({ upgrades }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  if (!upgrades || upgrades.length === 0) {
    return null;
  }
  
  return (
    <div className="absolute bottom-24 right-4">
      <button
        className="bg-black bg-opacity-50 text-white p-2 rounded mb-2 flex items-center"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span className="mr-2">Upgrades</span>
        <span>{isExpanded ? '▼' : '▶'}</span>
      </button>
      
      {isExpanded && (
        <div className="bg-black bg-opacity-50 text-white p-3 rounded max-h-60 overflow-y-auto w-64">
          <h3 className="text-sm font-bold mb-2">Upgrade History</h3>
          <ul className="text-xs space-y-2">
            {upgrades.map(upgrade => (
              <li key={upgrade.id} className="flex items-start">
                <span className="mr-2 text-lg">{upgrade.icon}</span>
                <div>
                  <p className="font-bold">{upgrade.name}</p>
                  <p className="text-gray-300">{upgrade.description}</p>
                  <p className="text-xs mt-1">
                    <span className={`px-1 py-0.5 rounded ${upgrade.type === 'permanent' ? 'bg-indigo-500' : 'bg-orange-500'}`}>
                      {upgrade.type === 'permanent' ? 'Permanent' : `Temporary (${upgrade.duration} levels)`}
                    </span>
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default UpgradeHistory;