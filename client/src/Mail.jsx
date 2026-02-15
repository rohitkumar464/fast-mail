import axios from "axios";
import { useState } from "react";

function Mail() {
  const [formData, setFormData] = useState({
    senderName: "",
    gmail: "",
    accessToken: "",
    subject: "",
    message: "",
    recipients: "",
  });

  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const logout = () => {
    localStorage.removeItem("token");
    window.location.href = "/login";
  };

  // Open popup for Gmail OAuth
  const authorizeGmail = async () => {
    const res = await axios.get(`${import.meta.env.VITE_API_URL}/auth-url`);
    const width = 500,
      height = 600,
      left = window.innerWidth / 2 - width / 2,
      top = window.innerHeight / 2 - height / 2;

    const popup = window.open(
      res.data.url,
      "Gmail Authorization",
      `width=${width},height=${height},top=${top},left=${left}`,
    );

    // Listen for message from popup
    window.addEventListener("message", async function handler(e) {
      if (e.data.type === "oauth-code") {
        window.removeEventListener("message", handler);
        const tokenRes = await axios.post(
          `${import.meta.env.VITE_API_URL}/get-token`,
          { code: e.data.code },
        );

        setFormData({
          ...formData,
          accessToken: tokenRes.data.access_token,
          gmail: tokenRes.data.email || formData.gmail,
        });
        setStatus({ type: "success", message: "Gmail authorized!" });
        popup.close();
      }
    });
  };

  const sendMail = async () => {
    setLoading(true);
    setStatus(null);

    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/send-mails`,
        formData,
        { headers: { Authorization: token } },
      );

      setStatus({ type: "success", message: res.data.message });

      setFormData({
        senderName: "",
        gmail: "",
        accessToken: "",
        subject: "",
        message: "",
        recipients: "",
      });
    } catch (error) {
      setStatus({ type: "danger", message: "Failed to send emails." });
    }

    setLoading(false);
  };

  return (
    <div className="full-screen-center">
      <div className="mail-card">
        <h3 className="text-center mb-4">📧 Fast Mail Launcher</h3>

        {status && (
          <div className={`alert alert-${status.type}`}>{status.message}</div>
        )}

        <div className="row">
          <div className="col-md-6">
            <input
              className="form-control mb-3"
              name="senderName"
              placeholder="Sender Name"
              value={formData.senderName}
              onChange={handleChange}
            />
            <button
              className="btn btn-outline-primary mb-3 w-100"
              onClick={authorizeGmail}
            >
              {formData.accessToken ? "Gmail Authorized" : "Authorize Gmail"}
            </button>
            <textarea
              className="form-control"
              rows="4"
              name="message"
              placeholder="Message Body"
              value={formData.message}
              onChange={handleChange}
            ></textarea>
          </div>

          <div className="col-md-6">
            <input
              className="form-control mb-3"
              name="gmail"
              placeholder="Your Gmail"
              value={formData.gmail}
              readOnly
            />
            <input
              className="form-control mb-3"
              name="subject"
              placeholder="Subject"
              value={formData.subject}
              onChange={handleChange}
            />
            <textarea
              className="form-control"
              rows="4"
              name="recipients"
              placeholder="Recipients (comma or newline)"
              value={formData.recipients}
              onChange={handleChange}
            ></textarea>
          </div>
        </div>

        <div className="d-flex gap-3 mt-4">
          <button
            className="btn btn-primary w-100"
            onClick={sendMail}
            disabled={loading || !formData.accessToken}
          >
            {loading ? "Sending..." : "Send All"}
          </button>
          <button className="btn btn-secondary w-100" onClick={logout}>
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}

export default Mail;
