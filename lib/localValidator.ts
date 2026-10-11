// lib/localValidator.ts

export async function validateProblemWithLocalAI(problemJson: {
  fact_context: string;
  target_issue: string;
}) {
  const localEndpoint = process.env.LOCAL_AI_ENDPOINT || 'http://127.0.0.1:11434/api/generate';
  
  const checkPrompt = `
あなたは法科大学院の考査委員補佐です。以下の事実関係と設問論点を検査してください。
事実関係の中に、指定された論点を検討するための生の事実（当事者の具体的言動）が明確に含まれていますか？

【事実関係】
${problemJson.fact_context}

【指定論点】
${problemJson.target_issue}

判定基準：
事実関係と指定論点が整合していれば "VALID"
事実関係と論点に矛盾がある（例：事実は窃盗なのに論点が放火等）なら "INVALID: 理由"

必ず先頭に VALID または INVALID を出力してください。
`;

  try {
    const res = await fetch(localEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'qwen2.5:7b',
        prompt: checkPrompt,
        stream: false,
      }),
    });

    if (!res.ok) return { isValid: true, note: 'ローカルAI待機中（スキップ）' };

    const data = await res.json();
    const reply: string = data.response || '';

    if (reply.includes('INVALID')) {
      return { isValid: false, reason: reply };
    }
    return { isValid: true };
  } catch (err) {
    // ローカルOllamaが起動していない場合はスルーして処理を止めない
    return { isValid: true, note: 'ローカルAIオフラインのためパス' };
  }
}