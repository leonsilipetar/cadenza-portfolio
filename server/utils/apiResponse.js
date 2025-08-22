const apiResponse = {
  success: (res, data, message = 'Success', code = 200) => {
    return res.status(code).json({
      success: true,
      message,
      data,
      timestamp: new Date().toISOString()
    });
  },
  error: (res, message = 'Error', code = 500, errors = null) => {
    return res.status(code).json({
      success: false,
      message,
      errors,
      timestamp: new Date().toISOString(),
      path: res.req.originalUrl
    });
  },
  pagination: (res, data, page, limit, total) => {
    return res.status(200).json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  }
}; 