const cors = require('cors');

const corsOptions = {
  origin: 'https://cadenza.com.hr', // Your frontend URL
  credentials: true, // Allow credentials (cookies)
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions)); 