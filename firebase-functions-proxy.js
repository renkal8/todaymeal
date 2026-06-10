/**
 * Firebase Cloud Functions (v2) Proxy Server for FatSecret API
 * 
 * This proxy handles server-to-server OAuth 2.0 token caching and API requests,
 * allowing mobile/smart-phone clients to bypass FatSecret's strict IP restrictions.
 * 
 * - Handles Client Credentials Grant flow.
 * - Caches tokens in-memory for performance.
 * - Proxies barcode lookup & food search.
 * 
 * Requirements:
 * - Runtime: Node.js 18 or above (Native Fetch is supported)
 * - Required Packages in functions/package.json: "firebase-functions": "^5.0.0" (or v2 compatible)
 */

const { onRequest } = require("firebase-functions/v2/https");
const { logger } = require("firebase-functions");

const FATSECRET_TOKEN_URL = "https://oauth.fatsecret.com/connect/token";
const FATSECRET_API_URL = "https://platform.fatsecret.com/rest/server.api";

// Warm instance cache for the FatSecret OAuth2 token
let cachedToken = null;
let tokenExpiryTime = 0;

/**
 * Robust server-side function to retrieve/refresh the access token
 */
async function getFatSecretToken(clientId, clientSecret) {
  if (cachedToken && Date.now() < tokenExpiryTime) {
    return cachedToken;
  }

  logger.info("Token expired or missing. Fetching fresh FatSecret OAuth2 token...");
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  
  const response = await fetch(FATSECRET_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials&scope=basic'
  });

  if (!response.ok) {
    const errText = await response.text();
    cachedToken = null;
    throw new Error(`Failed to obtain token from FatSecret: ${response.status} ${errText}`);
  }

  const data = await response.json();
  cachedToken = data.access_token;
  // Cache expires 5 minutes (300s) early to prevent edge cases
  tokenExpiryTime = Date.now() + (data.expires_in - 300) * 1000;
  
  return cachedToken;
}

/**
 * Cloud Function HTTPS request handler
 * URL structure: https://<your-region>-<your-project>.cloudfunctions.net/fatSecretProxy?action=...
 */
exports.fatSecretProxy = onRequest({ cors: true }, async (req, res) => {
  try {
    // 1. Get FatSecret credentials from environment variables
    const clientId = (process.env.FATSECRET_CLIENT_ID || "").trim();
    const clientSecret = (process.env.FATSECRET_CLIENT_SECRET || "").trim();

    if (!clientId || !clientSecret) {
      logger.error("FatSecret Client ID or Client Secret not set in Cloud Functions config.");
      return res.status(500).json({
        error: "ConfigError",
        message: "FatSecret API credentials are not set on the cloud server. Please configure FATSECRET_CLIENT_ID and FATSECRET_CLIENT_SECRET environment variables in Cloud Functions."
      });
    }

    const action = req.query.action || req.body.action;

    // --- CASE A: BARCODE LOOKUP ---
    if (action === "barcode") {
      const barcode = req.query.barcode || req.body.barcode;
      if (!barcode) {
        return res.status(400).json({ error: "Missing barcode parameter" });
      }

      logger.info(`Proxying barcode search for: ${barcode}`);
      const token = await getFatSecretToken(clientId, clientSecret);
      
      // Step 1: Retrieve food ID linked to the barcode
      const searchUrl = `${FATSECRET_API_URL}?method=food.find_id_for_barcode&barcode=${encodeURIComponent(barcode)}&format=json`;
      const searchRes = await fetch(searchUrl, {
        method: "GET",
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!searchRes.ok) {
        logger.error(`FatSecret barcode lookup returned error state: ${searchRes.status}`);
        return res.status(searchRes.status).json({ error: `FatSecret lookup failed: ${searchRes.status}` });
      }

      const data = await searchRes.json();
      
      // Step 2: If found, fetch complete food details in Korean (KR region)
      if (data && data.food_id && data.food_id.value) {
        const foodId = data.food_id.value;
        const getUrl = `${FATSECRET_API_URL}?method=food.get.v3&food_id=${foodId}&format=json&region=KR&language=ko`;
        const getRes = await fetch(getUrl, {
          method: "GET",
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (getRes.ok) {
          const getData = await getRes.json();
          return res.json(getData);
        }
      }
      return res.json(data);
    }

    // --- CASE B: FOOD ADVANCED SEARCH ---
    else if (action === "search") {
      const q = req.query.q || req.body.q;
      if (!q) {
        return res.status(400).json({ error: "Missing 'q' (query) parameter" });
      }

      logger.info(`Proxying food search for: "${q}"`);
      const token = await getFatSecretToken(clientId, clientSecret);
      
      const searchUrl = `${FATSECRET_API_URL}?method=foods.search&search_expression=${encodeURIComponent(q)}&format=json`;
      const response = await fetch(searchUrl, {
        method: "GET",
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        logger.error(`FatSecret search returned error: ${response.status}`);
        return res.status(response.status).json({ error: `FatSecret search returned status ${response.status}` });
      }

      const data = await response.json();
      return res.json(data);
    }

    // --- CASE C: UNKNOWN ACTION ---
    else {
      return res.status(400).json({
        error: "InvalidAction",
        message: "Specify parameter 'action' as 'barcode' or 'search'."
      });
    }

  } catch (err) {
    logger.error("Uncaught Server Error in Proxy Function:", err);
    return res.status(500).json({
      error: "InternalServerError",
      message: err.message
    });
  }
});
