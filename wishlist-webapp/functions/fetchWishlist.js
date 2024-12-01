import { Context } from "@netlify/functions";

export default async (req, context) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*", // Your Shopify store domain
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  if (req.method !== "GET") {
    return new Response(JSON.stringify({ message: "Method Not Allowed" }), {
      status: 405,
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  const customerId = new URL(req.url).searchParams.get("customerId");
  if (!customerId) {
    return new Response(
      JSON.stringify({ message: "Missing customerId" }),
      {
        status: 400,
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }

  try {
    const adminApiUrl = `https://${process.env.SHOPIFY_SHOP_DOMAIN}/admin/api/2023-10/graphql.json`;

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
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": process.env.SHOPIFY_ADMIN_API_ACCESS_TOKEN,
      },
      body: JSON.stringify({ query }),
    });

    const result = await response.json();
    let wishlist = [];

    if (result.data.customer && result.data.customer.metafield) {
      wishlist = JSON.parse(result.data.customer.metafield.value);
    }

    return new Response(JSON.stringify({ success: true, wishlist }), {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("Error fetching wishlist:", error);
    console.error("Detailed Error:", error);
    return new Response(
      JSON.stringify({ message: "Internal Server Error" }),
      {
        status: 500,
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
};
