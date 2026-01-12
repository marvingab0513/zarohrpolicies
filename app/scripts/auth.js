export const initAuth = () => {
  const loginForm = document.getElementById("login-form");
  if (loginForm) {
    loginForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const formData = new FormData(loginForm);
      const userid = String(formData.get("userid") || "").trim();
      const password = String(formData.get("password") || "");
      const error = document.getElementById("login-error");

      if (error) {
        error.textContent = "";
      }

      try {
        const response = await fetch("/api/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userid, password }),
          credentials: "include",
        });

        if (!response.ok) {
          const message = await response.text();
          if (error) {
            error.textContent = message || "Login failed. Check your credentials.";
          }
          return;
        }

        const data = await response.json();
        const role = data?.role;
        window.location.href = role === "admin" ? "policies.html" : "policies.html";
      } catch (err) {
        if (error) {
          error.textContent = "Login failed. Try again.";
        }
        console.error("Login failed:", err);
      }
    });
  }

  const isPolicyPage = document.body?.dataset.page === "policies";
  const isAdminPage = document.body?.dataset.page === "policy-admin";
  if (isPolicyPage || isAdminPage) {
    fetch("/api/session", { credentials: "include" })
      .then(async (response) => {
        if (!response.ok) {
          window.location.replace("index.html#login");
          return null;
        }
        return response.json();
      })
      .then((data) => {
        if (!data) return;
        document.body.dataset.role = data.role || "employee";
        window.dispatchEvent(new CustomEvent("role-ready"));
        const addPolicyBtn = document.querySelector(".add-policy-btn");
        if (data.role !== "admin" && addPolicyBtn) {
          addPolicyBtn.setAttribute("hidden", "");
        }
        if (isAdminPage && data.role !== "admin") {
          window.location.replace("policies.html");
        }
      })
      .catch((err) => {
        console.error("Session check failed:", err);
        window.location.replace("index.html#login");
      });
  }

  const logout = document.getElementById("logout");
  if (logout) {
    logout.addEventListener("click", async () => {
      try {
        await fetch("/api/logout", { method: "POST", credentials: "include" });
      } catch (err) {
        console.error("Logout failed:", err);
      }
      window.location.href = "index.html";
    });
  }
};
