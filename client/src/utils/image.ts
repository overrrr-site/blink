/**
 * 画像URL関連のユーティリティ関数
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/**
 * 画像URLを取得する（相対パスの場合はAPIベースURLを追加）
 */
export function getImageUrl(url: string | null | undefined): string {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${API_URL}${url}`;
}

/**
 * Supabase Storage の画像URLにサムネイルパラメータを追加
 * @param url 元の画像URL
 * @param width 幅（ピクセル）
 * @param height 高さ（ピクセル）
 * @param quality 品質（1-100、デフォルト80）
 */
export function getThumbnailUrl(
  url: string | null | undefined,
  width: number,
  height?: number,
  quality: number = 80
): string {
  if (!url) return '';

  // 相対パスの場合はAPIベースURLを追加
  const fullUrl = url.startsWith('http') ? url : `${API_URL}${url}`;

  // Supabase Storage のURLかどうかをチェック
  if (fullUrl.includes('supabase.co/storage')) {
    // render/image エンドポイントを使用してリサイズ
    // 形式: /storage/v1/render/image/public/bucket/path?width=x&height=y
    const transformedUrl = fullUrl.replace(
      '/storage/v1/object/public/',
      '/storage/v1/render/image/public/'
    );

    const params = new URLSearchParams();
    params.set('width', String(width));
    if (height) {
      params.set('height', String(height));
    }
    params.set('quality', String(quality));
    params.set('resize', 'cover');

    return `${transformedUrl}?${params.toString()}`;
  }

  // Supabase以外の画像はそのまま返す
  return fullUrl;
}

/**
 * アバター用のサムネイルURL（80x80px、Retina対応で160x160を取得）
 */
export function getAvatarUrl(url: string | null | undefined): string {
  return getThumbnailUrl(url, 160, 160);
}

/**
 * リスト表示用のサムネイルURL（120x120px）
 */
export function getListThumbnailUrl(url: string | null | undefined): string {
  return getThumbnailUrl(url, 240, 240);
}
