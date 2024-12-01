const axios = require('axios');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*', // Replace with your Shopify store's domain
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ success: false, message: 'Method Not Allowed' }),
    };
  }

  try {
    const { customerId, productId, action } = JSON.parse(event.body);

    if (!customerId || !productId || !['add', 'remove'].includes(action)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, message: 'Invalid input.' }),
      };
    }

    // Example: Axios request to a Shopify API endpoint
    const shopifyApiUrl = `https://${process.env.SHOPIFY_SHOP_DOMAIN}/admin/api/2023-10/graphql.json`;

    const payload = {
      query: `
        mutation {
          customerUpdate(input: {
            id: "gid://shopify/Customer/${customerId}",
            metafields: [
              {
                namespace: "favorites",
                key: "favorite_products",
                type: "json",
                value: "[${productId}]"
              }
            ]
          }) {
            customer {
              id
            }
            userErrors {
              field
              message
            }
          }
        }
      `,
    };

    const response = await axios.post(shopifyApiUrl, payload, {
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': process.env.SHOPIFY_ADMIN_API_ACCESS_TOKEN,
      },
    });

    if (response.data.errors || response.data.data.customerUpdate.userErrors.length > 0) {
      throw new Error(response.data.errors || response.data.data.customerUpdate.userErrors[0].message);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `Action '${action}' performed for product ID ${productId}.`,
      }),
    };
  } catch (error) {
    console.error('Error in updateWishlist:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, message: error.message }),
    };
  }
};
