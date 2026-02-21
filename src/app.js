const express = require("express");
const cors = require("cors");
const { connectDB } = require("./config/db");
const { seedAdminIfMissing } = require("./config/seedAdmin");
const authRoutes = require("./routes/auth");
const adminRoutes = require("./routes/admin");

const openapi = require("./docs/openapi.json");
const app = express();
app.use(cors({ origin: "*" }));
app.use(express.json());
connectDB();
seedAdminIfMissing().catch(() => {});

app.use("/auth", authRoutes);
app.use("/admin", adminRoutes);

app.get("/", (req, res) => {
  res.json({ message: "backend_running" });
});

app.get("/swagger.json", (req, res) => {
  res.json(openapi);
});

app.get("/docs", (req, res) => {
  const html = `
  <!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <title>API Docs</title>
      <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist/swagger-ui.css" />
    </head>
    <body>
      <div id="swagger-ui"></div>
      <script src="https://unpkg.com/swagger-ui-dist/swagger-ui-bundle.js"></script>
      <script>
        window.ui = SwaggerUIBundle({ url: '/swagger.json', dom_id: '#swagger-ui' });
      </script>
    </body>
  </html>`;
  res.type("html").send(html);
});
module.exports = app;
