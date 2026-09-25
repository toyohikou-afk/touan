'use client';

import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';

export default function Home() {
  const [prompt, setPrompt] = useState('【会社法】取締役の競業避止義務（356条1項1号）の該当性と損害額の算定について、判例をベースに出力して。');
  const [result, setResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [cards, setCards] = useState<any[]>([]);

  // 文字サイズの状態管理（100, 125, 150, 175）
  const [fontSizeScale, setFontSizeScale] = useState<number>(100);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editSubject, setEditSubject] = useState('');
  const [editIssue, setEditIssue] = useState('');
  const [editNorm, setEditNorm] = useState('');
  const [editCriteria, setEditCriteria] = useState('');

  const fetchCards = async () => {
    const { data, error } = await supabase
      .from('ronsho_cards')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('データ取得エラー:', error);
    } else {
      setCards(data || []);
    }
  };

  useEffect(() => {
    fetchCards();
  }, []);

  const handleGenerate = async () => {
    setIsLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      if (!res.ok) throw new Error('APIリクエストに失敗しました');
      const data = await res.json();
      setResult(data);
    } catch (error) {
      console.error('エラー:', error);
      alert('生成に失敗しました。');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!result) return;
    setIsSaving(true);

    try {
      const item = Array.isArray(result) ? result[0] : result;

      const subject = item.subject || item.科目 || '未設定';
      const issue = item.topic || item.issue || item.論点 || '未設定';
      const norm = item.norm || item.規範定立 || '';
      
      const criteriaRaw = item.application_criteria || item.当てはめ基準;
      const criteria = Array.isArray(criteriaRaw) 
        ? criteriaRaw.join('\n') 
        : (criteriaRaw || '');

      const { error } = await supabase
        .from('ronsho_cards')
        .insert([
          {
            subject,
            issue,
            norm,
            criteria,
            raw_data: result 
          }
        ]);

      if (error) throw error;
      alert('✅ Supabaseに論証カードを保存しました！');
      setResult(null);
      fetchCards();
    } catch (error) {
      console.error('保存エラー:', error);
      alert('❌ 保存に失敗しました。');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('本当にこの論証カードを削除しますか？')) return;

    try {
      const { error } = await supabase
        .from('ronsho_cards')
        .delete()
        .eq('id', id);

      if (error) throw error;
      alert('🗑️ カードを削除しました');
      fetchCards();
    } catch (error) {
      console.error('削除エラー:', error);
      alert('❌ 削除に失敗しました');
    }
  };

  const startEditing = (card: any, displaySubject: string, displayIssue: string, displayNorm: string, displayCriteria: string) => {
    setEditingId(card.id);
    setEditSubject(displaySubject);
    setEditIssue(displayIssue);
    setEditNorm(displayNorm);
    setEditCriteria(displayCriteria);
  };

  const handleUpdate = async (id: number) => {
    try {
      const { error } = await supabase
        .from('ronsho_cards')
        .update({
          subject: editSubject,
          issue: editIssue,
          norm: editNorm,
          criteria: editCriteria,
        })
        .eq('id', id);

      if (error) throw error;
      alert('✏️ カードを更新しました！');
      setEditingId(null);
      fetchCards();
    } catch (error) {
      console.error('更新エラー:', error);
      alert('❌ 更新に失敗しました');
    }
  };

  // 倍率に応じたTailwindの文字サイズクラスを動的に返す関数
  const getFontSizeClass = (scale: number) => {
    switch (scale) {
      case 125: return 'text-base'; // 標準より少し大きめ
      case 150: return 'text-lg';   // 大きめ
      case 175: return 'text-xl';   // かなり大きめ
      default: return 'text-sm';    // 標準
    }
  };

  return (
    <main className="max-w-4xl mx-auto p-8 font-sans">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">予備試験 論証カード生成機</h1>
        
        {/* 文字サイズ変更コントロール */}
        <div className="flex items-center space-x-2 bg-white px-3 py-2 rounded-lg shadow border border-gray-200">
          <span className="text-xs font-bold text-gray-600">文字サイズ:</span>
          {[100, 125, 150, 175].map((scale) => (
            <button
              key={scale}
              onClick={() => setFontSizeScale(scale)}
              className={`px-2.5 py-1 text-xs font-bold rounded transition-colors ${
                fontSizeScale === scale
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {scale === 100 ? '標準' : `${scale}%`}
            </button>
          ))}
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-xl shadow-md space-y-4 mb-10">
        <div>
          <label className="block text-sm font-bold mb-2 text-gray-700">プロンプト入力</label>
          <textarea
            className="w-full border border-gray-300 rounded-lg p-3 h-32 text-black focus:ring-2 focus:ring-blue-500 outline-none"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
        </div>

        <button
          onClick={handleGenerate}
          disabled={isLoading}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-700 disabled:bg-gray-400 transition-colors shadow"
        >
          {isLoading ? 'Mac miniのローカルAIで生成中...' : 'JSONデータを生成'}
        </button>

        {result && (
          <div className="mt-6 border-t pt-6">
            <h2 className="text-lg font-bold mb-2 text-gray-800">今回の生成結果</h2>
            <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm mb-4">
              {JSON.stringify(result, null, 2)}
            </pre>
            
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-green-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-green-700 disabled:bg-gray-400 transition-colors w-full shadow"
            >
              {isSaving ? 'Supabaseへ保存中...' : 'このデータをデータベースに保存する'}
            </button>
          </div>
        )}
      </div>

      <section>
        <h2 className="text-2xl font-bold mb-4 text-gray-800">📚 蓄積された論証カード一覧 ({cards.length}件)</h2>
        {cards.length === 0 ? (
          <p className="text-gray-500">まだ保存されたカードはありません。</p>
        ) : (
          <div className="space-y-4">
            {cards.map((card) => {
              const raw = card.raw_data;
              const rawItem = Array.isArray(raw) ? raw[0] : (raw || {});

              const displaySubject = card.subject || rawItem.subject || rawItem.科目 || '未設定';
              const displayIssue = card.issue || rawItem.topic || rawItem.issue || rawItem.論点 || card.title || '（論点記載なし）';
              const displayNorm = card.norm || card.kihan || rawItem.norm || rawItem.規範定立 || rawItem.rule || '（規範データなし）';
              
              const rawCriteria = card.criteria || card.atehame || rawItem.application_criteria || rawItem.当てはめ基準;
              const displayCriteria = Array.isArray(rawCriteria)
                ? rawCriteria.join('\n')
                : (rawCriteria || '（当てはめ基準記載なし）');

              const isEditing = editingId === card.id;

              return (
                <div key={card.id} className="bg-white p-6 rounded-xl shadow border border-gray-200">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center space-x-2">
                      {isEditing ? (
                        <input
                          type="text"
                          className="border px-2 py-1 rounded text-sm text-black font-semibold"
                          value={editSubject}
                          onChange={(e) => setEditSubject(e.target.value)}
                        />
                      ) : (
                        <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded">
                          {displaySubject}
                        </span>
                      )}
                      <span className="text-xs text-gray-400">
                        {new Date(card.created_at).toLocaleString('ja-JP')}
                      </span>
                    </div>

                    <div className="space-x-2">
                      {isEditing ? (
                        <>
                          <button
                            onClick={() => handleUpdate(card.id)}
                            className="bg-green-600 text-white text-xs px-3 py-1.5 rounded font-bold hover:bg-green-700"
                          >
                            保存
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="bg-gray-400 text-white text-xs px-3 py-1.5 rounded font-bold hover:bg-gray-500"
                          >
                            キャンセル
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => startEditing(card, displaySubject, displayIssue, displayNorm, displayCriteria)}
                            className="bg-amber-500 text-white text-xs px-3 py-1.5 rounded font-bold hover:bg-amber-600"
                          >
                            ✏️ 編集
                          </button>
                          <button
                            onClick={() => handleDelete(card.id)}
                            className="bg-red-500 text-white text-xs px-3 py-1.5 rounded font-bold hover:bg-red-600"
                          >
                            🗑️ 削除
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* 論点 */}
                  {isEditing ? (
                    <div className="mb-3">
                      <label className="block text-xs font-bold text-gray-600 mb-1">論点:</label>
                      <input
                        type="text"
                        className="border w-full px-3 py-2 rounded text-sm text-black font-bold"
                        value={editIssue}
                        onChange={(e) => setEditIssue(e.target.value)}
                      />
                    </div>
                  ) : (
                    <h3 className={`font-bold text-gray-900 mb-2 ${fontSizeScale === 100 ? 'text-lg' : fontSizeScale === 125 ? 'text-xl' : fontSizeScale === 150 ? 'text-2xl' : 'text-3xl'}`}>
                      論点: {displayIssue}
                    </h3>
                  )}

                  {/* 規範定立 & 当てはめ基準（文字サイズ倍率連動） */}
                  <div className="grid md:grid-cols-2 gap-4 mt-3">
                    <div className="bg-gray-50 p-3 rounded border">
                      <strong className="block text-gray-700 mb-1 text-xs">【規範定立】</strong>
                      {isEditing ? (
                        <textarea
                          className={`w-full border p-2 rounded text-black h-32 ${getFontSizeClass(fontSizeScale)}`}
                          value={editNorm}
                          onChange={(e) => setEditNorm(e.target.value)}
                        />
                      ) : (
                        <div 
                          className={`text-gray-600 whitespace-pre-wrap leading-relaxed ${getFontSizeClass(fontSizeScale)}`}
                          dangerouslySetInnerHTML={{ __html: displayNorm }}
                        />
                      )}
                    </div>
                    <div className="bg-gray-50 p-3 rounded border">
                      <strong className="block text-gray-700 mb-1 text-xs">【当てはめ基準】</strong>
                      {isEditing ? (
                        <textarea
                          className={`w-full border p-2 rounded text-black h-32 ${getFontSizeClass(fontSizeScale)}`}
                          value={editCriteria}
                          onChange={(e) => setEditCriteria(e.target.value)}
                        />
                      ) : (
                        <div 
                          className={`text-gray-600 whitespace-pre-wrap leading-relaxed ${getFontSizeClass(fontSizeScale)}`}
                          dangerouslySetInnerHTML={{ __html: displayCriteria }}
                        />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}