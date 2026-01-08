// provision.js
require("dotenv").config();
const axios = require("axios");

const createDroplet = async (clientName) => {
  try {
    const response = await axios.post(
      "https://api.digitalocean.com/v2/droplets",
      {
        name: `pulse-${clientName}`,
        region: "nyc3", // You can change this to a region closer to your clients
        size: "s-1vcpu-1gb",
        image: "ubuntu-22-04-x64",
        backups: true,
        ipv6: true,
        tags: ["pulse-connect"]
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.DO_API_TOKEN}`,
          "Content-Type": "application/json"
        }
      }
    );
    console.log(`🎉 Droplet created for ${clientName}:`, response.data.droplet);
  } catch (error) {
    console.error("❌ Error creating droplet:", error.response?.data || error.message);
  }
};

module.exports = { createDroplet };
