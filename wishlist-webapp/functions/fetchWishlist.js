const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const customerId = event.queryStringParameters.customerId;

  if (!customerId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ success: false, message: 'Missing customerId.' }),
    };
  }

  try {
    const adminApiUrl = `https://${process.env.SHOPIFY_SHOP_DOMAIN}/admin/api/2023-10/graphql.json`;
    const headers = {
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
      headers,
      body: JSON.stringify({ query }),
    });

    const result = await response.json();
    let wishlist = [];

    if (result.data.customer.metafield) {
      wishlist = JSON.parse(result.data.customer.metafield.value);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, wishlist }),
    };
  } catch (error) {
    console.error('Error fetching wishlist:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: error.message }),
    };
  }
};
