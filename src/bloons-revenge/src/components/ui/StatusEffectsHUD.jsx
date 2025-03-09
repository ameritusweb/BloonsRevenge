import React from 'react';

const StatusEffectsHUD = ({ activeModifiers, notifications }) => {
  return (
    <div className="absolute top-4 right-4 flex flex-col items-end">
      {/* Active modifiers */}
      <div className="bg-black bg-opacity-50 text-white p-2 rounded mb-2 max-w-xs">
        <h3 className="text-sm font-bold mb-1">Active Effects</h3>
        {Object.keys(activeModifiers).length === 0 ? (
          <p className="text-xs text-gray-300">No active modifiers</p>
        ) : (
          <ul className="text-xs">
            {Object.entries(activeModifiers).map(([key, modifier]) => (
              <li key={key} className="flex items-center mb-1 last:mb-0">
                <span className="mr-1">{modifier.icon}</span>
                <span>{modifier.name}</span>
                {modifier.duration && (
                  <span className="ml-auto text-gray-300">{modifier.duration} {modifier.duration === 1 ? 'level' : 'levels'}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
      
      {/* Notifications */}
      <div className="flex flex-col items-end space-y-2">
        {notifications.slice(-3).map(notification => (
          <div 
            key={notification.id}
            className="bg-black bg-opacity-75 text-white px-3 py-1 rounded-full text-sm animate-fade-out"
          >
            {notification.message}
          </div>
        ))}
      </div>
    </div>
  );
};

export default StatusEffectsHUD;