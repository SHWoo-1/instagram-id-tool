// Vercel Serverless Function (백엔드 API)
// 이 파일은 브라우저(사용자)에게 절대 노출되지 않으므로 API Key를 안전하게 보호할 수 있습니다.

export default async function handler(req, res) {
  // POST 요청만 허용
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST 요청만 지원합니다.' });
  }

  try {
    // 프론트엔드(index.html)에서 보낸 데이터 받기
    const { name, keywords, categoryLabel, vibeLabel, useNumbers, useUnderscores, usePeriods } = req.body;

    // Vercel 환경 변수에 설정해둔 API Key 가져오기
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: '서버에 API 키가 설정되지 않았습니다.' });
    }

    // 제약조건 생성 (프론트엔드에서 보낸 체크박스 값 기반)
    let constraints = [];
    if (!useNumbers) constraints.push("숫자를 절대 사용하지 마세요.");
    if (!useUnderscores) constraints.push("밑줄(_)을 절대 사용하지 마세요.");
    if (!usePeriods) constraints.push("마침표(.)를 절대 사용하지 마세요.");
    const constraintsText = constraints.length > 0 ? `\n\n[특별 제약조건]\n${constraints.join('\n')}` : '';

    // AI에게 지시할 프롬프트(명령어) 조합
    const prompt = `당신은 글로벌 트렌드를 선도하는 인스타그램 네이밍 전문가입니다.
      
[사용자 정보]
- 이름/닉네임: ${name}
- 핵심 키워드: ${keywords || '없음'}
- 계정 목적(카테고리): ${categoryLabel}
- 원하는 분위기: ${vibeLabel}

[요청 사항]
위 정보를 바탕으로 인스타그램에서 당장 쓰고 싶어지는 매우 트렌디하고 독창적인 아이디(username) 15개를 창작해주세요.
단순히 단어를 나열하지 말고, 언어유희, 축약, 감각적인 조합을 활용하세요.
인스타그램 아이디 규칙(영문 소문자, 숫자, 밑줄, 마침표만 허용)을 반드시 지키세요.${constraintsText}

결과는 반드시 ["id_1", "id.2", "id_3"] 형태의 JSON 배열(Array of strings)로만 반환해야 합니다. 다른 텍스트는 덧붙이지 마세요.`;

    // Gemini API 호출 (구조화된 JSON 응답 요구)
    // 에러 원인 해결: 현재 가장 최신이고 안정적인 gemini-2.5-flash 모델로 변경했습니다.
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "ARRAY",
            items: { type: "STRING" }
          }
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API 오류: ${response.status}`);
    }

    const data = await response.json();
    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (resultText) {
      const ids = JSON.parse(resultText);
      // 성공적으로 아이디 배열을 프론트엔드로 전달
      return res.status(200).json({ ids: ids.sort(() => 0.5 - Math.random()) });
    } else {
      throw new Error("결과를 받아오지 못했습니다.");
    }

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "아이디 생성 중 오류가 발생했습니다." });
  }
}
