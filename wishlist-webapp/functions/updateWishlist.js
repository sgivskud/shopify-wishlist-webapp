exports.handler = async (event, context) => {
  // Add CORS headers to allow requests from your Shopify store
  const headers = {
    'Access-Control-Allow-Origin': '276958-a8.myshopify.com', // Replace with your Shopify store's domain
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

    // Perform your server-side logic (e.g., updating Shopify metafields)
    const message = `Action '${action}' performed for product ID ${productId}.`;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, message }),
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
