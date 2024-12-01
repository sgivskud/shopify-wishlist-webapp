const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  const headers = {
    'Content-Type': 'application/json',
    // Replace 'https://www.yourshopifydomain.com' with your actual domain
    'Access-Control-Allow-Origin': 'https://www.brunodesign.dk',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    // Handle CORS preflight request
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers, body: 'Method Not Allowed' };
  }

  const customerId = event.queryStringParameters.customerId;

  if (!customerId) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ success: false, message: 'Missing customerId.' }),
    };
  }

  try {
    const adminApiUrl = `https://${process.env.SHOPIFY_SHOP_DOMAIN}/admin/api/2023-10/graphql.json`;
    const apiHeaders = {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': process.env.SHOPIFY_ADMIN_API_ACCESS_TOKEN,
    };

    // Fetch current wishlist
    const query = `
      {
        customer(id: "gid://shopify/Customer/${customerId}") {
          metafield(namespace: "favorites", key: "favorite_products") {
            value
          }
        }
      }
    `;

    const response = await fetch(adminApiUrl, {
      method: 'POST',
      headers: apiHeaders,
      body: JSON.stringify({ query }),
    });

    const result = await response.json();
    let wishlist = [];

    if (result.data.customer && result.data.customer.metafield) {
      wishlist = JSON.parse(result.data.customer.metafield.value);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, wishlist }),
    };
  } catch (error) {
    console.error('Error fetching wishlist:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message }),
    };
  }
};
