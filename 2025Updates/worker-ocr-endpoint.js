// Add this route to your multi-week-email-planner worker's src/index.js
// Place it after the other route definitions

// OCR Endpoint - Uses Gemini Vision to extract text from images
app.post('/api/ocr', async (c) => {
    try {
        const body = await c.req.json();
        const { image, mimeType } = body;

        if (!image) {
            return c.json({ error: 'No image provided' }, 400);
        }

        // Use Gemini with vision capabilities
        const prompt = `Extract ALL text from this drivers license image. Return ONLY the raw text you see, exactly as printed. Include all names, addresses, dates, license numbers, and dates of birth. Do not summarize or interpret.`;

        const genAI = new GoogleGenerativeAI(c.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

        const result = await model.generateContent([
            { text: prompt },
            { inlineData: { mimeType: mimeType || 'image/png', data: image } }
        ]);

        const response = await result.response;
        const text = response.text();

        return c.json({ text, success: true });
    } catch (error) {
        console.error('OCR Error:', error);
        return c.json({ error: error.message, success: false }, 500);
    }
});

// Make sure GoogleGenerativeAI is imported at the top of your file:
// import { GoogleGenerativeAI } from '@google/generative-ai';
