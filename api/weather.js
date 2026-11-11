/**
 * GET /api/weather?lat=&lon=
 * Open-Meteo (no key). Returns a compact current + hourly shape and a one-line
 * advice string. Falls back to West Lafayette if no coords are given.
 */

export default async function handler(req, res) {
  const url = new URL(req.url, `https://${req.headers.host}`);
  const lat = url.searchParams.get("lat") || "40.4237";   // West Lafayette, IN
  const lon = url.searchParams.get("lon") || "-86.9212";

  const api = `https://api.open-meteo.com/v1/forecast?${new URLSearchParams({
    latitude: lat, longitude: lon,
    current: "temperature_2m,apparent_temperature,precipitation,weather_code",
    hourly: "temperature_2m,precipitation_probability",
    daily: "temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset",
    temperature_unit: "celsius", timezone: "auto", forecast_days: "1",
  })}`;

  try {
    const r = await fetch(api);
    if (!r.ok) throw new Error("open-meteo " + r.status);
    const d = await r.json();

    const code = d.current?.weather_code ?? 0;
    const condition = codeText(code);
    const rainMax = d.daily?.precipitation_probability_max?.[0] ?? 0;

    // next 5 hourly slots from the current hour
    const nowHour = new Date().getHours();
    const hourly = [];
    const times = d.hourly?.time || [];
    for (let i = 0; i < times.length && hourly.length < 5; i++) {
      const h = new Date(times[i]).getHours();
      if (new Date(times[i]) >= new Date() || h === nowHour) {
        hourly.push({
          h: fmtHour(new Date(times[i])),
          t: Math.round(d.hourly.temperature_2m[i]),
          r: d.hourly.precipitation_probability?.[i] ?? 0,
        });
      }
    }

    // advice: find the first upcoming hour with >50% rain
    let advice = "";
    const rainHour = hourly.find((h) => h.r > 50);
    if (rainHour) advice = `Rain likely around ${rainHour.h} — take an umbrella.`;
    else if (d.current?.temperature_2m < 5) advice = "Cold out — bundle up for the walk to class.";

    res.setHeader("Cache-Control", "s-maxage=1800");
    res.status(200).json({
      now: Math.round(d.current?.temperature_2m),
      feels: Math.round(d.current?.apparent_temperature),
      high: Math.round(d.daily?.temperature_2m_max?.[0]),
      low: Math.round(d.daily?.temperature_2m_min?.[0]),
      condition, rainChance: rainMax, hourly, advice,
    });
  } catch (e) {
    console.error("[weather]", e);
    res.status(500).json({ error: "weather_failed" });
  }
}

function codeText(c) {
  if (c === 0) return "Clear";
  if (c <= 2) return "Partly cloudy";
  if (c === 3) return "Cloudy";
  if (c <= 48) return "Foggy";
  if (c <= 67) return "Rainy";
  if (c <= 77) return "Snowy";
  if (c <= 82) return "Showers";
  return "Stormy";
}
function fmtHour(d) {
  let h = d.getHours();
  const ap = h >= 12 ? "p" : "a";
  h = h % 12 || 12;
  return h + ap;
}
