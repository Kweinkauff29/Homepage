// Gemini OCR Worker - Dedicated worker for driver's license OCR
// Deploy with: npx wrangler deploy --config wrangler-ocr.toml
// Set secret: npx wrangler secret put GEMINI_API_KEY --config wrangler-ocr.toml

export default {
    async fetch(request, env) {
        // Handle CORS preflight
        if (request.method === 'OPTIONS') {
            return new Response(null, {
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type',
                },
            });
        }

        // Only allow POST to /api/ocr
        const url = new URL(request.url);
        if (request.method !== 'POST' || url.pathname !== '/api/ocr') {
            return new Response(JSON.stringify({ error: 'Not found' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            });
        }

        try {
            const { image, mimeType } = await request.json();

            if (!image) {
                return new Response(JSON.stringify({ error: 'No image provided' }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                });
            }

            if (!env.GEMINI_API_KEY) {
                return new Response(JSON.stringify({ error: 'GEMINI_API_KEY not configured' }), {
                    status: 500,
                    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                });
            }

            // Call Gemini API - Using 2.0-flash for best OCR quality
            const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${env.GEMINI_API_KEY}`;

            const prompt = 'Extract ALL text from this drivers license image. Return ONLY the raw text you see, exactly as printed. Include all names, addresses, dates, license numbers, and dates of birth. Do not summarize or interpret.';

            const geminiResponse = await fetch(geminiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [
                            { text: prompt },
                            { inlineData: { mimeType: mimeType || 'image/png', data: image } }
                        ]
                    }]
                })
            });

            if (!geminiResponse.ok) {
                const errorData = await geminiResponse.text();
                console.error('Gemini API error:', errorData);
                return new Response(JSON.stringify({ error: 'Gemini API error', details: errorData }), {
                    status: 500,
                    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                });
            }

            const data = await geminiResponse.json();
            const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

            console.log('OCR Result:', text);

            return new Response(JSON.stringify({ text, success: true }), {
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            });

        } catch (error) {
            console.error('OCR Error:', error);
            return new Response(JSON.stringify({ error: error.message, success: false }), {
                status: 500,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            });
        }
    },
};
