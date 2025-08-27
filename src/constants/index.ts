////////////////////////////////////////////////////////////////////////////////
//#region HTTP Status Code
////////////////////////////////////////////////////////////////////////////////

export const HTTP_NOT_FOUND = 404;
export const HTTP_BAD_REQUEST = 400;
export const HTTP_UNAUTHORIZED = 401;
export const HTTP_FORBIDDEN = 403;
export const HTTP_METHOD_NOT_ALLOWED = 405;
export const HTTP_INTERNAL_SERVER_ERROR = 500;
export const HTTP_SERVICE_NOT_AVAILABLE = 503;
export const HTTP_NOT_ACCEPTABLE = 406;
export const NETWORK_ERROR_CODE = [
    "ENOTFOUND", // DNS lookup failed
    "ETIMEDOUT", // Connection timed out
    "ECONNABORTED", // Connection timed out
    "ECONNREFUSED", // Connection refused by server
    "ENETUNREACH", // Network unreachable
    "ECONNRESET", // Connection reset by peer
    "EHOSTUNREACH", // No route to host
    "EHOSTDOWN", // Host is down
    "ENETDOWN", // Network is down
];
export const OFFLINE_ERROR_CODE = 600;

//endregion

export const EMPTY_OBJECT = Object.freeze({});
export const EMPTY_ARRAY = Object.freeze([]);
