const NOTION_TOKEN = process.env.NOTION_TOKEN;
const DATABASE_ID = process.env.NOTION_DATABASE_ID;

const headers = {
  "Authorization": `Bearer ${NOTION_TOKEN}`,
  "Content-Type": "application/json",
  "Notion-Version": "2022-06-28",
};

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  res.setHeader("Cache-Control", "no-store");

  try {
    // GET - 查询数据
    if (req.method === "GET") {
      

      const response = await fetch(`https://api.notion.com/v1/databases/${DATABASE_ID}/query`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          filter: {
            property: "Data",
            title: { starts_with: year }
          },
          page_size: 100,
        }),
      });

      const data = await response.json();

      const result = {};
      for (const page of data.results || []) {
        const date = page.properties.Data?.title?.[0]?.plain_text;
        const count = page.properties.Count?.number ?? 0;
        const pageId = page.id;
        if (date) result[date] = { count, pageId };
      }

      return res.status(200).json(result);
    }

    // POST - 创建或更新数据
    if (req.method === "POST") {
      const { date, count, pageId } = req.body;

      if (pageId) {
        if (count === 0) {
          await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
            method: "PATCH",
            headers,
            body: JSON.stringify({ archived: true }),
          });
          return res.status(200).json({ success: true, deleted: true });
        }
        
        const response = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
          method: "PATCH",
          headers,
          body: JSON.stringify({
            properties: {
              Count: { number: count }
            }
          }),
        });
        const data = await response.json();
        return res.status(200).json({ success: true, pageId: data.id });
      }

      const response = await fetch("https://api.notion.com/v1/pages", {
        method: "POST",
        headers,
        body: JSON.stringify({
          parent: { database_id: DATABASE_ID },
          properties: {
            Data: { title: [{ text: { content: date } }] },
            Count: { number: count },
          },
        }),
      });
      const data = await response.json();
      return res.status(200).json({ success: true, pageId: data.id });
    }

    return res.status(405).json({ error: "Method not allowed" });
    
  } catch (err) {
    console.error("服务器错误:", err);
    return res.status(500).json({ error: err.message });
  }
}
