import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.resolve(__dirname, '../../zomato_data.json');

export async function fetchAndPreprocessData(limit = 1000) {
  try {
    const stats = await fs.stat(DATA_FILE);
    if (stats.isFile()) {
      console.log("Loading Zomato data from local file...");
      const fileContent = await fs.readFile(DATA_FILE, 'utf-8');
      return JSON.parse(fileContent);
    }
  } catch (err) {
    // File does not exist, proceed to fetch
  }

  console.log(`Downloading Zomato data from Hugging Face (limit=${limit})...`);
  let allProcessed = [];
  const pageSize = 100;
  const pages = Math.ceil(limit / pageSize);

  for (let i = 0; i < pages; i++) {
    const offset = i * pageSize;
    const url = `https://datasets-server.huggingface.co/rows?dataset=ManikaSaini%2Fzomato-restaurant-recommendation&config=default&split=train&offset=${offset}&length=${pageSize}`;

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Fetch failed: ${response.statusText}`);
      const data = await response.json();
      const rows = data.rows || [];

      const processed = rows.map(item => {
        const row = item.row;
        // Clean missing values and format price/rating
        const name = row.name || "Unknown Restaurant";
        const location = row.location || "Unknown Location";
        // Parse cuisines cleanly into an array of trimmed strings
        const cuisines = row.cuisines ? row.cuisines.split(',').map(c => c.trim()).filter(c => c) : ["Various"];

        let rate = 0;
        if (row.rate && row.rate !== "NEW" && row.rate !== "-") {
          rate = parseFloat(row.rate.split("/")[0]);
          if (isNaN(rate)) rate = 0;
        }

        let priceForTwo = 0;
        if (row["approx_cost(for two people)"]) {
          priceForTwo = parseInt(row["approx_cost(for two people)"].replace(/,/g, ""), 10);
          if (isNaN(priceForTwo)) priceForTwo = 0;
        }

        const onlineOrder = row.online_order === "Yes" ? "offers online ordering" : "does not offer online ordering";
        const richTextDescription = `${name} is a ${rate}-star rated restaurant located in ${location} serving ${cuisines.join(', ')} cuisine. It costs approximately ₹${priceForTwo} for two people and ${onlineOrder}.`;

        return {
          name,
          location,
          cuisines,
          rate,
          price_for_two: priceForTwo,
          online_order: row.online_order === "Yes",
          book_table: row.book_table === "Yes",
          rich_text_description: richTextDescription,
          raw_metadata: {
            address: row.address,
            votes: row.votes,
            rest_type: row.rest_type,
          }
        };
      });
      allProcessed = allProcessed.concat(processed);
    } catch (error) {
      console.error("Error in fetchAndPreprocessData:", error);
      break;
    }
  }

  try {
    await fs.writeFile(DATA_FILE, JSON.stringify(allProcessed, null, 2));
    console.log(`Saved ${allProcessed.length} restaurants to local file zomato_data.json.`);
  } catch (err) {
    console.error("Error saving to local file:", err);
  }

  return allProcessed;
}
