import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, Calendar, Camera, Sparkles, Image,
  Dog, Scissors, Moon, Droplets,
  CheckCircle2, AlertCircle, XCircle, Plus, Send, Copy,
  Scale, Eye, Ear, Smile, PawPrint, TrendingUp, TrendingDown,
  Clock, X, ChevronDown, ChevronUp, Settings, Shield, Lightbulb,
  MessageCircle, Zap, Database, Lock, Check, MoreVertical
} from 'lucide-react';

// ===== デザイントークン =====
const tokens = {
  colors: {
    bg: '#F8FAFC',
    surface: '#FFFFFF',
    surfaceHover: '#F1F5F9',
    textPrimary: '#0F172A',
    textSecondary: '#475569',
    textTertiary: '#94A3B8',
    border: '#E2E8F0',
    borderLight: '#F1F5F9',
    primary: '#3B82F6',
    primaryHover: '#2563EB',
    primaryLight: '#EFF6FF',
    success: '#10B981',
    successLight: '#ECFDF5',
    warning: '#F59E0B',
    warningLight: '#FFFBEB',
    danger: '#EF4444',
    dangerLight: '#FEF2F2',
    grooming: '#8B5CF6',
    groomingLight: '#F5F3FF',
    groomingPale: '#FAF5FF',
    daycare: '#F97316',
    daycareLight: '#FFF7ED',
    daycarePale: '#FFFAF5',
    hotel: '#06B6D4',
    hotelLight: '#ECFEFF',
    hotelPale: '#F0FDFF',
    ai: '#6366F1',
    aiLight: '#EEF2FF',
    aiBorder: '#A5B4FC',
  },
  shadows: {
    xs: '0 1px 2px rgba(0, 0, 0, 0.04)',
    sm: '0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -1px rgba(0, 0, 0, 0.04)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -2px rgba(0, 0, 0, 0.04)',
  },
  radius: {
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '20px',
    full: '9999px',
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
  },
};

// =====================================
// 共通: インラインAI提案コンポーネント（改善版）
// =====================================

const AISuggestion = ({ 
  message, 
  preview, 
  actionLabel, 
  onAction, 
  onDismiss,
  applied,
  variant = 'default'
}) => {
  const variantStyles = {
    default: { line: tokens.colors.ai, bg: tokens.colors.aiLight },
    warning: { line: tokens.colors.warning, bg: tokens.colors.warningLight },
    success: { line: tokens.colors.success, bg: tokens.colors.successLight },
  };
  
  const style = variantStyles[variant];
  
  if (applied) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '12px 16px',
        backgroundColor: tokens.colors.successLight,
        borderRadius: tokens.radius.md,
        marginTop: '16px',
      }}>
        <div style={{
          width: '20px', height: '20px',
          borderRadius: tokens.radius.full,
          backgroundColor: tokens.colors.success,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Check size={12} color="white" />
        </div>
        <span style={{ fontSize: '13px', color: tokens.colors.success, fontWeight: '600' }}>
          適用しました
        </span>
      </div>
    );
  }
  
  return (
    <div style={{
      marginTop: '16px',
      borderRadius: tokens.radius.md,
      overflow: 'hidden',
      boxShadow: tokens.shadows.sm,
    }}>
      {/* 上部のカラーライン */}
      <div style={{
        height: '3px',
        background: `linear-gradient(90deg, ${style.line} 0%, ${style.line}88 100%)`,
      }} />
      
      <div style={{
        padding: '14px 16px',
        backgroundColor: style.bg,
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
        }}>
          {/* AIアイコン */}
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: tokens.radius.sm,
            background: `linear-gradient(135deg, ${style.line} 0%, ${style.line}CC 100%)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            boxShadow: `0 2px 4px ${style.line}40`,
          }}>
            <Lightbulb size={15} color="white" />
          </div>
          
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* メッセージ */}
            <div style={{
              fontSize: '14px',
              fontWeight: '600',
              color: tokens.colors.textPrimary,
              lineHeight: '1.4',
              marginBottom: preview ? '12px' : '12px',
            }}>
              {message}
            </div>
            
            {/* プレビュー */}
            {preview && (
              <div style={{
                padding: '12px',
                backgroundColor: tokens.colors.surface,
                borderRadius: tokens.radius.sm,
                border: `1px solid ${tokens.colors.border}`,
                marginBottom: '12px',
              }}>
                {preview}
              </div>
            )}
            
            {/* アクションボタン */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={onAction}
                style={{
                  padding: '8px 16px',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: 'white',
                  background: `linear-gradient(135deg, ${style.line} 0%, ${style.line}DD 100%)`,
                  border: 'none',
                  borderRadius: tokens.radius.sm,
                  cursor: 'pointer',
                  boxShadow: `0 2px 4px ${style.line}30`,
                  transition: 'transform 0.1s, box-shadow 0.1s',
                }}
              >
                {actionLabel}
              </button>
              <button
                onClick={onDismiss}
                style={{
                  padding: '8px 16px',
                  fontSize: '13px',
                  fontWeight: '500',
                  color: tokens.colors.textSecondary,
                  backgroundColor: tokens.colors.surface,
                  border: `1px solid ${tokens.colors.border}`,
                  borderRadius: tokens.radius.sm,
                  cursor: 'pointer',
                }}
              >
                スキップ
              </button>
            </div>
          </div>
          
          {/* 閉じるボタン */}
          <button
            onClick={onDismiss}
            style={{
              width: '24px',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: tokens.colors.textTertiary,
              flexShrink: 0,
              borderRadius: tokens.radius.sm,
            }}
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

// =====================================
// AI設定画面
// =====================================

const AISettingsScreen = ({ onClose }) => {
  const [settings, setSettings] = useState({
    assistantEnabled: true,
    useOwnData: true,
    contributeToService: false,
  });

  const Toggle = ({ enabled, onToggle }) => (
    <button
      onClick={onToggle}
      style={{
        width: '48px', height: '26px',
        borderRadius: tokens.radius.full,
        backgroundColor: enabled ? tokens.colors.ai : tokens.colors.border,
        border: 'none', cursor: 'pointer',
        position: 'relative', transition: 'background-color 0.2s',
        boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1)',
      }}
    >
      <div style={{
        width: '22px', height: '22px',
        borderRadius: tokens.radius.full,
        backgroundColor: 'white',
        position: 'absolute', top: '2px',
        left: enabled ? '24px' : '2px',
        transition: 'left 0.2s',
        boxShadow: tokens.shadows.sm,
      }} />
    </button>
  );

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: tokens.colors.bg,
      zIndex: 2000,
      overflow: 'auto',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: '12px 16px',
        backgroundColor: tokens.colors.surface,
        borderBottom: `1px solid ${tokens.colors.border}`,
        position: 'sticky', top: 0,
      }}>
        <button
          onClick={onClose}
          style={{
            width: '40px', height: '40px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backgroundColor: tokens.colors.surfaceHover, 
            border: 'none',
            borderRadius: tokens.radius.md,
            cursor: 'pointer', color: tokens.colors.textSecondary,
          }}
        >
          <ChevronLeft size={24} />
        </button>
        <div style={{ fontSize: '17px', fontWeight: '700', color: tokens.colors.textPrimary }}>
          AIとデータの設定
        </div>
      </div>

      <div style={{ padding: '20px 16px', maxWidth: '480px', margin: '0 auto' }}>
        {/* AIアシスタント機能 */}
        <div style={{
          backgroundColor: tokens.colors.surface,
          borderRadius: tokens.radius.lg,
          padding: '20px',
          marginBottom: '16px',
          boxShadow: tokens.shadows.sm,
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: '16px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '40px', height: '40px',
                borderRadius: tokens.radius.md,
                background: `linear-gradient(135deg, ${tokens.colors.ai} 0%, ${tokens.colors.ai}CC 100%)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: `0 2px 8px ${tokens.colors.ai}40`,
              }}>
                <Zap size={20} color="white" />
              </div>
              <div>
                <div style={{ fontSize: '15px', fontWeight: '700', color: tokens.colors.textPrimary }}>
                  AIアシスタント
                </div>
                <div style={{ fontSize: '13px', color: tokens.colors.textSecondary }}>
                  入力をサポートする提案機能
                </div>
              </div>
            </div>
            <Toggle 
              enabled={settings.assistantEnabled} 
              onToggle={() => setSettings(s => ({ ...s, assistantEnabled: !s.assistantEnabled }))}
            />
          </div>
          
          <div style={{
            fontSize: '13px', color: tokens.colors.textSecondary,
            lineHeight: '1.6', padding: '14px',
            backgroundColor: tokens.colors.surfaceHover,
            borderRadius: tokens.radius.md,
          }}>
            写真から気になる箇所を検出したり、前回との比較をお知らせします。
          </div>
        </div>

        {/* データの利用範囲 */}
        <div style={{
          backgroundColor: tokens.colors.surface,
          borderRadius: tokens.radius.lg,
          padding: '20px',
          marginBottom: '16px',
          boxShadow: tokens.shadows.sm,
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            marginBottom: '20px',
          }}>
            <Database size={20} color={tokens.colors.textSecondary} />
            <div style={{ fontSize: '15px', fontWeight: '700', color: tokens.colors.textPrimary }}>
              データの利用範囲
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{
              padding: '16px',
              backgroundColor: tokens.colors.surfaceHover,
              borderRadius: tokens.radius.md,
            }}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                marginBottom: '8px',
              }}>
                <div style={{ fontSize: '14px', fontWeight: '600', color: tokens.colors.textPrimary }}>
                  自店舗のAI改善に使用
                </div>
                <Toggle 
                  enabled={settings.useOwnData} 
                  onToggle={() => setSettings(s => ({ ...s, useOwnData: !s.useOwnData }))}
                />
              </div>
              <div style={{ fontSize: '12px', color: tokens.colors.textSecondary, lineHeight: '1.5' }}>
                過去のカルテを参考に、お店に合った提案ができるようになります。
              </div>
            </div>

            <div style={{
              padding: '16px',
              backgroundColor: tokens.colors.surfaceHover,
              borderRadius: tokens.radius.md,
            }}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                marginBottom: '8px',
              }}>
                <div style={{ fontSize: '14px', fontWeight: '600', color: tokens.colors.textPrimary }}>
                  サービス全体の改善に貢献
                </div>
                <Toggle 
                  enabled={settings.contributeToService} 
                  onToggle={() => setSettings(s => ({ ...s, contributeToService: !s.contributeToService }))}
                />
              </div>
              <div style={{ fontSize: '12px', color: tokens.colors.textSecondary, lineHeight: '1.5' }}>
                匿名化データでサービス全体の精度向上に貢献します（任意）
              </div>
            </div>
          </div>
        </div>

        {/* 使用しない範囲 */}
        <div style={{
          backgroundColor: tokens.colors.surface,
          borderRadius: tokens.radius.lg,
          padding: '20px',
          boxShadow: tokens.shadows.sm,
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            marginBottom: '16px',
          }}>
            <Shield size={20} color={tokens.colors.success} />
            <div style={{ fontSize: '15px', fontWeight: '700', color: tokens.colors.textPrimary }}>
              以下には使用しません
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
              '外部AI（OpenAI等）のモデル学習',
              '第三者への提供・販売',
              '広告・マーケティング目的',
            ].map((text, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '12px 14px',
                backgroundColor: tokens.colors.successLight,
                borderRadius: tokens.radius.sm,
              }}>
                <Check size={16} color={tokens.colors.success} />
                <span style={{ fontSize: '13px', color: tokens.colors.textPrimary }}>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// =====================================
// セクションコンポーネント
// =====================================

// 必須セクション用（カードなし、直接表示）
const RequiredSection = ({ title, children }) => (
  <div style={{ marginBottom: '24px' }}>
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      marginBottom: '12px',
    }}>
      <span style={{ 
        fontSize: '15px', 
        fontWeight: '700', 
        color: tokens.colors.textPrimary,
      }}>
        {title}
      </span>
      <span style={{
        fontSize: '10px', 
        fontWeight: '700',
        color: tokens.colors.danger,
        backgroundColor: tokens.colors.dangerLight,
        padding: '3px 8px', 
        borderRadius: tokens.radius.full,
      }}>必須</span>
    </div>
    <div style={{
      backgroundColor: tokens.colors.surface,
      borderRadius: tokens.radius.lg,
      padding: '16px',
      boxShadow: tokens.shadows.sm,
    }}>
      {children}
    </div>
  </div>
);

// 任意セクション用（折りたたみカード）
const OptionalSection = ({ title, children, collapsed, onToggle }) => (
  <div style={{
    backgroundColor: tokens.colors.surface,
    borderRadius: tokens.radius.md,
    boxShadow: collapsed ? 'none' : tokens.shadows.xs,
    marginBottom: '8px',
    border: `1px solid ${collapsed ? tokens.colors.borderLight : tokens.colors.border}`,
    overflow: 'hidden',
    transition: 'all 0.2s',
  }}>
    <div 
      style={{
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        padding: '14px 16px',
        cursor: 'pointer',
        backgroundColor: collapsed ? 'transparent' : tokens.colors.surface,
      }}
      onClick={onToggle}
    >
      <span style={{ 
        fontSize: '14px', 
        fontWeight: '600', 
        color: collapsed ? tokens.colors.textSecondary : tokens.colors.textPrimary,
      }}>
        {title}
      </span>
      {collapsed ? (
        <ChevronDown size={18} color={tokens.colors.textTertiary} />
      ) : (
        <ChevronUp size={18} color={tokens.colors.textTertiary} />
      )}
    </div>
    {!collapsed && (
      <div style={{ 
        padding: '0 16px 16px 16px',
        borderTop: `1px solid ${tokens.colors.borderLight}`,
        paddingTop: '16px',
      }}>
        {children}
      </div>
    )}
  </div>
);

// =====================================
// 写真フォーム
// =====================================

const PhotosForm = ({ data, onChange, showConcerns = false, aiSuggestion, onAISuggestionAction, onAISuggestionDismiss }) => {
  const regularCount = data.regular?.length || 0;
  const concernCount = data.concerns?.length || 0;
  
  return (
    <div>
      <div style={{ marginBottom: showConcerns ? '20px' : 0 }}>
        <div style={{ 
          fontSize: '13px', 
          fontWeight: '600', 
          color: tokens.colors.textSecondary, 
          marginBottom: '10px',
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px',
        }}>
          仕上がり写真
          {regularCount > 0 && (
            <span style={{
              fontSize: '12px', 
              fontWeight: '700',
              color: tokens.colors.primary,
              backgroundColor: tokens.colors.primaryLight,
              padding: '2px 8px', 
              borderRadius: tokens.radius.full,
            }}>{regularCount}枚</span>
          )}
        </div>
        <div style={{ 
          display: 'flex', 
          gap: '10px', 
          overflowX: 'auto', 
          padding: '4px 0',
        }}>
          {(data.regular || []).map((photo, i) => (
            <div key={i} style={{
              position: 'relative',
              width: '80px', 
              height: '80px',
              borderRadius: tokens.radius.md,
              backgroundColor: tokens.colors.surfaceHover,
              flexShrink: 0,
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              border: `1px solid ${tokens.colors.border}`,
            }}>
              <Dog size={28} color={tokens.colors.textTertiary} />
              {i === 1 && aiSuggestion?.type === 'photo-concern' && !aiSuggestion.dismissed && (
                <div style={{
                  position: 'absolute',
                  right: '6px', 
                  bottom: '6px',
                  width: '22px', 
                  height: '22px',
                  borderRadius: '50%',
                  border: `3px solid ${tokens.colors.danger}`,
                  backgroundColor: 'rgba(239, 68, 68, 0.2)',
                }} />
              )}
            </div>
          ))}
          <button
            onClick={() => onChange({ ...data, regular: [...(data.regular || []), {}] })}
            style={{
              width: '80px', 
              height: '80px',
              display: 'flex', 
              flexDirection: 'column',
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '4px',
              backgroundColor: 'transparent',
              border: `2px dashed ${tokens.colors.border}`,
              borderRadius: tokens.radius.md, 
              cursor: 'pointer', 
              flexShrink: 0,
              color: tokens.colors.textTertiary,
              transition: 'all 0.15s',
            }}
          >
            <Plus size={22} />
            <span style={{ fontSize: '11px', fontWeight: '600' }}>追加</span>
          </button>
        </div>
        
        {/* AI提案 */}
        {aiSuggestion?.type === 'photo-concern' && !aiSuggestion.dismissed && (
          <AISuggestion
            message="写真2に赤みを検出しました"
            preview={
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '52px', 
                  height: '52px',
                  borderRadius: tokens.radius.sm,
                  backgroundColor: tokens.colors.surfaceHover,
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  position: 'relative',
                  border: `1px solid ${tokens.colors.border}`,
                }}>
                  <Dog size={22} color={tokens.colors.textTertiary} />
                  <div style={{
                    position: 'absolute',
                    right: '4px', 
                    bottom: '4px',
                    width: '14px', 
                    height: '14px',
                    borderRadius: '50%',
                    border: `2px solid ${tokens.colors.danger}`,
                    backgroundColor: 'rgba(239, 68, 68, 0.25)',
                  }} />
                </div>
                <div>
                  <div style={{ 
                    fontSize: '14px', 
                    fontWeight: '600', 
                    color: tokens.colors.textPrimary,
                    marginBottom: '2px',
                  }}>
                    右後ろ足に赤み
                  </div>
                  <div style={{ fontSize: '12px', color: tokens.colors.textSecondary }}>
                    気になる箇所として追加できます
                  </div>
                </div>
              </div>
            }
            actionLabel="気になる箇所に追加"
            onAction={onAISuggestionAction}
            onDismiss={onAISuggestionDismiss}
            applied={aiSuggestion.applied}
          />
        )}
      </div>
      
      {showConcerns && (
        <div style={{
          padding: '14px',
          backgroundColor: tokens.colors.dangerLight,
          borderRadius: tokens.radius.md,
          border: `1px solid ${tokens.colors.danger}30`,
        }}>
          <div style={{ 
            fontSize: '13px', 
            fontWeight: '600', 
            color: tokens.colors.danger, 
            marginBottom: '10px',
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
          }}>
            <AlertCircle size={15} />
            気になる箇所
            {concernCount > 0 && (
              <span style={{
                fontSize: '12px', 
                fontWeight: '700',
                color: tokens.colors.danger,
                backgroundColor: tokens.colors.surface,
                padding: '2px 8px', 
                borderRadius: tokens.radius.full,
              }}>{concernCount}件</span>
            )}
          </div>
          <div style={{ 
            display: 'flex', 
            gap: '10px', 
            overflowX: 'auto', 
            padding: '4px 0',
          }}>
            {(data.concerns || []).map((photo, i) => (
              <div key={i} style={{
                position: 'relative',
                width: '90px', 
                height: '90px',
                borderRadius: tokens.radius.md,
                backgroundColor: tokens.colors.surface,
                flexShrink: 0, 
                overflow: 'hidden',
                border: `1px solid ${tokens.colors.border}`,
              }}>
                <div style={{
                  width: '100%', 
                  height: '100%',
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                }}>
                  <Dog size={28} color={tokens.colors.textTertiary} />
                </div>
                {photo.annotation && (
                  <div style={{
                    position: 'absolute',
                    left: `${photo.annotation.x}%`, 
                    top: `${photo.annotation.y}%`,
                    transform: 'translate(-50%, -50%)',
                    width: '32px', 
                    height: '32px', 
                    borderRadius: '50%',
                    border: `3px solid ${tokens.colors.danger}`,
                    backgroundColor: 'rgba(239, 68, 68, 0.15)',
                  }} />
                )}
                {photo.label && (
                  <div style={{
                    position: 'absolute', 
                    bottom: 0, 
                    left: 0, 
                    right: 0,
                    padding: '4px 6px',
                    backgroundColor: 'rgba(0,0,0,0.75)',
                    color: 'white',
                    fontSize: '10px', 
                    fontWeight: '500',
                  }}>
                    {photo.label}
                  </div>
                )}
              </div>
            ))}
            <button
              onClick={() => onChange({ 
                ...data, 
                concerns: [...(data.concerns || []), { annotation: { x: 50, y: 50 }, label: '' }] 
              })}
              style={{
                width: '90px', 
                height: '90px',
                display: 'flex', 
                flexDirection: 'column',
                alignItems: 'center', 
                justifyContent: 'center', 
                gap: '4px',
                backgroundColor: tokens.colors.surface,
                border: `2px dashed ${tokens.colors.danger}50`,
                borderRadius: tokens.radius.md, 
                cursor: 'pointer', 
                flexShrink: 0,
                color: tokens.colors.danger,
              }}
            >
              <Plus size={20} />
              <span style={{ fontSize: '10px', fontWeight: '600' }}>追加</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// =====================================
// 健康チェックフォーム
// =====================================

const HealthCheckForm = ({ data, onChange, showWeightGraph, weightHistory = [], aiSuggestion, onAISuggestionAction, onAISuggestionDismiss }) => {
  const lastWeight = weightHistory[weightHistory.length - 2]?.weight;
  const weightChange = lastWeight ? parseFloat((data.weight - lastWeight).toFixed(2)) : 0;
  
  const healthItems = [
    { key: 'ears', label: '耳', options: ['きれい', '汚れ', '赤み'] },
    { key: 'nails', label: '爪', options: ['普通', '長め', '伸びすぎ'] },
    { key: 'skin', label: '皮膚', options: ['良好', '赤み', '湿疹'] },
    { key: 'teeth', label: '歯', options: ['良好', '汚れ', '歯石'] },
  ];
  
  return (
    <div>
      {showWeightGraph && weightHistory.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'baseline', 
            gap: '12px', 
            marginBottom: '10px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Scale size={18} color={tokens.colors.textSecondary} />
              <span style={{ 
                fontSize: '26px', 
                fontWeight: '700', 
                color: tokens.colors.textPrimary,
              }}>
                {data.weight}
              </span>
              <span style={{ fontSize: '14px', color: tokens.colors.textSecondary }}>kg</span>
            </div>
            {weightChange !== 0 && (
              <div style={{
                display: 'flex', 
                alignItems: 'center', 
                gap: '4px',
                padding: '4px 10px', 
                borderRadius: tokens.radius.full,
                backgroundColor: weightChange > 0 ? tokens.colors.warningLight : tokens.colors.successLight,
                color: weightChange > 0 ? tokens.colors.warning : tokens.colors.success,
                fontSize: '12px', 
                fontWeight: '700',
              }}>
                {weightChange > 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                {weightChange > 0 ? '+' : ''}{weightChange}kg
              </div>
            )}
          </div>
          
          <div style={{
            height: '56px', 
            backgroundColor: tokens.colors.surfaceHover,
            borderRadius: tokens.radius.md, 
            padding: '8px 12px',
          }}>
            <svg style={{ width: '100%', height: '100%' }} viewBox="0 0 100 40" preserveAspectRatio="none">
              {(() => {
                const max = Math.max(...weightHistory.map(h => h.weight)) + 0.2;
                const min = Math.min(...weightHistory.map(h => h.weight)) - 0.2;
                const range = max - min;
                return (
                  <>
                    <polyline
                      fill="none" 
                      stroke={tokens.colors.grooming} 
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={weightHistory.map((h, i) => 
                        `${(i / (weightHistory.length - 1)) * 100},${40 - ((h.weight - min) / range) * 40}`
                      ).join(' ')}
                    />
                    {weightHistory.map((h, i) => (
                      <circle
                        key={i}
                        cx={(i / (weightHistory.length - 1)) * 100}
                        cy={40 - ((h.weight - min) / range) * 40}
                        r={i === weightHistory.length - 1 ? "4" : "3"}
                        fill={i === weightHistory.length - 1 ? tokens.colors.grooming : tokens.colors.surface}
                        stroke={tokens.colors.grooming} 
                        strokeWidth="2"
                      />
                    ))}
                  </>
                );
              })()}
            </svg>
          </div>
        </div>
      )}
      
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '10px', 
        marginBottom: '16px',
        padding: '12px 14px',
        backgroundColor: tokens.colors.surfaceHover,
        borderRadius: tokens.radius.md,
      }}>
        <span style={{ fontSize: '13px', fontWeight: '600', color: tokens.colors.textSecondary }}>
          体重
        </span>
        <input
          type="number" 
          step="0.1" 
          value={data.weight || ''}
          onChange={(e) => onChange({ ...data, weight: parseFloat(e.target.value) })}
          style={{
            width: '80px', 
            padding: '8px 10px', 
            fontSize: '15px', 
            fontWeight: '600',
            border: `1px solid ${tokens.colors.border}`, 
            borderRadius: tokens.radius.sm, 
            textAlign: 'right',
            backgroundColor: tokens.colors.surface,
          }}
        />
        <span style={{ fontSize: '13px', color: tokens.colors.textSecondary }}>kg</span>
      </div>
      
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr', 
        gap: '10px',
      }}>
        {healthItems.map((item) => (
          <div key={item.key} style={{
            padding: '12px',
            backgroundColor: tokens.colors.surfaceHover,
            borderRadius: tokens.radius.md,
          }}>
            <div style={{ 
              fontSize: '12px', 
              fontWeight: '600',
              color: tokens.colors.textSecondary, 
              marginBottom: '8px',
            }}>
              {item.label}
            </div>
            <select
              value={data[item.key] || ''}
              onChange={(e) => onChange({ ...data, [item.key]: e.target.value })}
              style={{
                width: '100%', 
                padding: '8px 10px', 
                fontSize: '13px',
                border: `1px solid ${tokens.colors.border}`, 
                borderRadius: tokens.radius.sm,
                backgroundColor: tokens.colors.surface,
                fontWeight: '500',
              }}
            >
              <option value="">-</option>
              {item.options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
        ))}
      </div>
      
      {/* AI提案 */}
      {aiSuggestion?.type === 'health-history' && !aiSuggestion.dismissed && (
        <AISuggestion
          message="耳の汚れが2回連続しています"
          preview={
            <div style={{ fontSize: '13px', color: tokens.colors.textSecondary, lineHeight: '1.6' }}>
              <div style={{ marginBottom: '4px' }}>
                <span style={{ color: tokens.colors.textTertiary }}>前回 (1/5):</span>
                <span style={{ marginLeft: '8px', color: tokens.colors.textPrimary }}>耳に汚れあり</span>
              </div>
              <div>
                <span style={{ color: tokens.colors.textTertiary }}>今回:</span>
                <span style={{ marginLeft: '8px', color: tokens.colors.textPrimary }}>耳に汚れあり</span>
              </div>
              <div style={{ 
                marginTop: '10px', 
                paddingTop: '10px',
                borderTop: `1px solid ${tokens.colors.border}`,
                color: tokens.colors.warning,
                fontWeight: '500',
              }}>
                継続的な症状の可能性があります
              </div>
            </div>
          }
          actionLabel="報告文に追記"
          onAction={onAISuggestionAction}
          onDismiss={onAISuggestionDismiss}
          applied={aiSuggestion.applied}
          variant="warning"
        />
      )}
    </div>
  );
};

// =====================================
// 報告文フォーム
// =====================================

const NotesForm = ({ data, onChange, photos, recordType, groomingData, aiSuggestion, onAISuggestionAction, onAISuggestionDismiss }) => {
  const generateDraft = () => {
    let draft = '';
    if (recordType === 'grooming') {
      const parts = (groomingData?.selectedParts || []).map(p => {
        const labels = { body: '体', face: '顔', head: '頭', ears: '耳', tail: 'しっぽ', front_legs: '前足', back_legs: '後足', hip: 'お尻' };
        return `${labels[p]}は${groomingData?.partNotes?.[p] || ''}`;
      }).join('、');
      draft = `今日も元気にご来店いただきました！\n\n${parts}で仕上げました。`;
      
      const concernLabels = photos?.concerns?.filter(p => p.label).map(p => p.label) || [];
      if (concernLabels.length > 0) {
        draft += `\n\n【気になる点】\n${concernLabels.map(l => `・${l}`).join('\n')}\n写真もお送りしますので、気になる場合は獣医さんにご相談ください。`;
      }
      
      draft += `\n\nとても可愛くなりました♪`;
    }
    return draft;
  };
  
  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <div style={{ 
          fontSize: '13px', 
          fontWeight: '600', 
          color: tokens.colors.textSecondary, 
          marginBottom: '8px',
        }}>
          内部メモ
          <span style={{ 
            fontWeight: '400', 
            color: tokens.colors.textTertiary,
            marginLeft: '6px',
          }}>
            （飼い主に非公開）
          </span>
        </div>
        <textarea
          value={data.internal_notes || ''}
          onChange={(e) => onChange({ ...data, internal_notes: e.target.value })}
          placeholder="スタッフ間で共有したいメモ..."
          style={{
            width: '100%', 
            padding: '12px 14px',
            fontSize: '14px', 
            lineHeight: '1.5',
            border: `1px solid ${tokens.colors.border}`,
            borderRadius: tokens.radius.md,
            resize: 'none', 
            height: '72px', 
            fontFamily: 'inherit',
            backgroundColor: tokens.colors.surfaceHover,
          }}
        />
      </div>
      
      <div>
        <div style={{ 
          fontSize: '13px', 
          fontWeight: '600', 
          color: tokens.colors.textSecondary, 
          marginBottom: '8px',
        }}>
          飼い主への報告文
        </div>
        
        <textarea
          value={data.report_text || ''}
          onChange={(e) => onChange({ ...data, report_text: e.target.value })}
          placeholder="今日の様子を入力..."
          style={{
            width: '100%', 
            padding: '14px',
            fontSize: '14px', 
            lineHeight: '1.7',
            border: `1px solid ${tokens.colors.border}`,
            borderRadius: tokens.radius.md,
            resize: 'vertical', 
            minHeight: '100px', 
            fontFamily: 'inherit',
            backgroundColor: tokens.colors.surface,
          }}
        />
        
        {/* AI提案 */}
        {aiSuggestion?.type === 'report-draft' && !aiSuggestion.dismissed && !data.report_text && (
          <AISuggestion
            message="入力内容から報告文を作成しました"
            preview={
              <div style={{ 
                fontSize: '13px', 
                color: tokens.colors.textPrimary, 
                lineHeight: '1.7',
                whiteSpace: 'pre-wrap',
                maxHeight: '140px',
                overflow: 'hidden',
              }}>
                {generateDraft()}
              </div>
            }
            actionLabel="この下書きを使う"
            onAction={() => {
              onChange({ ...data, report_text: generateDraft() });
              onAISuggestionAction();
            }}
            onDismiss={onAISuggestionDismiss}
            applied={aiSuggestion.applied}
          />
        )}
      </div>
    </div>
  );
};

// =====================================
// カットスタイルフォーム
// =====================================

const CutDetailsForm = ({ data, onChange }) => {
  const parts = [
    { id: 'head', label: '頭', x: 50, y: 12 },
    { id: 'face', label: '顔', x: 50, y: 28 },
    { id: 'ears', label: '耳', x: 28, y: 10 },
    { id: 'body', label: '体', x: 50, y: 50 },
    { id: 'tail', label: 'しっぽ', x: 85, y: 38 },
    { id: 'front_legs', label: '前足', x: 35, y: 78 },
    { id: 'back_legs', label: '後足', x: 68, y: 78 },
    { id: 'hip', label: 'お尻', x: 75, y: 55 },
  ];
  
  const selectedParts = data.selectedParts || [];
  const partNotes = data.partNotes || {};
  
  const handlePartSelect = (partId) => {
    const newSelected = selectedParts.includes(partId)
      ? selectedParts.filter(p => p !== partId)
      : [...selectedParts, partId];
    onChange({ ...data, selectedParts: newSelected });
  };
  
  return (
    <div>
      <div style={{
        position: 'relative', 
        height: '180px',
        backgroundColor: tokens.colors.groomingPale,
        borderRadius: tokens.radius.lg,
        border: `2px solid ${tokens.colors.grooming}40`,
        marginBottom: '16px', 
        overflow: 'hidden',
      }}>
        <svg viewBox="0 0 100 100" style={{
          position: 'absolute', 
          top: '50%', 
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '70%', 
          height: '70%', 
          opacity: 0.2,
        }}>
          <ellipse cx="50" cy="50" rx="25" ry="18" fill={tokens.colors.grooming} />
          <circle cx="50" cy="25" r="15" fill={tokens.colors.grooming} />
          <ellipse cx="38" cy="15" rx="6" ry="10" fill={tokens.colors.grooming} />
          <ellipse cx="62" cy="15" rx="6" ry="10" fill={tokens.colors.grooming} />
          <path d="M75 45 Q90 30 85 50" stroke={tokens.colors.grooming} strokeWidth="4" fill="none" />
          <rect x="32" y="65" width="6" height="20" rx="3" fill={tokens.colors.grooming} />
          <rect x="42" y="65" width="6" height="20" rx="3" fill={tokens.colors.grooming} />
          <rect x="55" y="65" width="6" height="20" rx="3" fill={tokens.colors.grooming} />
          <rect x="65" y="65" width="6" height="20" rx="3" fill={tokens.colors.grooming} />
        </svg>
        
        {parts.map((part) => {
          const isSelected = selectedParts.includes(part.id);
          return (
            <button
              key={part.id}
              onClick={() => handlePartSelect(part.id)}
              style={{
                position: 'absolute',
                left: `${part.x}%`, 
                top: `${part.y}%`,
                transform: 'translate(-50%, -50%)',
                minWidth: '36px', 
                height: '30px', 
                padding: '0 10px',
                borderRadius: tokens.radius.full,
                backgroundColor: isSelected ? tokens.colors.grooming : tokens.colors.surface,
                color: isSelected ? 'white' : tokens.colors.grooming,
                border: isSelected ? 'none' : `2px solid ${tokens.colors.grooming}`,
                fontSize: '11px', 
                fontWeight: '700', 
                cursor: 'pointer',
                boxShadow: isSelected 
                  ? `0 2px 8px ${tokens.colors.grooming}50`
                  : tokens.shadows.sm,
                transition: 'all 0.15s',
              }}
            >
              {part.label}
            </button>
          );
        })}
      </div>
      
      {selectedParts.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {selectedParts.map((partId) => {
            const part = parts.find(p => p.id === partId);
            return (
              <div key={partId} style={{
                display: 'flex', 
                alignItems: 'center', 
                gap: '10px',
              }}>
                <span style={{
                  width: '56px',
                  padding: '6px 0',
                  backgroundColor: tokens.colors.grooming,
                  color: 'white',
                  borderRadius: tokens.radius.sm,
                  fontSize: '12px', 
                  fontWeight: '600', 
                  flexShrink: 0,
                  textAlign: 'center',
                }}>
                  {part.label}
                </span>
                <input
                  type="text"
                  value={partNotes[partId] || ''}
                  onChange={(e) => onChange({ 
                    ...data, 
                    partNotes: { ...partNotes, [partId]: e.target.value } 
                  })}
                  placeholder="10mm、テディベアなど"
                  style={{
                    flex: 1, 
                    padding: '10px 12px', 
                    fontSize: '14px',
                    border: `1px solid ${tokens.colors.border}`,
                    borderRadius: tokens.radius.sm, 
                    backgroundColor: tokens.colors.surfaceHover,
                  }}
                />
                <button
                  onClick={() => handlePartSelect(partId)}
                  style={{
                    width: '28px', 
                    height: '28px',
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    backgroundColor: 'transparent', 
                    border: 'none',
                    cursor: 'pointer', 
                    color: tokens.colors.textTertiary,
                    borderRadius: tokens.radius.sm,
                  }}
                >
                  <X size={16} />
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{
          textAlign: 'center', 
          padding: '16px',
          color: tokens.colors.textTertiary, 
          fontSize: '13px',
        }}>
          部位をタップして選択してください
        </div>
      )}
    </div>
  );
};

// =====================================
// その他のフォーム
// =====================================

const DaycareActivitiesForm = ({ data, onChange }) => {
  const activityOptions = [
    { value: 'freeplay', label: '🎾 フリープレイ' },
    { value: 'training', label: '📚 トレーニング' },
    { value: 'walk', label: '🚶 お散歩' },
    { value: 'nap', label: '😴 お昼寝' },
    { value: 'socialization', label: '🐕 社会化' },
  ];
  
  const activities = data.activities || [];
  
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
      {activityOptions.map((opt) => {
        const selected = activities.includes(opt.value);
        return (
          <button
            key={opt.value}
            onClick={() => {
              onChange({
                ...data,
                activities: selected 
                  ? activities.filter(a => a !== opt.value)
                  : [...activities, opt.value]
              });
            }}
            style={{
              padding: '10px 16px', 
              fontSize: '13px', 
              fontWeight: '600',
              color: selected ? tokens.colors.daycare : tokens.colors.textSecondary,
              backgroundColor: selected ? tokens.colors.daycareLight : tokens.colors.surface,
              border: `1.5px solid ${selected ? tokens.colors.daycare : tokens.colors.border}`,
              borderRadius: tokens.radius.md, 
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
};

const HotelStayInfoForm = ({ data }) => (
  <div style={{
    backgroundColor: tokens.colors.hotelPale,
    borderRadius: tokens.radius.md, 
    padding: '16px',
    border: `1px solid ${tokens.colors.hotel}30`,
  }}>
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: '8px', 
      marginBottom: '14px',
    }}>
      <Moon size={18} color={tokens.colors.hotel} />
      <span style={{ fontWeight: '700', color: tokens.colors.hotel }}>宿泊情報</span>
    </div>
    
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
      <div>
        <div style={{ 
          fontSize: '12px', 
          color: tokens.colors.textSecondary, 
          marginBottom: '4px',
        }}>
          チェックイン
        </div>
        <div style={{ fontWeight: '600', color: tokens.colors.textPrimary }}>{data.check_in}</div>
      </div>
      <div>
        <div style={{ 
          fontSize: '12px', 
          color: tokens.colors.textSecondary, 
          marginBottom: '4px',
        }}>
          チェックアウト予定
        </div>
        <div style={{ fontWeight: '600', color: tokens.colors.textPrimary }}>{data.check_out_scheduled}</div>
      </div>
    </div>
  </div>
);

const ConditionForm = ({ data, onChange }) => {
  const options = [
    { value: 'excellent', label: '😆 絶好調' },
    { value: 'good', label: '😊 元気' },
    { value: 'normal', label: '😐 普通' },
    { value: 'tired', label: '😴 疲れ気味' },
    { value: 'observe', label: '🤒 要観察' },
  ];
  
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange({ ...data, overall: opt.value })}
          style={{
            padding: '10px 16px', 
            fontSize: '13px', 
            fontWeight: '600',
            color: data.overall === opt.value ? tokens.colors.primary : tokens.colors.textSecondary,
            backgroundColor: data.overall === opt.value ? tokens.colors.primaryLight : tokens.colors.surface,
            border: `1.5px solid ${data.overall === opt.value ? tokens.colors.primary : tokens.colors.border}`,
            borderRadius: tokens.radius.md, 
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
};

// =====================================
// 統合レコードフォーム
// =====================================

const RecordForm = ({ recordType, onOpenSettings }) => {
  const [condition, setCondition] = useState({ overall: 'good' });
  const [healthCheck, setHealthCheck] = useState({ weight: 3.25, ears: '汚れ' });
  const [photos, setPhotos] = useState({ 
    regular: [{}, {}],
    concerns: [{ label: '右後ろ足に赤み', annotation: { x: 70, y: 75 } }] 
  });
  const [notes, setNotes] = useState({ internal_notes: '', report_text: '' });
  
  const [groomingData, setGroomingData] = useState({ 
    selectedParts: ['body', 'face'], 
    partNotes: { body: '10mm', face: 'テディベア' } 
  });
  const [daycareData, setDaycareData] = useState({ activities: ['freeplay', 'training', 'nap'] });
  const [hotelData, setHotelData] = useState({ 
    check_in: '2026/02/01', 
    check_out_scheduled: '2026/02/03', 
    nights: 2 
  });
  
  const [collapsed, setCollapsed] = useState({ condition: true, health: true });
  const toggle = (key) => setCollapsed(prev => ({ ...prev, [key]: !prev[key] }));
  
  const [aiSuggestions, setAiSuggestions] = useState({
    'photo-concern': { type: 'photo-concern', dismissed: false, applied: false },
    'health-history': { type: 'health-history', dismissed: false, applied: false },
    'report-draft': { type: 'report-draft', dismissed: false, applied: false },
  });
  
  const handleAISuggestionAction = (type) => {
    if (type === 'photo-concern') {
      setPhotos(p => ({
        ...p,
        concerns: [...(p.concerns || []), { label: '右後ろ足に赤み（AI検出）', annotation: { x: 70, y: 75 } }]
      }));
    } else if (type === 'health-history') {
      setNotes(n => ({
        ...n,
        report_text: (n.report_text || '') + '\n\n耳の汚れが2回連続で見られます。継続的にケアをお勧めします。'
      }));
    }
    
    setAiSuggestions(prev => ({
      ...prev,
      [type]: { ...prev[type], applied: true }
    }));
    
    setTimeout(() => {
      setAiSuggestions(prev => ({
        ...prev,
        [type]: { ...prev[type], dismissed: true }
      }));
    }, 2000);
  };
  
  const handleAISuggestionDismiss = (type) => {
    setAiSuggestions(prev => ({
      ...prev,
      [type]: { ...prev[type], dismissed: true }
    }));
  };
  
  const weightHistory = [
    { date: '10/1', weight: 3.0 }, 
    { date: '11/1', weight: 3.1 },
    { date: '12/1', weight: 3.15 }, 
    { date: '1/1', weight: 3.2 }, 
    { date: '2/1', weight: 3.25 },
  ];
  
  const petInfo = {
    grooming: { name: 'ポチくん', breed: 'トイプードル', age: '3歳' },
    daycare: { name: 'モカちゃん', breed: 'チワワ', age: '2歳' },
    hotel: { name: 'レオくん', breed: '柴犬', age: '5歳' },
  }[recordType];
  
  const accentColor = { 
    grooming: tokens.colors.grooming, 
    daycare: tokens.colors.daycare, 
    hotel: tokens.colors.hotel 
  }[recordType];
  
  const accentBg = { 
    grooming: tokens.colors.groomingLight, 
    daycare: tokens.colors.daycareLight, 
    hotel: tokens.colors.hotelLight 
  }[recordType];
  
  const Icon = { grooming: Scissors, daycare: Dog, hotel: Moon }[recordType];

  return (
    <div style={{ 
      backgroundColor: tokens.colors.bg, 
      minHeight: '100vh', 
      maxWidth: '480px', 
      margin: '0 auto',
    }}>
      {/* ヘッダー */}
      <div style={{
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        padding: '10px 16px', 
        backgroundColor: tokens.colors.surface,
        borderBottom: `1px solid ${tokens.colors.border}`,
        position: 'sticky', 
        top: 0, 
        zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button style={{
            width: '40px', 
            height: '40px',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            backgroundColor: tokens.colors.surfaceHover, 
            border: 'none', 
            cursor: 'pointer',
            color: tokens.colors.textSecondary,
            borderRadius: tokens.radius.md,
          }}>
            <ChevronLeft size={22} />
          </button>
          <div>
            <div style={{ 
              fontSize: '16px', 
              fontWeight: '700', 
              color: tokens.colors.textPrimary,
            }}>
              {petInfo.name}
            </div>
            <div style={{ 
              fontSize: '12px', 
              color: tokens.colors.textSecondary,
            }}>
              {recordType === 'grooming' && 'トリミングカルテ'}
              {recordType === 'daycare' && '連絡帳'}
              {recordType === 'hotel' && `宿泊記録`}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={onOpenSettings}
            style={{
              width: '40px', 
              height: '40px',
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              backgroundColor: tokens.colors.surfaceHover, 
              border: 'none',
              borderRadius: tokens.radius.md, 
              cursor: 'pointer',
              color: tokens.colors.textSecondary,
            }}
          >
            <Settings size={20} />
          </button>
          <button style={{
            padding: '10px 14px', 
            fontSize: '13px', 
            fontWeight: '600',
            color: tokens.colors.textSecondary,
            backgroundColor: tokens.colors.surface,
            border: `1px solid ${tokens.colors.border}`,
            borderRadius: tokens.radius.md, 
            cursor: 'pointer',
          }}>
            保存
          </button>
          <button style={{
            padding: '10px 18px', 
            fontSize: '13px', 
            fontWeight: '700',
            color: 'white', 
            background: `linear-gradient(135deg, ${accentColor} 0%, ${accentColor}DD 100%)`,
            border: 'none', 
            borderRadius: tokens.radius.md, 
            cursor: 'pointer',
            display: 'flex', 
            alignItems: 'center', 
            gap: '6px',
            boxShadow: `0 2px 8px ${accentColor}40`,
          }}>
            <Send size={14} />
            共有
          </button>
        </div>
      </div>
      
      <div style={{ padding: '20px 16px' }}>
        {/* ペット情報カード */}
        <div style={{
          display: 'flex', 
          alignItems: 'center', 
          gap: '14px',
          padding: '16px', 
          backgroundColor: tokens.colors.surface,
          borderRadius: tokens.radius.lg, 
          boxShadow: tokens.shadows.sm, 
          marginBottom: '24px',
        }}>
          <div style={{
            width: '56px', 
            height: '56px', 
            borderRadius: tokens.radius.md,
            background: `linear-gradient(135deg, ${accentBg} 0%, ${accentColor}20 100%)`,
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            border: `1px solid ${accentColor}30`,
          }}>
            <Icon size={26} color={accentColor} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ 
              fontSize: '17px', 
              fontWeight: '700', 
              color: tokens.colors.textPrimary,
              marginBottom: '2px',
            }}>
              {petInfo.name}
            </div>
            <div style={{ 
              fontSize: '13px', 
              color: tokens.colors.textSecondary,
            }}>
              {petInfo.breed} / {petInfo.age}
            </div>
          </div>
          <button style={{
            padding: '10px 14px', 
            fontSize: '12px', 
            fontWeight: '600',
            color: tokens.colors.primary, 
            backgroundColor: tokens.colors.primaryLight,
            border: 'none', 
            borderRadius: tokens.radius.md, 
            cursor: 'pointer',
            display: 'flex', 
            alignItems: 'center', 
            gap: '6px',
          }}>
            <Copy size={14} />
            前回コピー
          </button>
        </div>

        {/* ===== 必須セクション ===== */}
        {recordType === 'grooming' && (
          <RequiredSection title="カットスタイル">
            <CutDetailsForm data={groomingData} onChange={setGroomingData} />
          </RequiredSection>
        )}
        {recordType === 'daycare' && (
          <RequiredSection title="今日の活動">
            <DaycareActivitiesForm data={daycareData} onChange={setDaycareData} />
          </RequiredSection>
        )}
        {recordType === 'hotel' && (
          <RequiredSection title="宿泊情報">
            <HotelStayInfoForm data={hotelData} />
          </RequiredSection>
        )}
        
        <RequiredSection title="写真">
          <PhotosForm 
            data={photos} 
            onChange={setPhotos} 
            showConcerns={recordType === 'grooming'}
            aiSuggestion={recordType === 'grooming' ? aiSuggestions['photo-concern'] : null}
            onAISuggestionAction={() => handleAISuggestionAction('photo-concern')}
            onAISuggestionDismiss={() => handleAISuggestionDismiss('photo-concern')}
          />
        </RequiredSection>
        
        <RequiredSection title="報告文">
          <NotesForm 
            data={notes} 
            onChange={setNotes}
            photos={photos} 
            recordType={recordType}
            groomingData={groomingData}
            aiSuggestion={aiSuggestions['report-draft']}
            onAISuggestionAction={() => handleAISuggestionAction('report-draft')}
            onAISuggestionDismiss={() => handleAISuggestionDismiss('report-draft')}
          />
        </RequiredSection>

        {/* ===== 任意セクション ===== */}
        <div style={{
          fontSize: '12px', 
          fontWeight: '600', 
          color: tokens.colors.textTertiary,
          padding: '12px 0 8px 0',
          marginBottom: '8px',
        }}>
          追加の記録（任意）
        </div>
        
        <OptionalSection 
          title="体調・様子" 
          collapsed={collapsed.condition} 
          onToggle={() => toggle('condition')}
        >
          <ConditionForm data={condition} onChange={setCondition} />
        </OptionalSection>
        
        <OptionalSection 
          title="健康チェック" 
          collapsed={collapsed.health} 
          onToggle={() => toggle('health')}
        >
          <HealthCheckForm 
            data={healthCheck} 
            onChange={setHealthCheck} 
            showWeightGraph={recordType === 'grooming'} 
            weightHistory={weightHistory}
            aiSuggestion={recordType === 'grooming' ? aiSuggestions['health-history'] : null}
            onAISuggestionAction={() => handleAISuggestionAction('health-history')}
            onAISuggestionDismiss={() => handleAISuggestionDismiss('health-history')}
          />
        </OptionalSection>
        
        <div style={{ height: '100px' }} />
      </div>
    </div>
  );
};

// =====================================
// メインアプリ
// =====================================

export default function App() {
  const [activeScreen, setActiveScreen] = useState('grooming');
  const [showSettings, setShowSettings] = useState(false);
  
  if (showSettings) {
    return <AISettingsScreen onClose={() => setShowSettings(false)} />;
  }
  
  return (
    <div style={{ fontFamily: '"Noto Sans JP", -apple-system, BlinkMacSystemFont, sans-serif' }}>
      {/* 業態切り替えタブ */}
      <div style={{
        display: 'flex', 
        justifyContent: 'center', 
        gap: '6px',
        padding: '12px 16px', 
        backgroundColor: tokens.colors.surface,
        borderBottom: `1px solid ${tokens.colors.border}`,
      }}>
        {[
          { id: 'grooming', label: 'トリミング', icon: <Scissors size={15} />, color: tokens.colors.grooming },
          { id: 'daycare', label: '幼稚園', icon: <Dog size={15} />, color: tokens.colors.daycare },
          { id: 'hotel', label: 'ホテル', icon: <Moon size={15} />, color: tokens.colors.hotel },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveScreen(tab.id)}
            style={{
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px',
              padding: '10px 18px', 
              fontSize: '13px',
              fontWeight: activeScreen === tab.id ? '700' : '500',
              color: activeScreen === tab.id ? tab.color : tokens.colors.textSecondary,
              backgroundColor: activeScreen === tab.id ? `${tab.color}15` : 'transparent',
              border: activeScreen === tab.id ? `1.5px solid ${tab.color}` : '1.5px solid transparent',
              borderRadius: tokens.radius.full, 
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>
      
      <RecordForm 
        recordType={activeScreen} 
        onOpenSettings={() => setShowSettings(true)} 
      />
    </div>
  );
}
