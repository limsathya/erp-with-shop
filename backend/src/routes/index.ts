import { Router } from "express";
import auth from "./auth.routes.js";
import products from "./product.routes.js";
import invoices from "./invoice.routes.js";
import payments from "./payment.routes.js";
import customers from "./customer.routes.js";
import suppliers from "./supplier.routes.js";
import dashboard from "./dashboard.routes.js";
import uploadRoute from "./upload.routes.js";

import stores from "./store.routes.js";
import visits from "./visit.routes.js";
import shop from "./shop.routes.js";

const api = Router();

api.get("/health", (_req, res) => res.json({ status: "ok", time: new Date().toISOString() }));
api.use("/auth", auth);
api.use("/products", products);
api.use("/invoices", invoices);
api.use("/payments", payments);
api.use("/customers", customers);
api.use("/suppliers", suppliers);
api.use("/stores", stores);
api.use("/visits", visits);
api.use("/shop", shop);
api.use("/dashboard", dashboard);
api.use("/upload", uploadRoute);

export default api;
