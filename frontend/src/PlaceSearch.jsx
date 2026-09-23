import { useState } from 'react';

async function searchPlaces(text) {
  if (!text || text.length < 3) return [];
  const url = 'https://nominatim.openstreetmap.org/search?format=json&limit=8&countrycodes=ug&q=' +
    encodeURIComponent(text);
  const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
  const data = await res.json();
  return (data || []).map((p) => ({
    name: p.display_name,
    lat: parseFloat(p.lat),
    lng: parseFloat(p.lon)
  }));
}

export default function PlaceSearch({ label, onPick, placeholder }) {
  const [text, setText] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  async function handleSearch() {
    if (text.length < 3) return;
    setLoading(true);
    try {
      const list = await searchPlaces(text);
      setResults(list);
      if (list.length === 0) {
        alert('No places found for "' + text + '". Try a bigger nearby town, or use the map to click/drag the pin.');
      }
    } catch (e) {
      setResults([]);
    }
    setLoading(false);
  }

  function pick(place) {
    onPick({ lat: place.lat, lng: place.lng });
    setResults([]);
    setText(place.name);
  }

  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: 'block', marginBottom: 4, fontWeight: 'bold' }}>
        {label}
      </label>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSearch(); } }}
          placeholder={placeholder}
          style={{ flex: 1, padding: 8 }}
        />
        <button type="button" onClick={handleSearch}>
          🔍 Search
        </button>
      </div>
      {loading && <p style={{ fontSize: 13, color: '#666' }}>Searching…</p>}
      {results.length > 0 && (
        <ul style={{
          listStyle: 'none',
          padding: 0,
          margin: '8px 0 0 0',
          border: '1px solid #ddd',
          borderRadius: 6,
          maxHeight: 220,
          overflowY: 'auto'
        }}>
          {results.map((p, i) => (
            <li
              key={i}
              onClick={() => pick(p)}
              style={{
                padding: 10,
                borderBottom: '1px solid #eee',
                cursor: 'pointer',
                fontSize: 14
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#f5f5f5'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
            >
              📍 {p.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}