/**
 * GET /api/news
 * Google News RSS → JSON. No key. Must run server-side because the RSS feed
 * can't be fetched from the browser (CORS). Returns the top ~6 headlines.
 */

const FEED = "https://news.google.com/rss?hl=en-US&gl=US&ceid=US:en";

export default async function handler(req, res) {
  try {
    const r = await fetch(FEED, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!r.ok) throw new Error("rss " + r.status);
    const xml = await r.text();

    const items = [];
    const re = /<item>([\s\S]*?)<\/item>/g;
    let m;
    while ((m = re.exec(xml)) && items.length < 6) {
      const block = m[1];
      const titleRaw = pick(block, "title");
      const pub = pick(block, "pubDate");
      const source = pick(block, "source");
      // Google News titles look like "Headline - Source"
      const title = titleRaw.replace(/\s+-\s+[^-]+$/, "").trim();
      items.push({
        h: decode(title),
        s: decode(source) || "Google News",
        a: ago(pub),
        c: "World",
        url: pick(block, "link"),
      });
    }
    res.setHeader("Cache-Control", "s-maxage=1800");
    res.status(200).json({ items });
  } catch (e) {
    console.error("[news]", e);
    res.status(500).json({ error: "news_failed" });
  }
}

function pick(block, tag) {
  const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
  if (!m) return "";
  return m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/, "$1").trim();
}
function decode(s) {
  return s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&apos;/g, "'");
}
function ago(pub) {
  const t = new Date(pub);
  if (isNaN(t)) return "";
  const mins = Math.round((Date.now() - t) / 60000);
  if (mins < 60) return mins + "m";
  const h = Math.round(mins / 60);
  return h < 24 ? h + "h" : Math.round(h / 24) + "d";
}
