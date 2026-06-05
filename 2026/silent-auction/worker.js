/**
 * Cloudflare Worker for Silent Auction
 * Requirements: 
 * - A D1 database binding named `DB`
 * - An environment variable named `ADMIN_SECRET` (for the admin page)
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export default {
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      if (request.method === 'GET' && path === '/api/auction-state') {
        // Fetch all items and their highest bids
        const query = `
          SELECT 
            i.id, i.original_name, i.creative_name as name, i.dimensions, i.image_url, i.starting_bid,
            i.title_placeholder, i.desc_placeholder,
            b.amount as current_bid, b.first_name, b.last_name
          FROM items i
          LEFT JOIN (
            SELECT item_id, MAX(amount) as max_amount
            FROM bids
            GROUP BY item_id
          ) max_bids ON i.id = max_bids.item_id
          LEFT JOIN bids b ON b.item_id = max_bids.item_id AND b.amount = max_bids.max_amount
          GROUP BY i.id
        `;
        
        const { results } = await env.DB.prepare(query).all();
        
        // Format the results to mask the last name
        const formattedResults = results.map(item => {
          let bidder = null;
          if (item.current_bid) {
            bidder = `${item.first_name} ${item.last_name ? item.last_name.charAt(0) + '.' : ''}`;
          }
          return {
            id: item.id,
            original_name: item.original_name,
            name: item.name,
            dimensions: item.dimensions,
            image_url: item.image_url,
            starting_bid: item.starting_bid,
            title_placeholder: item.title_placeholder,
            desc_placeholder: item.desc_placeholder,
            current_bid: item.current_bid || 0,
            highest_bidder: bidder
          };
        });

        return new Response(JSON.stringify(formattedResults), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (request.method === 'POST' && path === '/api/bid') {
        const body = await request.json();
        const { item_id, amount, first_name, last_name, email, phone } = body;

        if (!item_id || !amount || !first_name || !last_name || !email || !phone) {
          return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400, headers: corsHeaders });
        }

        // Get the current highest bid or starting bid
        const checkQuery = `
          SELECT COALESCE(MAX(b.amount), i.starting_bid - 1) as highest_bid
          FROM items i
          LEFT JOIN bids b ON i.id = b.item_id
          WHERE i.id = ?
        `;
        
        const current = await env.DB.prepare(checkQuery).bind(item_id).first();
        
        if (!current) {
           return new Response(JSON.stringify({ error: 'Item not found' }), { status: 404, headers: corsHeaders });
        }

        if (amount <= current.highest_bid) {
          return new Response(JSON.stringify({ 
            error: 'Bid must be higher than the current highest bid.',
            current_highest: current.highest_bid
          }), { status: 400, headers: corsHeaders });
        }

        // Insert the bid
        const insertQuery = `
          INSERT INTO bids (item_id, amount, first_name, last_name, email, phone)
          VALUES (?, ?, ?, ?, ?, ?)
        `;
        
        await env.DB.prepare(insertQuery).bind(item_id, amount, first_name, last_name, email, phone).run();

        return new Response(JSON.stringify({ success: true, message: 'Bid placed successfully!' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (request.method === 'GET' && path === '/api/admin/bids') {
        const query = `
          SELECT b.id, b.item_id, i.creative_name as item_name, b.amount, b.first_name, b.last_name, b.email, b.phone, b.created_at
          FROM bids b
          JOIN items i ON b.item_id = i.id
          ORDER BY b.item_id ASC, b.amount DESC
        `;
        
        const { results } = await env.DB.prepare(query).all();
        
        return new Response(JSON.stringify(results), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (request.method === 'DELETE' && path.startsWith('/api/admin/bid/')) {
        const auth = request.headers.get('Authorization') || url.searchParams.get('secret');
        if (auth !== 'bear1996!') {
           return new Response('Unauthorized delete code', { status: 401, headers: corsHeaders });
        }

        const bidId = path.split('/').pop();
        
        const deleteQuery = `DELETE FROM bids WHERE id = ?`;
        await env.DB.prepare(deleteQuery).bind(bidId).run();

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response('Not Found', { status: 404, headers: corsHeaders });

    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
    }
  }
};
