'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

type RonshoCard = {
  id: string;
  subject: string;
  title: string;
  issue: string;
  norm: string;
  reason?: string;
  key_facts?: string[];
  tags?: string[];
};

const SUBJECTS = ['すべて', '民法', '刑法', '憲法', '民事訴訟法', '刑事訴訟法', '商法', '行政法'];

export default function HomePage() {
  const [cards, setCards] = useState<RonshoCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState('すべて');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

  // Supabaseから論証カードを取得
  useEffect(() => {
    async function fetchCards() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('ronsho_cards')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('データ取得エラー:', error);
        } else if (data) {
          setCards(data);
        }
      } catch (err) {
        console.error('通信エラー:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchCards();
  }, []);

  // 絞り込み
  const filteredCards = cards.filter((card) => {
    const matchSubject = selectedSubject === 'すべて' || card.subject === selectedSubject;
    const matchQuery =
      searchQuery === '' ||
      card.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      card.issue?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      card.norm?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchSubject && matchQuery;
  });

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', color: '#0f172a', fontFamily: 'sans-serif' }}>
      
      {/* ─── 1. ヘッダー（右上に起案室リンクを常時表示） ─── */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          backgroundColor: '#ffffff',
          borderBottom: '2px solid #e2e8f0',
          padding: '12px 24px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '24px' }}>⚖️</span>
          <div>
            <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: '#0f172a' }}>
              予備試験・司法試験 論証カード
            </h1>
            <p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>
              判例規範定立・当てはめ基準 マスターアプリ
            </p>
          </div>
        </div>

        {/* ★ CBT起案室（touan）への直行ボタン ★ */}
        <a
          href="https://touan-git-main-ufuso.vercel.app/practice"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#0284c7',
            color: '#ffffff',
            padding: '9px 18px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 'bold',
            textDecoration: 'none',
            boxShadow: '0 2px 6px rgba(2, 132, 199, 0.35)',
            transition: 'all 0.15s ease',
          }}
        >
          <span>✍️</span>
          <span>本番CBT起案室へ</span>
          <span style={{ fontSize: '11px', opacity: 0.85 }}>↗</span>
        </a>
      </header>

      {/* ─── 2. メインコンテナ ─── */}
      <main style={{ maxWidth: '1040px', margin: '0 auto', padding: '24px 16px' }}>
        
        {/* 実践起案へのナビゲーションバナー */}
        <div
          style={{
            backgroundColor: '#ffffff',
            border: '2px solid #bae6fd',
            borderRadius: '12px',
            padding: '16px 20px',
            marginBottom: '24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ fontSize: '18px' }}>📝</span>
              <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 'bold', color: '#0369a1' }}>
                暗記した論証を70分本番起案で試す
              </h2>
            </div>
            <p style={{ margin: 0, fontSize: '12px', color: '#475569' }}>
              論証カードの定規を身につけたら、CBT起案室で過去問・改題を起案し、AI採点・添削を受けられます。
            </p>
          </div>

          <a
            href="https://touan-git-main-ufuso.vercel.app/practice"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              backgroundColor: '#f0f9ff',
              border: '1px solid #7dd3fc',
              color: '#0284c7',
              padding: '8px 16px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 'bold',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              whiteSpace: 'nowrap',
            }}
          >
            <span>起案室を開く</span>
            <span>➔</span>
          </a>
        </div>

        {/* 検索バー ＆ 科目セレクター */}
        <div style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <input
              type="text"
              placeholder="🔍 論点・条文・キーワードで論証を検索（例: 94条2項、共犯関係からの離脱）"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '14px',
                backgroundColor: '#ffffff',
                boxSizing: 'border-box',
                outline: 'none',
              }}
            />
          </div>

          {/* 科目フィルタータブ */}
          <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
            {SUBJECTS.map((sub) => {
              const isActive = selectedSubject === sub;
              return (
                <button
                  key={sub}
                  type="button"
                  onClick={() => setSelectedSubject(sub)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    border: isActive ? '1px solid #0284c7' : '1px solid #cbd5e1',
                    backgroundColor: isActive ? '#0284c7' : '#ffffff',
                    color: isActive ? '#ffffff' : '#475569',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {sub}
                </button>
              );
            })}
          </div>
        </div>

        {/* 論証カード一覧 */}
        {loading ? (
          <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '40px', textAlign: 'center', color: '#64748b', border: '1px solid #cbd5e1' }}>
            論証カードを読み込み中...
          </div>
        ) : filteredCards.length === 0 ? (
          <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '40px', textAlign: 'center', color: '#64748b', border: '1px solid #cbd5e1' }}>
            該当する論証カードが見つかりません。
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {filteredCards.map((card) => {
              const isExpanded = expandedCardId === card.id;

              return (
                <div
                  key={card.id}
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    padding: '18px 20px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                  }}
                >
                  {/* カード上部 */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', marginBottom: '8px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ backgroundColor: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>
                          {card.subject}
                        </span>
                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: '#0f172a' }}>
                          {card.title || card.issue}
                        </h3>
                      </div>
                      <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                        論点: {card.issue}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setExpandedCardId(isExpanded ? null : card.id)}
                      style={{
                        padding: '4px 10px',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        backgroundColor: '#f1f5f9',
                        color: '#334155',
                        border: '1px solid #cbd5e1',
                        borderRadius: '4px',
                        cursor: 'pointer',
                      }}
                    >
                      {isExpanded ? '閉じる ▲' : '解説・理由 ▼'}
                    </button>
                  </div>

                  {/* 規範定立（常時表示） */}
                  <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fef08a', borderRadius: '8px', padding: '12px 14px', marginTop: '10px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#92400e', marginBottom: '4px' }}>
                      【判例の規範定立・当てはめ基準】
                    </div>
                    <div style={{ fontSize: '13px', lineHeight: '1.7', fontFamily: 'serif', color: '#1e293b', whiteSpace: 'pre-wrap' }}>
                      {card.norm}
                    </div>
                  </div>

                  {/* 展開エリア（趣旨・理由付け） */}
                  {isExpanded && card.reason && (
                    <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 14px', marginTop: '10px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>
                        【趣旨・理由付け・考慮要素】
                      </div>
                      <div style={{ fontSize: '12px', lineHeight: '1.6', color: '#334155', whiteSpace: 'pre-wrap' }}>
                        {card.reason}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

      </main>
    </div>
  );
}