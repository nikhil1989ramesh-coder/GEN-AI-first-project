import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default async function handler(req, res) {
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const dataPath = path.join(__dirname, 'data.json');
        const fileContent = await fs.readFile(dataPath, 'utf-8');
        const data = JSON.parse(fileContent);

        const placesSet = new Set();
        const cuisinesSet = new Set();
        const pricesSet = new Set();

        data.forEach(item => {
            if (item.location) {
                const mainLocation = item.location.split(',')[0].trim();
                placesSet.add(mainLocation);
            }
            if (item.cuisines) {
                if (typeof item.cuisines === 'string') {
                    item.cuisines.split(',').forEach(c => cuisinesSet.add(c.trim()));
                }
            }
            if (item['approx_cost(for two people)']) {
                const cost = parseInt(item['approx_cost(for two people)'].toString().replace(/,/g, ''));
                if (!isNaN(cost)) {
                    pricesSet.add(cost);
                }
            }
        });

        res.status(200).json({
            success: true,
            places: Array.from(placesSet).sort(),
            cuisines: Array.from(cuisinesSet).sort(),
            prices: Array.from(pricesSet).sort((a, b) => a - b)
        });
    } catch (err) {
        console.error("Error fetching filters:", err);
        res.status(500).json({ error: "Failed to fetch filters" });
    }
}
