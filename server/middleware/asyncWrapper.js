const asyncWrapper = (fn) => {
     return async (req, res, next) => {
          try {
               await fn(req, res, next);
          } catch (error) {
               // Pass error to next middleware
               next(error);
          }
     };
};

module.exports = asyncWrapper;