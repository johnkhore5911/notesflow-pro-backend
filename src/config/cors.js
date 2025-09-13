// const corsOptions = {
//   origin: function (origin, callback) {
//     // Allow requests with no origin (like mobile apps or curl requests)
//     if (!origin) return callback(null, true);
    
//     const allowedOrigins = process.env.NODE_ENV === 'production'
//       ? [
//           process.env.FRONTEND_URL,
//           'https://your-frontend-domain.vercel.app',
//           /\.vercel\.app$/, // Allow all Vercel subdomains
//         ]
//       : [
//           'http://localhost:3000',
//           'http://127.0.0.1:3000',
//           'http://localhost:3001',
//           'http://127.0.0.1:3001'
//         ];

//     // Check if origin is allowed
//     const isAllowed = allowedOrigins.some(allowedOrigin => {
//       if (typeof allowedOrigin === 'string') {
//         return allowedOrigin === origin;
//       }
//       if (allowedOrigin instanceof RegExp) {
//         return allowedOrigin.test(origin);
//       }
//       return false;
//     });

//     if (isAllowed) {
//       callback(null, true);
//     } else {
//       callback(new Error(`Origin ${origin} not allowed by CORS policy`));
//     }
//   },
//   methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
//   allowedHeaders: [
//     'Content-Type',
//     'Authorization',
//     'X-Requested-With',
//     'Accept',
//     'Origin',
//     'Cache-Control',
//     'X-File-Name'
//   ],
//   credentials: true,
//   maxAge: 86400, // 24 hours
//   optionsSuccessStatus: 200 // For legacy browser support
// };

// module.exports = corsOptions;

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = process.env.NODE_ENV === 'production'
      ? [
          process.env.FRONTEND_URL,
          'https://notesflow-pro.vercel.app', // Your actual frontend URL
          'https://notesflow-pro-backend.vercel.app', // Your backend URL (for testing)
          /\.vercel\.app$/, // Allow all Vercel subdomains
        ]
      : [
          'http://localhost:3000',
          'http://127.0.0.1:3000',
          'http://localhost:3001',
          'http://127.0.0.1:3001'
        ];

    console.log('CORS Check - Origin:', origin); // Debug log
    console.log('CORS Check - Allowed Origins:', allowedOrigins); // Debug log

    // Check if origin is allowed
    const isAllowed = allowedOrigins.some(allowedOrigin => {
      if (typeof allowedOrigin === 'string') {
        return allowedOrigin === origin;
      }
      if (allowedOrigin instanceof RegExp) {
        return allowedOrigin.test(origin);
      }
      return false;
    });

    console.log('CORS Check - Is Allowed:', isAllowed); // Debug log

    if (isAllowed) {
      callback(null, true);
    } else {
      console.error(`CORS Error: Origin ${origin} not allowed`); // Debug log
      callback(new Error(`Origin ${origin} not allowed by CORS policy`));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Cache-Control',
    'X-File-Name'
  ],
  credentials: true,
  maxAge: 86400, // 24 hours
  optionsSuccessStatus: 200 // For legacy browser support
};

module.exports = corsOptions;
