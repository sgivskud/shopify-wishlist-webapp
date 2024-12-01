const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { customerId, productId, action } = JSON.parse(event.body);

    // Validate input
    if (!customerId || !productId || !['add', 'remove'].includes(action)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, message: 'Invalid input.' }),
      };
    }

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

    let response = await fetch(adminApiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query }),
    });

    let result = await response.json();
    let wishlist = [];

    if (result.data.customer.metafield) {
      wishlist = JSON.parse(result.data.customer.metafield.value);
    }

    // Update wishlist
    if (action === 'add' && !wishlist.includes(productId)) {
      wishlist.push(productId);
    } else if (action === 'remove') {
      wishlist = wishlist.filter((id) => id !== productId);
    }

    // Update metafield
    const mutation = `
      mutation {
        customerUpdate(input: {
          id: "gid://shopify/Customer/${customerId}",
          metafields: [
            {
              namespace: "favorites",
              key: "favorite_products",
              type: "json",
              value: "${JSON.stringify(wishlist).replace(/"/g, '\\"')}"
            }
          ]
        }) {
          userErrors {
            field
            message
          }
        }
      }
    `;

    response = await fetch(adminApiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query: mutation }),
    });

    result = await response.json();

    if (result.data.customerUpdate.userErrors.length > 0) {
      throw new Error(result.data.customerUpdate.userErrors[0].message);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true }),
    };
  } catch (error) {
    console.error('Error updating wishlist:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: error.message }),
    };
  }
};
