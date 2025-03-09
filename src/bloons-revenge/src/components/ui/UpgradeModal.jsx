import React from 'react';

const UpgradeModal = ({ upgrades, onSelect, level }) => {
  // Determine tier based on level
  let tierName = "Early Game";
  let tierColor = "bg-green-500";
  
  if (level > 5 && level <= 10) {
    tierName = "Mid Game";
    tierColor = "bg-blue-500";
  } else if (level > 10 && level <= 15) {
    tierName = "Late Game";
    tierColor = "bg-purple-500";
  } else if (level > 15) {
    tierName = "End Game";
    tierColor = "bg-red-500";
  }
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full p-6 shadow-2xl">
        <div className={`${tierColor} text-white text-center py-2 rounded-t-lg -mt-6 -mx-6 mb-4`}>
          <h2 className="text-2xl font-bold">{tierName} Upgrades</h2>
          <p className="text-sm">Select one upgrade to enhance your bloons</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {upgrades.map(upgrade => (
            <div 
              key={upgrade.id}
              className="border rounded-lg p-4 hover:shadow-lg transition-shadow cursor-pointer hover:bg-gray-50"
              onClick={() => onSelect(upgrade)}
            >
              <div className="flex items-center mb-2">
                <span className="text-2xl mr-2">{upgrade.icon}</span>
                <h3 className="text-lg font-bold">{upgrade.name}</h3>
              </div>
              
              <p className="text-gray-700 mb-3">{upgrade.description}</p>
              
              <div className="flex justify-between items-center">
                <span className={`px-2 py-1 rounded text-xs text-white ${upgrade.type === 'permanent' ? 'bg-indigo-500' : 'bg-orange-500'}`}>
                  {upgrade.type === 'permanent' ? 'Permanent' : `Temporary (${upgrade.duration} levels)`}
                </span>
                <button 
                  className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(upgrade);
                  }}
                >
                  Select
                </button>
              </div>
            </div>
          ))}
        </div>
        
        <div className="text-center text-gray-500 text-sm">
          <p>Perfect clear bonus! Choose carefully - this will affect your strategy.</p>
        </div>
      </div>
    </div>
  );
};

export default UpgradeModal;