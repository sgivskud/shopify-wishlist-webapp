const axios = require('axios');

const SHOPIFY_STORE_NAME = process.env.SHOPIFY_STORE_NAME;
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;
const API_VERSION = process.env.API_VERSION;
const METAOBJECT_TYPE = process.env.METAOBJECT_TYPE;

export const handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST' && event.httpMethod !== 'PUT') {
      return {
        statusCode: 405,
        body: JSON.stringify({ error: 'Method not allowed' })
      };
    }

    const data = JSON.parse(event.body || '{}');
    const { customer_id, action, product_id } = data;

    if (!customer_id || !action || !product_id) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields: customer_id, action, product_id' })
      };
    }

    // 1. Find the metaobject instance
    const searchUrl = `https://${SHOPIFY_STORE_NAME}.myshopify.com/admin/api/${API_VERSION}/metaobjects/${METAOBJECT_TYPE}/instances.json?filter[product-mapping]=${encodeURIComponent(customer_id)}`;
    const searchResponse = await fetch(searchUrl, {
      headers: {
        'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
        'Content-Type': 'application/json'
      }
    });

    if (!searchResponse.ok) {
      return {
        statusCode: searchResponse.status,
        body: JSON.stringify({ error: 'Error searching metaobject instance' })
      };
    }

    const searchData = await searchResponse.json();
    let instance = searchData.metaobjects && searchData.metaobjects[0];

    // If no instance found, create a new one
    if (!instance) {
      const createUrl = `https://${SHOPIFY_STORE_NAME}.myshopify.com/admin/api/${API_VERSION}/metaobjects/${METAOBJECT_TYPE}/instances.json`;
      const createPayload = {
        metaobject: {
          type: METAOBJECT_TYPE,
          fields: {
            "product-mapping": { value: customer_id },
            "favorites": { value: JSON.stringify([]) }
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
        return {
          statusCode: createResponse.status,
          body: JSON.stringify({ error: 'Error creating new metaobject instance' })
        };
      }

      const createdData = await createResponse.json();
      instance = createdData.metaobject;
    }

    // Extract current favorites
    const favoritesField = instance.fields.find(f => f.key === 'favorites');
    let favorites = [];
    if (favoritesField && favoritesField.value) {
      favorites = JSON.parse(favoritesField.value);
    }

    // Update favorites
    const productIdInt = parseInt(product_id, 10);
    if (action === 'add') {
      if (!favorites.includes(productIdInt)) {
        favorites.push(productIdInt);
      }
    } else if (action === 'remove') {
      favorites = favorites.filter(id => id !== productIdInt);
    } else {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid action' })
      };
    }

    // Update the instance
    const updateUrl = `https://${SHOPIFY_STORE_NAME}.myshopify.com/admin/api/${API_VERSION}/metaobjects/${METAOBJECT_TYPE}/instances/${instance.id}.json`;
    const updatePayload = {
      metaobject: {
        id: instance.id,
        type: METAOBJECT_TYPE,
        fields: {
          "product-mapping": { value: customer_id },
          "favorites": { value: JSON.stringify(favorites) }
        }
      }
    };

    const updateResponse = await fetch(updateUrl, {
      method: 'PUT',
      headers: {
        'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updatePayload)
    });

    if (!updateResponse.ok) {
      return {
        statusCode: updateResponse.status,
        body: JSON.stringify({ error: 'Error updating metaobject instance' })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ customer_id, favorites })
    };

  } catch (err) {
    console.error('Error updating wishlist:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error', details: err.message })
    };
  }
};
