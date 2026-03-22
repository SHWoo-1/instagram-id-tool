export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { keyword, style } = req.body || {};
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: 'Missing GEMINI_API_KEY' });
    }

    if (!keyword) {
      return res.status(400).json({ error: 'keyword is required' });
    }

    const prompt = `
키워드: ${keyword}
스타일: ${style}

인스타그램 아이디 10개를 추천해줘.

조건:
- 짧고 기억하기 쉬울 것
- 영어 소문자 위주
- 숫자는 가능하면 피할 것
- username과 reason을 포함할 것

중요:
설명 문장 없이, 반드시 "JSON 객체만" 반환해.
반드시 아래 형식만 반환해.

{
  "items": [
    {
      "username": "example_name",
      "reason": "추천 이유"
    }
  ]
}
`;

    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }]
            }
          ]
        })
      }
    );

    const data = await response.json();

    const rawText =
      data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Remove markdown code fences if present
    let cleaned = rawText
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();

    // Extract JSON object only
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start !== -1 && end !== -1) {
      cleaned = cleaned.slice(start, end + 1);
    }

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (e) {
      return res.status(200).json({
        items: [
          {
            username: 'error',
            reason: '결과 파싱 실패'
          }
        ],
        raw: rawText
      });
    }

    return res.status(200).json(parsed);
  } catch (error) {
    return res.status(500).json({
      error: 'server error',
      detail: error.message
    });
  }
}
