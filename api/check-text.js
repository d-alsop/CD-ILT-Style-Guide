export default async function handler(req, res) {
  // 1. Ensure we only accept POST requests (sending data)
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // 2. Extract the text sent from your HTML file
  const { text } = req.body;
  if (!text) {
    return res.status(400).json({ error: 'No text provided' });
  }

  // 3. Grab your secret key from Vercel's secure vault
  const apiKey = process.env.AIzaSyDTI6MJwA2QYWfVY9bSbvPpIEBYaFq-bnI;

  // 4. Set the instructions for Gemini (customized for your team!)
  const systemPrompt = `You are an expert editor for an instructional design team at Pegasystems. 
  Review the following text based on these style guide rules:
  1. Use active voice.
  2. Avoid jargon like 'utilize' or 'leverage'.
  3. Ensure UI elements are bolded.
  Provide a corrected version of the text and briefly list the issues found.`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  try {
    // 5. Forward the request to Gemini
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: { text: systemPrompt } },
        contents: [{ parts: [{ text: text }] }]
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
       throw new Error(data.error?.message || 'Error from Gemini');
    }

    // 6. Extract the clean text and send it back to your HTML
    const resultText = data.candidates[0].content.parts[0].text;
    return res.status(200).json({ result: resultText });

  } catch (error) {
    console.error("Serverless Error:", error);
    return res.status(500).json({ error: 'Failed to process text with AI' });
  }
}
