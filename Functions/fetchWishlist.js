export const handler = async (event) => {
  try {
    const { customer_id } = event.queryStringParameters || {};
    if (!customer_id) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing customer_id parameter' })
      };
    }

    // 1. Search for the metaobject instance
    const searchUrl = `https://${SHOPIFY_STORE_NAME}.dk/admin/api/${API_VERSION}/metaobjects/${METAOBJECT_TYPE}/instances.json?filter[product-mapping]=${encodeURIComponent(customer_id)}`;

    const searchResponse = await fetch(searchUrl, {
      headers: {
        'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
        'Content-Type': 'application/json'
      }
    });

    if (!searchResponse.ok) {
      // NOW we can use 'await' because we're inside an async function
      const errorText = await searchResponse.text();
      console.error('Shopify error:', errorText);

      return {
        statusCode: searchResponse.status,
        body: JSON.stringify({ error: 'Error searching metaobject instances' })
      };
    }

    const searchData = await searchResponse.json();
    let instance = searchData.metaobjects && searchData.metaobjects[0];

    if (!instance) {
      // No entry found, create a new one
      const createUrl = `https://${SHOPIFY_STORE_NAME}.dk/admin/api/${API_VERSION}/metaobjects/${METAOBJECT_TYPE}/instances.json`;
      const createPayload = {
        metaobject: {
          type: METAOBJECT_TYPE,
          fields: {
            'product-mapping': { value: customer_id },
            'favorites': { value: JSON.stringify([]) }
          }
        }
      };

      const createResponse = await fetch(createUrl, {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(createPayload)
      });

      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        console.error('Shopify error (create):', errorText);

        return {
          statusCode: createResponse.status,
          body: JSON.stringify({ error: 'Error creating new metaobject instance' })
        };
      }

      const createdData = await createResponse.json();
      instance = createdData.metaobject;
    }

    // Parse favorites JSON
    const favoritesField = instance.fields.find(f => f.key === 'favorites');
    let favorites = [];
    if (favoritesField && favoritesField.value) {
      favorites = JSON.parse(favoritesField.value);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ customer_id, favorites })
    };

  } catch (err) {
    console.error('Error fetching wishlist:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error', details: err.message })
    };
  }
};
