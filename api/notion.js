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
    if (req.method === "GET") {
  const { year } = req.query;

  const response = await fetch(`https://api.notion.com/v1/databases/${DATABASE_ID}/query`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      page_size: 10,
      // 先不加 filter，看看能不能读到数据
    }),
  });

  const data = await response.json();
  
  // 打印完整响应
  console.log("完整响应:", JSON.stringify(data, null, 2));

  return res.status(200).json(data);
}

      const data = await response.json();

      const result = {};
      for (const page of data.results || []) {
        // 兼容两种日期类型
        let date = null;
        // 如果是 Title/Text 类型
        if (page.properties.Date?.title?.[0]?.plain_text) {
          date = page.properties.Date.title[0].plain_text;
        }
        // 如果是 Date 类型
        else if (page.properties.Date?.date?.start) {
          date = page.properties.Date.date.start;
        }
        
        const count = page.properties.Count?.number ?? 0;
        const pageId = page.id;
        if (date) result[date] = { count, pageId };
      }
      return res.status(200).json(result);
    }

    // POST /api/notion
    if (req.method === "POST") {
      const { date, count, pageId } = req.body;

      // Update existing page
      if (pageId) {
        if (count === 0) {
          await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
            method: "PATCH",
            headers,
            body: JSON.stringify({ archived: true }),
          });
          return res.status(200).json({ deleted: true });
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
        return res.status(200).json({ pageId: data.id });
      }

      // Create new page
      const response = await fetch("https://api.notion.com/v1/pages", {
        method: "POST",
        headers,
        body: JSON.stringify({
          parent: { database_id: DATABASE_ID },
          properties: {
            Date: { title: [{ text: { content: date } }] },
            Count: { number: count },
          },
        }),
      });
      const data = await response.json();
      return res.status(200).json({ pageId: data.id });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
