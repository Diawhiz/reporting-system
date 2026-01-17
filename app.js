// Implementing localStorage caching functionality

const cacheData = (key, value) => {
  const data = {
    value,
    timestamp: new Date().getTime()  // Store the time of caching
  };
  localStorage.setItem(key, JSON.stringify(data));
};

const getCachedData = (key) => {
  const data = JSON.parse(localStorage.getItem(key));
  if (!data) return null;

  const now = new Date().getTime();
  // Check if the stored data is still valid (before midnight)
  if (new Date(data.timestamp).setHours(0, 0, 0, 0) > new Date().setHours(0, 0, 0, 0)) {
    return data.value;
  } else {
    // Clear cache if it is past midnight
    localStorage.removeItem(key);
    return null;
  }
};

// Example usage
cacheData('myKey', 'myValue');
const value = getCachedData('myKey');
console.log(value);  // Use the cached value or null if expired
