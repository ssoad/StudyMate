import fs from 'fs';

async function test() {
  const imageBuf = fs.readFileSync('/Users/ssoad/.gemini/antigravity/brain/04697257-604a-418a-95bc-114559c3b4e7/.user_uploaded/media__1784456542147.png');
  const base64 = imageBuf.toString('base64');
  
  const response = await fetch('https://api.armorclub.org/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer 57b8ba885ae46ff44ecdbe3d09cead3a79f563a783c7ab2d0ff5d446801897de'
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-latest',
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: 'Describe the UI in this image in detail. What is it showing? What does the MCQ UI look like? What states are visible (selected, unselected, hover)? What is the layout?' },
          { type: 'image_url', image_url: { url: `data:image/png;base64,${base64}` } }
        ]
      }],
      max_tokens: 500
    })
  });
  
  const json = await response.json();
  console.log(json.choices[0].message.content);
}

test();
