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

반드시 아래 JSON 형식만 반환해.
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
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent',
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

    // 1. HTTP 에러 먼저 확인
    if (!response.ok) {
      return res.status(response.status).json({
        error: 'Gemini API request failed',
        detail: data?.error?.message || 'Unknown error',
        raw: data
      });
    }

    // 2. candidates 존재 여부 확인
    if (!data?.candidates || !Array.isArray(data.candidates) || data.candidates.length === 0) {
      return res.status(500).json({
        error: 'No candidates returned from Gemini',
        raw: data
      });
    }

    // 3. text 추출
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
      return res.status(500).json({
        error: 'Gemini returned no text',
        raw: data
      });
    }

    // 4. 코드블록 제거
    let cleaned = rawText
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();

    // 5. JSON 부분만 잘라내기
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start !== -1 && end !== -1) {
      cleaned = cleaned.slice(start, end + 1);
    }

    // 6. JSON 파싱
    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (e) {
      return res.status(500).json({
        error: 'JSON parse failed',
        detail: e.message,
        rawText,
        cleaned,
        raw: data
      });
    }

    // 7. 최종 형식 검증
    if (!parsed.items || !Array.isArray(parsed.items)) {
      return res.status(500).json({
        error: 'Invalid JSON format',
        parsed,
        rawText
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
