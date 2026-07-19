const buildHeaders = () => ({
  "access-control-allow-origin": process.env.CORS_ORIGIN || "*",
  "access-control-allow-headers": "content-type,authorization",
  "access-control-allow-methods": "GET,POST,OPTIONS",
  "content-type": "application/json",
});

const json = (statusCode, body) => ({
  statusCode,
  headers: buildHeaders(),
  body: JSON.stringify(body),
});

const parseJsonBody = (event) => {
  if (!event.body) {
    return {};
  }

  try {
    return JSON.parse(event.body);
  } catch {
    const error = new Error("Request body must be valid JSON.");
    error.statusCode = 400;
    throw error;
  }
};

const getErrorResponse = (error) => {
  const statusCode = error.statusCode || 500;
  const message = statusCode === 500 ? "Internal server error." : error.message;

  return json(statusCode, {
    error: {
      message,
    },
  });
};

module.exports = {
  getErrorResponse,
  json,
  parseJsonBody,
};
