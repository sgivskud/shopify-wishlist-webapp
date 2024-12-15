// functions/updateWishlist.js

const axios = require('axios');

exports.handler = async (event, context) => {
  try {
    // Ensure the request method is POST
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        body: JSON.stringify({ message: 'Method Not Allowed' }),
      };
    }

    // Parse the request body
    const { customerId, productId } = JSON.parse(event.body);

    if (!customerId || !productId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Missing customerId or productId in request body' }),
      };
    }

    // Step 1: Fetch existing wishlist
    const getUrl = `https://${process.env.SHOPIFY_STORE_DOMAIN}/admin/api/2024-10/customers/${customerId}/metafields.json`;

    const getResponse = await axios.get(getUrl, {
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': process.env.SHOPIFY_ACCESS_TOKEN,
      },
      params: {
        namespace: 'wishlist',
        key: 'favorites',
      },
    });

    let favorites = [];

    if (getResponse.data.metafields.length > 0) {
      favorites = JSON.parse(getResponse.data.metafields[0].value);
    }

    // Step 2: Update the wishlist
    if (!favorites.includes(productId)) {
      favorites.push(productId);
    } else {
      // If product already liked, remove it (toggle behavior)
      favorites = favorites.filter(id => id !== productId);
    }

    // Step 3: Update or Create metafield
    if (getResponse.data.metafields.length > 0) {
      // Update existing metafield
      const metafieldId = getResponse.data.metafields[0].id;
      const updateUrl = `https://${process.env.SHOPIFY_STORE_DOMAIN}/admin/api/2024-10/metafields/${metafieldId}.json`;

      await axios.put(
        updateUrl,
        {
          metafield: {
            id: metafieldId,
            value: JSON.stringify(favorites),
            value_type: 'json',
          },
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Access-Token': process.env.SHOPIFY_ACCESS_TOKEN,
          },
        }
      );
    } else {
      // Create new metafield
      const createUrl = `https://${process.env.SHOPIFY_STORE_DOMAIN}/admin/api/2024-10/customers/${customerId}/metafields.json`;

      await axios.post(
        createUrl,
        {
          metafield: {
            namespace: 'wishlist',
            key: 'favorites',
            value: JSON.stringify(favorites),
            type: 'json',
          },
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Access-Token': process.env.SHOPIFY_ACCESS_TOKEN,
          },
        }
      );
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ favorites }),
    };
  } catch (error) {
    console.error('Error updating wishlist:', error.response ? error.response.data : error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal Server Error' }),
    };
  }
};