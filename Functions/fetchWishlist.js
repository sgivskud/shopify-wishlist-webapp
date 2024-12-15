// functions/fetchWishlist.js

const axios = require('axios');

exports.handler = async (event, context) => {
  try {
    // Ensure the request method is GET
    if (event.httpMethod !== 'GET') {
      return {
        statusCode: 405,
        body: JSON.stringify({ message: 'Method Not Allowed' }),
      };
    }

    // Parse query parameters
    const { customerId } = event.queryStringParameters;

    if (!customerId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Missing customerId parameter' }),
      };
    }

    // Shopify API endpoint to fetch customer metafields
    const url = `https://${process.env.SHOPIFY_STORE_DOMAIN}/admin/api/2024-10/customers/${customerId}/metafields.json`;

    // Make the GET request to Shopify
    const response = await axios.get(url, {
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': process.env.SHOPIFY_ACCESS_TOKEN,
      },
      params: {
        namespace: 'wishlist',
        key: 'favorites',
      },
    });

    const metafields = response.data.metafields;

    if (metafields.length === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({ favorites: [] }),
      };
    }

    // Assuming 'favorites' metafield contains a JSON array of product IDs
    const favorites = JSON.parse(metafields[0].value);

    return {
      statusCode: 200,
      body: JSON.stringify({ favorites }),
    };
  } catch (error) {
    console.error('Error fetching wishlist:', error.response ? error.response.data : error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal Server Error' }),
    };
  }
};