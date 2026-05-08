const KEY = process.env.EXPO_PUBLIC_UNSPLASH_KEY;
const BASE = 'https://api.unsplash.com';

export async function fetchHotelPhotos(hotelName, city, count = 6) {
  if (!KEY) return [];
  const query = encodeURIComponent(`${hotelName} ${city} hotel`);
  try {
    const res = await fetch(
      `${BASE}/search/photos?query=${query}&orientation=landscape&per_page=${count}&content_filter=high&order_by=relevant`,
      { headers: { Authorization: `Client-ID ${KEY}` } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data?.results || []).map(p => p.urls?.regular).filter(Boolean);
  } catch { return []; }
}

// Uses search (not random) so the same destination always returns the same top photo.
export async function fetchDestinationPhoto(city, country) {
  if (!KEY) return null;
  const query = encodeURIComponent(`${city} ${country} travel`);
  try {
    const res = await fetch(
      `${BASE}/search/photos?query=${query}&orientation=landscape&per_page=1&order_by=relevant&content_filter=high`,
      { headers: { Authorization: `Client-ID ${KEY}` } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data?.results?.[0]?.urls?.regular ?? null;
  } catch { return null; }
}

const CATEGORY_QUERIES = {
  All:      'travel destination landmark',
  Europe:   'europe travel city architecture',
  Asia:     'asia travel destination city',
  Americas: 'americas travel landscape city',
  Africa:   'africa travel landscape destination',
  Oceania:  'oceania australia new zealand travel',
};

export async function fetchInspirationPhotos(category = 'All', count = 12) {
  if (!KEY) return [];
  const query = encodeURIComponent(CATEGORY_QUERIES[category] || CATEGORY_QUERIES.All);
  try {
    const res = await fetch(
      `${BASE}/photos/random?query=${query}&orientation=landscape&count=${count}&content_filter=high`,
      { headers: { Authorization: `Client-ID ${KEY}` } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    return data.map(p => ({
      id: p.id,
      photo_url: p.urls.regular,
      thumb_url: p.urls.small,
      description: p.alt_description || p.description || null,
      location: [p.location?.city, p.location?.country].filter(Boolean).join(', ') || p.location?.title || null,
    }));
  } catch { return []; }
}
