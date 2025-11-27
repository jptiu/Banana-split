import { pool } from "../config/db.js";
import { v4 as uuidv4 } from "uuid";

export async function seed() {
  try {
    const platforms = [
      {
        name: "YouTube",
        description: "Video-sharing platform",
      },
      {
        name: "OnlyFans",
        description: "Subscription-based content platform",
      },
      {
        name: "TikTok",
        description: "Short-form video platform",
      },
      {
        name: "Instagram",
        description: "Photo and video-sharing platform",
      },
      {
        name: "Chaturbate",
        description: "Live streaming and cam platform",
      },
    ];

    for (const p of platforms) {
      await pool.query(
        `
        INSERT INTO platforms (id, name, description)
        VALUES ($1, $2, $3)
        ON CONFLICT (name) DO NOTHING
        `,
        [uuidv4(), p.name, p.description]
      );

      console.log(`✅ Platform seeded: ${p.name}`);
    }

    console.log("🎉 Platforms seeded successfully!");
  } catch (err) {
    console.error("❌ Error seeding platforms:", err);
  }
}

seed();
