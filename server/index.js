import "dotenv/config";
import bcrypt from "bcryptjs";
import express from "express";
import session from "express-session";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SESSION_SECRET = process.env.SESSION_SECRET || "dev-session-secret";
const PORT = Number(process.env.PORT || 5173);

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
    },
  })
);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
app.use(express.static(rootDir));

const requireAuth = (req, res, next) => {
  if (!req.session?.user) {
    return res.status(401).send("Not authenticated.");
  }
  return next();
};

const requireAdmin = (req, res, next) => {
  if (!req.session?.user) {
    return res.status(401).send("Not authenticated.");
  }
  if (req.session.user.role !== "admin") {
    return res.status(403).send("Admin access required.");
  }
  return next();
};

const sanitizeFilename = (name = "") => name.replace(/[^a-zA-Z0-9._-]/g, "_");

app.post("/api/login", async (req, res) => {
  const { userid, password } = req.body || {};
  const identifier = String(userid || "").trim();
  if (!identifier || !password) {
    return res.status(400).send("User ID and password are required.");
  }

  if (identifier === "hrdemo" && password === "Policy@2025") {
    const { data: demoUser, error: demoError } = await supabase
      .from("user_profiles")
      .select("id, employee_id, role, is_active")
      .eq("employee_id", identifier)
      .maybeSingle();

    if (demoError) {
      console.error("Demo login lookup failed:", demoError);
      return res.status(500).send("Login failed.");
    }

    let user = demoUser;
    if (!user) {
      const passwordHash = await bcrypt.hash(password, 10);
      const { data: created, error: createError } = await supabase
        .from("user_profiles")
        .insert({
          employee_id: identifier,
          password_hash: passwordHash,
          role: "admin",
          is_active: true,
        })
        .select("id, employee_id, role, is_active")
        .single();

      if (createError) {
        console.error("Demo user create failed:", createError);
        return res.status(500).send("Login failed.");
      }
      user = created;
    }

    if (user.is_active === false) {
      return res.status(401).send("Invalid credentials.");
    }

    req.session.user = { id: user.id, employeeId: user.employee_id, role: user.role };
    return res.json({ role: user.role, employeeId: user.employee_id });
  }

  const { data, error } = await supabase
    .from("user_profiles")
    .select("id, employee_id, role, password_hash, is_active")
    .eq("employee_id", identifier)
    .maybeSingle();

  if (error) {
    console.error("Login lookup failed:", error);
    return res.status(500).send("Login failed.");
  }

  if (!data || data.is_active === false) {
    return res.status(401).send("Invalid credentials.");
  }

  const isValid = await bcrypt.compare(password, data.password_hash);
  if (!isValid) {
    return res.status(401).send("Invalid credentials.");
  }

  req.session.user = { id: data.id, employeeId: data.employee_id, role: data.role };
  return res.json({ role: data.role, employeeId: data.employee_id });
});

app.get("/api/session", (req, res) => {
  if (!req.session?.user) {
    return res.status(401).send("Not authenticated.");
  }
  return res.json(req.session.user);
});

app.post("/api/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

app.post("/api/upload", requireAdmin, upload.single("file"), async (req, res) => {
  const { policyId } = req.body || {};
  const file = req.file;
  if (!policyId) {
    return res.status(400).send("Missing policy ID.");
  }
  if (!file) {
    return res.status(400).send("Missing file.");
  }

  const timestamp = Date.now();
  const safeName = sanitizeFilename(file.originalname);
  const filePath = `private/${policyId}/${timestamp}-${safeName}`;

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from("policy-files")
    .upload(filePath, file.buffer, { contentType: file.mimetype, upsert: false });

  if (uploadError) {
    console.error("Storage upload failed:", uploadError);
    return res.status(500).send(uploadError.message || "Upload failed.");
  }

  const storedPath = uploadData?.path || filePath;
  const { error: insertError } = await supabase.from("policy_documents").insert({
    policy_id: policyId,
    file_path: storedPath,
    uploaded_by: req.session.user.id,
  });

  if (insertError) {
    console.error("Insert failed:", insertError);
    return res.status(500).send(insertError.message || "Upload failed.");
  }

  return res.json({ filePath: storedPath });
});

app.get("/api/policy-documents", requireAuth, async (req, res) => {
  const policyId = req.query.policyId;
  if (!policyId) {
    return res.status(400).send("Missing policy ID.");
  }

  const { data, error } = await supabase
    .from("policy_documents")
    .select("file_path, uploaded_at")
    .eq("policy_id", policyId)
    .order("uploaded_at", { ascending: false });

  if (error) {
    console.error("Policy documents fetch failed:", error);
    return res.status(500).send("Failed to load policy files.");
  }

  const files = data || [];
  const signedFiles = await Promise.all(
    files.map(async (file) => {
      if (!file.file_path) return { ...file, url: null };
      const { data: signed, error: signedError } = await supabase.storage
        .from("policy-files")
        .createSignedUrl(file.file_path, 60 * 10);
      if (signedError) {
        console.error("Signed URL error:", signedError);
        return { ...file, url: null };
      }
      return { ...file, url: signed?.signedUrl || null };
    })
  );

  return res.json(signedFiles);
});

app.delete("/api/policy-documents", requireAdmin, async (req, res) => {
  const { policyId, filePath } = req.body || {};
  if (!policyId || !filePath) {
    return res.status(400).send("Missing policy ID or file path.");
  }

  const { error: storageError } = await supabase.storage.from("policy-files").remove([filePath]);
  if (storageError) {
    console.error("Storage delete failed:", storageError);
    return res.status(500).send(storageError.message || "Failed to delete file.");
  }

  const { error: deleteError } = await supabase
    .from("policy_documents")
    .delete()
    .eq("policy_id", policyId)
    .eq("file_path", filePath);

  if (deleteError) {
    console.error("Document delete failed:", deleteError);
    return res.status(500).send(deleteError.message || "Failed to delete file record.");
  }

  return res.json({ success: true });
});

app.post("/api/policy-documents/delete", requireAdmin, async (req, res) => {
  const { policyId, filePath } = req.body || {};
  if (!policyId || !filePath) {
    return res.status(400).send("Missing policy ID or file path.");
  }

  const { error: storageError } = await supabase.storage.from("policy-files").remove([filePath]);
  if (storageError) {
    console.error("Storage delete failed:", storageError);
    return res.status(500).send(storageError.message || "Failed to delete file.");
  }

  const { error: deleteError } = await supabase
    .from("policy_documents")
    .delete()
    .eq("policy_id", policyId)
    .eq("file_path", filePath);

  if (deleteError) {
    console.error("Document delete failed:", deleteError);
    return res.status(500).send(deleteError.message || "Failed to delete file record.");
  }

  return res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
