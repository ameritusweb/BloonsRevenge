class GameEvents {
    constructor() {
      this.listeners = {};
    }
  
    on(event, callback) {
      if (!this.listeners[event]) {
        this.listeners[event] = [];
      }
      this.listeners[event].push(callback);
    }
  
    off(event, callback) {
      if (!this.listeners[event]) return;
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }
  
    emit(event, data) {
      if (!this.listeners[event]) return;
      this.listeners[event].forEach(callback => callback(data));
    }

    // Helper method to remove all listeners for testing/cleanup
    removeAllListeners() {
      this.listeners = {};
    }

    // Helper method to get listener count for debugging
    getListenerCount(event) {
      return this.listeners[event]?.length || 0;
    }
  }
  
  export default GameEvents;