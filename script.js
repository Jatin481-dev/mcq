document.getElementById('mcq-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    const topic = document.getElementById('topic').value;
    const numQuestions = document.getElementById('num-questions').value;
    const container = document.getElementById('mcq-container');
    container.innerHTML = "Generating MCQs...";

    // Use your own API key here (NEVER expose it publicly!)
    const GROQ_API_KEY = "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";
    const prompt = `Generate ${numQuestions} multiple choice questions with 4 options and answers on the topic "${topic}". Reply ONLY with a JSON array, no explanation, no markdown, no headings, just the array. Format: [{"question": "...", "options": ["A", "B", "C", "D"], "answer": "A"}]`;

    try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${GROQ_API_KEY}`
            },
            body: JSON.stringify({
                model: "llama3-70b-8192",  // Make sure to use the correct model
                messages: [{role: "user", content: prompt}],
                max_tokens: 1024,
                temperature: 0.7
            })
        });

        const data = await response.json();
        
        // Check for possible errors in the response data
        if (!data.choices || !data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) {
            container.innerHTML = "Groq API error or rate limit exceeded. Please try again later.";
            console.error("Groq API error:", data);
            return;
        }

        let mcqs = [];
        try {
            let content = data.choices[0].message.content.trim();
            console.log("Groq raw content:", content);  // Log to help with debugging

            // Remove markdown code block markers if present
            if (content.startsWith("```json")) {
                content = content.replace(/```json|```/g, "").trim();
            } else if (content.startsWith("```")) {
                content = content.replace(/```/g, "").trim();
            }

            // Fix trailing commas before } and ]
            content = content
                .replace(/,\s*}/g, '}')
                .replace(/,\s*]/g, ']');

            // Sanitize the answers by mapping the letter to the correct option
            content = content.replace(/"answer":\s*"(A|B|C|D)"/g, (match, letter) => {
                const letterToOption = {
                    "A": 0,
                    "B": 1,
                    "C": 2,
                    "D": 3
                };

                // Match the corresponding option in the "options" array
                const regex = /"options":\s*\[([^\]]+)\]/;
                const optionMatch = content.match(regex);

                if (optionMatch) {
                    const options = JSON.parse(`[${optionMatch[1]}]`);
                    return `"answer": "${options[letterToOption[letter]]}"`;  // Replace with full option
                }
                return match;
            });

            // Now parse the JSON content after sanitization
            mcqs = JSON.parse(content);
        } catch (err) {
            container.innerHTML = "Could not parse MCQs. Try again.<br><pre style='font-size:10px'>" + (typeof content !== "undefined" ? content : "") + "</pre>";
            console.error("Error parsing MCQs:", err);
            return;
        }

        container.innerHTML = "";  // Clear previous content
        mcqs.forEach((mcq, idx) => {
            const div = document.createElement('div');
            div.className = 'mcq';
            div.innerHTML = `
                <b>Q${idx + 1}: ${mcq.question}</b><br>
                <ul>
                    ${mcq.options.map((opt, i) => `<li>${String.fromCharCode(65+i)}) ${opt}</li>`).join('')}
                </ul>
                <i>Answer: ${mcq.answer}</i>
            `;
            container.appendChild(div);
        });
    } catch (err) {
        container.innerHTML = "Error generating MCQs.";
        console.error("Error in API request:", err);
    }
});
