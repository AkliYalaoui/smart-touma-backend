const convertTimestampToDateString = (timestamp) => {
  // Extract seconds and nanoseconds
  const seconds = timestamp._seconds;
  const nanoseconds = timestamp._nanoseconds;

  const date = new Date(seconds * 1000 + nanoseconds / 1000000);

  return date.toISOString();
};

module.exports = { convertTimestampToDateString };
