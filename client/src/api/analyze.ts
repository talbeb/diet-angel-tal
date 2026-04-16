import { Meal, RawIngredient } from '../types';

const BASE = '/api';
const MAX_DIMENSION = 1024; // px — keeps base64 well under proxy limits

function resizeImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Canvas toBlob failed'))),
        'image/jpeg',
        0.85,
      );
    };
    img.onerror = reject;
    img.src = url;
  });
}

export async function analyzeImage(file: File): Promise<RawIngredient[]> {
  const resized = await resizeImage(file);
  const formData = new FormData();
  formData.append('image', resized, 'image.jpg');

  const res = await fetch(`${BASE}/analyze-image`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Analysis failed' }));
    throw new Error(err.error ?? 'Analysis failed');
  }

  const data = await res.json();
  return data.ingredients as RawIngredient[];
}

export async function addAnalyzedMeal(params: {
  date: string;
  time: string;
  name: string;
  yellowStars: number;
  redStars: number;
}): Promise<Meal> {
  const res = await fetch(`${BASE}/analyze/add-meal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to save meal' }));
    throw new Error(err.error ?? 'Failed to save meal');
  }

  return res.json();
}
