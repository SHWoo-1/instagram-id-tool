export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { keyword, style } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    const prompt = `
키워드: ${keyword}
스타일: ${style}

인스타그램 아이디 10개 추천해줘.
조건:
- 짧고 기억하기 쉬울 것
- 영어 소문자 위주
- 감성적이고 자연스러울 것

반드시 JSON 형식으로:
{
  "items": [
    { "username": "...", "reason": "..." }
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
          contents: [{ parts: [{ text: prompt }] }]
        })
      }
    );

    const data = await response.json();

    const text =
      data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      return res.status(200).json({
        items: [
          {
            username: 'error',
            reason: '결과 파싱 실패'
          }
        ]
      });
    }

    res.status(200).json(parsed);
  } catch (error) {
    res.status(500).json({ error: 'server error' });
  }
}