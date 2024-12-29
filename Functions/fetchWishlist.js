// functions/fetchWishlist.js

const SHOPIFY_STORE_NAME = process.env.SHOPIFY_STORE_NAME;       
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;   
const API_VERSION = process.env.API_VERSION;                     
const METAOBJECT_TYPE = process.env.METAOBJECT_TYPE;            

export const handler = async (event) => {
  try {
    // 1. Make sure environment variables exist
    if (!SHOPIFY_STORE_NAME || !SHOPIFY_ACCESS_TOKEN || !API_VERSION || !METAOBJECT_TYPE) {
      throw new Error(
        `One or more required environment variables are missing:
        SHOPIFY_STORE_NAME: ${SHOPIFY_STORE_NAME}
        SHOPIFY_ACCESS_TOKEN: ${SHOPIFY_ACCESS_TOKEN ? 'DEFINED' : 'UNDEFINED'}
        API_VERSION: ${API_VERSION}
        METAOBJECT_TYPE: ${METAOBJECT_TYPE}`
      );
    }

    // 2. Parse query parameters
    const { customer_id } = event.queryStringParameters || {};
    if (!customer_id) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing customer_id parameter' })
      };
    }

    // 3. Search for the metaobject instance
    //    NOTE: If your domain is "<store>.myshopify.com", replace ".dk" below with ".myshopify.com"
    const searchUrl = `https://${SHOPIFY_STORE_NAME}.dk/admin/api/${API_VERSION}/metaobjects/${METAOBJECT_TYPE}/instances.json?filter[product-mapping]=${encodeURIComponent(customer_id)}`;

    const searchResponse = await fetch(searchUrl, {
      headers: {
        'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
        'Content-Type': 'application/json'
      }
    });

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      console.error('Shopify error (search):', errorText);
      return {
        statusCode: searchResponse.status,
        body: JSON.stringify({ error: 'Error searching metaobject instances' })
      };
    }

    // 4. Extract the first metaobject instance if available
    const searchData = await searchResponse.json();
    let instance = searchData.metaobjects && searchData.metaobjects[0];

    // 5. If no instance found, create a new one
    if (!instance) {
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

    // 6. Extract the favorites array from the instance fields
    const favoritesField = instance.fields.find(f => f.key === 'favorites');
    let favorites = [];
    if (favoritesField && favoritesField.value) {
      favorites = JSON.parse(favoritesField.value);
    }

    // 7. Return the final result
    return {
      statusCode: 200,
      body: JSON.stringify({ customer_id, favorites })
    };

  } catch (err) {
    console.error('Error fetching wishlist:', err.message);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Internal server error',
        details: err.message
      })
    };
  }
};
