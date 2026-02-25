export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { text, type } = req.body;
  if (!text) {
    return res.status(400).json({ error: 'No text provided' });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  // Pulling directly from your Style Guide arrays
  const pegaTerms = "Access Group, Access Role, Action, Agent, Agile Workbench, Application Layer, Assignment, Branch, Case, Case ID, Case Lifecycle, Case Type, Channel, Clipboard, Condition, Data Flow, Data Model, Data Page, Data Record, Data Set, Data Transform, Data Type, Decision, Flow Action, Portal, Prediction, Predictive Model, Primary Page, Primary Stage, Process, Process Modeler, Rule, Ruleset, Section, Service Case, Service-Level Agreement, Stage, Step, Subprocess, Task, User, Validation, View, Work Queue, Worklist";
  const avoidTerms = "utilize (use), leverage (use/apply), streamline (simplify), in order to (to), e.g. (for example), i.e. (that is), prior to (before), due to the fact that (because), orchestrate (organize/manage)";

  const systemPrompt = `You are an expert editor for the ILT Curriculum Development Team at Pegasystems.
  Review the submitted text. The user indicated this text is for a: ${type.toUpperCase()}. 
  
  Correct the text based on these strict style rules:
  1. PLAIN LANGUAGE & VOICE: Use active voice and present tense. Avoid filler and jargon. Specifically replace these terms: ${avoidTerms}.
  2. PEGA HEADLINE CASE: The following Pega-specific terms MUST be capitalized (Headline Case): ${pegaTerms}.
  3. UI FORMATTING: Bold interface elements (e.g., click <strong>Submit</strong>). 
  4. ENTERED TEXT: If instructing a user to type exact text, format the input using this exact HTML tag: <span class="inline-code text-sm">the input</span>.
  5. SLIDES & HEADINGS: If the text type is a 'HEADING', enforce sentence case for the entire string (only capitalize the first word, proper nouns, and Pega terms).
  6. NUMBERS: Spell out numbers zero through nine. Use numerals for 10+.
  7. PUNCTUATION: Use the Oxford comma. Do not use ampersands (&) unless it's a UI label.

  Return a JSON object with the corrected text and a detailed list of issues found.`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const payload = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents: [{ parts: [{ text: text }] }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: {
          correctedText: { type: "STRING" },
          issuesFound: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                ruleBroken: { type: "STRING", description: "Category: Punctuation, Numbers, Active voice, Pega term, etc." },
                explanation: { type: "STRING", description: "Briefly explain what was changed and why." },
                severity: { 
                  type: "STRING", 
                  enum: ["error", "warning", "info"]
                }
              },
              required: ["ruleBroken", "explanation", "severity"]
            }
          }
        },
        required: ["correctedText", "issuesFound"]
      }
    }
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    
    if (!response.ok) {
       throw new Error(data.error?.message || 'Error from Gemini');
    }

    const resultString = data.candidates[0].content.parts[0].text;
    return res.status(200).send(resultString);

  } catch (error) {
    console.error("Serverless Error:", error);
    return res.status(500).json({ error: 'Failed to process text with AI' });
  }
}
